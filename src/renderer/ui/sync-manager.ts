import type { GameState } from "../../domain.ts";
import { isForward } from "../../formations.ts";

const formatRole = (role: string): string => {
  switch (role) {
    case "Loose Head":
      return "Loosehead Prop";
    case "Tight Head":
      return "Tighthead Prop";
    case "Hooker":
      return "Hooker";
    case "Lock":
      return "Lock / Second Row";
    case "Open Side Flanker":
      return "Openside Flanker";
    case "Blind Side Flanker":
      return "Blindside Flanker";
    case "Number Eight":
      return "Number Eight";
    case "Scrum Half":
      return "Scrum Half";
    case "Fly Half":
      return "Fly Half";
    case "Inside Centre":
      return "Inside Centre";
    case "Outside Centre":
      return "Outside Centre";
    case "Wing":
      return "Wing";
    case "Full Back":
      return "Fullback";
    default:
      return role;
  }
};

const getPositionGroup = (number: number): string => {
  if (number === 1 || number === 3) return "Prop";
  if (number === 2) return "Hooker";
  if (number === 4 || number === 5) return "Lock";
  if (number === 6 || number === 7) return "Flanker";
  if (number === 8) return "No. 8";
  if (number === 9) return "Halfback";
  if (number === 10) return "Fly Half";
  if (number === 12 || number === 13) return "Centre";
  if (number === 11 || number === 14) return "Wing";
  if (number === 15) return "Fullback";
  return "Reserve";
};

const getPodLabel = (pod: string): string => {
  if (pod === "left") return "Left Pod";
  if (pod === "middle") return "Crash Pod";
  if (pod === "right") return "Right Pod";
  if (pod === "backline") return "Backline";
  return pod;
};

const getOverall = (p: any): number => {
  const avg =
    (p.skills.decision +
      p.skills.handling +
      p.skills.passing +
      p.skills.kicking +
      p.skills.tackling) *
    20;
  return Math.round(avg);
};

const getOvrClass = (ovr: number): string => {
  if (ovr >= 80) return "ovr-elite";
  if (ovr >= 70) return "ovr-good";
  return "ovr-solid";
};

const getConditionInfo = (stamina: number) => {
  const pct = Math.max(0, Math.min(100, Math.round(stamina)));
  let status = "Fresh";
  let barClass = "";
  if (pct < 35) {
    status = "Exhausted";
    barClass = "stamina-low";
  } else if (pct < 65) {
    status = "Fatigued";
    barClass = "stamina-mid";
  } else if (pct < 85) {
    status = "Active";
  }
  return { pct, status, barClass };
};

