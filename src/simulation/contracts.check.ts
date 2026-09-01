import { ATTACK_FORMATION } from "../formations.ts";
import { createMatchConfig, getPlayerProfile } from "../teams/index.ts";
import { createGame, createMatchInput } from "./create-game.ts";
import { createMatchResult } from "./match-result.ts";
import { updateSubstitutions } from "./movement/substitutions.ts";

const check = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const teams = createMatchConfig();
const input = createMatchInput(teams, {
  0: {
    starters: Array.from({ length: 15 }, (_, index) => `club-a-${index + 1}`),
    substitutes: Array.from(
      { length: 8 },
      (_, index) => `club-a-${index + 16}`,
    ),
  },
  1: {
    starters: Array.from({ length: 15 }, (_, index) => `club-b-${index + 1}`),
    substitutes: Array.from(
      { length: 8 },
      (_, index) => `club-b-${index + 16}`,
    ),
  },
});
const state = createGame(input, () => 0.5);
const starter = state.players.find(
  (player) => player.team === 0 && player.number === 1,
)!;
starter.stamina = 0;
starter.stats.triesScored = 2;
state.matchClockSeconds = 2700;
state.phase = {
  kind: "scrum",
  stage: "forming",
  position: { x: 0, z: 0 },
  feedingTeam: 0,
  elapsed: 0,
  winningTeam: null,
};

updateSubstitutions(state);

check(
  starter.playerId === "club-a-17",
  "Replacement identity was not activated",
);
const replaced = state.substitutes.find(
  (player) => player.playerId === "club-a-1",
)!;
check(replaced.stats.triesScored === 2, "Outgoing player stats were lost");
check(starter.stats.triesScored === 0, "Replacement inherited starter stats");

const result = createMatchResult(state, 42);
check(result.simulationVersion === 1, "Result simulation version changed");
check(result.players.length === 46, "Result must contain all match entrants");
check(
  new Set(result.players.map((player) => player.playerId)).size === 46,
  "Result player IDs must be unique",
);

const role = ATTACK_FORMATION[0].role;
const overridden = getPlayerProfile(0, 1, role, teams);
delete teams[0].playerOverrides[1];
const baseline = getPlayerProfile(0, 1, role, teams);
check(overridden.weight !== baseline.weight, "Preset override had no effect");

console.log("Match contract checks passed");
