import { Color3, Matrix, Vector3 } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import type { GameState } from "../../domain.ts";
import { PITCH } from "../../domain.ts";
import { isForward } from "../../formations.ts";

export const createUI = (state: GameState) => {
  const scoreboard = document.getElementById("scoreboard");
  const speedSlider = document.getElementById(
    "speed-slider",
  ) as HTMLInputElement | null;
  const speedDisplay = document.getElementById("speed-display");
  const debugToggle = document.getElementById(
    "debug-toggle",
  ) as HTMLInputElement | null;
  const debugOverlay = document.getElementById("debug-overlay");
  const uiControls = document.getElementById("ui-controls");
  const controlsToggleBtn = document.getElementById("controls-toggle-btn");

  const tvTeam0 = document.getElementById("tv-team-0");
  const tvTeam1 = document.getElementById("tv-team-1");
  const tvTeam0Name = document.getElementById("tv-team0-name");
  const tvTeam0Score = document.getElementById("tv-team0-score");
  const tvTeam1Name = document.getElementById("tv-team1-name");
  const tvTeam1Score = document.getElementById("tv-team1-score");
  const tvClock = document.getElementById("tv-clock");
  const tvHalf = document.getElementById("tv-half");
  const tvPhasePill = document.getElementById("tv-phase-pill");
  const tvMeters = document.getElementById("tv-meters");
  const tvStatus = document.getElementById("tv-status");
  const tvShotClock = document.getElementById("tv-shot-clock");

  const managerModal = document.getElementById("manager-modal");
  const managerViewBtn = document.getElementById("manager-view-btn");
  const managerCloseBtn = document.getElementById("manager-close-btn");
  const tabTeam0 = document.getElementById("tab-team-0");
  const tabTeam1 = document.getElementById("tab-team-1");
  const subtabRoster = document.getElementById("subtab-roster");
  const subtabStats = document.getElementById("subtab-stats");
  const managerTeamSummary = document.getElementById("manager-team-summary");
  const managerRosterThead = document.getElementById("manager-roster-thead");
  const managerRosterTbody = document.getElementById("manager-roster-tbody");

  let managerOpen = false;
  let selectedManagerTeam: 0 | 1 = 0;
  let selectedManagerView: "roster" | "stats" = "roster";

  const setManagerOpen = (open: boolean) => {
    managerOpen = open;
    if (managerModal) managerModal.classList.toggle("active", open);
  };

  if (managerViewBtn)
    managerViewBtn.addEventListener("click", () => setManagerOpen(true));
  if (managerCloseBtn)
    managerCloseBtn.addEventListener("click", () => setManagerOpen(false));
  if (managerModal)
    managerModal.addEventListener("click", (e) => {
      if (e.target === managerModal) setManagerOpen(false);
    });
  if (tabTeam0)
    tabTeam0.addEventListener("click", () => {
      selectedManagerTeam = 0;
      tabTeam0.classList.add("active");
      tabTeam1?.classList.remove("active");
    });
  if (tabTeam1)
    tabTeam1.addEventListener("click", () => {
      selectedManagerTeam = 1;
      tabTeam1.classList.add("active");
      tabTeam0?.classList.remove("active");
    });
  if (subtabRoster)
    subtabRoster.addEventListener("click", () => {
      selectedManagerView = "roster";
      subtabRoster.classList.add("active");
      subtabStats?.classList.remove("active");
    });
  if (subtabStats)
    subtabStats.addEventListener("click", () => {
      selectedManagerView = "stats";
      subtabStats.classList.add("active");
      subtabRoster?.classList.remove("active");
    });
  if (controlsToggleBtn && uiControls) {
    controlsToggleBtn.addEventListener("click", () => {
      uiControls.classList.toggle("collapsed");
      controlsToggleBtn.textContent = uiControls.classList.contains("collapsed")
        ? "Open ⚙"
        : "Minimize";
    });
  }

  let simulationSpeed = 1;
  let debugMode = false;
  if (speedSlider) {
    simulationSpeed = parseFloat(speedSlider.value) || 1;
    speedSlider.addEventListener("input", () => {
      simulationSpeed = parseFloat(speedSlider.value) || 1;
      if (speedDisplay)
        speedDisplay.textContent = `${simulationSpeed.toFixed(1)}×`;
    });
  }
  if (debugToggle) {
    debugMode = debugToggle.checked;
    debugToggle.addEventListener("change", () => {
      debugMode = debugToggle.checked;
    });
  }

  const playerCards = new Map<string, HTMLElement>();
  let ballCard: HTMLElement | null = null;
  if (debugOverlay) {
    for (const player of state.players) {
      const card = document.createElement("div");
      card.className = `debug-card team-${player.team}`;
      debugOverlay.appendChild(card);
      playerCards.set(player.id, card);
    }
    ballCard = document.createElement("div");
    ballCard.className = "debug-card ball-card";
    debugOverlay.appendChild(ballCard);
  }

  const tempWorld = new Vector3();
  const tempProj = new Vector3();
  const ballTarget = new Vector3(0, 0, 0);

  return {
    scoreboard,
    speedSlider,
    speedDisplay,
    debugToggle,
    debugOverlay,
    uiControls,
    controlsToggleBtn,
    tvTeam0,
    tvTeam1,
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
    managerModal,
    managerViewBtn,
    managerCloseBtn,
    tabTeam0,
    tabTeam1,
    subtabRoster,
    subtabStats,
    managerTeamSummary,
    managerRosterThead,
    managerRosterTbody,
    getManagerOpen: () => managerOpen,
    setManagerOpen,
    getSelectedManagerTeam: () => selectedManagerTeam,
    getSelectedManagerView: () => selectedManagerView,
    getSimulationSpeed: () => simulationSpeed,
    isDebugMode: () => debugMode,
    playerCards,
    ballCard,
    tempWorld,
    tempProj,
    ballTarget,
  };
};
