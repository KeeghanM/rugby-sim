import { escapeHtml } from "../html.ts";
import {
  acknowledgeEvent,
  advanceCareer,
  CLUBS,
  createCareer,
  deleteCareer,
  deriveStandings,
  getUpcomingManagedFixture,
  loadCareer,
  markInboxRead,
  optimizeSquadSelection,
  ROLE_GROUPS,
  saveCareer,
  swapSquadPlayers,
  type Career,
  type Club,
  type Fixture,
  type Player,
} from "./index.ts";

const views = {
  home: "Club Office",
  selection: "Team Sheet",
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
  const standing = deriveStandings(career).find(
    (row) => row.clubId === career.managedClubId,
  )!;
  const position =
    deriveStandings(career).findIndex((row) => row.clubId === club.id) + 1;

  const isMatchDay = career.checkpoint === "matchDay";
  const isThursday = career.checkpoint === "thursday";

  return `<div class="career-home-grid">
    <section class="career-lead-panel">
      <span class="career-kicker">Next checkpoint</span>
      <h2>${checkpointLabels[career.checkpoint]}</h2>
      <p>${
        career.checkpoint === "monday"
          ? "Review squad condition and plan your strategy for the upcoming round."
          : career.checkpoint === "thursday"
            ? "Team selection checkpoint. Configure your starting XV and finishing reserves on the Team Sheet."
            : career.checkpoint === "matchDay"
              ? "Match day is here! Watch your match live in 3D or simulate the round headlessly."
              : career.checkpoint === "postMatch"
                ? "Round completed. Match results and updated standings are in. Review before the next round."
                : "First season complete. Review your final league standing and season achievements."
      }</p>

      ${
        isThursday
          ? `<div style="margin-top: 1rem;"><button type="button" class="career-primary" data-career-view="selection">📋 Configure Team Sheet</button></div>`
          : ""
      }

      ${
        isMatchDay && upcoming
          ? `<div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.25rem;">
              <button type="button" class="career-primary" data-watch-match>🎬 Watch Match in 3D</button>
              <button type="button" class="career-secondary-btn" data-advance>⚡ Quick Simulate Round</button>
            </div>`
          : ""
      }

      ${career.pendingEvent ? `<div class="career-event"><span>Action required</span><h3>${escapeHtml(career.pendingEvent.title)}</h3><p>${escapeHtml(career.pendingEvent.message)}</p><button type="button" data-ack-event>Acknowledge</button></div>` : ""}
    </section>
    <section class="career-next-match">
      <span class="career-kicker">${isMatchDay ? "Today's Match" : "Next fixture"}</span>
      ${
        upcoming
          ? (() => {
              const { home, away } = fixtureTeams(career, upcoming);
              return `<time>${formatDate(upcoming.date)}</time><div><span style="--club:${home.color}">${escapeHtml(home.name)}</span><b>v</b><span style="--club:${away.color}">${escapeHtml(away.name)}</span></div><small>Round ${upcoming.round} · National Club League</small>`;
            })()
          : `<h3>Season complete</h3><p>No scheduled fixtures remain.</p>`
      }
    </section>
    <section class="career-metric"><span>League position</span><strong>${standing.played ? position : "-"}<small> / 6</small></strong><p>${standing.tablePoints} points from ${standing.played} played</p></section>
    <section class="career-metric"><span>Club balance</span><strong>${formatMoney(club.balance)}</strong><p>Staff Level ${club.staffLevel} · Facility Level ${club.facilityLevel}</p></section>
    <section class="career-section career-table-preview"><header><div><span class="career-kicker">Competition</span><h2>${escapeHtml(career.season.name)}</h2></div><button type="button" data-career-view="league">Full table</button></header>${renderTable(career, 4)}</section>
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

  return `
    <div class="career-modal-backdrop" data-backdrop-close="player">
      <div class="career-modal-dialog" style="max-width: 580px;">
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
        <div class="career-modal-body" style="display: grid; gap: 1.15rem;">
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
                  <th>Role Match</th>
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
                    const matchBadge = isExact
                      ? `<span class="group-tag" style="background:rgba(34,197,94,0.15); color:#4ade80; border-color:rgba(34,197,94,0.3);">✓ Natural Role</span>`
                      : isGroup
                        ? `<span class="group-tag" style="background:rgba(56,189,248,0.15); color:#38bdf8; border-color:rgba(56,189,248,0.3);">Role Group</span>`
                        : `<span class="group-tag" style="background:rgba(148,163,184,0.1); color:#94a3b8; border-color:transparent;">Alternate</span>`;

                    return `
                      <tr>
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
      <tr>
        <td style="text-align: center;">
          <span class="player-num-badge" style="background:${club.color};">${index + 1}</span>
        </td>
        <td>
          <div class="player-role-title">
            <button type="button" class="career-link-btn" data-view-player="${player.id}">
              ${escapeHtml(player.name)}
            </button>
            <span class="group-tag" style="font-size:0.65rem;">${slotName}</span>
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

const renderInbox = (career: Career) => `<section class="career-section">
  <header><div><span class="career-kicker">Club communications</span><h2>Inbox</h2></div><span>${career.inbox.filter((message) => !message.read).length} unread</span></header>
  <div class="career-inbox">${career.inbox
    .map(
      (message) =>
        `<button type="button" data-message-id="${escapeHtml(message.id)}" class="${message.read ? "read" : ""}"><i></i><span><strong>${escapeHtml(message.title)}</strong><small>${escapeHtml(message.message)}</small></span></button>`,
    )
    .join("")}</div>
</section>`;

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
  let viewPlayerId: string | null = null;
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
          : view === "inbox"
            ? renderInbox(career)
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
      <section class="career-main"><header class="career-topbar"><div><span>${formatDate(career.currentDate)}</span><strong>${checkpointLabels[career.checkpoint]}</strong></div><div><span>Round ${career.currentRound} of 10</span><button type="button" data-advance ${career.pendingEvent || career.checkpoint === "seasonEnd" ? "disabled" : ""}>${career.pendingEvent ? "Resolve event" : advanceLabels[career.checkpoint]}</button></div></header>
        ${saveError ? `<p class="career-save-warning">Autosave failed: ${escapeHtml(saveError)}</p>` : ""}
        <div class="career-content">${content}</div>
      </section>
      ${playerModalHtml}
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
        career = advanceCareer(career);
        selectedSwapIndex = null;
        persist();
        render();
        return;
      }
      const message = target?.closest<HTMLButtonElement>("[data-message-id]");
      if (message?.dataset.messageId) {
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
