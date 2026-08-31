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
  // FullBack
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
  const override = definition.playerOverrides[number];
  const natural = getRoleNaturalDeltas(role);

  return {
    speed: override?.speedDelta ?? natural.speed,
    weight: override?.weightDelta ?? natural.weight,
    skills: {
      decision: override?.skillsDelta?.decision ?? natural.skills.decision,
      handling: override?.skillsDelta?.handling ?? natural.skills.handling,
      passing: override?.skillsDelta?.passing ?? natural.skills.passing,
      kicking: override?.skillsDelta?.kicking ?? natural.skills.kicking,
      tackling: override?.skillsDelta?.tackling ?? natural.skills.tackling,
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
  const deltas = getPlayerDeltas(team, number, role, teams);

  // Baseline ratings (0..100)
  const baseSpeedRating = ((definition.speedMultiplier - 0.8) / 0.4) * 100;
  const baseWeightRating = ((definition.weightMultiplier - 0.8) / 0.4) * 100;

  // Effective modified ratings (0..100)
  const finalSpeedRating = Math.max(
    0,
    Math.min(100, baseSpeedRating + deltas.speed),
  );
  const finalWeightRating = Math.max(
    0,
    Math.min(100, baseWeightRating + deltas.weight),
  );

  const speed = 3.8 + (finalSpeedRating / 100) * 2.8;
  const weight = 75 + (finalWeightRating / 100) * 50;

  const clampSkill = (base: number, delta: number) =>
    Math.max(0.05, Math.min(0.99, (base * 100 + delta) / 100));

  const skills: PlayerSkills = {
    decision: clampSkill(
      definition.defaultSkills.decision,
      deltas.skills.decision,
    ),
    handling: clampSkill(
      definition.defaultSkills.handling,
      deltas.skills.handling,
    ),
    passing: clampSkill(
      definition.defaultSkills.passing,
      deltas.skills.passing,
    ),
    kicking: clampSkill(
      definition.defaultSkills.kicking,
      deltas.skills.kicking,
    ),
    tackling: clampSkill(
      definition.defaultSkills.tackling,
      deltas.skills.tackling,
    ),
  };

  return { speed, weight, skills };
};