const formatDist = (d: number) =>
  d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`;

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

  const teamDef: any = game.teams[selectedManagerTeam];
  const teamColor = teamDef.color;

  // Sync team tab labels and swatches
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

  const teamPlayers = game.players.filter(
    (pl: any) => pl.team === selectedManagerTeam,
  );
  const benchSubs = game.substitutes.filter(
    (s: any) => s.team === selectedManagerTeam,
  );

  if (selectedManagerView === "stats") {
    if (managerRosterThead) {
      managerRosterThead.innerHTML = `
        <tr>
          <th style="width: 38px; text-align: center;">#</th>
          <th>Player / Role</th>
          <th>Work Rate</th>
          <th>Tackles</th>
          <th>Tries</th>
          <th>Breaks</th>
          <th>Passing</th>
          <th>Kicking</th>
          <th>Discipline</th>
        </tr>`;
    }

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

    managerTeamSummary.innerHTML = `
      <div class="summary-item">
        <span class="summary-label">🏃 Work Rate & Territory</span>
        <span class="summary-val">
          ${(totalDistM / 1000).toFixed(2)} km
          <span class="summary-sub">(${formatDist(totalCarriedM)} carry)</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">🛡️ Defensive Success</span>
        <span class="summary-val">
          ${totalTacklesMade}/${totalTacklesMade + totalTacklesMissed}
          <span class="group-tag" style="background:${tacklePct >= 85 ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}; color:${tacklePct >= 85 ? "#4ade80" : "#facc15"}; border-color:transparent;">${tacklePct}%</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">🏉 Attack Impact</span>
        <span class="summary-val">
          ${totalTries} ${totalTries === 1 ? "try" : "tries"}
          <span class="summary-sub">· ${totalBreaks} breaks</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">⚠️ Discipline & Handling</span>
        <span class="summary-val">
          ${totalPens} pens
          <span class="summary-sub">· ${totalKnockOns} knock-ons</span>
        </span>
      </div>
      <div class="summary-item" style="grid-column: 1 / -1;">
        <span class="summary-label">⚖️ Set Piece & Breakdown Contests Won</span>
        <span class="summary-val" style="font-size: 0.82rem; color: #cbd5e1; gap: 0.8rem;">
          <span>Rucks: <strong style="color:#f8fafc;">${setPieces.rucksWon}/${setPieces.rucksWon + setPieces.rucksLost}</strong></span>
          <span>Mauls: <strong style="color:#f8fafc;">${setPieces.maulsWon}/${setPieces.maulsWon + setPieces.maulsLost}</strong></span>
          <span>Scrums: <strong style="color:#f8fafc;">${setPieces.scrumsWon}/${setPieces.scrumsWon + setPieces.scrumsLost}</strong></span>
          <span>Lineouts: <strong style="color:#f8fafc;">${setPieces.lineoutsWon}/${setPieces.lineoutsWon + setPieces.lineoutsLost}</strong></span>
        </span>
      </div>`;

    const renderStatRow = (player: any, isSub = false) => {
      const s = player.stats;
      const opacity = isSub && !player.isUsed ? "opacity: 0.65;" : "";
      return `
        <tr style="${opacity}">
          <td style="text-align: center;">
            <span class="player-num-badge" style="background:${teamColor};">${player.number}</span>
          </td>
          <td>
            <div class="player-role-title">
              ${formatRole(player.role)}
              <span class="group-tag">${getPositionGroup(player.number)}</span>
              <span class="player-pod-badge">${getPodLabel(player.pod)}</span>
            </div>
          </td>
          <td>
            <span style="font-family:ui-monospace, monospace; font-weight:700; color:#e2e8f0;">${formatDist(s.distanceCovered)}</span>
            <span style="color:#38bdf8; font-size:0.75rem; font-family:ui-monospace, monospace; margin-left: 0.3rem;">(${formatDist(s.distanceCarried)})</span>
          </td>
          <td>
            <span style="font-family:ui-monospace, monospace; font-weight:700; color:#f8fafc;">${s.tacklesMade}</span>
            <span style="color:#94a3b8; font-size:0.75rem;">/${s.tacklesMade + s.tacklesMissed}</span>
          </td>
          <td>
            ${s.triesScored > 0 ? `<span class="stat-highlight-gold">🏉 ${s.triesScored}</span>` : `<span style="color:#475569;">-</span>`}
          </td>
          <td>
            ${s.lineBreaks > 0 ? `<span class="stat-highlight-cyan">⚡ ${s.lineBreaks}</span>` : `<span style="color:#475569;">-</span>`}
          </td>
          <td>
            <span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulPasses}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalPasses}</span></span>
          </td>
          <td>
            ${s.totalKicks > 0 ? `<span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulKicks}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalKicks}</span></span>` : `<span style="color:#475569;">-</span>`}
          </td>
          <td>
            <span style="font-family:ui-monospace, monospace; font-weight:600; ${s.penaltiesConceded > 0 ? "color:#ef4444;" : s.knockOns > 0 ? "color:#f87171;" : "color:#64748b;"}">
              ${s.penaltiesConceded}p · ${s.knockOns}k
            </span>
          </td>
        </tr>`;
    };

    managerRosterTbody.innerHTML = `
      <tr class="section-divider-row"><td colspan="9">Starting XV (1 - 15)</td></tr>
      ${teamPlayers.map((p: any) => renderStatRow(p)).join("")}
      <tr class="section-divider-row"><td colspan="9">Finishing Reserves (16 - 23)</td></tr>
      ${benchSubs.map((s: any) => renderStatRow(s, true)).join("")}`;
  } else {
    // --- SQUAD & CONDITION VIEW ---
    if (managerRosterThead) {
      managerRosterThead.innerHTML = `
        <tr>
          <th style="width: 38px; text-align: center;">#</th>
          <th>Player / Role</th>
          <th>Physicals</th>
          <th>Overall Rating</th>
          <th>Match Condition</th>
        </tr>`;
    }

    const forwards = teamPlayers.filter((p: any) => isForward(p));
    const packWeight = forwards.reduce(
      (sum: number, p: any) => sum + Math.round(p.weight),
      0,
    );
    const avgFwdWeight =
      forwards.length > 0 ? (packWeight / forwards.length).toFixed(1) : "0";

    const cPct = Math.round(teamDef.tendencies.carry * 100);
    const pPct = Math.round(teamDef.tendencies.pass * 100);
    const kPct = Math.round(teamDef.tendencies.kick * 100);
    const mPct = Math.round(teamDef.tendencies.maul * 100);

    managerTeamSummary.innerHTML = `
      <div class="summary-item">
        <span class="summary-label">📋 Tactical Shape</span>
        <span class="summary-val">
          ${teamDef.name}
          <span class="summary-sub">(${game.formations[selectedManagerTeam].openAttack})</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">💪 Pack Power</span>
        <span class="summary-val">
          ${packWeight} kg
          <span class="summary-sub">(${avgFwdWeight} kg avg)</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">⚡ Defensive Line Speed</span>
        <span class="summary-val">
          ${teamDef.lineSpeed.toFixed(1)} m/s
          <span class="summary-sub">(${game.formations[selectedManagerTeam].openDefence})</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">📊 Play Tendencies</span>
        <span class="summary-val" style="font-size: 0.76rem; color: #cbd5e1;">
          <span style="color:#60a5fa;">Carry ${cPct}%</span> ·
          <span style="color:#4ade80;">Pass ${pPct}%</span> ·
          <span style="color:#facc15;">Kick ${kPct}%</span> ·
          <span style="color:#f472b6;">Maul ${mPct}%</span>
        </span>
        <div class="tendency-bar">
          <div class="tendency-seg tendency-carry" style="width:${cPct}%;"></div>
          <div class="tendency-seg tendency-pass" style="width:${pPct}%;"></div>
          <div class="tendency-seg tendency-kick" style="width:${kPct}%;"></div>
          <div class="tendency-seg tendency-maul" style="width:${mPct}%;"></div>
        </div>
      </div>`;

    const renderRosterRow = (player: any, isSub = false) => {
      const ovr = getOverall(player);
      const ovrClass = getOvrClass(ovr);
      const cond = getConditionInfo(player.stamina);
      const opacity = isSub && !player.isUsed ? "opacity: 0.7;" : "";

      const statusBadge = isSub
        ? player.isUsed
          ? `<span class="group-tag" style="background:rgba(148,163,184,0.15); color:#94a3b8; border-color:transparent;">Subbed On</span>`
          : `<span class="group-tag" style="background:rgba(34,197,94,0.15); color:#4ade80; border-color:rgba(34,197,94,0.3);">Ready</span>`
        : "";

      return `
        <tr style="${opacity}">
          <td style="text-align: center;">
            <span class="player-num-badge" style="background:${teamColor};">${player.number}</span>
          </td>
          <td>
            <div class="player-role-title">
              ${formatRole(player.role)}
              <span class="group-tag">${getPositionGroup(player.number)}</span>
              <span class="player-pod-badge">${getPodLabel(player.pod)}</span>
              ${statusBadge}
            </div>
          </td>
          <td>
            <span style="font-weight:700; color:#f8fafc;">${Math.round(player.weight)} kg</span>
            <span style="color:#94a3b8; font-size:0.75rem; margin-left: 0.35rem;">· ${player.speed.toFixed(1)} m/s</span>
          </td>
          <td>
            <span class="ovr-badge ${ovrClass}">OVR ${ovr}</span>
          </td>
          <td>
            <div class="condition-wrapper">
              <div class="condition-header">
                <span>${cond.status}</span>
                <span style="font-family:ui-monospace, monospace;">${cond.pct}%</span>
              </div>
              <div class="stamina-bar-container">
                <div class="stamina-bar-fill ${cond.barClass}" style="width: ${cond.pct}%;"></div>
              </div>
            </div>
          </td>
        </tr>`;
    };

    managerRosterTbody.innerHTML = `
      <tr class="section-divider-row"><td colspan="5">Starting XV (1 - 15)</td></tr>
      ${teamPlayers.map((p: any) => renderRosterRow(p)).join("")}
      <tr class="section-divider-row"><td colspan="5">Finishing Reserves (16 - 23)</td></tr>
      ${benchSubs.map((s: any) => renderRosterRow(s, true)).join("")}`;
  }
};
