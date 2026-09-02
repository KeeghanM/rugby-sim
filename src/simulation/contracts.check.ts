import { ATTACK_FORMATION, getKickoffTarget } from "../formations.ts";
import { attackDirection, type GameState } from "../domain.ts";
import { createMatchConfig, getPlayerProfile } from "../teams/index.ts";
import { carryBall, startLineout } from "./ball.ts";
import { createGame, createMatchInput } from "./create-game.ts";
import { getPenaltyCommands, getRuckCommands } from "./decisions/set-piece.ts";
import { createMatchResult } from "./match-result.ts";
import { separatedVelocity } from "./movement/collisions.ts";
import { updateSubstitutions } from "./movement/substitutions.ts";
import {
  attemptTackle,
  startPenalty,
  updateKickoff,
  updatePenalty,
} from "./phases.ts";

const check = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};
const currentPhase = (game: GameState): GameState["phase"] => game.phase;

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

const kickoffState = createGame(input, () => 0.5);
const kickoff = kickoffState.phase;
if (kickoff.kind !== "kickoff")
  throw new Error("Match did not start at kickoff");
for (const player of kickoffState.players) {
  player.position = getKickoffTarget(
    player,
    kickoff.kickingTeam,
    kickoff.reason,
    kickoffState.formations[kickoff.kickingTeam].kickoffAttack,
    kickoffState.formations[player.team].kickoffDefence,
    kickoffState.activeShapePositions[player.team][
      player.team === kickoff.kickingTeam ? "kickoffAttack" : "kickoffDefence"
    ],
  );
}
kickoffState.players[0].position.z += 10;
updateKickoff(kickoffState, 30, () => 0.5);
check(
  kickoff.stage === "forming",
  "Kickoff started before every player formed",
);
kickoffState.players[0].position = getKickoffTarget(
  kickoffState.players[0],
  kickoff.kickingTeam,
  kickoff.reason,
  kickoffState.formations[kickoff.kickingTeam].kickoffAttack,
  kickoffState.formations[kickoffState.players[0].team].kickoffDefence,
  kickoffState.activeShapePositions[kickoffState.players[0].team][
    kickoffState.players[0].team === kickoff.kickingTeam
      ? "kickoffAttack"
      : "kickoffDefence"
  ],
);
updateKickoff(kickoffState, 0.1, () => 0.5);
updateKickoff(kickoffState, 1, () => 0.5);
check(
  kickoffState.ball.flight === "kickoff" &&
    kickoffState.ball.kickOrigin?.x === 0 &&
    kickoffState.ball.kickOrigin.z === 0,
  "Kickoff did not launch from restart mark",
);

const penaltyState = createGame(input, () => 0.5);
startPenalty(penaltyState, 0, { x: 12, z: 18 }, undefined, () => 0.5);
if (penaltyState.phase.kind !== "penalty")
  throw new Error("Penalty did not start");
penaltyState.phase.choice = "touch";
const penaltyKickerId = penaltyState.phase.kickerId;
updatePenalty(penaltyState, 30, () => 0.5);
check(
  penaltyState.phase.kind === "penalty" &&
    penaltyState.phase.stage === "decision",
  "Penalty started before players formed",
);
for (const command of getPenaltyCommands(penaltyState, penaltyState.players)!) {
  const player = penaltyState.players.find(
    ({ id }) => id === command.playerId,
  )!;
  player.position = { ...command.target };
  player.intentTarget = { ...command.target };
  player.intentKind = command.intentKind;
}
const legalDrifter = penaltyState.players.find(
  (player) => player.team === 0 && player.id !== penaltyKickerId,
)!;
legalDrifter.position.x = -30;
updatePenalty(penaltyState, 0.1, () => 0.5);
updatePenalty(penaltyState, 0.1, () => 0.5);
check(
  penaltyState.ball.kickOrigin?.x === 12 &&
    penaltyState.ball.kickOrigin.z === 18,
  "Penalty did not launch from mark",
);

penaltyState.players[0].ruckRecoverySeconds = 999;
startLineout(penaltyState, 0, 20, 35);
check(
  penaltyState.players.every(
    ({ ruckRecoverySeconds }) => ruckRecoverySeconds === 0,
  ),
  "Contact pose survived lineout transition",
);
check(
  separatedVelocity(penaltyState, penaltyState.players[0], { x: 1, z: 2 }).x ===
    1 &&
    separatedVelocity(penaltyState, penaltyState.players[0], { x: 1, z: 2 })
      .z === 2,
  "Collision avoidance remained active during lineout setup",
);

const tackleState = createGame(input, () => 0.5);
for (const player of tackleState.players) player.position = { x: 30, z: -50 };
const carrier = tackleState.players.find((player) => player.team === 0)!;
const tackler = tackleState.players.find((player) => player.team === 1)!;
carrier.position = { x: 0, z: 10.6 };
tackler.position = { x: 0, z: 9.4 };
tackleState.phase = { kind: "openPlay" };
carryBall(tackleState, carrier);
tackleState.defensiveLineZ[1] = 10;
const tackleRolls = [0, 0.5];
attemptTackle(tackleState, () => tackleRolls.shift() ?? 0.5);
check(
  tackler.stats.tacklesMade === 1,
  "Trailing defender tackle was not recorded",
);
const tacklePhase = currentPhase(tackleState);
if (tacklePhase.kind !== "ruck") throw new Error("Tackle did not start ruck");
const firstTacklerTarget = getRuckCommands(
  tackleState,
  tackleState.players,
)!.find(({ playerId }) => playerId === tackler.id)!.target;
tackler.position.x += 5;
const secondTacklerTarget = getRuckCommands(
  tackleState,
  tackleState.players,
)!.find(({ playerId }) => playerId === tackler.id)!.target;
check(
  firstTacklerTarget.x === secondTacklerTarget.x &&
    firstTacklerTarget.z === secondTacklerTarget.z &&
    (firstTacklerTarget.z - tacklePhase.position.z) *
      attackDirection(tacklePhase.attackingTeam) >
      0,
  "Tackler did not retreat to stable defending-side target",
);

console.log("Match contract checks passed");
