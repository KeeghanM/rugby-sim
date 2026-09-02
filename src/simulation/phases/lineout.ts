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
import { carryBall, launchBall, startGoalLineDropout } from "../ball.ts";
import { startMaul } from "./maul.ts";
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

export const updateLineout = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  if (phase.kind !== "lineout") return;
  phase.elapsed += deltaSeconds;

  const hooker = state.players.find(
    (player) =>
      player.team === phase.throwingTeam && player.role === ROLES.Hooker,
  );
  const throwingMembers =
    LINEOUT_MEMBER_VARIANTS[
      state.formations[phase.throwingTeam].lineoutMembers
    ];
  const defendingMembers =
    LINEOUT_MEMBER_VARIANTS[
      state.formations[otherTeam(phase.throwingTeam)].lineoutMembers
    ];

  // Readiness tolerance approximates two straight lines and thrower set at touch mark under Law 18.
  const hookerTarget = hooker
    ? getLineoutTarget(
        hooker,
        phase.position,
        phase.throwingTeam,
        state.formations[phase.throwingTeam].lineoutMembers,
        state.formations[phase.throwingTeam].lineoutNonParticipants,
      )
    : null;
  const hookerReady =
    hooker && hookerTarget && distance(hooker.position, hookerTarget) <= 2.0;

  const lineoutForwardsReady = state.players
    .filter((player) => {
      const members =
        player.team === phase.throwingTeam ? throwingMembers : defendingMembers;
      const slotNum = (player.slotIndex ?? 0) + 1;
      return members.includes(slotNum);
    })
    .every((player) => {
      const formation = state.formations[player.team];
      const target = getLineoutTarget(
        player,
        phase.position,
        phase.throwingTeam,
        formation.lineoutMembers,
        formation.lineoutNonParticipants,
      );
      return distance(player.position, target) <= 2.5;
    });

  if (phase.stage === "forming") {
    // Replacement ball appears with thrower because previous ball remains visible beyond touch.
    if (
      hooker &&
      state.ball.carrierId !== hooker.id &&
      (hookerReady || phase.elapsed >= 1.0)
    ) {
      state.ball = {
        position: { x: phase.position.x, y: 1.25, z: phase.position.z },
        velocity: { x: 0, y: 0, z: 0 },
        carrierId: hooker.id,
        flight: null,
        intendedReceiverId: null,
        lastTouchedTeam: phase.throwingTeam,
        passerId: null,
        kickerId: null,
        kickOrigin: null,
        bouncesRemaining: 0,
      };
    }

    if ((!hookerReady || !lineoutForwardsReady) && phase.elapsed < 14) return;
    phase.stage = "ready";
    phase.elapsed = 0;
    return;
  }
  if (phase.stage === "ready") {
    // Preserve pre-throw pause so formation is clearly visible.
    if (phase.elapsed < 1.0) return;
    const jumper =
      state.players.find(
        (player) =>
          player.team === phase.throwingTeam &&
          throwingMembers.includes((player.slotIndex ?? 0) + 1) &&
          player.role === ROLES.Lock,
      ) ??
      state.players.find(
        (player) =>
          player.team === phase.throwingTeam &&
          throwingMembers.includes((player.slotIndex ?? 0) + 1),
      );
    const defendingJumper =
      state.players.find(
        (player) =>
          player.team !== phase.throwingTeam &&
          defendingMembers.includes((player.slotIndex ?? 0) + 1) &&
          player.role === ROLES.Lock,
      ) ??
      state.players.find(
        (player) =>
          player.team !== phase.throwingTeam &&
          defendingMembers.includes((player.slotIndex ?? 0) + 1),
      );
    if (!hooker || !jumper) return;
    // Throw accuracy and jumper handling oppose defender handling and decision quality with probabilistic winner.
    const attackingScore =
      effectiveSkill(hooker, "passing") * 0.4 +
      effectiveSkill(jumper, "handling") * 0.6 +
      0.18;
    const defendingScore = defendingJumper
      ? effectiveSkill(defendingJumper, "handling") * 0.55 +
        effectiveSkill(defendingJumper, "decision") * 0.45
      : 0;
    const turnoverProb = defendingJumper
      ? clamp(0.18 + (defendingScore - attackingScore) * 0.4, 0.05, 0.45)
      : 0;
    const isDefended = random() < turnoverProb;
    const winner = isDefended && defendingJumper ? defendingJumper : jumper;
    hooker.stamina = clamp(hooker.stamina - 0.25, 0, 100);
    launchBall(state, hooker, winner.position, "lineout", winner.id, random);
    phase.stage = "inFlight";
    return;
  }
  if (state.ball.carrierId || state.ball.flight === null) {
    const carrier = state.players.find(
      (player) => player.id === state.ball.carrierId,
    );
    if (carrier) {
      state.teamStats[carrier.team].lineoutsWon += 1;
      state.teamStats[otherTeam(carrier.team)].lineoutsLost += 1;
    }
    for (const player of state.players) player.laneX = player.position.x;
    if (
      carrier?.team === phase.throwingTeam &&
      random() < state.teams[phase.throwingTeam].tendencies.maul
    ) {
      // Throwing side may bind around clean catch according to configured maul tendency.
      startMaul(state, carrier);
      return;
    }
    state.phase = { kind: "openPlay" };
  }
};
