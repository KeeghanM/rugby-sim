import { escapeHtml } from "../../../html.ts";
import { createWindow, registerStyles } from "../../../ui/index.ts";
import { ROLE_GROUPS, type Club } from "../../domain/index.ts";
import { roleName } from "../../domain/index.ts";
import { getOvrClass, getPlayerOverall } from "../formatters.ts";
import { SLOT_NAMES } from "../types.ts";

const SWAP_MODAL_STYLES = `
  .career-swap-btn {
    border: 1px solid rgb(56 189 248 / 30%);
    border-radius: 0.35rem;
    background: rgba(15, 23, 42, 0.6);
    color: #38bdf8;
    cursor: pointer;
    padding: 0.3rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 750;
    transition: background 0.15s;
  }
  .career-swap-btn:hover,
  .career-swap-btn.active {
    background: #38bdf8;
    color: #0f172a;
  }
`;

registerStyles("career-swap-modal", SWAP_MODAL_STYLES);

export const renderSwapModal = (club: Club, swapIndex: number): string => {
  const current = club.squad[swapIndex];
  const currentSlot = SLOT_NAMES[swapIndex];
  const requiredGroup = ROLE_GROUPS[current.role];

  const customHeader = `
    <div>
      <span class="career-kicker">Swap Player</span>
      <h3 style="margin: 0.2rem 0; font-size: 1.15rem; color: #f8fafc;">
        Swapping #${swapIndex + 1} ${escapeHtml(current.name)}
      </h3>
      <span style="font-size: 0.78rem; color: #94a3b8;">
        Position: <strong style="color: #38bdf8;">${currentSlot}</strong> (${roleName(current.role)})
      </span>
    </div>`;

  const body = `
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
                  <td style="font-size: 0.76rem; color: #cbd5e1;">${SLOT_NAMES[index] ?? "Squad Depth"}</td>
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
    </div>`;

  return createWindow({
    customHeader,
    body,
    backdropCloseAttr: 'data-backdrop-close="swap"',
    closeBtnAttr: "data-close-swap-modal",
  });
};
