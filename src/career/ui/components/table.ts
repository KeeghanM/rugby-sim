import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import { deriveStandings, type Career } from "../../domain/index.ts";

const TABLE_STYLES = `
  .career-table-wrap {
    overflow-x: auto;
  }
  .career-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  .career-table th,
  .career-table td {
    border-bottom: 1px solid rgb(255 255 255 / 8%);
    padding: 0.65rem 0.75rem;
    text-align: right;
  }
  .career-table th {
    background: rgb(0 0 0 / 25%);
    color: #94a3b8;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .career-table th:nth-child(2),
  .career-table td:nth-child(2) {
    text-align: left;
  }
  .career-table td {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-variant-numeric: tabular-nums;
    color: #f1f5f9;
  }
  .career-table td strong {
    color: #38bdf8;
  }
  .career-table tr:hover td {
    background: rgb(255 255 255 / 4%);
  }
  .career-table tr.managed td {
    background: rgba(56, 189, 248, 0.12);
    font-weight: 750;
  }
`;

registerStyles("career-table", TABLE_STYLES);

export const renderTable = (career: Career, limit?: number): string => {
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
