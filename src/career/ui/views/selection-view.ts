import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import type { Club, Player } from "../../domain/index.ts";
import { roleName } from "../../domain/index.ts";
import { getOvrClass, getPlayerOverall } from "../formatters.ts";
import { renderSwapModal } from "../modals/swap-modal.ts";
import { SLOT_NAMES } from "../types.ts";

const SELECTION_STYLES = `
  .player-num-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #1e293b;
    border: 1px solid rgb(255 255 255 / 20%);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 800;
    font-size: 0.78rem;
    color: #ffffff;
  }
  .player-role-title {
    font-weight: 700;
    color: #f8fafc;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .section-divider-row td {
    background: rgb(30 41 59 / 70%) !important;
    font-weight: 800;
    color: #38bdf8;
    padding: 0.4rem 0.75rem;
    text-transform: uppercase;
    font-size: 0.72rem;
  }
`;

registerStyles("career-selection", SELECTION_STYLES);

export const renderSelection = (
  club: Club,
  selectedSwapIndex: number | null,
): string => {
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
          <tr class="section-divider-row"><td colspan="9">Starting XV (1 - 15)</td></tr>
          ${starters.map((p, i) => renderRow(p, i, SLOT_NAMES[i])).join("")}
          <tr class="section-divider-row"><td colspan="9">Finishing Reserves (16 - 23)</td></tr>
          ${bench.map((p, i) => renderRow(p, i + 15, SLOT_NAMES[i + 15])).join("")}
        </tbody>
      </table>
    </div>

    ${selectedSwapIndex !== null ? renderSwapModal(club, selectedSwapIndex) : ""}
  </section>`;
};
