import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import type { Career } from "../../domain/index.ts";
import { clubById, formatDist } from "../formatters.ts";

const INBOX_STYLES = `
  .career-inbox {
    display: grid;
    gap: 0.45rem;
  }
  .career-inbox button {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.85rem;
    align-items: start;
    border: 1px solid rgb(255 255 255 / 8%);
    border-radius: 0.45rem;
    background: rgb(15 23 42 / 60%);
    cursor: pointer;
    padding: 0.85rem 1rem;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
  }
  .career-inbox button:hover {
    background: #1e293b;
    border-color: rgb(255 255 255 / 15%);
  }
  .career-inbox button i {
    width: 8px;
    height: 8px;
    margin-top: 0.35rem;
    border-radius: 50%;
    background: #38bdf8;
    box-shadow: 0 0 6px #38bdf8;
  }
  .career-inbox button.read {
    color: #94a3b8;
    background: transparent;
  }
  .career-inbox button.read i {
    background: #475569;
    box-shadow: none;
  }
  .career-inbox button span {
    display: grid;
    gap: 0.25rem;
  }
  .career-inbox strong {
    color: #f8fafc;
    font-size: 0.88rem;
  }
  .career-inbox small {
    color: #94a3b8;
    font-size: 0.78rem;
    line-height: 1.4;
  }
`;

registerStyles("career-inbox", INBOX_STYLES);

export const renderInbox = (
  career: Career,
  selectedMessageId: string | null,
): string => {
  const selectedMsg = career.inbox.find((m) => m.id === selectedMessageId);

  // If viewing a match report message
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
        <div style="display: flex; gap: 0.5rem; align-items: center; width: 100%; margin-bottom: 0.5rem;">
          <button type="button" class="career-secondary-btn" data-back-inbox style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">
            ← Back to Inbox
          </button>
          <button type="button" class="career-swap-btn" data-delete-message="${escapeHtml(selectedMsg.id)}" style="color: #f87171; font-size: 0.75rem; padding: 0.35rem 0.65rem; margin-left: auto;">
            🗑 Delete Message
          </button>
        </div>
        <div>
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

  // If viewing a standard text message
  if (selectedMsg) {
    return `<section class="career-section">
      <header style="flex-wrap: wrap;">
        <div style="display: flex; gap: 0.5rem; align-items: center; width: 100%; margin-bottom: 0.5rem;">
          <button type="button" class="career-secondary-btn" data-back-inbox style="padding: 0.35rem 0.75rem; font-size: 0.75rem;">
            ← Back to Inbox
          </button>
          <button type="button" class="career-swap-btn" data-delete-message="${escapeHtml(selectedMsg.id)}" style="color: #f87171; font-size: 0.75rem; padding: 0.35rem 0.65rem; margin-left: auto;">
            🗑 Delete Message
          </button>
        </div>
        <div>
          <span class="career-kicker">Club Communication</span>
          <h2>${escapeHtml(selectedMsg.title)}</h2>
        </div>
      </header>

      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.55rem; padding: 1.5rem; font-size: 0.95rem; color: #f8fafc; line-height: 1.6;">
        <p style="margin: 0;">${escapeHtml(selectedMsg.message)}</p>
      </div>
    </section>`;
  }

  const unreadCount = career.inbox.filter((message) => !message.read).length;
  const readCount = career.inbox.length - unreadCount;

  return `<section class="career-section">
    <header style="flex-wrap: wrap;">
      <div>
        <span class="career-kicker">Club communications</span>
        <h2>Inbox</h2>
      </div>
      <div style="display: flex; gap: 0.6rem; align-items: center;">
        <span style="font-size: 0.78rem; color: #94a3b8;">${unreadCount} unread · ${career.inbox.length} total</span>
        ${
          readCount > 0
            ? `<button type="button" class="career-secondary-btn" data-clear-read-inbox style="font-size: 0.72rem; padding: 0.3rem 0.6rem;">
                Clear Read
              </button>`
            : ""
        }
      </div>
    </header>
    <div class="career-inbox">
      ${
        career.inbox.length === 0
          ? `<div style="padding: 2.5rem 1rem; text-align: center; color: #94a3b8; font-size: 0.9rem; background: rgba(0,0,0,0.2); border-radius: 0.45rem;">
              <div style="font-size: 1.8rem; margin-bottom: 0.4rem;">📭</div>
              Your inbox is clean. No messages to display.
            </div>`
          : career.inbox
              .map(
                (message) =>
                  `<div style="display: flex; gap: 0.4rem; align-items: stretch;">
                    <button type="button" data-message-id="${escapeHtml(message.id)}" class="${message.read ? "read" : ""}" style="flex: 1;">
                      <i></i><span><strong>${escapeHtml(message.title)}</strong><small>${escapeHtml(message.message)}</small></span>
                    </button>
                    <button type="button" class="career-swap-btn" data-delete-message="${escapeHtml(message.id)}" title="Delete message" style="padding: 0 0.75rem; color: #94a3b8; font-size: 0.85rem;">
                      🗑
                    </button>
                  </div>`,
              )
              .join("")
      }
    </div>
  </section>`;
};
