import {
  attackDirection,
  otherTeam,
  ROLES,
  type GameState,
  type Player,
} from "../../domain.ts";
import { getOpenPlayTarget } from "../../formations/index.ts";
import { clamp, distance, effectiveSkill } from "../math.ts";
import type { Random } from "../types.ts";
import { chooseCarrierCommand } from "./carrier.ts";
import { command, hasBrokenLine, selectSupportRunners } from "./utils.ts";

export const getOpenPlayCommands = (
  state: GameState,
  players: Player[],
  carrier: Player | undefined,
  random: Random,
) => {
  if (!carrier) {
    const target = { x: state.ball.position.x, z: state.ball.position.z };
    const chasers = new Set(
      ([0, 1] as const).map(
        (team) =>
          players
            .filter((player) => player.team === team)
            .sort(
              (a, b) =>
                distance(a.position, target) - distance(b.position, target),
            )[0].id,
      ),
    );
    return players.map((player) =>
      command(
        player,
        chasers.has(player.id) ? target : player.intentTarget,
        "loose-ball",
        false,
        chasers.has(player.id) ? "sprint" : "jog",
      ),
    );
  }

  const lineBroken = hasBrokenLine(state, players, carrier);
  const defendingTeam = otherTeam(carrier.team);
  const ballDirection = attackDirection(carrier.team);

  const defendersAhead = players.filter(
    (player) =>
      player.team === defendingTeam &&
      (player.position.z - carrier.position.z) * ballDirection > 0,
  );

  const fullback = players.find(
    (player) => player.team === defendingTeam && player.role === ROLES.FullBack,
  );
  const lineTackler = players
    .filter(
      (player) =>
        player.team === defendingTeam && player.role !== ROLES.FullBack,
    )
    .sort(
      (a, b) =>
        distance(a.position, carrier.position) -
        distance(b.position, carrier.position),
    )[0];
  const tacklerId = lineBroken
    ? (fullback?.id ?? lineTackler?.id)
    : lineTackler?.id;
  const supportRunnerIds = selectSupportRunners(players, carrier, lineBroken);

  return players.map((player) => {
    if (player.id === carrier.id)
      return chooseCarrierCommand(state, players, carrier, random);
    const attacking = player.team === carrier.team;
    const target = getOpenPlayTarget(
      player,
      carrier,
      attacking ? undefined : state.defensiveLineZ[player.team],
      state.formations[player.team].openAttack,
      state.formations[player.team].openDefence,
      state.activeShapePositions[player.team][
        attacking ? "openAttack" : "openDefence"
      ],
    );
    const direction = attackDirection(player.team);
    if (player.ruckRecoverySeconds > 0) {
      return command(player, player.position, "ruck-recovery", true, "stand");
    }
    const supportIndex = supportRunnerIds.indexOf(player.id);
    if (supportIndex >= 0) {
      const side =
        player.position.x < carrier.position.x
          ? -1
          : player.position.x > carrier.position.x
            ? 1
            : supportIndex === 0
              ? -1
              : 1;
      return command(
        player,
        {
          x: clamp(carrier.position.x + side * (3 + supportIndex * 2), -32, 32),
          z: carrier.position.z - direction * (2.5 + supportIndex * 1.5),
        },
        lineBroken ? "line-break-support" : "support",
        false,
        lineBroken || distance(player.position, carrier.position) > 8
          ? "sprint"
          : "run",
      );
    }
    const aheadDistance = (player.position.z - carrier.position.z) * direction;
    const isAheadOfBall =
      attacking && player.hardLineForSeconds === 0 && aheadDistance >= 0;
    if (isAheadOfBall) {
      const lateralDist = Math.abs(player.position.x - carrier.position.x);
      const isCarrierRunningForward = carrier.velocity.z * direction > 0.8;
      if (aheadDistance <= 3.5 && isCarrierRunningForward) {
        return command(
          player,
          { x: player.laneX, z: player.position.z },
          "await-carrier",
          false,
          "stand",
        );
      }
      const clearX =
        lateralDist < 8
          ? clamp(
              player.position.x +
                (player.position.x >= carrier.position.x ? 6 : -6),
              -32,
              32,
            )
          : player.laneX;
      const targetZ = carrier.position.z - direction * 2.0;
      const effort =
        lateralDist > 16
          ? aheadDistance > 18
            ? "run"
            : "jog"
          : aheadDistance > 14
            ? "sprint"
            : aheadDistance > 6
              ? "run"
              : "jog";
      return command(
        player,
        { x: clearX, z: targetZ },
        "offside-recovery",
        false,
        effort,
      );
    }

    if (!attacking) {
      const distToCarrier = distance(player.position, carrier.position);
      const isFullback = player.role === ROLES.FullBack;
      const isAheadOfCarrier =
        (player.position.z - carrier.position.z) * ballDirection > 0;
      const isLastDefenderAhead =
        isAheadOfCarrier && (defendersAhead.length <= 1 || isFullback);

      if (lineBroken) {
        if (isAheadOfCarrier || isFullback || distToCarrier <= 35) {
          return command(
            player,
            {
              x: carrier.position.x + carrier.velocity.x * 0.45,
              z: carrier.position.z + carrier.velocity.z * 0.45,
            },
            "last-defender-tackle",
            true,
            "sprint",
          );
        }
        return command(
          player,
          {
            x: carrier.position.x,
            z: carrier.position.z + carrier.velocity.z * 0.25,
          },
          "cover-defence",
          false,
          "sprint",
        );
      }

      if (isFullback && (isLastDefenderAhead || distToCarrier <= 18)) {
        return command(
          player,
          {
            x: carrier.position.x + carrier.velocity.x * 0.45,
            z: carrier.position.z + carrier.velocity.z * 0.45,
          },
          "last-defender-tackle",
          true,
          "sprint",
        );
      }

      const inTackleZone = player.id === tacklerId || distToCarrier <= 7;
      if (inTackleZone && distToCarrier < 14) {
        return command(
          player,
          {
            x: carrier.position.x + carrier.velocity.x * 0.45,
            z: carrier.position.z + carrier.velocity.z * 0.45,
          },
          "tackle",
          true,
          "sprint",
        );
      }
    }
    const canRunHardLine =
      attacking &&
      player.hardLineForSeconds === 0 &&
      (player.role === ROLES.InsideCentre ||
        player.role === ROLES.OutsideCentre ||
        player.role === ROLES.Wing) &&
      distance(player.position, carrier.position) >= 5 &&
      distance(player.position, carrier.position) <= 10 &&
      player.intentForSeconds === 0 &&
      random() < 0.02 + effectiveSkill(player, "decision") * 0.06;
    if (canRunHardLine || player.hardLineForSeconds > 0) {
      const hardLine = command(
        player,
        { x: carrier.position.x, z: carrier.position.z + direction * 4 },
        "hard-line",
        false,
        "sprint",
      );
      hardLine.startHardLine = canRunHardLine;
      return hardLine;
    }
    const formationGap = distance(player.position, target);
    return command(
      player,
      target,
      attacking ? `attack-${player.pod}` : "defence-line",
      false,
      attacking
        ? formationGap > 12
          ? "sprint"
          : formationGap > 2
            ? "run"
            : "jog"
        : "run",
    );
  });
};
