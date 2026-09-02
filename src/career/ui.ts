import { escapeHtml } from "../html.ts";
import { simulateMatch } from "../simulation.ts";
import {
  acknowledgeEvent,
  advanceCareer,
  CLUBS,
  createCareer,
  createMatchInputForFixture,
  deleteCareer,
  deriveStandings,
  getUpcomingManagedFixture,
  loadCareer,
  markInboxRead,
  optimizeSquadSelection,
  ROLE_GROUPS,
  saveCareer,
  setClubTrainingPlan,
  swapSquadPlayers,
  TRAINING_FOCUSES,
  TRAINING_INTENSITIES,
  type Career,
  type Club,
  type Fixture,
  type InboxMessage,
  type Player,
  type TrainingFocus,
  type TrainingIntensity,
} from "./index.ts";

const views = {
  home: "Club Office",
  selection: "Team Sheet",
  training: "Training",
  inbox: "Inbox",
  squad: "Squad",
  league: "League",
  fixtures: "Fixtures",
} as const;

type CareerView = keyof typeof views;

const SLOT_NAMES = [
  "Loosehead Prop",
  "Hooker",
  "Tighthead Prop",
  "Lock (4)",
  "Lock (5)",
  "Blindside Flanker",
  "Openside Flanker",
  "Number Eight",
  "Scrum Half",
  "Fly Half",
  "Left Wing",
  "Inside Centre",
  "Outside Centre",
  "Right Wing",
  "Full Back",
  "Reserve Hooker",
  "Reserve Loosehead Prop",
  "Reserve Tighthead Prop",
  "Reserve Lock",
  "Reserve Back Row",
  "Reserve Scrum Half",
  "Reserve Fly Half",
  "Reserve Outside Back",
] as const;

const checkpointLabels = {
  monday: "Monday planning",
  thursday: "Thursday selection",
  matchDay: "Match day",
  postMatch: "Post-match review",
  seasonEnd: "Season complete",
} as const;

