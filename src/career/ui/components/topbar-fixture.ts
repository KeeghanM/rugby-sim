import { escapeHtml } from "../../../html.ts";
import { getUpcomingManagedFixture, type Career } from "../../domain/index.ts";
import { formatDate, fixtureTeams } from "../formatters.ts";

export const renderTopbarFixture = (career: Career): string => {
  const upcoming = getUpcomingManagedFixture(career);
  if (!upcoming) return "";

  const { home, away } = fixtureTeams(career, upcoming);
  return `
    <div class="topbar-fixture-pill" style="display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.4rem; padding: 0.35rem 0.75rem; font-size: 0.78rem;">
      <span style="color: #38bdf8; font-weight: 800; font-size: 0.7rem; text-transform: uppercase;">Next Rd ${upcoming.round}:</span>
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${home.color};"></span>
      <span style="font-weight: 700; color: #f8fafc;">${escapeHtml(home.name)}</span>
      <span style="color: #64748b; font-weight: 600;">v</span>
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${away.color};"></span>
      <span style="font-weight: 700; color: #f8fafc;">${escapeHtml(away.name)}</span>
      <span style="color: #94a3b8; font-size: 0.72rem;">(${formatDate(upcoming.date)})</span>
    </div>`;
};
