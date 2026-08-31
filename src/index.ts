import { Engine } from "@babylonjs/core/Engines/engine";
import { createRenderer } from "./renderer.ts";
import { createGame, updateGame } from "./simulation.ts";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true);
const state = createGame();
const renderer = createRenderer(engine, canvas, state);

engine.runRenderLoop(() => {
  const deltaSeconds =
    (Math.min(engine.getDeltaTime(), 100) / 1000) *
    renderer.getSimulationSpeed();
  updateGame(state, deltaSeconds);
  renderer.sync(state);
  renderer.scene.render();
});

window.addEventListener("resize", () => engine.resize());
