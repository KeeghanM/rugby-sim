import type { Phase } from "./domain.ts";
import { computeCommands, createGame, updateGame } from "./simulation.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

{
  const game = createGame();
  const carrier = game.players.find((player) => player.team === 0)!;
  carrier.position = { x: 0, z: 49.9 };
  game.ball.carrierId = carrier.id;
  game.phase = { kind: "openPlay" };

  updateGame(game, 0.1, () => 0);

  assert(game.scores[0] === 5 && game.scores[1] === 0, "try should score five points");
  assert((game.phase as Phase).kind === "kickoff", "try should start kickoff formation");
  assert(game.ball.carrierId === null, "scorer should release ball");
}

{
  const game = createGame();
  const carrier = game.players.find((player) => player.team === 0)!;
  const teammate = game.players.find(
    (player) => player.team === 0 && player.id !== carrier.id,
  )!;
  carrier.position = { x: 0, z: 0 };
  teammate.position = { x: 5, z: 1 };
  game.ball.carrierId = carrier.id;
  game.phase = { kind: "openPlay" };

  const command = computeCommands(game, () => 1).find(
    ({ playerId }) => playerId === teammate.id,
  );

  assert((command?.velocity.z ?? 0) < 0, "offside attacker should retreat behind ball");
}

{
  const game = createGame();
  const carrier = game.players.find((player) => player.team === 0)!;
  const tackler = game.players.find((player) => player.team === 1)!;
  carrier.position = { x: 0, z: 0 };
  tackler.position = { x: 0, z: 0.5 };
  game.ball.carrierId = carrier.id;
  game.phase = { kind: "openPlay" };
  const rolls = [0, 0, 1, 1];

  updateGame(game, 0, () => rolls.shift() ?? 1);

  const phase = game.phase as Phase;
  assert(
    phase.kind === "ruck" &&
      phase.strategy === "slow" &&
      phase.releaseAfterSeconds === 60,
    "slow ruck should be able to retain ball for one minute",
  );
}

{
  const game = createGame();
  const carrier = game.players.find(
    (player) => player.team === 0 && player.role === "Fly Half",
  )!;
  carrier.position = { x: 0, z: 0 };
  game.players.find((player) => player.team === 1)!.position = { x: 0, z: 2 };
  game.ball.carrierId = carrier.id;
  game.phase = { kind: "openPlay" };

  const command = computeCommands(game, () => 0.3).find(
    ({ playerId }) => playerId === carrier.id,
  );
  const receiverId =
    command?.ballAction?.kind === "pass" ? command.ballAction.receiverId : null;
  const passTarget = game.players.find((player) => player.id === receiverId);

  if (!passTarget) throw new Error("fly half should find a pass under pressure");
  assert(
    (passTarget.position.z - carrier.position.z) * 1 <= 0,
    "pass target must not be ahead of carrier",
  );
}

{
  const game = createGame();
  const carrier = game.players.find((player) => player.team === 0)!;
  const tackler = game.players.find((player) => player.team === 1)!;
  carrier.position = { x: 0, z: 0 };
  tackler.position = { x: 0, z: 0.5 };
  game.ball.carrierId = carrier.id;
  game.phase = { kind: "openPlay" };

  updateGame(game, 0, () => 0);

  const phase = game.phase as Phase;
  assert(
    phase.kind === "ruck" && phase.stage === "forming",
    "successful tackle should start forming ruck",
  );
  assert(game.ball.carrierId === null, "ruck ball should be loose");
}
