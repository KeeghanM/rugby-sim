import { escapeHtml } from "../../../html.ts";
import type { Career } from "../../domain/index.ts";
import { renderTable } from "../components/table.ts";

export const renderLeague = (
  career: Career,
): string => `<section class="career-section">
  <header>
    <div>
      <span class="career-kicker">2026 season</span>
      <h2>${escapeHtml(career.season.name)}</h2>
    </div>
    <span>Round ${career.currentRound} / 10</span>
  </header>
  ${renderTable(career)}
</section>`;
