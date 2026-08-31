import type {
  ActiveTeamFormations,
  FormationContext,
  MatchConfig,
  Position,
  Team,
  TeamDefinition,
} from "../domain.ts";
import type {
  OpenAttackFormation,
  OpenDefenceFormation,
} from "../formations/index.ts";
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

export const getActiveShapePositions = (
  teamDef: TeamDefinition,
  context: FormationContext,
  random: Random = Math.random,
): readonly Position[] | undefined => {
  const shapes = teamDef.tacticalShapes?.[context];
  if (shapes && shapes.length > 0) {
    const totalWeight = shapes.reduce(
      (sum, s) => sum + Math.max(0, s.weight),
      0,
    );
    if (totalWeight > 0) {
      let r = random() * totalWeight;
      for (const s of shapes) {
        const w = Math.max(0, s.weight);
        if (r <= w) {
          return s.positions ?? undefined;
        }
        r -= w;
      }
    }
    const last = shapes[shapes.length - 1];
    return last?.positions ?? undefined;
  }
  return teamDef.customFormations[context];
};

export const rollTeamFormations = (
  team: Team,
  random: Random = Math.random,
  teams: MatchConfig = TEAMS,
): ActiveTeamFormations => {
  const definition = teams[team];
  const def = definition.formations;
  const variation = definition.formationVariation;

  let rolledOpenAttack = pickVariant(
    def.openAttack,
    OPEN_ATTACK_VARIANTS,
    variation,
    random,
  );
  const openAttackShapes = definition.tacticalShapes?.openAttack;
  if (openAttackShapes && openAttackShapes.length > 0) {
    const totalWeight = openAttackShapes.reduce(
      (sum, s) => sum + Math.max(0, s.weight),
      0,
    );
    if (totalWeight > 0) {
      let r = random() * totalWeight;
      for (const s of openAttackShapes) {
        const w = Math.max(0, s.weight);
        if (r <= w) {
          if (
            s.preset &&
            OPEN_ATTACK_VARIANTS.includes(s.preset as OpenAttackFormation)
          ) {
            rolledOpenAttack = s.preset as OpenAttackFormation;
          }
          break;
        }
        r -= w;
      }
    }
  }

  let rolledOpenDefence = pickVariant(
    def.openDefence,
    OPEN_DEFENCE_VARIANTS_LIST,
    variation,
    random,
  );
  const openDefenceShapes = definition.tacticalShapes?.openDefence;
  if (openDefenceShapes && openDefenceShapes.length > 0) {
    const totalWeight = openDefenceShapes.reduce(
      (sum, s) => sum + Math.max(0, s.weight),
      0,
    );
    if (totalWeight > 0) {
      let r = random() * totalWeight;
      for (const s of openDefenceShapes) {
        const w = Math.max(0, s.weight);
        if (r <= w) {
          if (
            s.preset &&
            OPEN_DEFENCE_VARIANTS_LIST.includes(
              s.preset as OpenDefenceFormation,
            )
          ) {
            rolledOpenDefence = s.preset as OpenDefenceFormation;
          }
          break;
        }
        r -= w;
      }
    }
  }

  return {
    kickoffAttack: pickVariant(
      def.kickoffAttack,
      KICKOFF_ATTACK_VARIANTS,
      variation,
      random,
    ),
    kickoffDefence: pickVariant(
      def.kickoffDefence,
      KICKOFF_DEFENCE_VARIANTS,
      variation,
      random,
    ),
    openAttack: rolledOpenAttack,
    openDefence: rolledOpenDefence,
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
    scrumAttack: pickVariant(
      def.scrumAttack,
      SCRUM_ATTACK_VARIANTS,
      variation,
      random,
    ),
    scrumDefence: pickVariant(
      def.scrumDefence,
      SCRUM_DEFENCE_VARIANTS,
      variation,
      random,
    ),
  };
};
