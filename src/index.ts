import { Engine } from "@babylonjs/core/Engines/engine";
import { createCareerUI } from "./career/ui.ts";
import {
  createMatchInputForFixture,
  type Career,
  type Fixture,
} from "./career/index.ts";
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

type Screen = "career" | "pregame" | "match";

const careerRoot = requiredElement("career-screen", HTMLDivElement);
const canvas = requiredElement("renderCanvas", HTMLCanvasElement);
const pregame = requiredElement("pregame", HTMLDivElement);
const matchScreen = requiredElement("match-screen", HTMLDivElement);
const setScreen = (screen: Screen) => {
  careerRoot.hidden = screen !== "career";
  pregame.hidden = screen !== "pregame";
  matchScreen.hidden = screen !== "match";
};

let engine: Engine | null = null;
let state: GameState | null = null;
let renderer: ReturnType<typeof createRenderer> | null = null;
let setup: ReturnType<typeof createMatchSetup> | null = null;
let random = Math.random;
let disposed = false;

const renderFrame = () => {
  if (!state || !renderer || !engine) return;
  const speed = renderer.getSimulationSpeed();
  if (speed > 0) {
    const deltaSeconds = (Math.min(engine.getDeltaTime(), 100) / 1000) * speed;
    updateGame(state, deltaSeconds, random);
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
  onFinish: (result: { homeScore: number; awayScore: number }) => void,
) => {
  const activeEngine = ensureEngine();
  const input = createMatchInputForFixture(career, fixture);
  random = createSeededRandom(fixture.seed);
  state = createGame(input, random);

  const finishMatch = () => {
    const finalScore = {
      homeScore: state?.scores[0] ?? 0,
      awayScore: state?.scores[1] ?? 0,
    };
    renderer?.dispose();
    renderer = null;
    state = null;
    setScreen("career");
    onFinish(finalScore);
  };

  renderer = createRenderer(activeEngine, canvas, state, finishMatch);
  setScreen("match");
  activeEngine.resize();
};

let careerUI: ReturnType<typeof createCareerUI>;

const startExhibition = () => {
  careerUI.dispose();
  setScreen("pregame");
  const activeEngine = ensureEngine();
  const teams = createMatchConfig();
  setup = createMatchSetup(pregame, teams, () => {
    setup?.dispose();
    random = createSeededRandom(Date.now());
    state = createGame(createMatchInput(teams), random);

    const finishExhibition = () => {
      renderer?.dispose();
      renderer = null;
      state = null;
      setScreen("career");
      careerUI = createCareerUI(
        careerRoot,
        startExhibition,
        startWatchedCareerMatch,
      );
    };

    renderer = createRenderer(activeEngine, canvas, state, finishExhibition);
    pregame.replaceChildren();
    setScreen("match");
    activeEngine.resize();
  });
};

const resize = () => engine?.resize();
const dispose = () => {
  if (disposed) return;
  disposed = true;
  if (engine) engine.stopRenderLoop(renderFrame);
  renderer?.dispose();
  renderer = null;
  state = null;
  setup?.dispose();
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
careerUI = createCareerUI(careerRoot, startExhibition, startWatchedCareerMatch);
window.addEventListener("resize", resize);
window.addEventListener("pagehide", handlePageHide);
import.meta.hot?.dispose(dispose);
