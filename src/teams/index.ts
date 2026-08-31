import type {
  ActiveTeamFormations,
  FormationContext,
  MatchConfig,
  PlayerSkills,
  Position,
  TacticalShape,
  Team,
  TeamDefinition,
} from "../domain.ts";
import { TEAMS, INTERNATIONAL_PRESETS } from "./presets/index.ts";

export { TEAMS, INTERNATIONAL_PRESETS } from "./presets/index.ts";
export { BENCH_SLOTS } from "./constants.ts";
export {
  OPEN_ATTACK_VARIANTS,
  OPEN_DEFENCE_VARIANTS_LIST,
  KICKOFF_ATTACK_VARIANTS,
  KICKOFF_DEFENCE_VARIANTS,
  LINEOUT_MEMBERS_LIST,
  LINEOUT_NON_PARTICIPANTS_LIST,
  SCRUM_ATTACK_VARIANTS,
  SCRUM_DEFENCE_VARIANTS,
} from "./constants.ts";
export {
  getRolePhysicals,
  getPlayerProfile,
  getPlayerDeltas,
  getRoleNaturalDeltas,
} from "./profiles.ts";
export { getActiveShapePositions, rollTeamFormations } from "./formations.ts";

const bounded = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const cloneTeam = (team: TeamDefinition): TeamDefinition => ({
  ...team,
  tendencies: { ...team.tendencies },
  formations: { ...team.formations },
  customFormations: Object.fromEntries(
    Object.entries(team.customFormations).map(([context, positions]) => [
      context,
      positions?.map((position) => ({ ...position })),
    ]),
  ),
  tacticalShapes: Object.fromEntries(
    Object.entries(team.tacticalShapes ?? {}).map(([context, shapes]) => [
      context,
      shapes?.map((shape) => ({
        ...shape,
        positions: shape.positions?.map((position) => ({ ...position })),
      })),
    ]),
  ),
  defaultSkills: { ...team.defaultSkills },
  playerOverrides: Object.fromEntries(
    Object.entries(team.playerOverrides).flatMap(([number, override]) =>
      override
        ? [
            [
              number,
              {
                ...override,
                skills: override.skills ? { ...override.skills } : undefined,
              },
            ],
          ]
        : [],
    ),
  ),
});

export const loadPreset = (
  teams: MatchConfig,
  team: Team,
  presetKey: string,
) => {
  const preset = INTERNATIONAL_PRESETS[presetKey];
  if (!preset) return teams;
  teams[team] = cloneTeam(preset);
  return teams;
};

export const createMatchConfig = (
  source: MatchConfig = TEAMS,
): MatchConfig => ({
  0: cloneTeam(source[0]),
  1: cloneTeam(source[1]),
});

export type TeamStatsInput = Partial<
  Pick<
    TeamDefinition,
    "name" | "color" | "lineSpeed" | "speedMultiplier" | "weightMultiplier"
  >
> & {
  skills?: Partial<PlayerSkills>;
  playerOverrides?: TeamDefinition["playerOverrides"] | null;
};

export type TeamTacticsInput = {
  carry?: number;
  pass?: number;
  kick?: number;
  maul?: number;
  formationVariation?: number;
  formations?: Partial<ActiveTeamFormations>;
  customFormations?: Partial<Record<FormationContext, Position[] | null>>;
  tacticalShapes?: Partial<Record<FormationContext, TacticalShape[]>>;
};

export const setStats = (
  teams: MatchConfig,
  team: Team,
  stats: TeamStatsInput,
) => {
  const target = teams[team];
  if (stats.name !== undefined) target.name = stats.name.trim() || target.name;
  if (stats.color !== undefined && /^#[0-9a-f]{6}$/i.test(stats.color)) {
    target.color = stats.color;
  }
  if (stats.lineSpeed !== undefined)
    target.lineSpeed = bounded(stats.lineSpeed, 1, 8);
  if (stats.speedMultiplier !== undefined) {
    target.speedMultiplier = bounded(stats.speedMultiplier, 0.7, 1.3);
  }
  if (stats.weightMultiplier !== undefined) {
    target.weightMultiplier = bounded(stats.weightMultiplier, 0.7, 1.3);
  }
  if (stats.skills) {
    for (const skill of Object.keys(stats.skills) as (keyof PlayerSkills)[]) {
      const value = stats.skills[skill];
      if (value !== undefined)
        target.defaultSkills[skill] = bounded(value, 0, 1);
    }
  }
  if (stats.playerOverrides === null) {
    target.playerOverrides = {};
  } else if (stats.playerOverrides) {
    for (const [number, override] of Object.entries(stats.playerOverrides)) {
      if (!override) continue;
      const current = target.playerOverrides[Number(number)] ?? {};
      target.playerOverrides[Number(number)] = {
        ...current,
        ...override,
        skills: { ...current.skills, ...override.skills },
      };
    }
  }
  return teams;
};

export const setTactics = (
  teams: MatchConfig,
  team: Team,
  tactics: TeamTacticsInput,
) => {
  const target = teams[team];
  if (tactics.formations) {
    Object.assign(target.formations, tactics.formations);
  }
  if (tactics.customFormations) {
    for (const [context, positions] of Object.entries(
      tactics.customFormations,
    ) as [FormationContext, Position[] | null][]) {
      if (positions) {
        target.customFormations[context] = positions.map((position) => ({
          ...position,
        }));
      } else {
        delete target.customFormations[context];
      }
    }
  }
  if (tactics.tacticalShapes) {
    if (!target.tacticalShapes) target.tacticalShapes = {};
    for (const [context, shapes] of Object.entries(tactics.tacticalShapes) as [
      FormationContext,
      TacticalShape[],
    ][]) {
      target.tacticalShapes[context] = shapes.map((shape) => ({
        ...shape,
        positions: shape.positions?.map((p) => ({ ...p })),
      }));
    }
  }
  if (tactics.formationVariation !== undefined) {
    target.formationVariation = bounded(tactics.formationVariation, 0, 1);
  }
  if (tactics.maul !== undefined)
    target.tendencies.maul = bounded(tactics.maul, 0, 1);
  if (tactics.carry !== undefined)
    target.tendencies.carry = Math.max(0, tactics.carry);
  if (tactics.pass !== undefined)
    target.tendencies.pass = Math.max(0, tactics.pass);
  if (tactics.kick !== undefined)
    target.tendencies.kick = Math.max(0, tactics.kick);
  const total =
    target.tendencies.carry + target.tendencies.pass + target.tendencies.kick;
  if (total > 0) {
    target.tendencies.carry /= total;
    target.tendencies.pass /= total;
    target.tendencies.kick /= total;
  }
  return teams;
};
