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

export const resolveTacticalShapes = (
  teams: MatchConfig,
  teamId: Team,
  context: FormationContext,
): TacticalShape[] => {
  const configured = teams[teamId].tacticalShapes?.[context];
  if (configured?.length) {
    return configured.map((shape) => ({
      ...shape,
      positions: shape.positions?.map((position) => ({ ...position })),
    }));
  }

  const configItem = shapeContexts.find((item) => item.value === context)!;
  const defaultPreset = String(teams[teamId].formations[configItem.formation]);
  return [
    {
      id: `${context}-1`,
      name: "Shape 1 (Primary)",
      weight: 60,
      preset: defaultPreset,
      positions: teams[teamId].customFormations[context]?.map((position) => ({
        ...position,
      })),
    },
    {
      id: `${context}-2`,
      name: "Shape 2 (Alternate)",
      weight: 40,
      preset: String(configItem.presets[1] ?? defaultPreset),
    },
  ];
};

export const previewPositions = (
  teams: MatchConfig,
  selectedTeam: Team,
  shapeContext: FormationContext,
  selectedShapeIndex: number,
): Position[] => {
  const shapes = resolveTacticalShapes(teams, selectedTeam, shapeContext);
  const idx = selectedShapeIndex >= shapes.length ? 0 : selectedShapeIndex;
  const currentShape = shapes[idx] ?? shapes[0];

  if (currentShape.positions && currentShape.positions.length > 0) {
    return currentShape.positions.map((position) => ({ ...position }));
  }

  const game = createGame(createMatchInput(teams), () => 0.5);
  const ownPlayers = game.players.filter(
    (player) => player.team === selectedTeam,
  );
  const direction = selectedTeam === 0 ? 1 : -1;
  const formation = { ...game.formations[selectedTeam] };
  if (currentShape.preset) {
    if (shapeContext === "openAttack") {
      formation.openAttack = currentShape.preset as typeof formation.openAttack;
    } else if (shapeContext === "openDefence") {
      formation.openDefence =
        currentShape.preset as typeof formation.openDefence;
    } else if (shapeContext === "kickoffAttack") {
      formation.kickoffAttack =
        currentShape.preset as typeof formation.kickoffAttack;
    } else if (shapeContext === "kickoffDefence") {
      formation.kickoffDefence =
        currentShape.preset as typeof formation.kickoffDefence;
    } else if (shapeContext === "scrumAttack") {
      formation.scrumAttack =
        currentShape.preset as typeof formation.scrumAttack;
    } else {
      formation.scrumDefence =
        currentShape.preset as typeof formation.scrumDefence;
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