const advanceLabels = {
  monday: "Advance to Thursday",
  thursday: "Advance to match day",
  matchDay: "Simulate round",
  postMatch: "Start next week",
  seasonEnd: "Season complete",
} as const;

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDist = (d: number) =>
  d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`;

const roleName = (role: string) =>
  role
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());

const getPlayerOverall = (player: Player): number =>
  Math.round((player.attack + player.defence + player.fitness) / 3);

const getOvrClass = (ovr: number): string => {
  if (ovr >= 78) return "ovr-elite";
  if (ovr >= 68) return "ovr-good";
  return "ovr-solid";
};

const clubById = (career: Career, id: string) => {
  const club = career.season.clubs.find((candidate) => candidate.id === id);
  if (!club) throw new Error(`Unknown club: ${id}`);
  return club;
};

const fixtureTeams = (career: Career, fixture: Fixture) => ({
  home: clubById(career, fixture.homeClubId),
  away: clubById(career, fixture.awayClubId),
});

const renderFixture = (career: Career, fixture: Fixture) => {
  const { home, away } = fixtureTeams(career, fixture);
  const managed =
    home.id === career.managedClubId || away.id === career.managedClubId;
  return `<div class="career-fixture ${managed ? "managed" : ""}">
    <time>${formatDate(fixture.date)}</time>
    <span class="fixture-club home">${escapeHtml(home.name)}</span>
    <strong>${fixture.result ? `${fixture.result.homeScore} - ${fixture.result.awayScore}` : "v"}</strong>
    <span class="fixture-club">${escapeHtml(away.name)}</span>
  </div>`;
};

const renderTable = (career: Career, limit?: number) => {
  const standings = deriveStandings(career);
  return `<div class="career-table-wrap"><table class="career-table">
    <thead><tr><th>Pos</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Diff</th><th>Pts</th></tr></thead>
    <tbody>${standings
      .slice(0, limit)
      .map(
        (
          row,
          index,
        ) => `<tr class="${row.clubId === career.managedClubId ? "managed" : ""}">
          <td>${index + 1}</td><td>${escapeHtml(row.clubName)}</td><td>${row.played}</td><td>${row.won}</td><td>${row.drawn}</td><td>${row.lost}</td><td>${row.pointsDifference > 0 ? "+" : ""}${row.pointsDifference}</td><td><strong>${row.tablePoints}</strong></td>
        </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
};

const renderHome = (career: Career, club: Club) => {
  const upcoming = getUpcomingManagedFixture(career);
  const isMatchDay = career.checkpoint === "matchDay";
  const isThursday = career.checkpoint === "thursday";
  const isMonday = career.checkpoint === "monday";
  const isPostMatch = career.checkpoint === "postMatch";
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

  // Find latest played fixture for managed club
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

    latestMatchTile = `
      <section class="career-metric">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span class="career-kicker">Latest Result</span>
          <button type="button" class="career-link-btn" data-career-view="inbox" style="font-size: 0.72rem; color: #38bdf8;">Report →</button>
        </div>
        <div style="display: flex; align-items: baseline; gap: 0.6rem; margin-top: 0.5rem;">
          <strong style="margin: 0; font-size: 1.8rem; font-family: ui-monospace, monospace; color: #f8fafc;">${userScore} - ${oppScore}</strong>
          <span class="group-tag" style="background: ${outcomeColor}22; color: ${outcomeColor}; border-color: ${outcomeColor}55; font-size: 0.68rem;">
            ${outcomeText}
          </span>
        </div>
        <p style="margin-top: 0.35rem; font-size: 0.78rem; color: #cbd5e1;">vs ${escapeHtml(opponent.name)} (${isHome ? "Home" : "Away"})</p>
        <p style="margin-top: 0.2rem; font-size: 0.72rem; color: #94a3b8;">Round ${latestFixture.round} Match</p>
      </section>`;
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

  return `<div class="career-home-grid">
    ${pendingEventHtml}
    ${matchDayActionTile}
    ${latestMatchTile}

    <!-- Squad Profile Card -->
    <section class="career-metric">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="career-kicker">Squad Profile</span>
        <button type="button" class="career-link-btn" data-career-view="selection" style="font-size: 0.72rem; color: #38bdf8;">Team Sheet →</button>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.6rem;">
        <strong style="margin: 0; font-size: 1.8rem;">${avgOvr}</strong>
        <span class="ovr-badge ${getOvrClass(avgOvr)}" style="pointer-events: none;">OVR</span>
      </div>
      <div style="margin-top: 0.4rem; font-size: 0.78rem; color: #cbd5e1;">
        <span class="fitness" style="width: 36px;"><i style="width:${avgFitness}%"></i></span>
        <strong>${avgFitness}%</strong> Avg Condition
      </div>
      <p style="margin-top: 0.35rem; font-size: 0.72rem; color: #94a3b8;">15 Starters · 8 Bench · 23 Squad</p>
    </section>

    <!-- Medical & Injuries Card -->
    <section class="career-metric">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="career-kicker">Medical & Rehab</span>
        <button type="button" class="career-link-btn" data-career-view="training" style="font-size: 0.72rem; color: #38bdf8;">Rehab Wing →</button>
      </div>
      <div style="margin-top: 0.6rem;">
        ${
          injuredPlayers.length === 0
            ? `<strong style="margin: 0; font-size: 1.8rem; color: #4ade80;">0</strong> <span style="font-size: 0.78rem; color: #4ade80; font-weight: 700;">Sidelined</span>
               <p style="margin-top: 0.35rem; font-size: 0.75rem; color: #94a3b8;">Squad fully healthy & available</p>`
            : `<strong style="margin: 0; font-size: 1.8rem; color: #f87171;">${injuredPlayers.length}</strong> <span style="font-size: 0.78rem; color: #f87171; font-weight: 700;">Sidelined</span>
               <p style="margin-top: 0.35rem; font-size: 0.72rem; color: #fca5a5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                 ${injuredPlayers.map((p) => `${escapeHtml(p.name)} (${p.injury!.weeksRemaining}w)`).join(", ")}
               </p>`
        }
      </div>
      <p style="margin-top: 0.35rem; font-size: 0.72rem; color: #94a3b8;">Medical Room Lvl ${club.facilities.medicalRoom}</p>
    </section>

    <!-- Training Regimen Card -->
    <section class="career-metric">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="career-kicker">Training Regimen</span>
        <button type="button" class="career-link-btn" data-career-view="training" style="font-size: 0.72rem; color: #38bdf8;">Training Center →</button>
      </div>
      <div style="margin-top: 0.6rem;">
        <strong style="margin: 0; font-size: 1.4rem; color: #f8fafc;">${roleName(plan.focus)}</strong>
      </div>
      <p style="margin-top: 0.35rem; font-size: 0.78rem; color: #cbd5e1;">
        Intensity: <strong style="color: #38bdf8;">${roleName(plan.intensity)}</strong>
      </p>
      <p style="margin-top: 0.25rem; font-size: 0.72rem; color: #94a3b8;">Gym Lvl ${club.facilities.gym} · Grounds Lvl ${club.facilities.trainingGround}</p>
    </section>

    <!-- Operations & Finances Card -->
    <section class="career-metric">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="career-kicker">Club Operations</span>
      </div>
      <div style="margin-top: 0.6rem;">
        <strong style="margin: 0; font-size: 1.5rem; color: #38bdf8; font-family: ui-monospace, monospace;">${formatMoney(club.balance)}</strong>
      </div>
      <p style="margin-top: 0.35rem; font-size: 0.78rem; color: #cbd5e1;">
        Staff Level: <strong>Lvl ${club.staffLevel}</strong>
      </p>
      <p style="margin-top: 0.25rem; font-size: 0.72rem; color: #94a3b8;">Club Reputation: ${club.reputation}/100</p>
    </section>

    <!-- Communications / Inbox Card -->
    <section class="career-metric">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="career-kicker">Communications</span>
        <button type="button" class="career-link-btn" data-career-view="inbox" style="font-size: 0.72rem; color: #38bdf8;">Open Inbox →</button>
      </div>
      <div style="margin-top: 0.6rem;">
        <strong style="margin: 0; font-size: 1.5rem; color: ${unreadMessages > 0 ? "#38bdf8" : "#94a3b8"};">${unreadMessages}</strong>
        <span style="font-size: 0.78rem; color: ${unreadMessages > 0 ? "#38bdf8" : "#94a3b8"}; font-weight: 700;">Unread</span>
      </div>
      <p style="margin-top: 0.35rem; font-size: 0.75rem; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${career.inbox[0]?.title ? escapeHtml(career.inbox[0].title) : "No new messages"}
      </p>
      <p style="margin-top: 0.25rem; font-size: 0.72rem; color: #94a3b8;">Total Messages: ${career.inbox.length}</p>
    </section>

    <!-- League Table Snapshot -->
    <section class="career-section career-table-preview" style="grid-column: 1 / -1;">
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

const renderSkillBar = (label: string, value: number, color = "#38bdf8") => `
  <div style="display: grid; grid-template-columns: 140px 1fr 36px; gap: 0.75rem; align-items: center; font-size: 0.75rem;">
    <span style="color: #cbd5e1; font-weight: 600;">${label}</span>
    <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
      <div style="width: ${value}%; height: 100%; background: ${color}; border-radius: 3px;"></div>
    </div>
    <span style="font-family: ui-monospace, monospace; font-weight: 700; color: #f8fafc; text-align: right;">${value}</span>
  </div>`;

const renderPlayerCardModal = (
  player: Player,
  club: Club,
  slotIndex?: number,
) => {
  const ovr = getPlayerOverall(player);
  const decision = Math.round(
    Math.min(99, player.attack * 0.5 + player.defence * 0.5),
  );
  const handling = Math.round(Math.min(99, player.attack * 0.9 + 5));
  const passing = Math.round(Math.min(99, player.attack * 0.85 + 8));
  const kicking = Math.round(Math.min(99, player.attack * 0.8 + 12));
  const tackling = Math.round(Math.min(99, player.defence * 0.95 + 4));

  const slotInfo =
    slotIndex !== undefined
      ? `#${slotIndex + 1} ${SLOT_NAMES[slotIndex]}`
      : roleName(player.role);

  const rec = player.careerRecord;
  const totalTackles = rec.tacklesMade + rec.tacklesMissed;
  const tacklePct =
    totalTackles > 0 ? Math.round((rec.tacklesMade / totalTackles) * 100) : 0;
  const passPct =
    rec.totalPasses > 0
      ? Math.round((rec.successfulPasses / rec.totalPasses) * 100)
      : 0;
  const kickPct =
    rec.totalKicks > 0
      ? Math.round((rec.successfulKicks / rec.totalKicks) * 100)
      : 0;

  return `
    <div class="career-modal-backdrop" data-backdrop-close="player">
      <div class="career-modal-dialog" style="max-width: 620px;">
        <div class="career-modal-header">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div class="player-shirt" style="--team-color:${club.color}; width: 3.2rem; height: 2.8rem; font-size: 1.1rem; margin: 0;">
              <span>${slotIndex !== undefined ? slotIndex + 1 : ""}</span>
            </div>
            <div>
              <span class="career-kicker">${escapeHtml(club.name)} · Player Profile</span>
              <h3 style="margin: 0.2rem 0; font-size: 1.3rem; color: #f8fafc; display: flex; align-items: center; gap: 0.6rem;">
                ${escapeHtml(player.name)}
                <span class="ovr-badge ${getOvrClass(ovr)}">OVR ${ovr}</span>
              </h3>
              <div style="font-size: 0.78rem; color: #94a3b8; display: flex; gap: 0.6rem; align-items: center; margin-top: 0.2rem;">
                <span style="color: #38bdf8; font-weight: 700;">${slotInfo}</span>
                <span>·</span>
                <span>Age ${player.age}</span>
                <span>·</span>
                <span>Natural: <strong>${roleName(player.role)}</strong></span>
              </div>
            </div>
          </div>
          <button type="button" class="career-modal-close" data-close-player-card aria-label="Close">✕</button>
        </div>
        <div class="career-modal-body" style="display: grid; gap: 1.15rem; max-height: 75vh; overflow-y: auto;">
          <!-- Health / Injury Alert if injured -->
          ${
            player.injury
              ? `<div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 0.45rem; padding: 0.75rem 1rem; color: #fca5a5; display: flex; align-items: center; gap: 0.6rem;">
                  <span style="font-size: 1.1rem;">⚠️</span>
                  <div>
                    <strong style="color: #ef4444;">Injured: ${escapeHtml(player.injury.type)}</strong> (${player.injury.severity})
                    <div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 0.15rem;">Estimated return: ${player.injury.weeksRemaining} week${player.injury.weeksRemaining > 1 ? "s" : ""}</div>
                  </div>
                </div>`
              : ""
          }

          <!-- 3 Main Pillars -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.65rem;">
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.45rem; padding: 0.75rem; text-align: center;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Attack Rating</span>
              <strong style="display: block; font-size: 1.4rem; color: #38bdf8; font-family: ui-monospace, monospace; margin-top: 0.2rem;">${player.attack}</strong>
            </div>
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.45rem; padding: 0.75rem; text-align: center;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Defence Rating</span>
              <strong style="display: block; font-size: 1.4rem; color: #4ade80; font-family: ui-monospace, monospace; margin-top: 0.2rem;">${player.defence}</strong>
            </div>
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.45rem; padding: 0.75rem; text-align: center;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Condition</span>
              <strong style="display: block; font-size: 1.4rem; color: #facc15; font-family: ui-monospace, monospace; margin-top: 0.2rem;">${player.fitness}%</strong>
            </div>
          </div>

          <!-- Career Statistics & History -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.5rem; padding: 1rem; display: grid; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: 0.72rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">Season Career Record</span>
              <span style="font-size: 0.75rem; color: #94a3b8; font-family: ui-monospace, monospace;">
                ${rec.appearances} Apps (${rec.starts} Starts, ${rec.subAppearances} Subs)
              </span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.65rem; font-size: 0.8rem;">
              <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
                <span style="color: #94a3b8; font-size: 0.68rem; display: block;">SCORING</span>
                <strong style="color: #facc15; font-size: 1.05rem;">${rec.tries}</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">Tries</span> · <strong style="color: #38bdf8;">${rec.lineBreaks}</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">Breaks</span>
              </div>
              <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
                <span style="color: #94a3b8; font-size: 0.68rem; display: block;">TACKLE %</span>
                <strong style="color: #4ade80; font-size: 1.05rem;">${tacklePct}%</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">(${rec.tacklesMade}/${totalTackles})</span>
              </div>
              <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
                <span style="color: #94a3b8; font-size: 0.68rem; display: block;">METRES CARRIED</span>
                <strong style="color: #38bdf8; font-size: 1.05rem;">${formatDist(rec.distanceCarried)}</strong>
              </div>
              <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
                <span style="color: #94a3b8; font-size: 0.68rem; display: block;">PASSING ACCURACY</span>
                <strong style="color: #f8fafc; font-size: 1.05rem;">${passPct}%</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">(${rec.successfulPasses}/${rec.totalPasses})</span>
              </div>
              <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
                <span style="color: #94a3b8; font-size: 0.68rem; display: block;">KICK SUCCESS</span>
                <strong style="color: #f8fafc; font-size: 1.05rem;">${kickPct}%</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">(${rec.successfulKicks}/${rec.totalKicks})</span>
              </div>
              <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
                <span style="color: #94a3b8; font-size: 0.68rem; display: block;">DISCIPLINE / ERRORS</span>
                <strong style="color: ${rec.penaltiesConceded > 0 ? "#f87171" : "#cbd5e1"}; font-size: 1.05rem;">${rec.penaltiesConceded}p</strong> · <strong style="color: #cbd5e1;">${rec.knockOns}k</strong>
              </div>
            </div>
          </div>

          <!-- Technical Skills Breakdown -->
          <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgb(255 255 255 / 8%); border-radius: 0.5rem; padding: 1rem; display: grid; gap: 0.65rem;">
            <span style="font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Technical Breakdown</span>
            ${renderSkillBar("Decision Making", decision, "#60a5fa")}
            ${renderSkillBar("Handling & Catching", handling, "#38bdf8")}
            ${renderSkillBar("Passing Execution", passing, "#4ade80")}
            ${renderSkillBar("Kicking Range", kicking, "#facc15")}
            ${renderSkillBar("Tackling & Contact", tackling, "#f472b6")}
          </div>
        </div>
      </div>
    </div>`;
};

type SimulationProgress = {
  round: number;
  percent: number;
  fixtureText: string;
  results: Array<{ homeName: string; awayName: string; score: string }>;
};

const renderSimulationModal = (sim: SimulationProgress) => `
  <div class="career-modal-backdrop">
    <div class="career-modal-dialog" style="max-width: 520px;">
      <div class="career-modal-header" style="justify-content: center; text-align: center;">
        <div>
          <span class="career-kicker">Match Simulation Engine</span>
          <h3 style="margin: 0.25rem 0 0; font-size: 1.25rem; color: #f8fafc;">
            ⚡ Simulating Round ${sim.round}
          </h3>
        </div>
      </div>
      <div class="career-modal-body" style="padding: 1.5rem 1.25rem; display: grid; gap: 1.25rem;">
        <!-- Progress Bar and Status -->
        <div style="display: grid; gap: 0.5rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem;">
            <span style="color: #cbd5e1; font-weight: 500;">${escapeHtml(sim.fixtureText)}</span>
            <strong style="color: #38bdf8; font-family: ui-monospace, monospace;">${Math.round(sim.percent)}%</strong>
          </div>
          <div style="height: 8px; background: #0f172a; border-radius: 4px; overflow: hidden; border: 1px solid rgb(255 255 255 / 12%);">
            <div style="width: ${sim.percent}%; height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); border-radius: 4px; transition: width 0.15s ease;"></div>
          </div>
        </div>

        <!-- Fixture Results Feed -->
        <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgb(255 255 255 / 8%); border-radius: 0.45rem; padding: 0.75rem 1rem; display: grid; gap: 0.45rem; min-height: 90px;">
          <span style="font-size: 0.68rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Fixtures Status</span>
          ${
            sim.results.length === 0
              ? `<div style="font-size: 0.78rem; color: #64748b; font-style: italic; padding: 0.5rem 0;">Computing player decisions and match phases...</div>`
              : sim.results
                  .map(
                    (r) => `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; border-top: 1px solid rgb(255 255 255 / 6%); padding-top: 0.35rem;">
                  <span style="color: #f1f5f9;">${escapeHtml(r.homeName)} vs ${escapeHtml(r.awayName)}</span>
                  <strong style="color: #38bdf8; font-family: ui-monospace, monospace;">${r.score}</strong>
                </div>`,
                  )
                  .join("")
          }
        </div>
      </div>
    </div>
  </div>`;

const renderSwapModal = (club: Club, swapIndex: number) => {
  const current = club.squad[swapIndex];
  const currentSlot = SLOT_NAMES[swapIndex];
  const requiredGroup = ROLE_GROUPS[current.role];

  return `
    <div class="career-modal-backdrop" data-backdrop-close="swap">
      <div class="career-modal-dialog">
        <div class="career-modal-header">
          <div>
            <span class="career-kicker">Swap Player</span>
            <h3 style="margin: 0.2rem 0; font-size: 1.15rem; color: #f8fafc;">
              Swapping #${swapIndex + 1} ${escapeHtml(current.name)}
            </h3>
            <span style="font-size: 0.78rem; color: #94a3b8;">
              Position: <strong style="color: #38bdf8;">${currentSlot}</strong> (${roleName(current.role)})
            </span>
          </div>
          <button type="button" class="career-modal-close" data-close-swap-modal aria-label="Cancel">✕</button>
        </div>
        <div class="career-modal-body">
          <p style="margin: 0 0 0.75rem; font-size: 0.8rem; color: #94a3b8;">
            Select a player below to move into the <strong>${currentSlot}</strong> slot:
          </p>
          <div class="career-table-wrap" style="max-height: 55vh; overflow-y: auto;">
            <table class="career-table">
              <thead>
                <tr>
                  <th style="width: 36px; text-align: center;">#</th>
                  <th>Player</th>
                  <th>Current Slot</th>
                  <th style="text-align: center;">OVR</th>
                  <th style="text-align: center;">Fitness</th>
                  <th>Status & Match</th>
                  <th style="text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${club.squad
                  .map((player, index) => {
                    if (index === swapIndex) return "";
                    const ovr = getPlayerOverall(player);
                    const isExact = player.role === current.role;
                    const isGroup = ROLE_GROUPS[player.role] === requiredGroup;
                    const matchBadge = player.injury
                      ? `<span class="group-tag" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.4);">Injured (${player.injury.weeksRemaining}w)</span>`
                      : isExact
                        ? `<span class="group-tag" style="background:rgba(34,197,94,0.15); color:#4ade80; border-color:rgba(34,197,94,0.3);">✓ Natural Role</span>`
                        : isGroup
                          ? `<span class="group-tag" style="background:rgba(56,189,248,0.15); color:#38bdf8; border-color:rgba(56,189,248,0.3);">Role Group</span>`
                          : `<span class="group-tag" style="background:rgba(148,163,184,0.1); color:#94a3b8; border-color:transparent;">Alternate</span>`;

                    return `
                      <tr style="${player.injury ? "opacity: 0.65;" : ""}">
                        <td style="text-align: center;">
                          <span class="player-num-badge" style="background:${club.color}; width: 22px; height: 22px; font-size: 0.7rem;">${index + 1}</span>
                        </td>
                        <td>
                          <button type="button" class="career-link-btn" data-view-player="${player.id}">
                            ${escapeHtml(player.name)}
                          </button>
                          <div style="font-size: 0.72rem; color: #94a3b8;">${roleName(player.role)} · Age ${player.age}</div>
                        </td>
                        <td style="font-size: 0.76rem; color: #cbd5e1;">${SLOT_NAMES[index]}</td>
                        <td style="text-align: center;">
                          <button type="button" class="ovr-badge ${getOvrClass(ovr)}" data-view-player="${player.id}">
                            OVR ${ovr}
                          </button>
                        </td>
                        <td style="text-align: center;">
                          <span class="fitness"><i style="width:${player.fitness}%"></i></span>${player.fitness}%
                        </td>
                        <td>${matchBadge}</td>
                        <td style="text-align: center;">
                          <button type="button" class="career-primary" style="padding: 0.3rem 0.75rem; font-size: 0.72rem;" data-confirm-swap="${index}">
                            Swap In
                          </button>
                        </td>
                      </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
};

const renderSelection = (club: Club, selectedSwapIndex: number | null) => {
  const starters = club.squad.slice(0, 15);
  const bench = club.squad.slice(15, 23);

  const renderRow = (player: Player, index: number, slotName: string) => {
    const ovr = getPlayerOverall(player);
    const ovrClass = getOvrClass(ovr);

    return `
      <tr style="${player.injury ? "background: rgba(239,68,68,0.08);" : ""}">
        <td style="text-align: center;">
          <span class="player-num-badge" style="background:${club.color};">${index + 1}</span>
        </td>
        <td>
          <div class="player-role-title">
            <button type="button" class="career-link-btn" data-view-player="${player.id}">
              ${escapeHtml(player.name)}
            </button>
            <span class="group-tag" style="font-size:0.65rem;">${slotName}</span>
            ${
              player.injury
                ? `<span class="group-tag" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.4); font-size:0.65rem;">⚠️ ${escapeHtml(player.injury.type)} (${player.injury.weeksRemaining}w)</span>`
                : ""
            }
          </div>
        </td>
        <td style="text-align: center;">${player.age}</td>
        <td>${roleName(player.role)}</td>
        <td style="text-align: center;">
          <button type="button" class="ovr-badge ${ovrClass}" data-view-player="${player.id}">
            OVR ${ovr}
          </button>
        </td>
        <td style="text-align: center;">${player.attack}</td>
        <td style="text-align: center;">${player.defence}</td>
        <td style="text-align: center;">
          <span class="fitness"><i style="width:${player.fitness}%"></i></span>${player.fitness}%
        </td>
        <td style="text-align: center;">
          <button type="button" class="career-swap-btn" data-open-swap="${index}">
            Swap
          </button>
        </td>
      </tr>`;
  };

  return `<section class="career-section">
    <header style="flex-wrap: wrap;">
      <div>
        <span class="career-kicker">Matchday Selection</span>
        <h2>${escapeHtml(club.name)} Team Sheet</h2>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
        <button type="button" class="career-secondary-btn" data-auto-pick="ovr">⭐ Pick Best (OVR)</button>
        <button type="button" class="career-secondary-btn" data-auto-pick="fitness">⚡ Pick Fittest</button>
      </div>
    </header>

    <div class="career-table-wrap">
      <table class="career-table squad">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>Player & Slot</th>
            <th style="text-align: center;">Age</th>
            <th>Natural Role</th>
            <th style="text-align: center;">Overall</th>
            <th style="text-align: center;">Attack</th>
            <th style="text-align: center;">Defence</th>
            <th style="text-align: center;">Fitness</th>
            <th style="text-align: center;">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr class="section-divider-row"><td colspan="9" style="background: rgb(30 41 59 / 70%); font-weight: 800; color: #38bdf8; padding: 0.4rem 0.75rem; text-transform: uppercase; font-size: 0.72rem;">Starting XV (1 - 15)</td></tr>
          ${starters.map((p, i) => renderRow(p, i, SLOT_NAMES[i])).join("")}
          <tr class="section-divider-row"><td colspan="9" style="background: rgb(30 41 59 / 70%); font-weight: 800; color: #38bdf8; padding: 0.4rem 0.75rem; text-transform: uppercase; font-size: 0.72rem;">Finishing Reserves (16 - 23)</td></tr>
          ${bench.map((p, i) => renderRow(p, i + 15, SLOT_NAMES[i + 15])).join("")}
        </tbody>
      </table>
    </div>

    ${selectedSwapIndex !== null ? renderSwapModal(club, selectedSwapIndex) : ""}
  </section>`;
};

const renderTraining = (club: Club) => {
  const plan = club.trainingPlan;
  const injuredCount = club.squad.filter((p) => p.injury !== null).length;

  const focusDescriptions: Record<TrainingFocus, string> = {
    balanced: "Standard balanced preparation across ball skills and fitness.",
    strength:
      "Heavy resistance and contact training. Improves collision power and breakdown dominance (+Gym boost).",
    conditioning:
      "High aerobic conditioning. Boosts stamina and match fitness across the squad.",
    handling:
      "Catch, pass, and offloading under pressure. Enhances attacking execution.",
    attack:
      "Backline strike plays, running lines, and set-piece launch technique.",
    defence:
      "Defensive line speed, tackle technique, and turnover contact drills.",
    recovery:
      "Active rehab, hydrotherapy, and light mobility. +15% fitness boost, -50% injury risk, faster return for injured players.",
  };

  const intensityDescriptions: Record<TrainingIntensity, string> = {
    light:
      "Low workload. +10% fitness recovery, minimal injury risk (0.5%), small skill progression.",
    medium:
      "Standard balanced workload. Standard fitness maintenance and moderate skill gains.",
    high: "Intense match-simulation load. -8% fitness cost, higher injury risk (6%), maximum skill development.",
  };

  return `<section class="career-section">
    <header style="flex-wrap: wrap;">
      <div>
        <span class="career-kicker">Weekly Training Regimen</span>
        <h2>${escapeHtml(club.name)} Training Center</h2>
      </div>
      <div style="display: flex; gap: 0.6rem; font-size: 0.75rem; color: #94a3b8; align-items: center;">
        <span>Gym <strong>Lvl ${club.facilities.gym}</strong></span>
        <span>·</span>
        <span>Training Ground <strong>Lvl ${club.facilities.trainingGround}</strong></span>
        <span>·</span>
        <span>Medical <strong>Lvl ${club.facilities.medicalRoom}</strong></span>
      </div>
    </header>

    <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 1.25rem;">
      <!-- Training Configuration Card -->
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.65rem; padding: 1.25rem; display: grid; gap: 1.25rem;">
        <div>
          <span class="career-kicker">1. Weekly Primary Focus</span>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.4rem; margin-top: 0.6rem;">
            ${TRAINING_FOCUSES.map(
              (
                f,
              ) => `<button type="button" class="career-swap-btn ${plan.focus === f ? "active" : ""}" data-set-focus="${f}" style="padding: 0.5rem 0.65rem; text-align: center;">
                ${roleName(f)}
              </button>`,
            ).join("")}
          </div>
          <p style="font-size: 0.78rem; color: #cbd5e1; margin-top: 0.65rem; background: rgba(0,0,0,0.25); padding: 0.6rem 0.8rem; border-radius: 0.35rem; border-left: 3px solid #38bdf8;">
            ${focusDescriptions[plan.focus]}
          </p>
        </div>

        <div>
          <span class="career-kicker">2. Session Workload & Intensity</span>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem; margin-top: 0.6rem;">
            ${TRAINING_INTENSITIES.map(
              (
                i,
              ) => `<button type="button" class="career-swap-btn ${plan.intensity === i ? "active" : ""}" data-set-intensity="${i}" style="padding: 0.5rem 0.65rem; text-align: center;">
                ${roleName(i)}
              </button>`,
            ).join("")}
          </div>
          <p style="font-size: 0.78rem; color: #cbd5e1; margin-top: 0.65rem; background: rgba(0,0,0,0.25); padding: 0.6rem 0.8rem; border-radius: 0.35rem; border-left: 3px solid ${plan.intensity === "high" ? "#ef4444" : plan.intensity === "medium" ? "#38bdf8" : "#4ade80"};">
            ${intensityDescriptions[plan.intensity]}
          </p>
        </div>
      </div>

      <!-- Medical & Injury Room Card -->
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.65rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span class="career-kicker">Medical & Rehab Wing</span>
          <span style="font-size: 0.75rem; color: ${injuredCount > 0 ? "#f87171" : "#4ade80"}; font-weight: 700;">
            ${injuredCount > 0 ? `${injuredCount} Player${injuredCount > 1 ? "s" : ""} Sidelined` : "Squad Fully Fit"}
          </span>
        </div>

        ${
          injuredCount > 0
            ? `<div style="display: grid; gap: 0.5rem; overflow-y: auto; max-height: 280px;">
                ${club.squad
                  .filter((p) => p.injury !== null)
                  .map(
                    (p) => `
                  <div style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: 0.45rem; padding: 0.65rem 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <button type="button" class="career-link-btn" data-view-player="${p.id}" style="color:#f8fafc; font-weight: 750;">
                        ${escapeHtml(p.name)}
                      </button>
                      <div style="font-size: 0.72rem; color: #fca5a5; margin-top: 0.15rem;">
                        ${escapeHtml(p.injury!.type)} · <strong style="color: #cbd5e1;">${p.injury!.weeksRemaining} wk${p.injury!.weeksRemaining > 1 ? "s" : ""} remaining</strong>
                      </div>
                    </div>
                    <span class="group-tag" style="background:rgba(239,68,68,0.25); color:#fca5a5; font-size: 0.65rem;">${p.injury!.severity}</span>
                  </div>`,
                  )
                  .join("")}
              </div>`
            : `<div style="padding: 2rem 1rem; text-align: center; color: #94a3b8; font-size: 0.85rem; background: rgba(0,0,0,0.2); border-radius: 0.45rem;">
                <div style="font-size: 1.6rem; margin-bottom: 0.4rem;">🩺</div>
                All 23 registered squad players are currently healthy and available for selection.
              </div>`
        }

        <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid rgb(255 255 255 / 8%); font-size: 0.72rem; color: #94a3b8; line-height: 1.4;">
          Tip: Setting focus to <strong>Recovery</strong> accelerates rehab times and protects players from training fatigue.
        </div>
      </div>
    </div>
  </section>`;
};

const renderInbox = (career: Career, selectedMessageId: string | null) => {
  const selectedMsg = career.inbox.find((m) => m.id === selectedMessageId);

  if (selectedMsg && selectedMsg.matchReport) {
    const report = selectedMsg.matchReport;
    const isHome = report.homeClubId === career.managedClubId;
    const userScore = isHome ? report.homeScore : report.awayScore;
    const oppScore = isHome ? report.awayScore : report.homeScore;
    const won = userScore > oppScore;
    const drawn = userScore === oppScore;
    const outcomeText = drawn ? "DRAW" : won ? "VICTORY" : "DEFEAT";
    const outcomeColor = drawn ? "#facc15" : won ? "#4ade80" : "#ef4444";

    const hStats = report.homeTeamStats;
    const aStats = report.awayTeamStats;

    return `<section class="career-section">
      <header style="flex-wrap: wrap;">
        <div>
          <button type="button" class="career-secondary-btn" data-back-inbox style="padding: 0.35rem 0.75rem; font-size: 0.75rem; margin-bottom: 0.5rem;">
            ← Back to Inbox
          </button>
          <span class="career-kicker">Round ${report.round} Official Match Report</span>
          <h2>${escapeHtml(selectedMsg.title)}</h2>
        </div>
        <span class="group-tag" style="background: ${outcomeColor}22; color: ${outcomeColor}; border-color: ${outcomeColor}55; font-size: 0.85rem; padding: 0.25rem 0.6rem;">
          ${outcomeText}
        </span>
      </header>

      <!-- Scoreboard Display -->
      <div style="background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); border: 1px solid rgb(255 255 255 / 15%); border-radius: 0.65rem; padding: 1.5rem; text-align: center; margin-bottom: 1.25rem;">
        <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.4rem;">
          FULL TIME SCORE
        </div>
        <div style="display: flex; justify-content: center; align-items: center; gap: 1.5rem; font-size: 1.8rem; font-weight: 800; color: #f8fafc; flex-wrap: wrap;">
          <span>${escapeHtml(report.homeClubName)}</span>
          <span style="font-family: ui-monospace, monospace; color: #38bdf8; font-size: 2.2rem;">${report.homeScore} - ${report.awayScore}</span>
          <span>${escapeHtml(report.awayClubName)}</span>
        </div>
      </div>

      <!-- Contest & Set Piece Comparison -->
      ${
        hStats && aStats
          ? `<div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.55rem; padding: 1.25rem; margin-bottom: 1.25rem;">
              <span class="career-kicker" style="margin-bottom: 0.75rem; display: block;">Set Piece & Breakdown Stats</span>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; text-align: center; font-size: 0.82rem;">
                <div style="background: rgba(0,0,0,0.3); padding: 0.6rem; border-radius: 0.35rem;">
                  <span style="color: #94a3b8; font-size: 0.68rem; display: block;">RUCKS WON</span>
                  <strong>${hStats.rucksWon}</strong> vs <strong>${aStats.rucksWon}</strong>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 0.6rem; border-radius: 0.35rem;">
                  <span style="color: #94a3b8; font-size: 0.68rem; display: block;">SCRUMS WON</span>
                  <strong>${hStats.scrumsWon}</strong> vs <strong>${aStats.scrumsWon}</strong>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 0.6rem; border-radius: 0.35rem;">
                  <span style="color: #94a3b8; font-size: 0.68rem; display: block;">LINEOUTS WON</span>
                  <strong>${hStats.lineoutsWon}</strong> vs <strong>${aStats.lineoutsWon}</strong>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 0.6rem; border-radius: 0.35rem;">
                  <span style="color: #94a3b8; font-size: 0.68rem; display: block;">MAULS WON</span>
                  <strong>${hStats.maulsWon}</strong> vs <strong>${aStats.maulsWon}</strong>
                </div>
              </div>
            </div>`
          : ""
      }

      <!-- Individual Match Player Stats (Only User's Club Players) -->
      ${
        report.players && report.players.length > 0
          ? (() => {
              const myClub = clubById(career, career.managedClubId);
              const mySquadIds = new Set(myClub.squad.map((p) => p.id));
              const myPlayers = report.players
                .filter(
                  (p) =>
                    p.clubId === career.managedClubId ||
                    mySquadIds.has(p.playerId),
                )
                .sort((a, b) => a.number - b.number);

              return `<div>
                <span class="career-kicker" style="margin-bottom: 0.5rem; display: block;">${escapeHtml(myClub.name)} Player Match Ratings & Performance</span>
                <div class="career-table-wrap">
                  <table class="career-table">
                    <thead>
                      <tr>
                        <th style="width: 36px; text-align: center;">#</th>
                        <th>Player</th>
                        <th>Position Slot</th>
                        <th style="text-align: right;">Distance</th>
                        <th style="text-align: right;">Carried</th>
                        <th style="text-align: center;">Tackles</th>
                        <th style="text-align: center;">Tries</th>
                        <th style="text-align: center;">Breaks</th>
                        <th style="text-align: center;">Passes</th>
                        <th style="text-align: center;">Kicks</th>
                        <th style="text-align: center;">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${myPlayers
                        .map((p) => {
                          const s = p.stats;
                          const tacklesTotal = s.tacklesMade + s.tacklesMissed;
                          return `
                          <tr>
                            <td style="text-align: center;">
                              <span class="player-num-badge" style="background:${myClub.color}; width: 22px; height: 22px; font-size: 0.7rem;">${p.number}</span>
                            </td>
                            <td>
                              <button type="button" class="career-link-btn" data-view-player="${p.playerId}">
                                <strong>${escapeHtml(p.name)}</strong>
                              </button>
                            </td>
                            <td style="font-size: 0.75rem; color: #94a3b8;">${p.role}</td>
                            <td style="text-align: right;">${formatDist(s.distanceCovered)}</td>
                            <td style="text-align: right; color: #38bdf8;">${formatDist(s.distanceCarried)}</td>
                            <td style="text-align: center;">${s.tacklesMade}/${tacklesTotal}</td>
                            <td style="text-align: center; color: ${s.triesScored > 0 ? "#facc15" : "inherit"}; font-weight: ${s.triesScored > 0 ? "800" : "inherit"};">${s.triesScored}</td>
                            <td style="text-align: center;">${s.lineBreaks}</td>
                            <td style="text-align: center;">${s.successfulPasses}/${s.totalPasses}</td>
                            <td style="text-align: center;">${s.successfulKicks}/${s.totalKicks}</td>
                            <td style="text-align: center; color: ${s.penaltiesConceded > 0 ? "#f87171" : "inherit"};">${s.penaltiesConceded}p / ${s.knockOns}k</td>
                          </tr>`;
                        })
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </div>`;
            })()
          : ""
      }
    </section>`;
  }

  return `<section class="career-section">
    <header><div><span class="career-kicker">Club communications</span><h2>Inbox</h2></div><span>${career.inbox.filter((message) => !message.read).length} unread</span></header>
    <div class="career-inbox">${career.inbox
      .map(
        (message) =>
          `<button type="button" data-message-id="${escapeHtml(message.id)}" class="${message.read ? "read" : ""}"><i></i><span><strong>${escapeHtml(message.title)}</strong><small>${escapeHtml(message.message)}</small></span></button>`,
      )
      .join("")}</div>
  </section>`;
};

const renderSquad = (club: Club) => `<section class="career-section">
  <header><div><span class="career-kicker">Registered players</span><h2>${escapeHtml(club.name)} squad</h2></div><span>23 players</span></header>
  <div class="career-table-wrap"><table class="career-table squad"><thead><tr><th>#</th><th>Player</th><th>Age</th><th>Role</th><th>Overall</th><th>Attack</th><th>Defence</th><th>Fitness</th></tr></thead><tbody>
  ${club.squad
    .map(
      (player, index) =>
        `<tr><td>${index + 1}</td><td><button type="button" class="career-link-btn" data-view-player="${player.id}"><strong>${escapeHtml(player.name)}</strong></button></td><td>${player.age}</td><td>${roleName(player.role)}</td><td><button type="button" class="ovr-badge ${getOvrClass(getPlayerOverall(player))}" data-view-player="${player.id}">OVR ${getPlayerOverall(player)}</button></td><td>${player.attack}</td><td>${player.defence}</td><td><span class="fitness"><i style="width:${player.fitness}%"></i></span>${player.fitness}%</td></tr>`,
    )
    .join("")}
  </tbody></table></div>
</section>`;

const renderLeague = (career: Career) => `<section class="career-section">
  <header><div><span class="career-kicker">2026 season</span><h2>${escapeHtml(career.season.name)}</h2></div><span>Round ${career.currentRound} / 10</span></header>
  ${renderTable(career)}
</section>`;

const renderFixtures = (career: Career) => `<section class="career-section">
  <header><div><span class="career-kicker">Full calendar</span><h2>Fixtures & results</h2></div><span>10 rounds</span></header>
  <div class="career-rounds">${Array.from(
    { length: 10 },
    (_, index) => index + 1,
  )
    .map(
      (round) =>
        `<section class="career-round ${round === career.currentRound ? "current" : ""}"><h3>Round ${round}</h3>${career.season.fixtures
          .filter((fixture) => fixture.round === round)
          .map((fixture) => renderFixture(career, fixture))
          .join("")}</section>`,
    )
    .join("")}</div>
</section>`;

const renderCareerSetup = (
  selectedClubId: string,
  loadError: string | null,
) => `<main class="career-onboarding">
  <section class="career-intro">
    <span>Rugby Sim</span>
    <h1>Take the club.<br />Shape the season.</h1>
    <p>Ten rounds. One league. Every decision builds toward match day.</p>
    <button type="button" data-exhibition>Open Match Lab</button>
  </section>
  <form class="career-create" data-create-career>
    <span class="career-kicker">New career</span>
    <h2>Sign your first contract</h2>
    ${loadError ? `<div class="career-save-error"><strong>Save could not be loaded.</strong><span>${escapeHtml(loadError)}</span><button type="button" data-delete-save>Delete damaged save</button></div>` : ""}
    <label>Manager name<input name="managerName" required maxlength="40" autocomplete="name" placeholder="Your name" /></label>
    <fieldset><legend>Choose club</legend><div class="career-club-options">${CLUBS.map((club) => `<button type="button" data-club-id="${club.id}" aria-pressed="${club.id === selectedClubId}" class="${club.id === selectedClubId ? "selected" : ""}" style="--club:${club.color}"><i></i><span>${escapeHtml(club.name)}</span></button>`).join("")}</div></fieldset>
    <button class="career-primary" type="submit">Begin career</button>
  </form>
</main>`;

export const createCareerUI = (
  root: HTMLElement,
  onExhibition: () => void,
  onWatchMatch?: (
    career: Career,
    fixture: Fixture,
    onFinish: (result: { homeScore: number; awayScore: number }) => void,
  ) => void,
) => {
  const lifecycle = new AbortController();
  let career: Career | null = null;
  let view: CareerView = "home";
  let selectedClubId: string = CLUBS[0].id;
  let selectedSwapIndex: number | null = null;
  let selectedMessageId: string | null = null;
  let viewPlayerId: string | null = null;
  let simulationProgress: SimulationProgress | null = null;
  let loadError: string | null = null;
  let saveError: string | null = null;

  try {
    career = loadCareer();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown save error";
  }

  const persist = () => {
    if (!career) return;
    try {
      saveCareer(career);
      saveError = null;
    } catch (error) {
      saveError = error instanceof Error ? error.message : "Save failed";
    }
  };

  const runRoundSimulation = async () => {
    if (
      !career ||
      career.checkpoint !== "matchDay" ||
      simulationProgress !== null
    ) {
      return;
    }
    const currentRound = career.currentRound;
    const roundFixtures = career.season.fixtures.filter(
      (f) => f.round === currentRound && f.status === "scheduled",
    );
    const recordedResultsMap = new Map<
      string,
      { homeScore: number; awayScore: number }
    >();

    simulationProgress = {
      round: currentRound,
      percent: 5,
      fixtureText: "Initializing match simulation engine...",
      results: [],
    };
    render();
    await new Promise((r) => setTimeout(r, 60));

    for (let i = 0; i < roundFixtures.length; i += 1) {
      const fixture = roundFixtures[i];
      const home = clubById(career, fixture.homeClubId);
      const away = clubById(career, fixture.awayClubId);

      simulationProgress = {
        round: currentRound,
        percent: Math.round(((i + 0.3) / roundFixtures.length) * 100),
        fixtureText: `Simulating: ${home.name} vs ${away.name}...`,
        results: simulationProgress.results,
      };
      render();
      await new Promise((r) => setTimeout(r, 70));

      const input = createMatchInputForFixture(career, fixture);
      const result = simulateMatch({ input, seed: fixture.seed });
      const score = { homeScore: result.score[0], awayScore: result.score[1] };
      recordedResultsMap.set(fixture.id, score);

      simulationProgress = {
        round: currentRound,
        percent: Math.round(((i + 1) / roundFixtures.length) * 100),
        fixtureText: `Completed: ${home.name} ${score.homeScore} - ${score.awayScore} ${away.name}`,
        results: [
          ...simulationProgress.results,
          {
            homeName: home.name,
            awayName: away.name,
            score: `${score.homeScore} - ${score.awayScore}`,
          },
        ],
      };
      render();
      await new Promise((r) => setTimeout(r, 90));
    }

    career = advanceCareer(career, recordedResultsMap);
    simulationProgress = null;
    selectedSwapIndex = null;
    persist();
    render();
  };

  const render = () => {
    if (!career) {
      root.innerHTML = renderCareerSetup(selectedClubId, loadError);
      return;
    }
    const club = clubById(career, career.managedClubId);
    const unread = career.inbox.filter((message) => !message.read).length;
    const content =
      view === "home"
        ? renderHome(career, club)
        : view === "selection"
          ? renderSelection(club, selectedSwapIndex)
          : view === "training"
            ? renderTraining(club)
            : view === "inbox"
              ? renderInbox(career, selectedMessageId)
              : view === "squad"
                ? renderSquad(club)
                : view === "league"
                  ? renderLeague(career)
                  : renderFixtures(career);

    // Check if player profile modal is active
    let playerModalHtml = "";
    if (viewPlayerId) {
      let foundPlayer: Player | undefined;
      let foundClub: Club | undefined;
      let foundSlot: number | undefined;

      for (const c of career.season.clubs) {
        const pIndex = c.squad.findIndex((p) => p.id === viewPlayerId);
        if (pIndex !== -1) {
          foundPlayer = c.squad[pIndex];
          foundClub = c;
          if (c.id === career.managedClubId) foundSlot = pIndex;
          break;
        }
      }

      if (foundPlayer && foundClub) {
        playerModalHtml = renderPlayerCardModal(
          foundPlayer,
          foundClub,
          foundSlot,
        );
      }
    }

    const simModalHtml = simulationProgress
      ? renderSimulationModal(simulationProgress)
      : "";

    const upcoming = getUpcomingManagedFixture(career);
    let topbarFixtureHtml = "";
    if (upcoming) {
      const { home, away } = fixtureTeams(career, upcoming);
      topbarFixtureHtml = `
        <div class="topbar-fixture-pill" style="display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.4rem; padding: 0.35rem 0.75rem; font-size: 0.78rem;">
          <span style="color: #38bdf8; font-weight: 800; font-size: 0.7rem; text-transform: uppercase;">Next Rd ${upcoming.round}:</span>
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${home.color};"></span>
          <span style="font-weight: 700; color: #f8fafc;">${escapeHtml(home.name)}</span>
          <span style="color: #64748b; font-weight: 600;">v</span>
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${away.color};"></span>
          <span style="font-weight: 700; color: #f8fafc;">${escapeHtml(away.name)}</span>
          <span style="color: #94a3b8; font-size: 0.72rem;">(${formatDate(upcoming.date)})</span>
        </div>`;
    }

    root.innerHTML = `<main class="career-shell" style="--club:${club.color}">
      <aside class="career-sidebar"><div class="career-club-mark"><i></i><span>${escapeHtml(club.name)}</span><small>${escapeHtml(career.manager.name)}, Manager</small></div>
        <nav>${Object.entries(views)
          .map(
            ([key, label]) =>
              `<button type="button" data-career-view="${key}" class="${view === key ? "active" : ""}">${label}${key === "inbox" && unread ? `<b>${unread}</b>` : ""}</button>`,
          )
          .join("")}</nav>
        <button type="button" class="career-lab-link" data-exhibition>Match Lab</button>
        <button type="button" class="career-new-link" data-new-career>New career</button>
      </aside>
      <section class="career-main"><header class="career-topbar"><div><span>${formatDate(career.currentDate)}</span><strong>${checkpointLabels[career.checkpoint]}</strong></div>${topbarFixtureHtml}<div><span>Round ${career.currentRound} of 10</span><button type="button" data-advance ${career.pendingEvent || career.checkpoint === "seasonEnd" || simulationProgress !== null ? "disabled" : ""}>${career.pendingEvent ? "Resolve event" : advanceLabels[career.checkpoint]}</button></div></header>
        ${saveError ? `<p class="career-save-warning">Autosave failed: ${escapeHtml(saveError)}</p>` : ""}
        <div class="career-content">${content}</div>
      </section>
      ${playerModalHtml}
      ${simModalHtml}
    </main>`;
  };

  root.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const clubButton = target?.closest<HTMLButtonElement>("[data-club-id]");
      if (clubButton?.dataset.clubId) {
        selectedClubId = clubButton.dataset.clubId;
        render();
        return;
      }
      const viewButton =
        target?.closest<HTMLButtonElement>("[data-career-view]");
      const requestedView = viewButton?.dataset.careerView;
      if (requestedView && requestedView in views) {
        view = requestedView as CareerView;
        selectedSwapIndex = null;
        selectedMessageId = null;
        viewPlayerId = null;
        render();
        return;
      }
      if (target?.closest("[data-exhibition]")) {
        onExhibition();
        return;
      }
      if (target?.closest("[data-delete-save]")) {
        deleteCareer();
        loadError = null;
        render();
        return;
      }
      if (target?.closest("[data-new-career]")) {
        if (!confirm("Delete this career and start again?")) return;
        deleteCareer();
        career = null;
        loadError = null;
        view = "home";
        render();
        return;
      }
      if (!career) return;
      if (target?.closest("[data-ack-event]")) {
        career = acknowledgeEvent(career);
        persist();
        render();
        return;
      }

      // Training Focus / Intensity changes
      const focusBtn = target?.closest<HTMLButtonElement>("[data-set-focus]");
      if (focusBtn?.dataset.setFocus) {
        const focus = focusBtn.dataset.setFocus as TrainingFocus;
        career = setClubTrainingPlan(career, career.managedClubId, { focus });
        persist();
        render();
        return;
      }
      const intensityBtn = target?.closest<HTMLButtonElement>(
        "[data-set-intensity]",
      );
      if (intensityBtn?.dataset.setIntensity) {
        const intensity = intensityBtn.dataset
          .setIntensity as TrainingIntensity;
        career = setClubTrainingPlan(career, career.managedClubId, {
          intensity,
        });
        persist();
        render();
        return;
      }

      // Back to inbox list from report view
      if (target?.closest("[data-back-inbox]")) {
        selectedMessageId = null;
        render();
        return;
      }

      // View Player Detail Modal
      const viewPlayerBtn = target?.closest<HTMLElement>("[data-view-player]");
      if (viewPlayerBtn?.dataset.viewPlayer) {
        viewPlayerId = viewPlayerBtn.dataset.viewPlayer;
        render();
        return;
      }

      // Close Player Detail Modal
      if (
        target?.closest("[data-close-player-card]") ||
        target?.matches('[data-backdrop-close="player"]')
      ) {
        viewPlayerId = null;
        render();
        return;
      }

      // Quick Pick actions
      const autoPick = target?.closest<HTMLButtonElement>("[data-auto-pick]");
      if (autoPick?.dataset.autoPick) {
        const criteria = autoPick.dataset.autoPick as "ovr" | "fitness";
        career = optimizeSquadSelection(career, career.managedClubId, criteria);
        selectedSwapIndex = null;
        persist();
        render();
        return;
      }

      // Open swap modal for slot
      const openSwapBtn =
        target?.closest<HTMLButtonElement>("[data-open-swap]");
      if (openSwapBtn?.dataset.openSwap) {
        selectedSwapIndex = Number(openSwapBtn.dataset.openSwap);
        render();
        return;
      }

      // Close swap modal
      if (
        target?.closest("[data-close-swap-modal]") ||
        target?.matches('[data-backdrop-close="swap"]')
      ) {
        selectedSwapIndex = null;
        render();
        return;
      }

      // Confirm swap
      const confirmSwapBtn = target?.closest<HTMLButtonElement>(
        "[data-confirm-swap]",
      );
      if (confirmSwapBtn?.dataset.confirmSwap && selectedSwapIndex !== null) {
        const candidateIndex = Number(confirmSwapBtn.dataset.confirmSwap);
        career = swapSquadPlayers(
          career,
          career.managedClubId,
          selectedSwapIndex,
          candidateIndex,
        );
        selectedSwapIndex = null;
        persist();
        render();
        return;
      }

      // Handle Watch Match
      if (target?.closest("[data-watch-match]")) {
        const upcoming = getUpcomingManagedFixture(career);
        if (upcoming && onWatchMatch) {
          onWatchMatch(career, upcoming, (matchResult) => {
            if (!career) return;
            career = advanceCareer(
              career,
              new Map([[upcoming.id, matchResult]]),
            );
            persist();
            render();
          });
        }
        return;
      }

      if (target?.closest("[data-advance]")) {
        if (career.checkpoint === "matchDay") {
          runRoundSimulation();
          return;
        }
        career = advanceCareer(career);
        selectedSwapIndex = null;
        persist();
        render();
        return;
      }
      const message = target?.closest<HTMLButtonElement>("[data-message-id]");
      if (message?.dataset.messageId) {
        selectedMessageId = message.dataset.messageId;
        career = markInboxRead(career, message.dataset.messageId);
        persist();
        render();
      }
    },
    { signal: lifecycle.signal },
  );
  root.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (
        !(form instanceof HTMLFormElement) ||
        !form.matches("[data-create-career]")
      ) {
        return;
      }
      event.preventDefault();
      const data = new FormData(form);
      career = createCareer(
        String(data.get("managerName") ?? ""),
        selectedClubId,
      );
      view = "home";
      persist();
      render();
    },
    { signal: lifecycle.signal },
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        if (selectedSwapIndex !== null || viewPlayerId !== null) {
          selectedSwapIndex = null;
          viewPlayerId = null;
          render();
        }
      }
    },
    { signal: lifecycle.signal },
  );

  render();
  return {
    dispose() {
      lifecycle.abort();
      root.replaceChildren();
    },
  };
};
