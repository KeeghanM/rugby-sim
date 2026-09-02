import type { MatchInput, PlayerSkills, TeamDefinition } from "../../domain.ts";
import { getManagerPerks } from "./manager.ts";
import type { Career, Club, Fixture, ManagerProfile } from "./types.ts";

export const roleName = (role: string): string =>
  role
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());

export function clubToTeamDefinition(
  club: Club,
  manager?: ManagerProfile,
): TeamDefinition {
  const perks = manager ? getManagerPerks(manager) : null;
  const disciplineBonus = perks ? perks.disciplineBonus / 100 : 0;

  const defaultSkills: PlayerSkills = {
    decision: Math.min(
      0.98,
      0.55 + (club.reputation / 100) * 0.35 + disciplineBonus,
    ),
    handling: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
    passing: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
    kicking: Math.min(0.95, 0.5 + (club.reputation / 100) * 0.35),
    tackling: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
  };

  const playerOverrides: TeamDefinition["playerOverrides"] = {};
  club.squad.forEach((player, index) => {
    const jerseyNumber = index + 1;
    playerOverrides[jerseyNumber] = {
      speedMultiplier: 0.82 + (player.speed / 100) * 0.36,
      weightMultiplier: 0.85 + (player.strength / 100) * 0.3,
      skills: {
        decision: Math.max(
          0.1,
          Math.min(0.99, player.skills.decision / 100 + disciplineBonus),
        ),
        handling: Math.max(0.1, Math.min(0.99, player.skills.handling / 100)),
        passing: Math.max(0.1, Math.min(0.99, player.skills.passing / 100)),
        kicking: Math.max(0.1, Math.min(0.99, player.skills.kicking / 100)),
        tackling: Math.max(0.1, Math.min(0.99, player.skills.tackling / 100)),
      },
    };
  });

  // Base tendencies and formations
  let carry = 0.48;
  let pass = 0.32;
  let kick = 0.2;
  let maul = 0.5;
  let lineSpeed = 3.6 + (club.staffLevel - 1) * 0.5;

  const formations: TeamDefinition["formations"] = {
    kickoffAttack: "balanced",
    kickoffDefence: "deep",
    openAttack: "balanced",
    openDefence: "connected",
    lineoutMembers: 6,
    lineoutNonParticipants: "backline",
    scrumAttack: "openSide",
    scrumDefence: "drift",
  };

  // Apply manager's tactical playbook if managed team
  if (manager) {
    const pb = manager.playbook;

    // Attack structure
    if (pb.attackStructure === "pod_1_3_3_1") {
      carry = 0.52;
      pass = 0.33;
      kick = 0.15;
      formations.openAttack = "tightPods";
    } else if (pb.attackStructure === "pod_2_4_2") {
      carry = 0.44;
      pass = 0.43;
      kick = 0.13;
      formations.openAttack = "tightPods";
    } else if (pb.attackStructure === "wide_spread") {
      carry = 0.38;
      pass = 0.5;
      kick = 0.12;
      formations.openAttack = "wide";
    }

    // Defense structure
    if (pb.defenseStructure === "blitz") {
      formations.openDefence = "narrow";
      formations.scrumDefence = "blitz";
      lineSpeed += 0.6;
    } else if (pb.defenseStructure === "pendulum_cover") {
      formations.openDefence = "connected";
      formations.kickoffDefence = "deep";
      lineSpeed += 0.2;
    } else if (pb.defenseStructure === "aggressive_rush") {
      formations.openDefence = "narrow";
      formations.scrumDefence = "blitz";
      lineSpeed += 1.0;
    } else {
      formations.openDefence = "connected";
      formations.scrumDefence = "drift";
    }

    // Set piece focus
    if (pb.setPieceFocus === "quick_tap") {
      maul = 0.2;
      pass += 0.05;
      kick = Math.max(0.05, kick - 0.05);
    } else if (pb.setPieceFocus === "maul_drive") {
      maul = 0.85;
      carry += 0.06;
    } else if (pb.setPieceFocus === "territory_boot") {
      kick += 0.15;
      carry = Math.max(0.1, carry - 0.08);
      pass = Math.max(0.1, pass - 0.07);
    }

    // Kick pressure
    if (pb.kickPressure === "low") {
      kick = Math.max(0.05, kick - 0.04);
      pass += 0.04;
    } else if (pb.kickPressure === "high") {
      kick += 0.06;
      carry = Math.max(0.1, carry - 0.03);
      pass = Math.max(0.1, pass - 0.03);
    }

    // Match tempo
    if (pb.tempo === "controlled") {
      lineSpeed = Math.max(2.5, lineSpeed - 0.2);
    } else if (pb.tempo === "high_tempo") {
      lineSpeed += 0.4;
      pass += 0.02;
    }

    // Normalize tendencies to sum to 1.0 (carry + pass + kick)
    const totalTendency = carry + pass + kick;
    if (totalTendency > 0) {
      carry = Number((carry / totalTendency).toFixed(2));
      pass = Number((pass / totalTendency).toFixed(2));
      kick = Number((1 - carry - pass).toFixed(2));
    }
  }

  return {
    name: club.name,
    color: club.color,
    lineSpeed,
    tendencies: { carry, pass, kick, maul },
    formationVariation: 0,
    speedMultiplier: 0.92 + (club.facilityLevel - 1) * 0.08,
    weightMultiplier: 0.92 + (club.staffLevel - 1) * 0.08,
    formations,
    customFormations: {},
    defaultSkills,
    playerOverrides,
  };
}

export function createMatchInputForFixture(
  career: Career,
  fixture: Fixture,
): MatchInput {
  const home = career.season.clubs.find((c) => c.id === fixture.homeClubId);
  const away = career.season.clubs.find((c) => c.id === fixture.awayClubId);
  if (!home || !away) {
    throw new Error(`Clubs for fixture ${fixture.id} not found`);
  }

  const isHomeManaged = home.id === career.managedClubId;
  const isAwayManaged = away.id === career.managedClubId;

  return {
    teams: {
      0: clubToTeamDefinition(home, isHomeManaged ? career.manager : undefined),
      1: clubToTeamDefinition(away, isAwayManaged ? career.manager : undefined),
    },
    entrants: {
      0: {
        starters: home.squad.slice(0, 15).map((p) => p.id),
        substitutes: home.squad.slice(15, 23).map((p) => p.id),
      },
      1: {
        starters: away.squad.slice(0, 15).map((p) => p.id),
        substitutes: away.squad.slice(15, 23).map((p) => p.id),
      },
    },
  };
}
