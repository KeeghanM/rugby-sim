import { createMatchConfig, createMatchInput, setStats, simulateMonteCarlo } from './simulation/index.ts'

declare const process: { argv: string[] }

const args = process.argv.slice(2).filter((argument) => argument !== '--')
const matches = Number(args[0] ?? 100)
const blueSkill = Number(args[1] ?? 85) / 100
const redSkill = Number(args[2] ?? 20) / 100
const presets = createMatchConfig()
const teams = createMatchConfig({ 0: presets[0], 1: presets[0] })
teams[1].name = presets[1].name
teams[1].color = presets[1].color
const skillKeys = ['decision', 'handling', 'passing', 'kicking', 'tackling'] as const

for (const [team, skill] of [
  [0, blueSkill],
  [1, redSkill],
] as const) {
  setStats(teams, team, {
    skills: Object.fromEntries(skillKeys.map((key) => [key, skill])),
    playerOverrides: null,
  })
}

console.log(JSON.stringify(simulateMonteCarlo(matches, { input: createMatchInput(teams), seed: 1 }), null, 2))
