import type { GameState } from "../../domain.ts";

export const updateSubstitutions = (state: GameState) => {
  const matchSecs = state.matchClockSeconds;
  if (matchSecs < 2700 || state.half === "fullTime") return;
  const isStoppage =
    state.phase.kind === "scrum" ||
    state.phase.kind === "lineout" ||
    state.phase.kind === "maul" ||
    state.phase.kind === "kickoff" ||
    (state.phase.kind === "ruck" && state.phase.stage === "arrivals");
  if (!isStoppage) return;

  for (const team of [0, 1] as const) {
    const teamPlayers = state.players.filter((p) => p.team === team);
    const availableSubs = state.substitutes.filter(
      (s) => s.team === team && !s.isUsed,
    );
    if (availableSubs.length === 0) continue;

    for (const player of teamPlayers) {
      const isTightFive = player.number >= 1 && player.number <= 5;
      const isLoose = player.number >= 6 && player.number <= 8;
      const isBack = player.number >= 9 && player.number <= 15;

      const needsSub =
        (isTightFive && matchSecs >= 2700 && player.stamina < 40) ||
        (isLoose && matchSecs >= 3400 && player.stamina < 35) ||
        (isBack && matchSecs >= 3900 && player.stamina < 30);

      if (!needsSub) continue;

      const matchingSub =
        availableSubs.find((s) => s.role === player.role) ??
        (isTightFive
          ? availableSubs.find((s) => s.number <= 19)
          : availableSubs[0]);

      if (!matchingSub) continue;

      const oldNum = player.number;
      player.number = matchingSub.number;
      player.speed = matchingSub.speed;
      player.weight = matchingSub.weight;
      player.skills = { ...matchingSub.skills };
      player.stats = matchingSub.stats;
      player.stamina = 100;
      matchingSub.isUsed = true;

      const teamName = state.teams[team].name;
      state.recentSubstitution = `${teamName} SUB: #${matchingSub.number} on for #${oldNum} (${player.role})`;
      break;
    }
  }
};
