import { Engine } from "@babylonjs/core/Engines/engine";
import type { GameState } from "./domain.ts";
import { createRenderer } from "./renderer.ts";
import { createGame, createMatchConfig, updateGame } from "./simulation.ts";
import { createMatchSetup } from "./setup.ts";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const pregame = document.getElementById("pregame")!;
const engine = new Engine(canvas, true);
const teams = createMatchConfig();
let state: GameState | null = null;
let renderer: ReturnType<typeof createRenderer> | null = null;

createMatchSetup(pregame, teams, () => {
  state = createGame(teams);
  renderer = createRenderer(engine, canvas, state);
  pregame.classList.add("hidden");
});

engine.runRenderLoop(() => {
  if (!state || !renderer) return;
  const speed = renderer.getSimulationSpeed();
  if (speed > 0) {
    const deltaSeconds = (Math.min(engine.getDeltaTime(), 100) / 1000) * speed;
    updateGame(state, deltaSeconds);
  }
  renderer.sync(state);
  renderer.scene.render();
});

window.addEventListener("resize", () => engine.resize());
