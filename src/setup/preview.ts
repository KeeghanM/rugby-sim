import type {
  FormationContext,
  MatchConfig,
  Position,
  Team,
} from "../domain.ts";
import { otherTeam } from "../domain.ts";
import {
  getKickoffTarget,
  getOpenPlayTarget,
  getScrumTarget,
} from "../formations/index.ts";
import { createGame, createMatchInput } from "../simulation/create-game.ts";
import { shapeContexts } from "./types.ts";
import type { TacticalShape } from "../domain.ts";

export const ensureTacticalShapes = (
  teams: MatchConfig,
  teamId: Team,
  context: FormationContext,
): TacticalShape[] => {
  if (!teams[teamId].tacticalShapes) {
    teams[teamId].tacticalShapes = {};
  }
  let shapes = teams[teamId].tacticalShapes![context];
  if (!shapes || shapes.length === 0) {
    const configItem = shapeContexts.find((c) => c.value === context)!;
    const defaultPreset = String(
      teams[teamId].formations[configItem.formation],
    );
    shapes = [
      {
        id: `${context}-1`,
        name: "Play 1 (Primary)",
        weight: 60,
        preset: defaultPreset,
        positions: teams[teamId].customFormations[context]?.map((p) => ({
          ...p,
        })),
      },
      {
        id: `${context}-2`,
        name: "Play 2 (Alternate)",
        weight: 40,
        preset: configItem.presets[1]
          ? String(configItem.presets[1])
          : defaultPreset,
      },
    ];
    teams[teamId].tacticalShapes![context] = shapes;
  }
  return shapes;
};

export const previewPositions = (
  teams: MatchConfig,
  selectedTeam: Team,
  shapeContext: FormationContext,
  selectedShapeIndex: number,
): Position[] => {
  const shapes = ensureTacticalShapes(teams, selectedTeam, shapeContext);
  const idx = selectedShapeIndex >= shapes.length ? 0 : selectedShapeIndex;
  const currentShape = shapes[idx] ?? shapes[0];

  if (currentShape.positions && currentShape.positions.length > 0) {
    return currentShape.positions.map((position) => ({ ...position }));
  }

  const custom = teams[selectedTeam].customFormations[shapeContext];
  if (custom) return custom.map((position) => ({ ...position }));

  const game = createGame(createMatchInput(teams), () => 0.5);
  const ownPlayers = game.players.filter(
    (player) => player.team === selectedTeam,
  );
  const direction = selectedTeam === 0 ? 1 : -1;
  const formation = { ...game.formations[selectedTeam] };
  if (currentShape.preset) {
    const contextItem = shapeContexts.find(
      (item) => item.value === shapeContext,
    );
    if (contextItem) {
      (formation as any)[contextItem.formation] = currentShape.preset;
    }
  }
  const opponentCarrier = game.players.find(
    (player) => player.team === otherTeam(selectedTeam) && player.number === 10,
  )!;
  opponentCarrier.position = { x: 0, z: 0 };
  const ownCarrier = ownPlayers.find((player) => player.number === 10)!;
  ownCarrier.position = { x: 0, z: 0 };

  return ownPlayers.map((player) => {
    let target: Position;
    if (shapeContext === "openAttack") {
      target = getOpenPlayTarget(
        player,
        ownCarrier,
        undefined,
        formation.openAttack,
        formation.openDefence,
      );
    } else if (shapeContext === "openDefence") {
      target = getOpenPlayTarget(
        player,
        opponentCarrier,
        0,
        formation.openAttack,
        formation.openDefence,
      );
    } else if (shapeContext === "kickoffAttack") {
      target = getKickoffTarget(
        player,
        selectedTeam,
        "matchStart",
        formation.kickoffAttack,
        formation.kickoffDefence,
      );
    } else if (shapeContext === "kickoffDefence") {
      target = getKickoffTarget(
        player,
        otherTeam(selectedTeam),
        "matchStart",
        formation.kickoffAttack,
        formation.kickoffDefence,
      );
    } else {
      target = getScrumTarget(
        player,
        { x: 0, z: 0 },
        shapeContext === "scrumAttack" ? selectedTeam : otherTeam(selectedTeam),
        formation.scrumAttack,
        formation.scrumDefence,
      );
    }
    return {
      x: target.x,
      z: target.z * direction,
    };
  });
};
