import type { MatchInput, PlayerSkills, TeamDefinition } from "../../domain.ts";
import type { Career, Club, Fixture } from "./types.ts";

export const roleName = (role: string): string =>
  role
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());

export function clubToTeamDefinition(club: Club): TeamDefinition {
  const defaultSkills: PlayerSkills = {
    decision: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
    handling: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
    passing: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
    kicking: Math.min(0.95, 0.5 + (club.reputation / 100) * 0.35),
    tackling: Math.min(0.95, 0.55 + (club.reputation / 100) * 0.35),
  };

  const playerOverrides: TeamDefinition["playerOverrides"] = {};
  club.squad.forEach((player, index) => {
    const jerseyNumber = index + 1;
    playerOverrides[jerseyNumber] = {
      speedMultiplier: 0.88 + (player.fitness / 100) * 0.24,
      weightMultiplier: 0.9 + (player.defence / 100) * 0.2,
      skills: {
        decision: Math.max(
          0.1,
          Math.min(0.99, (player.attack * 0.5 + player.defence * 0.5) / 100),
        ),
        handling: Math.max(0.1, Math.min(0.99, player.attack / 100)),
        passing: Math.max(0.1, Math.min(0.99, player.attack / 100)),
        kicking: Math.max(
          0.1,
          Math.min(0.99, (player.attack * 0.8 + 15) / 100),
        ),
        tackling: Math.max(0.1, Math.min(0.99, player.defence / 100)),
      },
    };
  });

  return {
    name: club.name,
    color: club.color,
    lineSpeed: 3.6 + (club.staffLevel - 1) * 0.5,
    tendencies: { carry: 0.48, pass: 0.32, kick: 0.2, maul: 0.5 },
    formationVariation: 0,
    speedMultiplier: 0.92 + (club.facilityLevel - 1) * 0.08,
    weightMultiplier: 0.92 + (club.staffLevel - 1) * 0.08,
    formations: {
      kickoffAttack: "balanced",
      kickoffDefence: "deep",
      openAttack: "balanced",
      openDefence: "connected",
      lineoutMembers: 6,
      lineoutNonParticipants: "backline",
      scrumAttack: "openSide",
      scrumDefence: "drift",
    },
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

  return {
    teams: {
      0: clubToTeamDefinition(home),
      1: clubToTeamDefinition(away),
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
