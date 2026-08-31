import {
  ROLES,
  type Role,
  type Team,
  type MatchConfig,
  type TeamDefinition,
} from "../domain.ts";

export const getRolePhysicals = (role: Role) => {
  if (role === ROLES.LooseHead || role === ROLES.TightHead) {
    return { weight: 118, speed: 4.2 };
  }
  if (role === ROLES.Hooker) return { weight: 108, speed: 4.5 };
  if (role === ROLES.Lock) return { weight: 115, speed: 4.4 };
  if (role === ROLES.BlindSideFlanker || role === ROLES.OpenSideFlanker) {
    return { weight: 102, speed: 5.1 };
  }
  if (role === ROLES.NumberEight) return { weight: 110, speed: 5 };
  if (role === ROLES.ScrumHalf) return { weight: 78, speed: 5.8 };
  if (role === ROLES.FlyHalf) return { weight: 85, speed: 5.4 };
  if (role === ROLES.InsideCentre || role === ROLES.OutsideCentre) {
    return { weight: 98, speed: 5.3 };
  }
  if (role === ROLES.Wing) return { weight: 88, speed: 6.2 };
  return { weight: 90, speed: 5.9 };
};

export const getPlayerProfile = (
  team: Team,
  number: number,
  role: Role,
  teams: MatchConfig,
) => {
  const definition = teams[team] as TeamDefinition;
  const override = definition.playerOverrides[number];
  const physicals = getRolePhysicals(role);
  return {
    speed:
      physicals.speed *
      definition.speedMultiplier *
      (override?.speedMultiplier ?? 1),
    weight:
      physicals.weight *
      definition.weightMultiplier *
      (override?.weightMultiplier ?? 1),
    skills: { ...definition.defaultSkills, ...override?.skills },
  };
};
