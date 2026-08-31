import type { GameState } from "../../domain.ts";
import { isForward } from "../../formations.ts";

export const syncManager = (
  game: GameState,
  ctx: any,
  selectedManagerTeam: 0 | 1,
  selectedManagerView: "roster" | "stats",
  managerOpen: boolean,
) => {
  const {
    managerTeamSummary,
    managerRosterThead,
    managerRosterTbody,
    tabTeam0,
    tabTeam1,
  } = ctx;
  if (!managerOpen || !managerTeamSummary || !managerRosterTbody) return;

  // Sync team tab labels and colors
  if (tabTeam0) {
    const swatch = tabTeam0.querySelector(
      ".team-tab-swatch",
    ) as HTMLElement | null;
    const label = tabTeam0.querySelector(
      "#tab-team-0-label",
    ) as HTMLElement | null;
    if (swatch) swatch.style.backgroundColor = game.teams[0].color;
    if (label) label.textContent = game.teams[0].name;
    if (selectedManagerTeam === 0) {
      tabTeam0.style.borderBottomColor = game.teams[0].color;
    } else {
      tabTeam0.style.borderBottomColor = "transparent";
    }
  }
  if (tabTeam1) {
    const swatch = tabTeam1.querySelector(
      ".team-tab-swatch",
    ) as HTMLElement | null;
    const label = tabTeam1.querySelector(
      "#tab-team-1-label",
    ) as HTMLElement | null;
    if (swatch) swatch.style.backgroundColor = game.teams[1].color;
    if (label) label.textContent = game.teams[1].name;
    if (selectedManagerTeam === 1) {
      tabTeam1.style.borderBottomColor = game.teams[1].color;
    } else {
      tabTeam1.style.borderBottomColor = "transparent";
    }
  }

  const teamDef: any = game.teams[selectedManagerTeam];
  const teamPlayers = game.players.filter(
    (pl: any) => pl.team === selectedManagerTeam,
  );
  const benchSubs = game.substitutes.filter(
    (s: any) => s.team === selectedManagerTeam,
  );
  const formatDist = (d: number) =>
    d >= 1000 ? `${(d / 1000).toFixed(2)}km` : `${Math.round(d)}m`;
  if (selectedManagerView === "stats") {
    if (managerRosterThead)
      managerRosterThead.innerHTML = `<tr><th class="player-num-col">#</th><th>Player / Role</th><th>Distance Ran</th><th>Carried</th><th>Tackles</th><th>Tries</th><th>Breaks</th><th>Passes</th><th>Kicks</th><th>Knock-ons</th><th>Pens</th></tr>`;
    const all = [...teamPlayers, ...benchSubs];
    const sum = (fn: (p: any) => number) => all.reduce((s, p) => s + fn(p), 0);
    const totalDistM = sum((p: any) => p.stats.distanceCovered);
    const totalCarriedM = sum((p: any) => p.stats.distanceCarried);
    const totalTacklesMade = sum((p: any) => p.stats.tacklesMade);
    const totalTacklesMissed = sum((p: any) => p.stats.tacklesMissed);
    const totalTries = sum((p: any) => p.stats.triesScored);
    const totalBreaks = sum((p: any) => p.stats.lineBreaks);
    const totalPens = sum((p: any) => p.stats.penaltiesConceded);
    const totalKnockOns = sum((p: any) => p.stats.knockOns);
    const setPieces: any = game.teamStats[selectedManagerTeam];
    const tacklePct =
      totalTacklesMade + totalTacklesMissed > 0
        ? Math.round(
            (totalTacklesMade / (totalTacklesMade + totalTacklesMissed)) * 100,
          )
        : 100;
    managerTeamSummary.innerHTML = `<div class="summary-item"><span class="summary-label">Total Distance</span><span class="summary-val">${(totalDistM / 1000).toFixed(2)} km <span style="color:#94a3b8;font-size:0.72rem;">(${formatDist(totalCarriedM)} carry)</span></span></div><div class="summary-item"><span class="summary-label">Tackles Completed</span><span class="summary-val">${totalTacklesMade}/${totalTacklesMade + totalTacklesMissed} (${tacklePct}%)</span></div><div class="summary-item"><span class="summary-label">Tries & Line Breaks</span><span class="summary-val">${totalTries} tries · ${totalBreaks} breaks</span></div><div class="summary-item"><span class="summary-label">Discipline & Errors</span><span class="summary-val">${totalKnockOns} knock-ons · ${totalPens} pens conceded</span></div><div class="summary-item"><span class="summary-label">Contests Won / Lost</span><span class="summary-val">Ruck ${setPieces.rucksWon}/${setPieces.rucksLost} · Maul ${setPieces.maulsWon}/${setPieces.maulsLost} · Scrum ${setPieces.scrumsWon}/${setPieces.scrumsLost} · Lineout ${setPieces.lineoutsWon}/${setPieces.lineoutsLost}</span></div>`;
    managerRosterTbody.innerHTML =
      teamPlayers
        .map((player: any) => {
          const s = player.stats;
          return `<tr><td class="player-num-col">${player.number}</td><td class="player-role-col">${player.role} <span class="player-pod-badge">${player.pod}</span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600; color:#e2e8f0;">${formatDist(s.distanceCovered)}</span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600; color:#38bdf8;">${formatDist(s.distanceCarried)}</span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.tacklesMade} <span style="color:#94a3b8;font-size:0.75rem;">(${s.tacklesMissed})</span></span></td><td>${s.triesScored > 0 ? `<span class="stat-highlight-gold">🏉 ${s.triesScored}</span>` : `<span style="color:#64748b;">0</span>`}</td><td>${s.lineBreaks > 0 ? `<span class="stat-highlight-cyan">⚡ ${s.lineBreaks}</span>` : `<span style="color:#64748b;">0</span>`}</td><td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulPasses}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalPasses}</span></span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulKicks}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalKicks}</span></span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600; ${s.knockOns > 0 ? "color:#f87171;" : "color:#64748b;"}">${s.knockOns}</span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600; ${s.penaltiesConceded > 0 ? "color:#ef4444;" : "color:#64748b;"}">${s.penaltiesConceded}</span></td></tr>`;
        })
        .join("") +
      benchSubs
        .map((sub: any) => {
          const s = sub.stats;
          return `<tr style="opacity: ${sub.isUsed ? 0.95 : 0.65};"><td class="player-num-col" style="color: #94a3b8;">${sub.number}</td><td class="player-role-col" style="color: #cbd5e1;">${sub.role} (Sub) <span class="player-pod-badge">${sub.pod}</span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600; color:#cbd5e1;">${formatDist(s.distanceCovered)}</span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600; color:#38bdf8;">${formatDist(s.distanceCarried)}</span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.tacklesMade} <span style="color:#94a3b8;font-size:0.75rem;">(${s.tacklesMissed})</span></span></td><td>${s.triesScored > 0 ? `<span class="stat-highlight-gold">🏉 ${s.triesScored}</span>` : `<span style="color:#64748b;">0</span>`}</td><td>${s.lineBreaks > 0 ? `<span class="stat-highlight-cyan">⚡ ${s.lineBreaks}</span>` : `<span style="color:#64748b;">0</span>`}</td><td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulPasses}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalPasses}</span></span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulKicks}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalKicks}</span></span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600; ${s.knockOns > 0 ? "color:#f87171;" : "color:#64748b;"}">${s.knockOns}</span></td><td><span style="font-family:ui-monospace, monospace; font-weight:600; ${s.penaltiesConceded > 0 ? "color:#ef4444;" : "color:#64748b;"}">${s.penaltiesConceded}</span></td></tr>`;
        })
        .join("");
  } else {
    if (managerRosterThead)
      managerRosterThead.innerHTML = `<tr><th class="player-num-col">#</th><th>Player / Role</th><th>Physicals</th><th>Skill</th><th>Condition</th></tr>`;
    const teamPlayers = game.players.filter(
      (p: any) => p.team === selectedManagerTeam,
    );
    const benchSubs = game.substitutes.filter(
      (s: any) => s.team === selectedManagerTeam,
    );
    const teamDef: any = game.teams[selectedManagerTeam];
    const packWeight = teamPlayers
      .filter((p: any) => isForward(p))
      .reduce((sum: number, p: any) => sum + Math.round(p.weight), 0);
    managerTeamSummary.innerHTML = `<div class="summary-item"><span class="summary-label">Attacking Style</span><span class="summary-val">${teamDef.name} — ${game.formations[selectedManagerTeam].openAttack}</span></div><div class="summary-item"><span class="summary-label">8-Man Pack Weight</span><span class="summary-val">${packWeight} kg</span></div><div class="summary-item"><span class="summary-label">Defensive Line Speed</span><span class="summary-val">${teamDef.lineSpeed.toFixed(1)} m/s (${game.formations[selectedManagerTeam].openDefence})</span></div><div class="summary-item"><span class="summary-label">Tendency</span><span class="summary-val">Carry ${Math.round(teamDef.tendencies.carry * 100)}% · Pass ${Math.round(teamDef.tendencies.pass * 100)}% · Kick ${Math.round(teamDef.tendencies.kick * 100)}% · Maul ${Math.round(teamDef.tendencies.maul * 100)}%</span></div>`;
    managerRosterTbody.innerHTML =
      teamPlayers
        .map((player: any) => {
          const avgSkill = Math.round(
            (player.skills.decision +
              player.skills.handling +
              player.skills.passing +
              player.skills.kicking +
              player.skills.tackling) *
              20,
          );
          const staminaClamped = Math.max(0, Math.min(100, player.stamina));
          const staminaClass =
            staminaClamped > 65
              ? ""
              : staminaClamped > 35
                ? "stamina-mid"
                : "stamina-low";
          return `<tr><td class="player-num-col">${player.number}</td><td class="player-role-col">${player.role} <span class="player-pod-badge">${player.pod}</span></td><td>${Math.round(player.weight)}kg · ${player.speed.toFixed(1)}m/s</td><td><span class="skill-badge">★ ${avgSkill}</span></td><td><div class="stamina-bar-container" title="Indicative Match Condition"><div class="stamina-bar-fill ${staminaClass}" style="width: ${staminaClamped}%;"></div></div></td></tr>`;
        })
        .join("") +
      benchSubs
        .map((sub: any) => {
          const avgSkill = Math.round(
            (sub.skills.decision +
              sub.skills.handling +
              sub.skills.passing +
              sub.skills.kicking +
              sub.skills.tackling) *
              20,
          );
          const statusLabel = sub.isUsed
            ? `<span style="color:#94a3b8;font-size:0.75rem;">SUBBED ON</span>`
            : `<span style="color:#4ade80;font-size:0.75rem;">READY</span>`;
          return `<tr style="opacity: ${sub.isUsed ? 0.6 : 0.95};"><td class="player-num-col" style="color: #94a3b8;">${sub.number}</td><td class="player-role-col" style="color: #cbd5e1;">${sub.role} (Sub) <span class="player-pod-badge">${sub.pod}</span></td><td>${Math.round(sub.weight)}kg · ${sub.speed.toFixed(1)}m/s</td><td><span class="skill-badge">★ ${avgSkill}</span></td><td>${statusLabel}</td></tr>`;
        })
        .join("");
  }
};
