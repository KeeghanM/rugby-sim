import type { MatchConfig, Team } from "../domain.ts";
import { ATTACK_FORMATION } from "../formations/index.ts";
import { getPlayerProfile, getPlayerDeltas } from "../teams/index.ts";
import {
  modifierControl,
  ratingControl,
  skillKeys,
  text,
  toSpeedRating,
  toWeightRating,
} from "./types.ts";

export const renderSquad = (
  teams: MatchConfig,
  selectedTeam: Team,
  selectedPlayer: number,
) => {
  const team = teams[selectedTeam];
  const roster = ATTACK_FORMATION.map((slot, index) => ({
    ...slot,
    number: index + 1,
    profile: getPlayerProfile(selectedTeam, index + 1, slot.role, teams),
    deltas: getPlayerDeltas(selectedTeam, index + 1, slot.role, teams),
  }));
  const selected = roster[selectedPlayer - 1];
  const profile = selected.profile;
  const deltas = selected.deltas;

  return `
      <div class="squad-layout">
        <section class="team-ratings">
          <div class="section-heading"><div><span>Whole squad</span><h2>Baseline ratings</h2></div><p>Move one slider to coach that quality across all 23 players. Individual differences remain visible below.</p></div>
          <div class="ratings-grid">
            ${ratingControl("speed", "Pace", ((team.speedMultiplier - 0.8) / 0.4) * 100, "team")}
            ${ratingControl("weight", "Power", ((team.weightMultiplier - 0.8) / 0.4) * 100, "team")}
            ${skillKeys.map((key) => ratingControl(key, text(key), team.defaultSkills[key] * 100, "team")).join("")}
          </div>
        </section>
        <section class="roster-panel">
          <div class="section-heading"><div><span>Starting XV</span><h2>Select player</h2></div></div>
          <div class="roster-head"><span>#</span><span>Role</span><span>Pace</span><span>Power</span><span>Decision</span><span>Handle</span><span>Pass</span><span>Kick</span><span>Tackle</span></div>
          <div class="roster-list">
            ${roster
              .map(
                (player) => `
                <button type="button" class="roster-row ${player.number === selectedPlayer ? "selected" : ""}" data-player="${player.number}">
                  <b>${player.number}</b><span>${player.role}</span>
                  <i>${toSpeedRating(player.profile.speed)}</i><i>${toWeightRating(player.profile.weight)}</i>
                  <i>${Math.round(player.profile.skills.decision * 100)}</i><i>${Math.round(player.profile.skills.handling * 100)}</i>
                  <i>${Math.round(player.profile.skills.passing * 100)}</i><i>${Math.round(player.profile.skills.kicking * 100)}</i><i>${Math.round(player.profile.skills.tackling * 100)}</i>
                </button>`,
              )
              .join("")}
          </div>
        </section>
        <aside class="player-editor">
          <div class="player-shirt" style="--team-color:${team.color}"><span>${selectedPlayer}</span></div>
          <div><span class="eyebrow">Individual training (Modifiers)</span><h2>#${selectedPlayer} ${selected.role}</h2></div>
          <div class="player-rating-list">
            ${modifierControl("speed", "Pace", deltas.speed, toSpeedRating(profile.speed))}
            ${modifierControl("weight", "Power", deltas.weight, toWeightRating(profile.weight))}
            ${skillKeys.map((key) => modifierControl(key, text(key), deltas.skills[key], Math.round(profile.skills[key] * 100))).join("")}
          </div>
        </aside>
      </div>`;
};
