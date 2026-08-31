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

export const updateKickoff = (
  state: GameState,
  deltaSeconds: number,
  random: Random,
) => {
  const phase = state.phase;
  // Ignore update outside kickoff phase.
  if (phase.kind !== "kickoff") return;
  // Wait until key players reach kickoff formation or forming timeout expires
  if (phase.stage === "forming") {
    phase.readyForSeconds += deltaSeconds;
    const kicker = state.players.find(
      (player) =>
        player.team === phase.kickingTeam && player.role === ROLES.FlyHalf,
    );
    const kickerTarget = kicker
      ? getKickoffTarget(
          kicker,
          phase.kickingTeam,
          phase.reason,
          state.formations[phase.kickingTeam].kickoffAttack,
          state.formations[kicker.team].kickoffDefence,
          getActiveShapePositions(state.teams[kicker.team], "kickoffAttack"),
        )
      : null;
    const kickerReady =
      kicker && kickerTarget && distance(kicker.position, kickerTarget) <= 2.2;

    const inPlaceCount = state.players.filter((player) => {
      const target = getKickoffTarget(
        player,
        phase.kickingTeam,
        phase.reason,
        state.formations[phase.kickingTeam].kickoffAttack,
        state.formations[player.team].kickoffDefence,
        getActiveShapePositions(
          state.teams[player.team],
          player.team === phase.kickingTeam
            ? "kickoffAttack"
            : "kickoffDefence",
        ),
      );
      return distance(player.position, target) <= 2.5;
    }).length;

    const kickingTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    const kickDir = attackDirection(phase.kickingTeam);
    const allKickingBehindTryLine = state.players
      .filter((player) => player.team === phase.kickingTeam)
      .every((player) => (player.position.z - kickingTryLine) * kickDir <= 0.2);

    const kickerHasBall = Boolean(kicker && state.ball.carrierId === kicker.id);
    const isGoalLine = phase.reason === "goalLineDropout";
    const isFormed = isGoalLine
      ? kickerReady &&
        kickerHasBall &&
        allKickingBehindTryLine &&
        (inPlaceCount >= 22 || phase.readyForSeconds >= 8)
      : (kickerReady && kickerHasBall && inPlaceCount >= 22) ||
        (kickerHasBall && phase.readyForSeconds >= 12);

    // Transition to ready once kicker has ball and team is largely formed
    if (isFormed || (kickerHasBall && phase.readyForSeconds >= 20)) {
      phase.stage = "ready";
      phase.readyForSeconds = 0;
    }
    return;
  }
  // Launch kickoff after ready delay and required players exist.
  if (phase.stage === "ready") {
    phase.readyForSeconds += deltaSeconds;
    // Preserve pre-kick pause.
    if (phase.readyForSeconds < 0.75) return;
    const kickingTryLine =
      phase.kickingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    const kickDir = attackDirection(phase.kickingTeam);
    const allKickingBehindTryLine = state.players
      .filter((player) => player.team === phase.kickingTeam)
      .every((player) => (player.position.z - kickingTryLine) * kickDir <= 0.2);
    if (
      phase.reason === "goalLineDropout" &&
      !allKickingBehindTryLine &&
      phase.readyForSeconds < 12
    ) {
      return;
    }
    const kicker = state.players.find(
      (player) =>
        player.team === phase.kickingTeam && player.role === ROLES.FlyHalf,
    );
    // Wait when required kicker unavailable.
    if (!kicker) return;
    const receivingTeam = otherTeam(phase.kickingTeam);
    const receivingDirection = attackDirection(receivingTeam);
    const receivingTryLine =
      receivingTeam === 0 ? PITCH.tryLines.south : PITCH.tryLines.north;
    // Choose territory rather than person: normal kickoff lands in receiving 22.
    const targetPosition =
      phase.reason === "goalLineDropout"
        ? {
            x: (random() - 0.5) * 36,
            z:
              kickingTryLine +
              attackDirection(phase.kickingTeam) * (22 + random() * 10),
          }
        : {
            x: (random() - 0.5) * 44,
            z: receivingTryLine + receivingDirection * (10 + random() * 10),
          };
    kicker.stamina = clamp(kicker.stamina - 0.8, 0, 100);
    launchBall(state, kicker, targetPosition, "kickoff", null, random);
    phase.stage = "inFlight";
    return;
  }
  // Enter open play after kickoff is caught or lands.
  if (state.ball.carrierId || state.ball.flight === null) {
    for (const player of state.players) player.laneX = player.position.x;
    state.phase = { kind: "openPlay" };
  }
};
