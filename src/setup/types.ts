import type { FormationContext, MatchConfig, Team } from "../domain.ts";

export type SetupView = "squad" | "tactics" | "shape";

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

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]!,
  );

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

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
