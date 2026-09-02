import { PLAYER_ROLES, ROLE_GROUPS, type PlayerRole } from "./constants.ts";
import type { Career, Player } from "./types.ts";

export function optimizeSquadSelection(
  career: Career,
  clubId: string,
  criteria: "ovr" | "fitness",
): Career {
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club;

        const scorePlayer = (player: Player) => {
          const ovr = (player.attack + player.defence + player.fitness) / 3;
          return criteria === "ovr" ? ovr : player.fitness * 100 + ovr;
        };

        const available = [...club.squad].sort(
          (a, b) => scorePlayer(b) - scorePlayer(a),
        );
        const assigned: Player[] = [];

        for (let slot = 0; slot < PLAYER_ROLES.length; slot += 1) {
          const requiredRole = PLAYER_ROLES[slot] as PlayerRole;
          const requiredGroup = ROLE_GROUPS[requiredRole];

          let pickIndex = available.findIndex(
            (p) =>
              p.injury === null &&
              ROLE_GROUPS[p.role as PlayerRole] === requiredGroup,
          );
          if (pickIndex === -1) {
            pickIndex = available.findIndex((p) => p.injury === null);
          }
          if (pickIndex === -1) {
            pickIndex = 0;
          }

          if (pickIndex >= 0 && pickIndex < available.length) {
            assigned.push(available[pickIndex]);
            available.splice(pickIndex, 1);
          }
        }

        return { ...club, squad: assigned.concat(available) };
      }),
    },
  };
}

export function swapSquadPlayers(
  career: Career,
  clubId: string,
  indexA: number,
  indexB: number,
): Career {
  if (indexA === indexB) return career;
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club;
        const squad = [...club.squad];
        const temp = squad[indexA];
        squad[indexA] = squad[indexB];
        squad[indexB] = temp;
        return { ...club, squad };
      }),
    },
  };
}
