import type {
  ActiveTeamFormations,
  ActiveShapePositions,
  FormationContext,
  GameState,
  MatchConfig,
  TacticalShape,
  Team,
  TeamDefinition,
} from "../domain.ts";
import {
  KICKOFF_ATTACK_VARIANTS,
  KICKOFF_DEFENCE_VARIANTS,
  LINEOUT_MEMBERS_LIST,
  LINEOUT_NON_PARTICIPANTS_LIST,
  OPEN_ATTACK_VARIANTS,
  OPEN_DEFENCE_VARIANTS_LIST,
  SCRUM_ATTACK_VARIANTS,
  SCRUM_DEFENCE_VARIANTS,
} from "./constants.ts";
import { TEAMS } from "./presets/index.ts";

type Random = () => number;

const pickVariant = <T>(
  defaultVal: T,
  all: readonly T[],
  variation: number,
  random: Random,
): T => {
  if (random() >= variation) return defaultVal;
  return all[Math.floor(random() * all.length)];
};

const pickWeightedShape = (
  shapes: readonly TacticalShape[] | undefined,
  random: Random,
) => {
  const weighted = shapes?.filter((shape) => shape.weight > 0) ?? [];
  const totalWeight = weighted.reduce((sum, shape) => sum + shape.weight, 0);
  if (totalWeight === 0) return undefined;

  let roll = random() * totalWeight;
  for (const shape of weighted) {
    if (roll < shape.weight) return shape;
    roll -= shape.weight;
  }
  return weighted[weighted.length - 1];
};

const rollContext = <Context extends FormationContext>(
  context: Context,
  definition: TeamDefinition,
  variants: readonly ActiveTeamFormations[Context][],
  random: Random,
) => {
  const shape = pickWeightedShape(definition.tacticalShapes?.[context], random);
  const configured = definition.formations[context];
  const formation =
    shape?.preset &&
    variants.includes(shape.preset as ActiveTeamFormations[Context])
      ? (shape.preset as ActiveTeamFormations[Context])
      : pickVariant(
          configured,
          variants,
          definition.formationVariation,
          random,
        );
  return {
    formation,
    positions: shape ? shape.positions : definition.customFormations[context],
  };
};

export const rollTeamTactics = (
  team: Team,
  random: Random = Math.random,
  teams: MatchConfig = TEAMS,
): {
  formations: ActiveTeamFormations;
  shapePositions: ActiveShapePositions;
} => {
  const definition = teams[team];
  const def = definition.formations;
  const variation = definition.formationVariation;
  const kickoffAttack = rollContext(
    "kickoffAttack",
    definition,
    KICKOFF_ATTACK_VARIANTS,
    random,
  );
  const kickoffDefence = rollContext(
    "kickoffDefence",
    definition,
    KICKOFF_DEFENCE_VARIANTS,
    random,
  );
  const openAttack = rollContext(
    "openAttack",
    definition,
    OPEN_ATTACK_VARIANTS,
    random,
  );
  const openDefence = rollContext(
    "openDefence",
    definition,
    OPEN_DEFENCE_VARIANTS_LIST,
    random,
  );
  const scrumAttack = rollContext(
    "scrumAttack",
    definition,
    SCRUM_ATTACK_VARIANTS,
    random,
  );
  const scrumDefence = rollContext(
    "scrumDefence",
    definition,
    SCRUM_DEFENCE_VARIANTS,
    random,
  );

  return {
    formations: {
      kickoffAttack: kickoffAttack.formation,
      kickoffDefence: kickoffDefence.formation,
      openAttack: openAttack.formation,
      openDefence: openDefence.formation,
      lineoutMembers: pickVariant(
        def.lineoutMembers,
        LINEOUT_MEMBERS_LIST,
        variation,
        random,
      ),
      lineoutNonParticipants: pickVariant(
        def.lineoutNonParticipants,
        LINEOUT_NON_PARTICIPANTS_LIST,
        variation,
        random,
      ),
      scrumAttack: scrumAttack.formation,
      scrumDefence: scrumDefence.formation,
    },
    shapePositions: {
      kickoffAttack: kickoffAttack.positions,
      kickoffDefence: kickoffDefence.positions,
      openAttack: openAttack.positions,
      openDefence: openDefence.positions,
      scrumAttack: scrumAttack.positions,
      scrumDefence: scrumDefence.positions,
    },
  };
};

export const rerollTeamTactics = (
  state: Pick<GameState, "teams" | "formations" | "activeShapePositions">,
  random: Random,
) => {
  for (const team of [0, 1] as const) {
    const rolled = rollTeamTactics(team, random, state.teams);
    state.formations[team] = rolled.formations;
    state.activeShapePositions[team] = rolled.shapePositions;
  }
};
