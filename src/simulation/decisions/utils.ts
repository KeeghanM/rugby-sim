import {
  attackDirection,
  otherTeam,
  ROLES,
  type GameState,
  type Player,
  type Position,
} from "../../domain.ts";
import { isForward } from "../../formations/index.ts";
import { clamp, distance, effectiveSkill } from "../math.ts";
import type { Effort, PlayerCommand, Random } from "../types.ts";
import { PITCH } from "../../domain.ts";

export const command = (
  player: Player,
  target: Position,
  intentKind: string,
  immediate = false,
  effort: Effort = "run",
): PlayerCommand => ({
  playerId: player.id,
  target,
  intentKind,
  immediate,
  effort,
});

export const nearestOpponentDistance = (players: Player[], player: Player) =>
  players.reduce(
    (nearest, other) =>
      other.team === player.team
        ? nearest
        : Math.min(nearest, distance(player.position, other.position)),
    Infinity,
  );

export const hasBrokenLine = (
  state: GameState,
  players: Player[],
  carrier: Player,
) => {
  if (state.phase.kind !== "openPlay") return false;
  const direction = attackDirection(carrier.team);
  const defendingTeam = otherTeam(carrier.team);
  const defLineZ = state.defensiveLineZ[defendingTeam];
  const pastLineDistance = (carrier.position.z - defLineZ) * direction;
  // Half-metre tolerance avoids declaring a break from small line-positioning jitter.
  if (pastLineDistance > 0.5) return true;
  const frontlineAhead = players.filter(
    (p) =>
      p.team === defendingTeam &&
      p.role !== ROLES.FullBack &&
      (p.position.z - carrier.position.z) * direction > 0,
  );
  if (frontlineAhead.length <= 1) return true;
  const frontlineBeaten = players.filter(
    (p) =>
      p.team === defendingTeam &&
      p.role !== ROLES.FullBack &&
      (carrier.position.z - p.position.z) * direction > 0,
  );
  return frontlineBeaten.length >= 2;
};

export const selectSupportRunners = (
  players: Player[],
  carrier: Player,
  lineBroken: boolean,
) => {
  const direction = attackDirection(carrier.team);
  const central = Math.abs(carrier.position.x) < 15;
  return players
    .filter(
      (player) =>
        player.team === carrier.team &&
        player.id !== carrier.id &&
        player.ruckRecoverySeconds === 0 &&
        (lineBroken || player.role !== ROLES.FullBack),
    )
    .map((player) => {
      const preferred = central
        ? isForward(player) ||
          player.role === ROLES.FlyHalf ||
          player.role === ROLES.InsideCentre
        : player.role === ROLES.Wing ||
          player.role === ROLES.InsideCentre ||
          player.role === ROLES.OutsideCentre ||
          player.role === ROLES.FlyHalf ||
          player.role === ROLES.OpenSideFlanker ||
          player.role === ROLES.NumberEight;
      return {
        player,
        // Lower score favours fast support after breaks and nearby, onside role fits otherwise.
        priority:
          (lineBroken ? -player.speed * 4 : preferred ? 0 : 20) +
          Math.max(0, (player.position.z - carrier.position.z) * direction) *
            1.5 +
          distance(player.position, carrier.position),
      };
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(({ player }) => player.id);
};

export const choosePassTarget = (
  players: Player[],
  carrier: Player,
  preferredRoles?: ReadonlySet<Player["role"]>,
  flowDirection?: -1 | 1,
) =>
  players
    .filter(
      (player) =>
        player.team === carrier.team &&
        player.id !== carrier.id &&
        player.ruckRecoverySeconds === 0 &&
        (!preferredRoles || preferredRoles.has(player.role)) &&
        (!flowDirection ||
          (player.position.x - carrier.position.x) * flowDirection >= 2) &&
        (player.position.z - carrier.position.z) *
          attackDirection(carrier.team) <=
          0.5 &&
        (player.position.z - carrier.position.z) *
          attackDirection(carrier.team) >=
          (preferredRoles ? -12 : -5) &&
        Math.abs(player.position.x - carrier.position.x) >= 2 &&
        distance(player.position, carrier.position) <=
          (preferredRoles ? 20 : 15),
    )
    .map((player) => ({
      player,
      space: nearestOpponentDistance(players, player),
      gap: distance(player.position, carrier.position),
      lateralGap: Math.abs(player.position.x - carrier.position.x),
      depth: Math.abs(
        (player.position.z - carrier.position.z) *
          attackDirection(carrier.team),
      ),
    }))
    .sort(
      // Safe shallow passes lead; width, defensive space, and range break ties.
      (a, b) =>
        a.depth - b.depth ||
        a.lateralGap - b.lateralGap ||
        b.space - a.space ||
        a.gap - b.gap,
    )[0]?.player;

export const clearanceTarget = (player: Player, random: Random): Position => {
  const direction = attackDirection(player.team);
  const isBackThreeOrTen =
    player.role === ROLES.FullBack ||
    player.role === ROLES.FlyHalf ||
    player.role === ROLES.Wing;
  const kickSkill = effectiveSkill(player, "kicking");
  const targetTryLine =
    direction === 1 ? PITCH.tryLines.north : PITCH.tryLines.south;
  const maxSafeDistance = Math.max(
    14,
    Math.abs(targetTryLine - player.position.z) - 8,
  );
  const desiredDistance = isBackThreeOrTen
    ? Math.min(maxSafeDistance, 36 + kickSkill * 18 + (random() - 0.5) * 8)
    : Math.min(maxSafeDistance, 24 + kickSkill * 10 + (random() - 0.5) * 6);
  const isMiskickOvercooked = random() < (1 - kickSkill) * 0.04;
  // Rare low-skill overkick creates dead-ball risk instead of making every clearance conservative.
  const finalDistance = isMiskickOvercooked
    ? desiredDistance + 24
    : desiredDistance;
  const side =
    Math.abs(player.position.x) > 6
      ? Math.sign(player.position.x)
      : random() < 0.5
        ? -1
        : 1;
  return {
    x: side * (PITCH.touchLines.right + 6),
    z: clamp(
      player.position.z + direction * finalDistance,
      PITCH.tryLines.south - 5,
      PITCH.tryLines.north + 5,
    ),
  };
};
