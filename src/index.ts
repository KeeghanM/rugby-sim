import { Engine } from "@babylonjs/core/Engines/engine";
import type { GameState } from "./domain.ts";
import { requiredElement } from "./dom.ts";
import { createRenderer } from "./renderer/index.ts";
import {
  createGame,
  createMatchConfig,
  createMatchInput,
  createSeededRandom,
  updateGame,
} from "./simulation.ts";
import { createMatchSetup } from "./setup/index.ts";

type Screen = "pregame" | "match";

const canvas = requiredElement("renderCanvas", HTMLCanvasElement);
const pregame = requiredElement("pregame", HTMLDivElement);
const matchScreen = requiredElement("match-screen", HTMLDivElement);
const setScreen = (screen: Screen) => {
  pregame.hidden = screen !== "pregame";
  matchScreen.hidden = screen !== "match";
};

const engine = new Engine(canvas, true);
const teams = createMatchConfig();
let state: GameState | null = null;
let renderer: ReturnType<typeof createRenderer> | null = null;
let random = Math.random;
let disposed = false;

setScreen("pregame");
const setup = createMatchSetup(pregame, teams, () => {
  setup.dispose();
  random = createSeededRandom(Date.now());
  state = createGame(createMatchInput(teams), random);
  renderer = createRenderer(engine, canvas, state);
  pregame.replaceChildren();
  setScreen("match");
  engine.resize();
});

const renderFrame = () => {
  if (!state || !renderer) return;
  const speed = renderer.getSimulationSpeed();
  if (speed > 0) {
    const deltaSeconds = (Math.min(engine.getDeltaTime(), 100) / 1000) * speed;
    updateGame(state, deltaSeconds, random);
  }
  renderer.sync(state);
  renderer.scene.render();
};
const resize = () => engine.resize();
const dispose = () => {
  if (disposed) return;
  disposed = true;
  engine.stopRenderLoop(renderFrame);
  renderer?.dispose();
  renderer = null;
  state = null;
  setup.dispose();
  window.removeEventListener("resize", resize);
  window.removeEventListener("pagehide", handlePageHide);
  engine.dispose();
};
const handlePageHide = (event: PageTransitionEvent) => {
  if (!event.persisted) dispose();
};

engine.runRenderLoop(renderFrame);
window.addEventListener("resize", resize);
window.addEventListener("pagehide", handlePageHide);
import.meta.hot?.dispose(dispose);
