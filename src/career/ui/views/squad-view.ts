import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import type { Club } from "../../domain/index.ts";
import { roleName } from "../../domain/index.ts";
import { getOvrClass, getPlayerOverall } from "../formatters.ts";

const SQUAD_VIEW_STYLES = `
  .fitness {
    display: inline-block;
    width: 48px;
    height: 5px;
    border-radius: 3px;
    margin-right: 0.5rem;
    background: #334155;
    vertical-align: middle;
    overflow: hidden;
  }
  .fitness i {
    display: block;
    height: 100%;
    background: #22c55e;
  }
`;

registerStyles("career-squad-view", SQUAD_VIEW_STYLES);

export const renderSquad = (
  club: Club,
): string => `<section class="career-section">
  <header>
    <div>
      <span class="career-kicker">Registered players</span>
      <h2>${escapeHtml(club.name)} squad</h2>
    </div>
    <span>${club.squad.length} players</span>
  </header>
  <div class="career-table-wrap">
    <table class="career-table squad">
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th style="text-align: center;">Age</th>
          <th>Role</th>
          <th style="text-align: center;">Overall</th>
          <th style="text-align: center;">Pace</th>
          <th style="text-align: center;">Power</th>
          <th style="text-align: center;">Fitness</th>
        </tr>
      </thead>
      <tbody>
        ${club.squad
          .map(
            (player, index) =>
              `<tr>
                <td style="text-align: center;">
                  <span class="player-num-badge" style="background:${club.color}; width:22px; height:22px; font-size:0.7rem;">${index + 1}</span>
                </td>
                <td>
                  <button type="button" class="career-link-btn" data-view-player="${player.id}">
                    <strong>${escapeHtml(player.name)}</strong>
                  </button>
                  ${
                    player.injury
                      ? `<span class="group-tag" style="background:rgba(239,68,68,0.2); color:#f87171; font-size:0.62rem; margin-left: 0.35rem;">⚠️ ${player.injury.weeksRemaining}w</span>`
                      : ""
                  }
                </td>
                <td style="text-align: center;">${player.age}</td>
                <td>${roleName(player.role)}</td>
                <td style="text-align: center;">
                  <button type="button" class="ovr-badge ${getOvrClass(getPlayerOverall(player))}" data-view-player="${player.id}">
                    OVR ${getPlayerOverall(player)}
                  </button>
                </td>
                <td style="text-align: center;">${player.speed}</td>
                <td style="text-align: center;">${player.strength}</td>
                <td style="text-align: center;"><span class="fitness"><i style="width:${player.fitness}%"></i></span>${player.fitness}%</td>
              </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>
</section>`;
