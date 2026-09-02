import { Vector3 } from "@babylonjs/core";
import type { GameState } from "../../domain.ts";
import { isEditableTarget, requiredElement } from "../../dom.ts";
import { createManagerController } from "./manager-controller.ts";

export const createUI = (state: GameState) => {
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  const scoreboard = requiredElement("scoreboard", HTMLOutputElement);
  const speedSlider = requiredElement("speed-slider", HTMLInputElement);
  const speedDisplay = requiredElement("speed-display", HTMLSpanElement);
  const debugOverlay = requiredElement("debug-overlay", HTMLDivElement);
  const tvTeam0 = requiredElement("tv-team-0", HTMLDivElement);
  const tvTeam1 = requiredElement("tv-team-1", HTMLDivElement);
  const tvTeam0Badge = requiredElement("tv-team0-badge", HTMLSpanElement);
  const tvTeam1Badge = requiredElement("tv-team1-badge", HTMLSpanElement);
  const tvTeam0Name = requiredElement("tv-team0-name", HTMLSpanElement);
  const tvTeam0Score = requiredElement("tv-team0-score", HTMLSpanElement);
  const tvTeam1Name = requiredElement("tv-team1-name", HTMLSpanElement);
  const tvTeam1Score = requiredElement("tv-team1-score", HTMLSpanElement);
  const tvClock = requiredElement("tv-clock", HTMLSpanElement);
  const tvHalf = requiredElement("tv-half", HTMLSpanElement);
  const tvPhasePill = requiredElement("tv-phase-pill", HTMLSpanElement);
  const tvMeters = requiredElement("tv-meters", HTMLSpanElement);
  const tvStatus = requiredElement("tv-status", HTMLSpanElement);
  const tvShotClock = requiredElement("tv-shot-clock", HTMLSpanElement);
  const managerViewBtn = requiredElement("manager-view-btn", HTMLButtonElement);
  const managerModal = requiredElement("manager-modal", HTMLDialogElement);
  const managerCloseBtn = requiredElement(
    "manager-close-btn",
    HTMLButtonElement,
  );
  const tabTeam0 = requiredElement("tab-team-0", HTMLButtonElement);
  const tabTeam1 = requiredElement("tab-team-1", HTMLButtonElement);
  const tabTeam0Swatch = requiredElement("tab-team-0-swatch", HTMLSpanElement);
  const tabTeam1Swatch = requiredElement("tab-team-1-swatch", HTMLSpanElement);
  const tabTeam0Label = requiredElement("tab-team-0-label", HTMLSpanElement);
  const tabTeam1Label = requiredElement("tab-team-1-label", HTMLSpanElement);
  const subtabRoster = requiredElement("subtab-roster", HTMLButtonElement);
  const subtabStats = requiredElement("subtab-stats", HTMLButtonElement);
  const managerTeamSummary = requiredElement(
    "manager-team-summary",
    HTMLDivElement,
  );
  const managerRosterThead = requiredElement(
    "manager-roster-thead",
    HTMLTableSectionElement,
  );
  const managerRosterTbody = requiredElement(
    "manager-roster-tbody",
    HTMLTableSectionElement,
  );
  const manager = createManagerController(
    {
      dialog: managerModal,
      opener: managerViewBtn,
      closeButton: managerCloseBtn,
      teamTabs: [tabTeam0, tabTeam1],
      viewTabs: { roster: subtabRoster, stats: subtabStats },
    },
    signal,
  );

  let simulationSpeed = 1;
  let previousSpeed = 1;
  let debugMode = false;

  const updateSpeedDisplay = () => {
    speedDisplay.textContent =
      simulationSpeed === 0
        ? "0.0× (Paused)"
        : `${simulationSpeed.toFixed(1)}×`;
  };

  const rawSpeed = Number(speedSlider.value);
  simulationSpeed = Number.isFinite(rawSpeed) ? Math.max(0, rawSpeed) : 1;
  if (simulationSpeed > 0) previousSpeed = simulationSpeed;
  updateSpeedDisplay();
  speedSlider.addEventListener(
    "input",
    () => {
      const value = Number(speedSlider.value);
      simulationSpeed = Number.isFinite(value) ? Math.max(0, value) : 1;
      if (simulationSpeed > 0) previousSpeed = simulationSpeed;
      updateSpeedDisplay();
    },
    { signal },
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (manager.isOpen() || event.repeat || isEditableTarget(event.target)) {
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        if (simulationSpeed > 0) {
          previousSpeed = simulationSpeed;
          simulationSpeed = 0;
        } else {
          simulationSpeed = previousSpeed > 0 ? previousSpeed : 1;
        }
        speedSlider.value = String(simulationSpeed);
        updateSpeedDisplay();
      } else if (event.key === "d" || event.key === "D") {
        debugMode = !debugMode;
      }
    },
    { signal },
  );

  const playerCards = new Map<string, HTMLElement>();
  for (const player of state.players) {
    const card = document.createElement("div");
    card.className = `debug-card team-${player.team}`;
    debugOverlay.appendChild(card);
    playerCards.set(player.id, card);
  }
  const ballCard = document.createElement("div");
  ballCard.className = "debug-card ball-card";
  debugOverlay.appendChild(ballCard);

  const context = {
    scoreboard,
    tvTeam0,
    tvTeam1,
    tvTeam0Badge,
    tvTeam1Badge,
    tvTeam0Name,
    tvTeam0Score,
    tvTeam1Name,
    tvTeam1Score,
    tvClock,
    tvHalf,
    tvPhasePill,
    tvMeters,
    tvStatus,
    tvShotClock,
    tabTeam0,
    tabTeam1,
    tabTeam0Swatch,
    tabTeam1Swatch,
    tabTeam0Label,
    tabTeam1Label,
    managerTeamSummary,
    managerRosterThead,
    managerRosterTbody,
    manager,
    getSimulationSpeed: () => simulationSpeed,
    isDebugMode: () => debugMode,
    debugOverlay,
    playerCards,
    ballCard,
    tempWorld: new Vector3(),
    tempProj: new Vector3(),
    dispose() {
      manager.dispose();
      lifecycle.abort();
      debugOverlay.replaceChildren();
      playerCards.clear();
    },
  };

  return context;
};

export type UIContext = ReturnType<typeof createUI>;
