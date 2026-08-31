import type { MatchConfig, Team } from "../domain.ts";
import { mixControl } from "./types.ts";

export const renderTactics = (teams: MatchConfig, selectedTeam: Team) => {
  const team = teams[selectedTeam];
  const pressure =
    team.lineSpeed < 4.1
      ? "patient"
      : team.lineSpeed > 4.8
        ? "aggressive"
        : "balanced";
  const maul =
    team.tendencies.maul < 0.35
      ? "move"
      : team.tendencies.maul > 0.65
        ? "drive"
        : "mixed";
  return `
      <div class="tactics-layout">
        <section class="tactic-block">
          <div class="section-heading"><div><span>With ball</span><h2>Attack balance</h2></div><strong>100%</strong></div>
          <div class="mix-stack">
            ${mixControl("carry", team.tendencies.carry)}
            ${mixControl("pass", team.tendencies.pass)}
            ${mixControl("kick", team.tendencies.kick)}
          </div>
          <div class="mix-bar"><i style="width:${team.tendencies.carry * 100}%"></i><i style="width:${team.tendencies.pass * 100}%"></i><i style="width:${team.tendencies.kick * 100}%"></i></div>
        </section>
        <section class="tactic-block">
          <div class="section-heading"><div><span>Without ball</span><h2>Defensive pressure</h2></div></div>
          <div class="choice-row">
            ${[
              ["patient", "Patient", "Hold shape, conserve energy"],
              ["balanced", "Balanced", "Connected pressure"],
              ["aggressive", "Aggressive", "Fast line, higher fatigue"],
            ]
              .map(
                ([value, title, detail]) =>
                  `<button type="button" data-pressure="${value}" class="choice ${pressure === value ? "selected" : ""}"><b>${title}</b><span>${detail}</span></button>`,
              )
              .join("")}
          </div>
        </section>
        <section class="tactic-block">
          <div class="section-heading"><div><span>Lineout ball</span><h2>Drive or distribute</h2></div></div>
          <div class="choice-row">
            ${[
              ["move", "Move it", "Play away from lineout"],
              ["mixed", "Mix it", "Keep defence guessing"],
              ["drive", "Drive", "Build mauls often"],
            ]
              .map(
                ([value, title, detail]) =>
                  `<button type="button" data-maul="${value}" class="choice ${maul === value ? "selected" : ""}"><b>${title}</b><span>${detail}</span></button>`,
              )
              .join("")}
          </div>
          <div class="lineout-size"><span>Preferred lineout size</span>${[4, 5, 6, 7].map((size) => `<button type="button" data-lineout="${size}" class="number-choice ${team.formations.lineoutMembers === size ? "selected" : ""}">${size}</button>`).join("")}</div>
        </section>
      </div>`;
};
