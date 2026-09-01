import {
  attackDirection,
  PITCH,
  ROLES,
  type GameState,
  type Player,
  type Position,
} from "../../domain.ts";
import { isForward } from "../../formations/index.ts";
import { clamp, distance, GRAVITY } from "../math.ts";
import { command } from "./utils.ts";

const predictedLanding = (state: GameState): Position => {
  const ball = state.ball;
  const time = Math.max(
    0,
    (ball.velocity.y +
      Math.sqrt(ball.velocity.y ** 2 + 2 * GRAVITY * ball.position.y)) /
      GRAVITY,
  );
  // Positive quadratic root gives time until ballistic path next reaches ground level.
  return {
    x: ball.position.x + ball.velocity.x * time,
    z: ball.position.z + ball.velocity.z * time,
  };
};

export const computeFlightCommands = (state: GameState, players: Player[]) => {
  const landing = predictedLanding(state);
  const kickingTeam = state.ball.lastTouchedTeam;
  const isKickoff = state.ball.flight === "kickoff";
  const contestableKick =
    state.ball.flight === "kick" ||
    state.ball.flight === "kickoff" ||
    state.ball.flight === "rolling";

  const eligibleChasers = new Set(
    players
      .filter((player) => {
        if (
          !contestableKick ||
          player.team !== kickingTeam ||
          player.kickOffside
        )
          return false;
        if (isKickoff) {
          return (
            player.role !== ROLES.FullBack && player.role !== ROLES.InsideCentre
          );
        }
        return true;
      })
      .sort(
        (a, b) => distance(a.position, landing) - distance(b.position, landing),
      )
      .slice(0, isKickoff ? 13 : 4)
      .map((player) => player.id),
  );
  // Kickoffs mobilise broad chase line; open-play kicks limit chase to nearest four onside players.

  const receivingCatchers = new Set(
    players
      .filter((player) => contestableKick && player.team !== kickingTeam)
      .map((player) => {
        const dist = distance(player.position, landing);
        const priorityRole =
          isForward(player) ||
          player.role === ROLES.InsideCentre ||
          player.role === ROLES.OutsideCentre;
        const roleScore = isKickoff && !priorityRole ? 8 : 0;
        // Eight-metre penalty steers restart catches toward forwards and centres without hard role exclusion.
        return { player, score: dist + roleScore };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(({ player }) => player.id),
  );

  return players.map((player) => {
    if (player.kickOffside && state.ball.kickOrigin) {
      return command(
        player,
        {
          x: player.position.x,
          z: state.ball.kickOrigin.z - attackDirection(player.team) * 2,
        },
        "kick-offside",
        true,
        "run",
      );
    }
    if (player.id === state.ball.intendedReceiverId) {
      return command(player, landing, "flight-receive", false, "sprint");
    }
    if (eligibleChasers.has(player.id)) {
      const chaseTarget = isKickoff
        ? { x: player.laneX, z: landing.z }
        : landing;
      return command(player, chaseTarget, "kick-chase", false, "sprint");
    }
    if (receivingCatchers.has(player.id)) {
      return command(player, landing, "kick-receive", false, "sprint");
    }
    if (player.team !== kickingTeam && player.role === ROLES.FullBack) {
      const receiveDir = attackDirection(player.team);
      const sweepTarget = {
        x: clamp(landing.x * 0.6, -25, 25),
        z: clamp(
          landing.z - receiveDir * 8,
          PITCH.tryLines.south,
          PITCH.tryLines.north,
        ),
      };
      // Fullback stays goal-side of predicted landing to cover missed catch or bounce.
      return command(player, sweepTarget, "kick-sweep", false, "run");
    }
    if (player.team !== kickingTeam && player.role === ROLES.Wing) {
      return command(
        player,
        {
          x: clamp(landing.x + (player.number % 2 ? -10 : 10), -32, 32),
          z: landing.z,
        },
        "kick-cover",
        false,
        "run",
      );
    }
    return command(player, player.intentTarget, "kick-hold", false, "jog");
  });
};
