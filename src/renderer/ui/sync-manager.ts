import type { GameState } from "../../domain.ts";
import { isForward } from "../../formations.ts";
import { escapeHtml } from "../../html.ts";

const getPlayerName = (number: number, role: string): string => {
  switch (number) {
    case 1:
      return "Loosehead Prop";
    case 2:
      return "Hooker";
    case 3:
      return "Tighthead Prop";
    case 4:
      return "Lock (4)";
    case 5:
      return "Lock (5)";
    case 6:
      return "Blindside Flanker";
    case 7:
      return "Openside Flanker";
    case 8:
      return "Number Eight";
    case 9:
      return "Scrum Half";
    case 10:
      return "Fly Half";
    case 11:
      return "Left Wing";
    case 12:
      return "Inside Centre";
    case 13:
      return "Outside Centre";
    case 14:
      return "Right Wing";
    case 15:
      return "Fullback";
    case 16:
      return "Reserve Prop";
    case 17:
      return "Reserve Hooker";
    case 18:
      return "Reserve Prop";
    case 19:
      return "Reserve Lock";
    case 20:
      return "Reserve Back Row";
    case 21:
      return "Reserve Scrum Half";
    case 22:
      return "Reserve Fly Half";
    case 23:
      return "Reserve Outside Back";
    default:
      return role || `Player ${number}`;
  }
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

const getConditionInfo = (stamina?: number, isSub = false, isUsed = false) => {
  if (isSub && !isUsed) {
    return { pct: 100, status: "Ready", barClass: "" };
  }
  const val = typeof stamina === "number" && !isNaN(stamina) ? stamina : 100;
  const pct = Math.max(0, Math.min(100, Math.round(val)));
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

  // Team selector labels and colors.
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
    // Squad condition table.
    if (managerRosterThead) {
      managerRosterThead.innerHTML = `
        <tr>
          <th style="width: 36px; text-align: center;">#</th>
          <th>Player</th>
          <th style="text-align: right;">Distance</th>
          <th style="text-align: right;">Carried</th>
          <th style="text-align: center;">Tackles</th>
          <th style="text-align: center;">Tries</th>
          <th style="text-align: center;">Breaks</th>
          <th style="text-align: center;">Passing</th>
          <th style="text-align: center;">Kicking</th>
          <th style="text-align: center;">Errors</th>
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
    const totalTackles = totalTacklesMade + totalTacklesMissed;
    const tacklePct =
      totalTackles > 0
        ? `${Math.round((totalTacklesMade / totalTackles) * 100)}%`
        : "-";

    const totalRucks = setPieces.rucksWon + setPieces.rucksLost;
    const ruckPct =
      totalRucks > 0
        ? `${Math.round((setPieces.rucksWon / totalRucks) * 100)}%`
        : "-";
    const totalScrums = setPieces.scrumsWon + setPieces.scrumsLost;
    const scrumPct =
      totalScrums > 0
        ? `${Math.round((setPieces.scrumsWon / totalScrums) * 100)}%`
        : "-";
    const totalLineouts = setPieces.lineoutsWon + setPieces.lineoutsLost;
    const lineoutPct =
      totalLineouts > 0
        ? `${Math.round((setPieces.lineoutsWon / totalLineouts) * 100)}%`
        : "-";

    managerTeamSummary.innerHTML = `
      <div class="summary-item">
        <span class="summary-label">DISTANCE & CARRIES</span>
        <span class="summary-val">
          ${(totalDistM / 1000).toFixed(2)} km
          <span class="summary-sub">(${formatDist(totalCarriedM)} carry)</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">TACKLE COMPLETION</span>
        <span class="summary-val">
          ${tacklePct}
          <span class="summary-sub">(${totalTacklesMade}/${totalTackles})</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">SCORING & BREAKS</span>
        <span class="summary-val">
          ${totalTries} ${totalTries === 1 ? "Try" : "Tries"}
          <span class="summary-sub">(${totalBreaks} Line Breaks)</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">DISCIPLINE & HANDLING</span>
        <span class="summary-val">
          ${totalPens} Pens
          <span class="summary-sub">(${totalKnockOns} Knock-ons)</span>
        </span>
      </div>
      <div class="summary-item" style="grid-column: 1 / -1; background: rgba(0,0,0,0.2); padding: 0.5rem 0.8rem; border-radius: 0.4rem; border: 1px solid rgba(255,255,255,0.06);">
        <span class="summary-label" style="font-size: 0.68rem; margin-bottom: 0.15rem;">SET PIECE & BREAKDOWN RETENTION</span>
        <span class="summary-val" style="font-size: 0.82rem; color: #cbd5e1; gap: 1.4rem;">
          <span>Ruck: <strong style="color:#f8fafc;">${setPieces.rucksWon}/${totalRucks} (${ruckPct})</strong></span>
          <span>Scrum: <strong style="color:#f8fafc;">${setPieces.scrumsWon}/${totalScrums} (${scrumPct})</strong></span>
          <span>Lineout: <strong style="color:#f8fafc;">${setPieces.lineoutsWon}/${totalLineouts} (${lineoutPct})</strong></span>
          <span>Maul: <strong style="color:#f8fafc;">${setPieces.maulsWon}/${setPieces.maulsWon + setPieces.maulsLost}</strong></span>
        </span>
      </div>`;

    const renderStatRow = (player: any, isSub = false) => {
      const s = player.stats;
      const opacity = isSub && !player.isUsed ? "opacity: 0.65;" : "";
      const tacklesTotal = s.tacklesMade + s.tacklesMissed;
      const pTacklePct =
        tacklesTotal > 0 ? Math.round((s.tacklesMade / tacklesTotal) * 100) : 0;

      return `
        <tr style="${opacity}">
          <td style="text-align: center;">
            <span class="player-num-badge" style="background:${teamColor};">${player.number}</span>
          </td>
          <td>
            <div class="player-role-title">
              ${getPlayerName(player.number, player.role)}
            </div>
          </td>
          <td style="text-align: right;">
            <span class="stat-num">${formatDist(s.distanceCovered)}</span>
          </td>
          <td style="text-align: right;">
            ${s.distanceCarried > 0 ? `<span class="stat-num" style="color:#38bdf8;">${formatDist(s.distanceCarried)}</span>` : `<span class="stat-zero">-</span>`}
          </td>
          <td style="text-align: center;">
            ${tacklesTotal > 0 ? `<span class="stat-num">${s.tacklesMade}/${tacklesTotal}</span> <span class="stat-sub">(${pTacklePct}%)</span>` : `<span class="stat-zero">-</span>`}
          </td>
          <td style="text-align: center;">
            ${s.triesScored > 0 ? `<span class="stat-highlight-gold">${s.triesScored}</span>` : `<span class="stat-zero">-</span>`}
          </td>
          <td style="text-align: center;">
            ${s.lineBreaks > 0 ? `<span class="stat-highlight-cyan">${s.lineBreaks}</span>` : `<span class="stat-zero">-</span>`}
          </td>
          <td style="text-align: center;">
            ${s.totalPasses > 0 ? `<span class="stat-num">${s.successfulPasses}/${s.totalPasses}</span>` : `<span class="stat-zero">-</span>`}
          </td>
          <td style="text-align: center;">
            ${s.totalKicks > 0 ? `<span class="stat-num">${s.successfulKicks}/${s.totalKicks}</span>` : `<span class="stat-zero">-</span>`}
          </td>
          <td style="text-align: center;">
            ${s.penaltiesConceded > 0 || s.knockOns > 0 ? `<span class="stat-num" style="${s.penaltiesConceded > 0 ? "color:#ef4444;" : "color:#f87171;"}">${s.penaltiesConceded}p / ${s.knockOns}k</span>` : `<span class="stat-zero">0</span>`}
          </td>
        </tr>`;
    };

    managerRosterTbody.innerHTML = `
      <tr class="section-divider-row"><td colspan="10">Starting XV</td></tr>
      ${teamPlayers.map((p: any) => renderStatRow(p)).join("")}
      <tr class="section-divider-row"><td colspan="10">Finishing Reserves</td></tr>
      ${benchSubs.map((s: any) => renderStatRow(s, true)).join("")}`;
  } else {
    if (managerRosterThead) {
      managerRosterThead.innerHTML = `
        <tr>
          <th style="width: 36px; text-align: center;">#</th>
          <th>Player</th>
          <th>Physicals</th>
          <th>Rating</th>
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
        <span class="summary-label">TACTICAL SYSTEM</span>
        <span class="summary-val">
          ${escapeHtml(teamDef.name)}
          <span class="summary-sub">(${game.formations[selectedManagerTeam].openAttack})</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">FORWARD PACK POWER</span>
        <span class="summary-val">
          ${packWeight} kg
          <span class="summary-sub">(${avgFwdWeight} kg avg)</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">DEFENSIVE LINE SPEED</span>
        <span class="summary-val">
          ${teamDef.lineSpeed.toFixed(1)} m/s
          <span class="summary-sub">(${game.formations[selectedManagerTeam].openDefence})</span>
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">PLAY TENDENCIES</span>
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
      const cond = getConditionInfo(player.stamina, isSub, player.isUsed);
      const opacity = isSub && !player.isUsed ? "opacity: 0.7;" : "";

      const statusBadge = isSub
        ? player.isUsed
          ? `<span class="group-tag" style="background:rgba(148,163,184,0.15); color:#94a3b8; border-color:transparent; margin-left: 0.4rem;">Subbed On</span>`
          : `<span class="group-tag" style="background:rgba(34,197,94,0.15); color:#4ade80; border-color:rgba(34,197,94,0.3); margin-left: 0.4rem;">Ready</span>`
        : "";

      return `
        <tr style="${opacity}">
          <td style="text-align: center;">
            <span class="player-num-badge" style="background:${teamColor};">${player.number}</span>
          </td>
          <td>
            <div class="player-role-title">
              ${getPlayerName(player.number, player.role)}
              ${statusBadge}
            </div>
          </td>
          <td>
            <span class="stat-num">${Math.round(player.weight)} kg</span>
            <span class="stat-sub" style="margin-left: 0.35rem;">· ${player.speed.toFixed(1)} m/s</span>
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
      <tr class="section-divider-row"><td colspan="5">Starting XV</td></tr>
      ${teamPlayers.map((p: any) => renderRosterRow(p)).join("")}
      <tr class="section-divider-row"><td colspan="5">Finishing Reserves</td></tr>
      ${benchSubs.map((s: any) => renderRosterRow(s, true)).join("")}`;
  }
};
