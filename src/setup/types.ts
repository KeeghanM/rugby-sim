import type { FormationContext, MatchConfig, Team } from "../domain.ts";
import { clamp } from "../math.ts";
export { escapeHtml } from "../html.ts";
export { clamp } from "../math.ts";

export const setupViews = {
  squad: "Squad",
  tactics: "Tactics",
  shape: "Shape Board",
} as const;

export type SetupView = keyof typeof setupViews;

export type SetupState = {
  selectedTeam: Team;
  view: SetupView;
  selectedPlayer: number;
  shapeContext: FormationContext;
  selectedShapeIndex: number;
};

export const skillKeys = [
  "decision",
  "handling",
  "passing",
  "kicking",
  "tackling",
] as const;

export const shapeContexts: {
  value: FormationContext;
  label: string;
  formation: keyof MatchConfig[Team]["formations"];
  presets: readonly (string | number)[];
}[] = [
  {
    value: "openAttack",
    label: "Open-play attack",
    formation: "openAttack",
    presets: ["balanced", "tightPods", "wide"],
  },
  {
    value: "openDefence",
    label: "Open-play defence",
    formation: "openDefence",
    presets: ["connected", "narrow", "wide"],
  },
  {
    value: "kickoffAttack",
    label: "Kick chase",
    formation: "kickoffAttack",
    presets: ["balanced", "press", "split"],
  },
  {
    value: "kickoffDefence",
    label: "Kick receipt",
    formation: "kickoffDefence",
    presets: ["deep", "pendulum", "splitField"],
  },
  {
    value: "scrumAttack",
    label: "Scrum attack",
    formation: "scrumAttack",
    presets: ["openSide", "blindSide", "splitBacks"],
  },
  {
    value: "scrumDefence",
    label: "Scrum defence",
    formation: "scrumDefence",
    presets: ["drift", "manOnMan", "blitz"],
  },
];

export const text = (value: string) =>
  value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());

export const toSpeedRating = (speed: number) =>
  Math.round(clamp(((speed - 3.8) / 2.8) * 100, 0, 100));
export const fromSpeedRating = (rating: number) => 3.8 + (rating / 100) * 2.8;
export const toWeightRating = (weight: number) =>
  Math.round(clamp(((weight - 75) / 50) * 100, 0, 100));
export const fromWeightRating = (rating: number) => 75 + (rating / 100) * 50;

export const ratingControl = (
  key: string,
  label: string,
  value: number,
  scope: "team" | "player",
) => `
  <label class="rating-control">
    <span>${label}</span>
    <input type="range" min="0" max="100" value="${Math.round(value)}" data-rating="${key}" data-scope="${scope}" />
    <output>${Math.round(value)}</output>
  </label>`;

export const modifierControl = (
  key: string,
  label: string,
  delta: number,
  effectiveTotal: number,
) => {
  const roundDelta = Math.round(delta);
  const deltaStr = roundDelta > 0 ? `+${roundDelta}` : `${roundDelta}`;
  const deltaColor =
    roundDelta > 0 ? "#4ade80" : roundDelta < 0 ? "#f87171" : "#94a3b8";
  return `
    <label class="rating-control">
      <div style="display:flex; justify-content:space-between; width:100%; align-items:baseline;">
        <span>${label}</span>
        <span style="font-size:0.72rem; color:#94a3b8; font-weight:500;">
          Total: <strong data-modifier-total style="color:#38bdf8; font-family:ui-monospace, monospace;">${Math.round(effectiveTotal)}</strong>
        </span>
      </div>
      <input type="range" min="-50" max="50" step="1" value="${roundDelta}" data-modifier="${key}" data-effective-base="${effectiveTotal - roundDelta}" data-scope="player" />
      <output style="font-weight:700; color:${deltaColor}; font-family:ui-monospace, monospace;">${deltaStr}</output>
    </label>`;
};

export const mixControl = (key: "carry" | "pass" | "kick", value: number) => `
  <label class="mix-control mix-${key}">
    <span>${text(key)}</span>
    <input type="range" min="0" max="100" value="${Math.round(value * 100)}" data-mix="${key}" />
    <output>${Math.round(value * 100)}%</output>
  </label>`;

export const boundsFor = (context: FormationContext) =>
  context.startsWith("scrum")
    ? { x: 25, z: 20 }
    : context.startsWith("open")
      ? { x: 35, z: 30 }
      : { x: 35, z: 50 };
