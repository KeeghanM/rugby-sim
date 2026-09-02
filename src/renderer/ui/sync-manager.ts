import type { GameState, Player, Substitute } from "../../domain.ts";
import { isForward } from "../../formations.ts";
import { escapeHtml } from "../../html.ts";
import type { UIContext } from "./create.ts";
import type { ManagerView } from "./manager-controller.ts";

type SquadPlayer = Player | Substitute;

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
      return "Reserve Hooker";
    case 17:
      return "Reserve Loosehead Prop";
    case 18:
      return "Reserve Tighthead Prop";
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

const getOverall = (player: Pick<Player, "skills">): number => {
  const avg =
    (player.skills.decision +
      player.skills.handling +
      player.skills.passing +
      player.skills.kicking +
      player.skills.tackling) *
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
  ctx: UIContext,
  selectedManagerTeam: 0 | 1,
  selectedManagerView: ManagerView,
) => {
  const {
    managerTeamSummary,
    managerRosterThead,
    managerRosterTbody,
    tabTeam0,
    tabTeam1,
  } = ctx;
  const teamDef = game.teams[selectedManagerTeam];
  const teamColor = teamDef.color;

  // Team selector labels and colors.
  if (tabTeam0) {
    ctx.tabTeam0Swatch.style.backgroundColor = game.teams[0].color;
    ctx.tabTeam0Label.textContent = game.teams[0].name;
    if (selectedManagerTeam === 0) {
      tabTeam0.style.borderBottomColor = game.teams[0].color;
    } else {
      tabTeam0.style.borderBottomColor = "transparent";
    }
  }
  if (tabTeam1) {
    ctx.tabTeam1Swatch.style.backgroundColor = game.teams[1].color;
    ctx.tabTeam1Label.textContent = game.teams[1].name;
    if (selectedManagerTeam === 1) {
      tabTeam1.style.borderBottomColor = game.teams[1].color;
    } else {
      tabTeam1.style.borderBottomColor = "transparent";
    }
  }

  const teamPlayers = game.players.filter(
    (player) => player.team === selectedManagerTeam,
  );
  const benchSubs = game.substitutes.filter(
    (player) => player.team === selectedManagerTeam,
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
    const sum = (read: (player: SquadPlayer) => number) =>
      all.reduce((total, player) => total + read(player), 0);
    const totalDistM = sum((player) => player.stats.distanceCovered);
    const totalCarriedM = sum((player) => player.stats.distanceCarried);
    const totalTacklesMade = sum((player) => player.stats.tacklesMade);
    const totalTacklesMissed = sum((player) => player.stats.tacklesMissed);
    const totalTries = sum((player) => player.stats.triesScored);
    const totalBreaks = sum((player) => player.stats.lineBreaks);
    const totalPens = sum((player) => player.stats.penaltiesConceded);
    const totalKnockOns = sum((player) => player.stats.knockOns);
    const setPieces = game.teamStats[selectedManagerTeam];
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

    const renderStatRow = (player: SquadPlayer, isSub = false) => {
      const s = player.stats;
      const isUsed = "isUsed" in player && player.isUsed;
      const opacity = isSub && !isUsed ? "opacity: 0.65;" : "";
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
      ${teamPlayers.map((player) => renderStatRow(player)).join("")}
      <tr class="section-divider-row"><td colspan="10">Finishing Reserves</td></tr>
      ${benchSubs.map((player) => renderStatRow(player, true)).join("")}`;
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

    const forwards = teamPlayers.filter((player) => isForward(player));
    const packWeight = forwards.reduce(
      (sum, player) => sum + Math.round(player.weight),
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

    const renderRosterRow = (player: SquadPlayer, isSub = false) => {
      const ovr = getOverall(player);
      const ovrClass = getOvrClass(ovr);
      const isUsed = "isUsed" in player && player.isUsed;
      const cond = getConditionInfo(player.stamina, isSub, isUsed);
      const opacity = isSub && !isUsed ? "opacity: 0.7;" : "";

      const statusBadge = isSub
        ? isUsed
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
      ${teamPlayers.map((player) => renderRosterRow(player)).join("")}
      <tr class="section-divider-row"><td colspan="5">Finishing Reserves</td></tr>
      ${benchSubs.map((player) => renderRosterRow(player, true)).join("")}`;
  }
};
