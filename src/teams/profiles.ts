import {
  ROLES,
  type Role,
  type Team,
  type MatchConfig,
  type TeamDefinition,
  type PlayerSkills,
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
  if (role === ROLES.NumberEight) return { weight: 110, speed: 5.0 };
  if (role === ROLES.ScrumHalf) return { weight: 78, speed: 5.8 };
  if (role === ROLES.FlyHalf) return { weight: 85, speed: 5.4 };
  if (role === ROLES.InsideCentre || role === ROLES.OutsideCentre) {
    return { weight: 98, speed: 5.3 };
  }
  if (role === ROLES.Wing) return { weight: 88, speed: 6.2 };
  return { weight: 90, speed: 5.9 };
};

export const getRoleNaturalDeltas = (role: Role) => {
  if (role === ROLES.LooseHead || role === ROLES.TightHead) {
    return {
      speed: -28,
      weight: 32,
      skills: {
        decision: -5,
        handling: -5,
        passing: -15,
        kicking: -40,
        tackling: 15,
      },
    };
  }
  if (role === ROLES.Hooker) {
    return {
      speed: -20,
      weight: 22,
      skills: {
        decision: 0,
        handling: 5,
        passing: 5,
        kicking: -35,
        tackling: 15,
      },
    };
  }
  if (role === ROLES.Lock) {
    return {
      speed: -22,
      weight: 28,
      skills: {
        decision: 0,
        handling: 0,
        passing: -10,
        kicking: -40,
        tackling: 15,
      },
    };
  }
  if (role === ROLES.BlindSideFlanker || role === ROLES.OpenSideFlanker) {
    return {
      speed: -5,
      weight: 12,
      skills: {
        decision: 5,
        handling: 5,
        passing: 0,
        kicking: -30,
        tackling: 20,
      },
    };
  }
  if (role === ROLES.NumberEight) {
    return {
      speed: -8,
      weight: 20,
      skills: {
        decision: 5,
        handling: 5,
        passing: 0,
        kicking: -30,
        tackling: 15,
      },
    };
  }
  if (role === ROLES.ScrumHalf) {
    return {
      speed: 12,
      weight: -20,
      skills: {
        decision: 10,
        handling: 15,
        passing: 25,
        kicking: 10,
        tackling: -10,
      },
    };
  }
  if (role === ROLES.FlyHalf) {
    return {
      speed: 5,
      weight: -12,
      skills: {
        decision: 15,
        handling: 15,
        passing: 20,
        kicking: 25,
        tackling: -10,
      },
    };
  }
  if (role === ROLES.InsideCentre || role === ROLES.OutsideCentre) {
    return {
      speed: 8,
      weight: 2,
      skills: {
        decision: 5,
        handling: 10,
        passing: 10,
        kicking: 0,
        tackling: 10,
      },
    };
  }
  if (role === ROLES.Wing) {
    return {
      speed: 22,
      weight: -15,
      skills: {
        decision: 0,
        handling: 10,
        passing: 0,
        kicking: 0,
        tackling: -5,
      },
    };
  }
  // Remaining role is fullback, whose profile balances kick cover, handling, and pace.
  return {
    speed: 15,
    weight: -12,
    skills: {
      decision: 10,
      handling: 10,
      passing: 5,
      kicking: 15,
      tackling: 0,
    },
  };
};

export const getPlayerDeltas = (
  team: Team,
  number: number,
  role: Role,
  teams: MatchConfig,
) => {
  const definition = teams[team] as TeamDefinition;
  const profile = getPlayerProfile(team, number, role, teams);
  const baseSpeedRating = ((definition.speedMultiplier - 0.8) / 0.4) * 100;
  const baseWeightRating = ((definition.weightMultiplier - 0.8) / 0.4) * 100;

  return {
    speed: ((profile.speed - 3.8) / 2.8) * 100 - baseSpeedRating,
    weight: ((profile.weight - 75) / 50) * 100 - baseWeightRating,
    skills: {
      decision:
        (profile.skills.decision - definition.defaultSkills.decision) * 100,
      handling:
        (profile.skills.handling - definition.defaultSkills.handling) * 100,
      passing:
        (profile.skills.passing - definition.defaultSkills.passing) * 100,
      kicking:
        (profile.skills.kicking - definition.defaultSkills.kicking) * 100,
      tackling:
        (profile.skills.tackling - definition.defaultSkills.tackling) * 100,
    },
  };
};

export const getPlayerProfile = (
  team: Team,
  number: number,
  role: Role,
  teams: MatchConfig,
) => {
  const definition = teams[team] as TeamDefinition;
  const natural = getRoleNaturalDeltas(role);
  const override = definition.playerOverrides[number];

  // Team multipliers from 0.8 to 1.2 map onto editable 0-to-100 profile scale.
  const baseSpeedRating = ((definition.speedMultiplier - 0.8) / 0.4) * 100;
  const baseWeightRating = ((definition.weightMultiplier - 0.8) / 0.4) * 100;

  // Role and player deltas modify team baseline before physical output is clamped.
  const finalSpeedRating = Math.max(
    0,
    Math.min(100, baseSpeedRating + natural.speed),
  );
  const finalWeightRating = Math.max(
    0,
    Math.min(100, baseWeightRating + natural.weight),
  );

  const speed =
    (3.8 + (finalSpeedRating / 100) * 2.8) * (override?.speedMultiplier ?? 1);
  const weight =
    (75 + (finalWeightRating / 100) * 50) * (override?.weightMultiplier ?? 1);

  const clampSkill = (base: number, delta: number) =>
    Math.max(0.05, Math.min(0.99, (base * 100 + delta) / 100));

  const skills: PlayerSkills = {
    decision:
      override?.skills?.decision ??
      clampSkill(definition.defaultSkills.decision, natural.skills.decision),
    handling:
      override?.skills?.handling ??
      clampSkill(definition.defaultSkills.handling, natural.skills.handling),
    passing:
      override?.skills?.passing ??
      clampSkill(definition.defaultSkills.passing, natural.skills.passing),
    kicking:
      override?.skills?.kicking ??
      clampSkill(definition.defaultSkills.kicking, natural.skills.kicking),
    tackling:
      override?.skills?.tackling ??
      clampSkill(definition.defaultSkills.tackling, natural.skills.tackling),
  };

  return { speed, weight, skills };
};
