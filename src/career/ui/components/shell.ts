import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import type { Career, Club } from "../../domain/index.ts";
import { formatDate } from "../formatters.ts";
import {
  advanceLabels,
  checkpointLabels,
  views,
  type CareerView,
} from "../types.ts";

const SHELL_STYLES = `
  .career-shell {
    display: grid;
    grid-template-columns: 240px 1fr;
    min-height: 100dvh;
  }
  .career-sidebar {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    height: 100dvh;
    background: linear-gradient(180deg, #0f172a 0%, #111c32 100%);
    border-right: 1px solid rgb(255 255 255 / 12%);
    color: #cbd5e1;
    padding: 1.4rem 1.15rem;
  }
  .career-club-mark {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0 0.75rem;
    align-items: center;
    min-height: 60px;
    border-bottom: 1px solid rgb(255 255 255 / 10%);
    padding-bottom: 1rem;
  }
  .career-club-mark i {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--club, #38bdf8);
    box-shadow: 0 0 8px var(--club, #38bdf8);
  }
  .career-club-mark span {
    font-size: 1rem;
    font-weight: 750;
    color: #f8fafc;
  }
  .career-club-mark small {
    color: #94a3b8;
    font-size: 0.72rem;
    grid-column: 2;
  }
  .career-sidebar nav {
    display: grid;
    gap: 0.25rem;
    margin-top: 1.25rem;
  }
  .career-sidebar nav button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid transparent;
    border-radius: 0.4rem;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.65rem 0.8rem;
    font-weight: 700;
    font-size: 0.82rem;
    text-align: left;
    transition: background 0.15s, color 0.15s;
  }
  .career-sidebar nav button:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #f1f5f9;
  }
  .career-sidebar nav button.active {
    color: #f8fafc;
    background: #1e293b;
    border-color: rgb(255 255 255 / 12%);
    box-shadow: inset 3px 0 var(--club, #38bdf8);
  }
  .career-sidebar nav b {
    min-width: 1.3rem;
    padding: 0.05rem 0.35rem;
    border-radius: 1rem;
    background: #38bdf8;
    color: #0f172a;
    font-size: 0.68rem;
    font-weight: 800;
    text-align: center;
  }
  .career-lab-link,
  .career-new-link {
    border: 1px solid rgb(56 189 248 / 30%);
    border-radius: 0.35rem;
    background: rgba(15, 23, 42, 0.6);
    color: #38bdf8;
    cursor: pointer;
    padding: 0.45rem 0.9rem;
    font-weight: 700;
    font-size: 0.78rem;
    transition: background 0.15s, border-color 0.15s;
  }
  .career-lab-link {
    margin-top: auto;
  }
  .career-new-link {
    margin-top: 0.5rem;
    color: #64748b;
    border-color: transparent;
  }
  .career-main {
    min-width: 0;
  }
  .career-topbar {
    position: sticky;
    z-index: 5;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 72px;
    border-bottom: 1px solid rgb(255 255 255 / 12%);
    background: linear-gradient(180deg, rgb(15 23 42 / 94%) 0%, rgb(17 28 50 / 94%) 100%);
    backdrop-filter: blur(10px);
    padding: 0.85rem clamp(1rem, 3vw, 2.5rem);
  }
  .career-topbar > div {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .career-topbar span {
    color: #94a3b8;
    font-size: 0.75rem;
    font-weight: 500;
  }
  .career-topbar strong {
    font-size: 1rem;
    font-weight: 750;
    color: #f8fafc;
  }
  .career-topbar button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    background: #334155;
    color: #94a3b8;
    border-color: transparent;
  }
  .career-content {
    padding: clamp(1rem, 2.5vw, 2.25rem);
  }
`;

registerStyles("career-shell", SHELL_STYLES);

export interface ShellOptions {
  career: Career;
  club: Club;
  view: CareerView;
  content: string;
  topbarFixtureHtml: string;
  modalsHtml: string;
  saveError: string | null;
  isSimulating: boolean;
}

export const renderShell = (options: ShellOptions): string => {
  const {
    career,
    club,
    view,
    content,
    topbarFixtureHtml,
    modalsHtml,
    saveError,
    isSimulating,
  } = options;

  const unread = career.inbox.filter((message) => !message.read).length;

  return `<main class="career-shell" style="--club:${club.color}">
    <aside class="career-sidebar">
      <div class="career-club-mark">
        <i></i><span>${escapeHtml(club.name)}</span>
        <small>${escapeHtml(career.manager.name)}, Manager</small>
      </div>
      <nav>${Object.entries(views)
        .map(
          ([key, label]) =>
            `<button type="button" data-career-view="${key}" class="${view === key ? "active" : ""}">${label}${key === "inbox" && unread ? `<b>${unread}</b>` : ""}</button>`,
        )
        .join("")}</nav>
      <button type="button" class="career-lab-link" data-exhibition>Match Lab</button>
      <button type="button" class="career-new-link" data-new-career>New career</button>
    </aside>
    <section class="career-main">
      <header class="career-topbar">
        <div>
          <span>${formatDate(career.currentDate)}</span>
          <strong>${checkpointLabels[career.checkpoint]}</strong>
        </div>
        ${topbarFixtureHtml}
        <div>
          <span>Round ${career.currentRound} of 10</span>
          <button type="button" data-advance ${career.pendingEvent || career.checkpoint === "seasonEnd" || isSimulating ? "disabled" : ""}>${career.pendingEvent ? "Resolve event" : advanceLabels[career.checkpoint]}</button>
        </div>
      </header>
      ${saveError ? `<p class="career-save-warning">Autosave failed: ${escapeHtml(saveError)}</p>` : ""}
      <div class="career-content">${content}</div>
    </section>
    ${modalsHtml}
  </main>`;
};
