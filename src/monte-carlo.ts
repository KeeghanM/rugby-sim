import {
  createMatchConfig,
  setStats,
  simulateMonteCarlo,
} from "./simulation.ts";

declare const process: { argv: string[] };

const args = process.argv.slice(2).filter((argument) => argument !== "--");
const matches = Number(args[0] ?? 100);
const blueSkill = Number(args[1] ?? 85) / 100;
const redSkill = Number(args[2] ?? 20) / 100;
const teams = createMatchConfig();
const skillKeys = [
  "decision",
  "handling",
  "passing",
  "kicking",
  "tackling",
] as const;

for (const [team, skill] of [
  [0, blueSkill],
  [1, redSkill],
] as const) {
  setStats(teams, team, {
    skills: Object.fromEntries(skillKeys.map((key) => [key, skill])),
    playerOverrides: null,
  });
}

console.log(
  JSON.stringify(simulateMonteCarlo(matches, { teams, seed: 1 }), null, 2),
);
