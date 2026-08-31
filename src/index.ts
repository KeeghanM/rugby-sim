import { Engine } from "@babylonjs/core/Engines/engine";
import { createRenderer } from "./renderer.ts";
import { createGame, updateGame } from "./simulation.ts";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true);
const state = createGame();
const renderer = createRenderer(engine, canvas, state);
const SIMULATION_SPEED = 1; //0.25;

engine.runRenderLoop(() => {
  const deltaSeconds =
    (Math.min(engine.getDeltaTime(), 100) / 1000) * SIMULATION_SPEED;
  updateGame(state, deltaSeconds);
  renderer.sync(state);
  renderer.scene.render();
});

window.addEventListener("resize", () => engine.resize());
