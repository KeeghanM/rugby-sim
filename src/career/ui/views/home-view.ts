import { escapeHtml } from "../../../html.ts";
import { createTile, registerStyles } from "../../../ui/index.ts";
import type { Career, Club } from "../../domain/index.ts";
import { roleName } from "../../domain/index.ts";
import { renderTable } from "../components/table.ts";
import {
  clubById,
  fixtureTeams,
  formatMoney,
  getOvrClass,
  getPlayerOverall,
} from "../formatters.ts";
import { getUpcomingManagedFixture } from "../../domain/index.ts";

const HOME_STYLES = `
  .career-home-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1rem;
  }
  .career-lead-panel {
    min-height: 260px;
  }
  .career-section {
    background: linear-gradient(180deg, rgb(15 23 42 / 92%) 0%, rgb(30 41 59 / 85%) 100%);
    border: 1px solid rgb(255 255 255 / 12%);
    border-radius: 0.65rem;
    padding: clamp(1.2rem, 2.5vw, 2rem);
    box-shadow: 0 6px 20px rgb(0 0 0 / 35%);
  }
  .career-home-grid .career-table-preview {
    grid-column: 1 / -1;
  }
  .career-section > header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    border-bottom: 1px solid rgb(255 255 255 / 12%);
    padding-bottom: 0.75rem;
  }
  .career-section > header h2 {
    margin: 0.15rem 0 0;
  }
  .career-section > header button {
    border: 1px solid rgb(56 189 248 / 30%);
    border-radius: 0.35rem;
    background: rgba(15, 23, 42, 0.6);
    color: #38bdf8;
    cursor: pointer;
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 750;
  }
`;

registerStyles("career-home", HOME_STYLES);

