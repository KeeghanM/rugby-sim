import { Engine } from "@babylonjs/core/Engines/engine";
import { createCareerUI } from "./career/ui.ts";
import {
  createMatchInputForFixture,
  type Career,
  type Fixture,
} from "./career/index.ts";
import type { GameState, MatchResult } from "./domain.ts";
import { requiredElement } from "./dom.ts";
import { createRenderer } from "./renderer/index.ts";
import {
  createGame,
  createMatchResult,
  createSeededRandom,
  SIMULATION_STEP_SECONDS,
  updateGame,
} from "./simulation.ts";

type Screen = "career" | "match";

const careerRoot = requiredElement("career-screen", HTMLDivElement);
const canvas = requiredElement("renderCanvas", HTMLCanvasElement);
const matchScreen = requiredElement("match-screen", HTMLDivElement);
const setScreen = (screen: Screen) => {
  careerRoot.hidden = screen !== "career";
  matchScreen.hidden = screen !== "match";
};

let engine: Engine | null = null;
let state: GameState | null = null;
let renderer: ReturnType<typeof createRenderer> | null = null;
let random = Math.random;
let accumulatedSimulationSeconds = 0;
let disposed = false;

const renderFrame = () => {
  if (!state || !renderer || !engine) return;
  const speed = renderer.getSimulationSpeed();
  if (speed > 0) {
    accumulatedSimulationSeconds +=
      (Math.min(engine.getDeltaTime(), 100) / 1000) * speed;
    while (accumulatedSimulationSeconds >= SIMULATION_STEP_SECONDS) {
      updateGame(state, SIMULATION_STEP_SECONDS, random);
      accumulatedSimulationSeconds -= SIMULATION_STEP_SECONDS;
    }
  }
  renderer.sync(state);
  renderer.scene.render();
};

const ensureEngine = () => {
  if (!engine) {
    engine = new Engine(canvas, true);
    engine.runRenderLoop(renderFrame);
  }
  return engine;
};

const startWatchedCareerMatch = (
  career: Career,
  fixture: Fixture,
  onFinish: (result: MatchResult) => void,
) => {
  const activeEngine = ensureEngine();
  const input = createMatchInputForFixture(career, fixture);
  random = createSeededRandom(fixture.seed);
  state = createGame(input, random);
  accumulatedSimulationSeconds = 0;

  const finishMatch = () => {
    if (!state) return;
    const result = createMatchResult(state, fixture.seed);
    renderer?.dispose();
    renderer = null;
    state = null;
    accumulatedSimulationSeconds = 0;
    setScreen("career");
    onFinish(result);
  };

  renderer = createRenderer(activeEngine, canvas, state, finishMatch);
  setScreen("match");
  activeEngine.resize();
};

let careerUI: ReturnType<typeof createCareerUI>;

const resize = () => engine?.resize();
const dispose = () => {
  if (disposed) return;
  disposed = true;
  if (engine) engine.stopRenderLoop(renderFrame);
  renderer?.dispose();
  renderer = null;
  state = null;
  careerUI.dispose();
  window.removeEventListener("resize", resize);
  window.removeEventListener("pagehide", handlePageHide);
  engine?.dispose();
  engine = null;
};
const handlePageHide = (event: PageTransitionEvent) => {
  if (!event.persisted) dispose();
};

setScreen("career");
careerUI = createCareerUI(careerRoot, startWatchedCareerMatch);
window.addEventListener("resize", resize);
window.addEventListener("pagehide", handlePageHide);
import.meta.hot?.dispose(dispose);
