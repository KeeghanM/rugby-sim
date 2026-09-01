import { Engine } from "@babylonjs/core/Engines/engine";
import type { GameState } from "./domain.ts";
import { createRenderer } from "./renderer/index.ts";
import {
  createGame,
  createMatchConfig,
  createMatchInput,
  createSeededRandom,
  updateGame,
} from "./simulation.ts";
import { createMatchSetup } from "./setup/index.ts";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const pregame = document.getElementById("pregame")!;
const engine = new Engine(canvas, true);
const teams = createMatchConfig();
let state: GameState | null = null;
let renderer: ReturnType<typeof createRenderer> | null = null;
let random = Math.random;

createMatchSetup(pregame, teams, () => {
  random = createSeededRandom(Date.now());
  state = createGame(createMatchInput(teams), random);
  renderer = createRenderer(engine, canvas, state);
  pregame.classList.add("hidden");
});

engine.runRenderLoop(() => {
  if (!state || !renderer) return;
  const speed = renderer.getSimulationSpeed();
  if (speed > 0) {
    const deltaSeconds = (Math.min(engine.getDeltaTime(), 100) / 1000) * speed;
    updateGame(state, deltaSeconds, random);
  }
  renderer.sync(state);
  renderer.scene.render();
});

window.addEventListener("resize", () => engine.resize());