export const renderHome = (career: Career, club: Club): string => {
  const upcoming = getUpcomingManagedFixture(career);
  const isMatchDay = career.checkpoint === "matchDay";
  const plan = club.trainingPlan;

  const avgOvr = Math.round(
    club.squad.reduce((sum, p) => sum + getPlayerOverall(p), 0) /
      club.squad.length,
  );
  const avgFitness = Math.round(
    club.squad.reduce((sum, p) => sum + p.fitness, 0) / club.squad.length,
  );
  const injuredPlayers = club.squad.filter((p) => p.injury !== null);
  const unreadMessages = career.inbox.filter((m) => !m.read).length;

  const latestFixture = [...career.season.fixtures]
    .reverse()
    .find(
      (f) =>
        f.status === "played" &&
        f.result !== null &&
        (f.homeClubId === club.id || f.awayClubId === club.id),
    );

  let latestMatchTile = "";
  if (latestFixture && latestFixture.result) {
    const isHome = latestFixture.homeClubId === club.id;
    const oppId = isHome ? latestFixture.awayClubId : latestFixture.homeClubId;
    const opponent = clubById(career, oppId);
    const userScore = isHome
      ? latestFixture.result.homeScore
      : latestFixture.result.awayScore;
    const oppScore = isHome
      ? latestFixture.result.awayScore
      : latestFixture.result.homeScore;
    const won = userScore > oppScore;
    const drawn = userScore === oppScore;
    const outcomeText = drawn ? "DRAW" : won ? "VICTORY" : "DEFEAT";
    const outcomeColor = drawn ? "#facc15" : won ? "#4ade80" : "#ef4444";

    latestMatchTile = createTile({
      kicker: "Latest Result",
      action: { label: "Report →", datasetAttr: 'data-career-view="inbox"' },
      value: `${userScore} - ${oppScore}`,
      valueBadge: { text: outcomeText, color: outcomeColor },
      subtitle: `vs ${escapeHtml(opponent.name)} (${isHome ? "Home" : "Away"})`,
      footer: `Round ${latestFixture.round} Match`,
    });
  }

  let matchDayActionTile = "";
  if (isMatchDay && upcoming) {
    const { home, away } = fixtureTeams(career, upcoming);
    const isHome = upcoming.homeClubId === club.id;
    matchDayActionTile = `
      <section class="career-metric" style="border-color: rgba(56, 189, 248, 0.4); background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span class="career-kicker" style="color: #38bdf8;">Match Day Action</span>
          <span style="font-size: 0.72rem; color: #94a3b8;">Rd ${upcoming.round}</span>
        </div>
        <div style="margin-top: 0.4rem; font-size: 1rem; font-weight: 750; color: #f8fafc;">
          ${escapeHtml(home.name)} v ${escapeHtml(away.name)}
        </div>
        <p style="margin-top: 0.2rem; font-size: 0.72rem; color: #94a3b8;">${isHome ? "Home Stadium" : "Away Stadium"}</p>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap;">
          <button type="button" class="career-primary" data-watch-match style="font-size: 0.75rem; padding: 0.4rem 0.75rem;">🎬 Watch 3D</button>
          <button type="button" class="career-secondary-btn" data-advance style="font-size: 0.75rem; padding: 0.4rem 0.75rem;">⚡ Quick Sim</button>
        </div>
      </section>`;
  }

  let pendingEventHtml = "";
  if (career.pendingEvent) {
    pendingEventHtml = `
      <section class="career-lead-panel" style="grid-column: 1 / -1; border-left: 4px solid #38bdf8; background: rgba(56, 189, 248, 0.1); min-height: auto; padding: 1rem 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span class="career-kicker" style="color: #38bdf8;">Action Required</span>
            <h3 style="margin: 0.2rem 0; font-size: 1.15rem; color: #f8fafc;">${escapeHtml(career.pendingEvent.title)}</h3>
            <p style="margin: 0; color: #cbd5e1; font-size: 0.85rem;">${escapeHtml(career.pendingEvent.message)}</p>
          </div>
          <button type="button" class="career-primary" data-ack-event>Acknowledge</button>
        </div>
      </section>`;
  }

  const squadTile = createTile({
    kicker: "Squad Profile",
    action: {
      label: "Team Sheet →",
      datasetAttr: 'data-career-view="selection"',
    },
    value: avgOvr,
    valueBadge: {
      text: "OVR",
      color: "#38bdf8",
      style: `pointer-events: none;`,
    },
    content: `
      <div style="margin-top: 0.4rem; font-size: 0.78rem; color: #cbd5e1;">
        <span class="fitness" style="width: 36px;"><i style="width:${avgFitness}%"></i></span>
        <strong>${avgFitness}%</strong> Avg Condition
      </div>`,
    footer: `15 Starters · 8 Bench · ${club.squad.length} Squad`,
  });

  const medicalContent =
    injuredPlayers.length === 0
      ? `<strong style="margin: 0; font-size: 1.8rem; color: #4ade80;">0</strong> <span style="font-size: 0.78rem; color: #4ade80; font-weight: 700;">Sidelined</span>
       <p style="margin-top: 0.35rem; font-size: 0.75rem; color: #94a3b8;">Squad fully healthy & available</p>`
      : `<strong style="margin: 0; font-size: 1.8rem; color: #f87171;">${injuredPlayers.length}</strong> <span style="font-size: 0.78rem; color: #f87171; font-weight: 700;">Sidelined</span>
       <p style="margin-top: 0.35rem; font-size: 0.72rem; color: #fca5a5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
         ${injuredPlayers.map((p) => `${escapeHtml(p.name)} (${p.injury!.weeksRemaining}w)`).join(", ")}
       </p>`;

  const medicalTile = createTile({
    kicker: "Medical & Rehab",
    action: {
      label: "Rehab Wing →",
      datasetAttr: 'data-career-view="training"',
    },
    content: `<div style="margin-top: 0.6rem;">${medicalContent}</div>`,
    footer: `Medical Room Lvl ${club.facilities.medicalRoom}`,
  });

  const trainingTile = createTile({
    kicker: "Training Regimen",
    action: {
      label: "Training Center →",
      datasetAttr: 'data-career-view="training"',
    },
    content: `
      <div style="margin-top: 0.6rem;">
        <strong style="margin: 0; font-size: 1.4rem; color: #f8fafc;">${roleName(plan.focus)}</strong>
      </div>
      <p style="margin-top: 0.35rem; font-size: 0.78rem; color: #cbd5e1;">
        Intensity: <strong style="color: #38bdf8;">${roleName(plan.intensity)}</strong>
      </p>`,
    footer: `Gym Lvl ${club.facilities.gym} · Grounds Lvl ${club.facilities.trainingGround}`,
  });

  const playerWagesWeekly = club.squad.reduce((sum, p) => sum + p.wage, 0);
  const staffWagesWeekly = club.staff.reduce((sum, s) => sum + s.wage, 0);
  const totalWeeklyWages = playerWagesWeekly + staffWagesWeekly;

  // Expected monthly P&L (4 weeks: ~2 home matches gate income minus 4 weeks of wages)
  const estHomeGate = Math.round(
    (3200 + club.reputation * 55 + 60 * 45) * 18 * 0.72,
  );
  const estMonthlyIncome = estHomeGate * 2;
  const estMonthlyExpenses = totalWeeklyWages * 4;
  const estMonthlyPnL = estMonthlyIncome - estMonthlyExpenses;
  const isProfit = estMonthlyPnL >= 0;
  const pnlColor = isProfit ? "#4ade80" : "#f87171";
  const pnlText = isProfit
    ? `+${formatMoney(estMonthlyPnL)}/mo`
    : `-${formatMoney(Math.abs(estMonthlyPnL))}/mo`;

  const financesTile = createTile({
    kicker: "Club Finances",
    action: {
      label: "Finances →",
      datasetAttr: 'data-career-view="finances"',
    },
    value: formatMoney(club.balance),
    valueColor: "#38bdf8",
    content: `
      <div style="margin-top: 0.4rem; font-size: 0.78rem; color: #cbd5e1;">
        Monthly P&L: <strong style="color: ${pnlColor}; font-family: ui-monospace, monospace; font-size: 0.95rem;">${pnlText}</strong>
      </div>`,
    footer: `Wages: -${formatMoney(totalWeeklyWages)}/wk · Gate: +${formatMoney(estHomeGate)}`,
  });

  const commsTile = createTile({
    kicker: "Communications",
    action: { label: "Open Inbox →", datasetAttr: 'data-career-view="inbox"' },
    value: unreadMessages,
    valueColor: unreadMessages > 0 ? "#38bdf8" : "#94a3b8",
    valueBadge: {
      text: "Unread",
      color: unreadMessages > 0 ? "#38bdf8" : "#94a3b8",
    },
    subtitle: `<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${career.inbox[0]?.title ? escapeHtml(career.inbox[0].title) : "No new messages"}</span>`,
    footer: `Total Messages: ${career.inbox.length}`,
  });

  return `<div class="career-home-grid">
    ${pendingEventHtml}
    ${matchDayActionTile}
    ${latestMatchTile}
    ${squadTile}
    ${medicalTile}
    ${trainingTile}
    ${financesTile}
    ${commsTile}

    <!-- League Table Snapshot -->
    <section class="career-section career-table-preview">
      <header>
        <div>
          <span class="career-kicker">Competition</span>
          <h2>${escapeHtml(career.season.name)} Standings</h2>
        </div>
        <button type="button" data-career-view="league">Full table</button>
      </header>
      ${renderTable(career)}
    </section>
  </div>`;
};
