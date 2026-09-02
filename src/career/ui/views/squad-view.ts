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
    <span>23 players</span>
  </header>
  <div class="career-table-wrap">
    <table class="career-table squad">
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Age</th>
          <th>Role</th>
          <th>Overall</th>
          <th>Attack</th>
          <th>Defence</th>
          <th>Fitness</th>
        </tr>
      </thead>
      <tbody>
        ${club.squad
          .map(
            (player, index) =>
              `<tr>
                <td>${index + 1}</td>
                <td><button type="button" class="career-link-btn" data-view-player="${player.id}"><strong>${escapeHtml(player.name)}</strong></button></td>
                <td>${player.age}</td>
                <td>${roleName(player.role)}</td>
                <td><button type="button" class="ovr-badge ${getOvrClass(getPlayerOverall(player))}" data-view-player="${player.id}">OVR ${getPlayerOverall(player)}</button></td>
                <td>${player.attack}</td>
                <td>${player.defence}</td>
                <td><span class="fitness"><i style="width:${player.fitness}%"></i></span>${player.fitness}%</td>
              </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>
</section>`;
