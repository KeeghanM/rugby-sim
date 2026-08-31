import {
  attackDirection,
  type GameState,
  otherTeam,
  PITCH,
  type Player,
  type Position,
  ROLES,
  type Team,
} from "../../domain.ts";
import {
  getKickoffTarget,
  getLineoutTarget,
  getScrumTarget,
  isForward,
  LINEOUT_MEMBER_VARIANTS,
} from "../../formations/index.ts";
import {
  getActiveShapePositions,
  rollTeamFormations,
} from "../../teams/index.ts";
import { carryBall, launchBall, startGoalLineDropout } from "../ball.ts";
import {
  clamp,
  contactStrength,
  distance,
  effectiveSkill,
  GRAVITY,
  insideOwnTwentyTwo,
  overallSkill,
} from "../math.ts";
import type { Random } from "../types.ts";

export const startScrum = (
  state: GameState,
  feedingTeam: Team,
  position: Position,
  random: Random = Math.random,
) => {
  // Clamp scrum mark safely inside touchlines and try lines
  const markX = clamp(position.x, -22, 22);
  const markZ = clamp(
    position.z,
    PITCH.tryLines.south + 8,
    PITCH.tryLines.north - 8,
  );
  state.ball = {
    position: { x: markX, y: 0.15, z: markZ },
    velocity: { x: 0, y: 0, z: 0 },
    carrierId: null,
    flight: null,
    intendedReceiverId: null,
    lastTouchedTeam: otherTeam(feedingTeam),
    passerId: null,
    kickerId: null,
    kickOrigin: null,
    bouncesRemaining: 0,
  };
  state.pendingClearanceKickerId = null;
  state.possessionTeam = feedingTeam;
  state.phaseCount = 1;
  state.possessionOriginZ = markZ;
  state.gainLineZ = markZ;
  state.distanceGained = 0;
  state.formations[0] = rollTeamFormations(0, random, state.teams);
  state.formations[1] = rollTeamFormations(1, random, state.teams);
  state.phase = {
    kind: "scrum",
    stage: "forming",
    position: { x: markX, z: markZ },
    feedingTeam,
    elapsed: 0,
    winningTeam: null,
  };
};

// Simulates scrum engagement, contest, and ball channeling to the base
export const updateScrum = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  if (phase.kind !== "scrum") return;
  phase.elapsed += deltaSeconds;

  // Check if 8-man forward packs are set at the mark
  const forwardsReady = state.players
    .filter((p) => isForward(p))
    .every((p) => {
      const target = getScrumTarget(
        p,
        phase.position,
        phase.feedingTeam,
        state.formations[p.team].scrumAttack,
        state.formations[p.team].scrumDefence,
        getActiveShapePositions(
          state.teams[p.team],
          p.team === phase.feedingTeam ? "scrumAttack" : "scrumDefence",
        ),
      );
      return distance(p.position, target) <= 2.0;
    });

  if (phase.stage === "forming") {
    if (!forwardsReady && phase.elapsed < 14) return;
    phase.stage = "set";
    phase.elapsed = 0;
    return;
  }

  // Packs engage! Scrum push contest determines clean heel or turnover against head
  if (phase.stage === "set") {
    if (phase.elapsed < 1.2) return;
    const feedingPackStrength = state.players
      .filter((p) => p.team === phase.feedingTeam && isForward(p))
      .reduce((sum, p) => sum + contactStrength(p), 0);
    const defendingPackStrength = state.players
      .filter((p) => p.team !== phase.feedingTeam && isForward(p))
      .reduce((sum, p) => sum + contactStrength(p), 0);

    const averageStrength = (feedingPackStrength + defendingPackStrength) / 2;
    const strengthDifference =
      (defendingPackStrength - feedingPackStrength) /
      Math.max(1, averageStrength);
    // Feed remains an advantage, but pack technique and fatigue can overcome mass.
    const turnoverRoll = random();
    const turnoverThreshold = clamp(
      0.12 + strengthDifference * 0.48,
      0.03,
      0.45,
    );
    phase.winningTeam =
      turnoverRoll < turnoverThreshold
        ? otherTeam(phase.feedingTeam)
        : phase.feedingTeam;
    state.teamStats[phase.winningTeam].scrumsWon += 1;
    state.teamStats[otherTeam(phase.winningTeam)].scrumsLost += 1;
    phase.stage = "channeling";
    phase.elapsed = 0;
    return;
  }

  // Ball channels to #8 / #9 at the base, then cleanly releases into open play
  if (phase.stage === "channeling") {
    if (phase.elapsed < 1.0) return;
    const winningTeam = phase.winningTeam ?? phase.feedingTeam;
    const nine = state.players.find(
      (p) => p.team === winningTeam && p.role === ROLES.ScrumHalf,
    );
    const eight = state.players.find(
      (p) => p.team === winningTeam && p.role === ROLES.NumberEight,
    );

    // Unbind pack forwards cleanly
    for (const player of state.players) {
      if (isForward(player)) {
        player.ruckRecoverySeconds = 1.2 * (1.3 - overallSkill(player) * 0.55);
      }
    }

    // 25% chance of #8 pick-and-go from the base, otherwise 9 passes out to first receiver (10)
    if (eight && random() < 0.25) {
      carryBall(state, eight);
    } else if (nine) {
      const ten = state.players.find(
        (p) => p.team === winningTeam && p.role === ROLES.FlyHalf,
      );
      if (ten) {
        nine.stamina = clamp(nine.stamina - 0.2, 0, 100);
        launchBall(state, nine, ten.position, "pass", ten.id, random);
      } else {
        carryBall(state, nine);
      }
    } else if (eight) {
      carryBall(state, eight);
    }
    for (const player of state.players) player.laneX = player.position.x;
    state.phase = { kind: "openPlay" };
  }
};
