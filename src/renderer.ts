import {
  Color3,
  Color4,
  CreateBox,
  CreateCylinder,
  CreateDashedLines,
  CreateGround,
  CreateLines,
  CreateSphere,
  FreeCamera,
  HemisphericLight,
  Matrix,
  StandardMaterial,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import type { GameState } from "./domain.ts";
import { PITCH } from "./domain.ts";
import { isForward } from "./formations.ts";
import { createPitch } from "./renderer/pitch.ts";

export type CameraMode = "halfway" | "goalLine" | "free";
type GoalLineSide = "south" | "north";

const createEnvironment = (scene: Scene) => {
  // Extended ground beyond pitch — large low-poly apron
  const extended = CreateGround(
    "extended-ground",
    { width: 520, height: 520 },
    scene,
  );
  extended.position.y = -0.18;
  const extMat = new StandardMaterial("ext-ground-mat", scene);
  extMat.diffuseColor = Color3.FromHexString("#2a5d12");
  extMat.specularColor = Color3.Black();
  extended.material = extMat;

  // Outer concrete / mud ring
  const outer = CreateGround(
    "outer-ground",
    { width: 700, height: 700 },
    scene,
  );
  outer.position.y = -0.35;
  const outerMat = new StandardMaterial("outer-ground-mat", scene);
  outerMat.diffuseColor = Color3.FromHexString("#3a3f3a");
  outerMat.specularColor = Color3.Black();
  outer.material = outerMat;

  // Skybox — large inverted box with solid sky color
  const skybox = CreateBox("skyBox", { size: 2000 }, scene);
  const skyMat = new StandardMaterial("skyBox-mat", scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.emissiveColor = Color3.FromHexString("#87ceeb");
  skyMat.diffuseColor = Color3.FromHexString("#87ceeb");
  skybox.material = skyMat;
  skybox.infiniteDistance = true;
  skybox.isPickable = false;

  scene.clearColor = new Color4(0.53, 0.81, 0.92, 1);
  scene.ambientColor = new Color3(0.9, 0.9, 0.95);

  // Low-poly stadium — four stands + floodlights
  const standMat = new StandardMaterial("stand-mat", scene);
  standMat.diffuseColor = Color3.FromHexString("#475569");
  standMat.specularColor = Color3.FromHexString("#1e293b");
  standMat.specularPower = 8;

  const standUpperMat = new StandardMaterial("stand-upper-mat", scene);
  standUpperMat.diffuseColor = Color3.FromHexString("#64748b");
  standUpperMat.specularColor = Color3.Black();

  const createStand = (
    name: string,
    width: number,
    height: number,
    depth: number,
    pos: Vector3,
    mat: StandardMaterial,
  ) => {
    const m = CreateBox(name, { width, height, depth }, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    return m;
  };

  // South / North stands (behind dead-ball lines)
  createStand("stand-south", 200, 18, 28, new Vector3(0, 9, -78), standMat);
  createStand("stand-north", 200, 18, 28, new Vector3(0, 9, 78), standMat);
  // West / East stands (along touch lines)
  createStand("stand-west", 28, 16, 170, new Vector3(-58, 8, 0), standMat);
  createStand("stand-east", 28, 16, 170, new Vector3(58, 8, 0), standMat);
  // Upper rim tiers — low-poly step
  createStand(
    "stand-south-upper",
    190,
    6,
    8,
    new Vector3(0, 18, -84),
    standUpperMat,
  );
  createStand(
    "stand-north-upper",
    190,
    6,
    8,
    new Vector3(0, 18, 84),
    standUpperMat,
  );
  createStand(
    "stand-west-upper",
    8,
    5,
    160,
    new Vector3(-64, 16, 0),
    standUpperMat,
  );
  createStand(
    "stand-east-upper",
    8,
    5,
    160,
    new Vector3(64, 16, 0),
    standUpperMat,
  );

  // Floodlight poles + heads at four corners
  const poleMat = new StandardMaterial("pole-mat", scene);
  poleMat.diffuseColor = Color3.FromHexString("#cbd5e1");
  poleMat.specularColor = Color3.Black();
  const lightMat = new StandardMaterial("light-mat", scene);
  lightMat.emissiveColor = Color3.FromHexString("#fef9c3");
  lightMat.diffuseColor = Color3.FromHexString("#fef9c3");
  lightMat.disableLighting = true;
  const polePositions = [
    new Vector3(-68, 0, -66),
    new Vector3(68, 0, -66),
    new Vector3(-68, 0, 66),
    new Vector3(68, 0, 66),
  ];
  for (let i = 0; i < polePositions.length; i++) {
    const base = polePositions[i];
    const pole = CreateCylinder(
      `pole-${i}`,
      { height: 38, diameter: 1.1 },
      scene,
    );
    pole.position.set(base.x, 19, base.z);
    pole.material = poleMat;
    const head = CreateBox(
      `light-${i}`,
      { width: 4.5, height: 1.4, depth: 3 },
      scene,
    );
    head.position.set(base.x, 38.5, base.z);
    head.material = lightMat;
  }

  // Low perimeter wall around outer ground
  const wallMat = new StandardMaterial("wall-mat", scene);
  wallMat.diffuseColor = Color3.FromHexString("#334155");
  wallMat.specularColor = Color3.Black();
  const wallY = 1.2;
  const wallH = 2.4;
  const wallT = 1.2;
  createStand(
    "wall-south",
    560,
    wallH,
    wallT,
    new Vector3(0, wallY, -260),
    wallMat,
  );
  createStand(
    "wall-north",
    560,
    wallH,
    wallT,
    new Vector3(0, wallY, 260),
    wallMat,
  );
  createStand(
    "wall-west",
    wallT,
    wallH,
    560,
    new Vector3(-260, wallY, 0),
    wallMat,
  );
  createStand(
    "wall-east",
    wallT,
    wallH,
    560,
    new Vector3(260, wallY, 0),
    wallMat,
  );
};

export const createRenderer = (
  engine: Engine,
  canvas: HTMLCanvasElement,
  state: GameState,
) => {
  const scene = new Scene(engine);
  createEnvironment(scene);

  const broadcastCam = new FreeCamera(
    "broadcastCam",
    new Vector3(85, 85, 0),
    scene,
  );
  broadcastCam.setTarget(Vector3.Zero());
  broadcastCam.inputs.removeByType("FreeCameraKeyboardMoveInput");

  const freeCam = new UniversalCamera(
    "freeCam",
    new Vector3(0, 85, -85),
    scene,
  );
  freeCam.setTarget(Vector3.Zero());
  freeCam.speed = 1.1;
  freeCam.angularSensibility = 3000;
  // Babylon default keys: W/S up/down, A/D left/right — remap to WASD explicitly
  freeCam.keysUp = [87]; // W
  freeCam.keysDown = [83]; // S
  freeCam.keysLeft = [65]; // A
  freeCam.keysRight = [68]; // D
  // ensure inertia doesn't feel floaty
  (freeCam as unknown as { inertia: number }).inertia = 0.5;

  let cameraMode: CameraMode = "halfway";
  let goalLineSide: GoalLineSide = "south";
  let autoFollowBall = true;
  let zoom = 1;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.3;
  const BASE_BROADCAST_DIST = 85;
  const BASE_FREE_FOV = 0.8;

  scene.activeCamera = broadcastCam;

  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.92;
  light.groundColor = Color3.FromHexString("#dbeafe");

  createPitch(scene);

  const views = new Map(
    state.players.map((player) => {
      const mesh = CreateCylinder(
        player.id,
        { diameter: player.weight / 100, height: 2 },
        scene,
      );
      const material = new StandardMaterial(`${player.id}-material`, scene);
      material.diffuseColor = Color3.FromHexString(
        state.teams[player.team].color,
      );
      mesh.material = material;
      return [player.id, { mesh, material }] as const;
    }),
  );

  const REF_PALETTE = [
    "#facc15", // Fluorescent Yellow
    "#ec4899", // Hot Pink
    "#06b6d4", // Cyan
    "#f97316", // Bright Orange
    "#a855f7", // Vivid Purple
    "#ffffff", // White
    "#18181b", // Charcoal
    "#84cc16", // Lime Green
  ];

  const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace("#", "");
    const num = parseInt(
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean,
      16,
    );
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const colorDistance = (c1: string, c2: string): number => {
    const [r1, g1, b1] = hexToRgb(c1);
    const [r2, g2, b2] = hexToRgb(c2);
    const rMean = (r1 + r2) / 2;
    const deltaR = r1 - r2;
    const deltaG = g1 - g2;
    const deltaB = b1 - b2;
    return Math.sqrt(
      (2 + rMean / 256) * deltaR * deltaR +
        4 * deltaG * deltaG +
        (2 + (255 - rMean) / 256) * deltaB * deltaB,
    );
  };

  const getContrastingRefColor = (color0: string, color1: string): string => {
    let bestColor = REF_PALETTE[0];
    let maxMinDistance = -1;
    for (const candidate of REF_PALETTE) {
      const d0 = colorDistance(candidate, color0);
      const d1 = colorDistance(candidate, color1);
      const dPitch = colorDistance(candidate, "#3f9b0b");
      const score = Math.min(d0, d1, dPitch * 1.1);
      if (score > maxMinDistance) {
        maxMinDistance = score;
        bestColor = candidate;
      }
    }
    return bestColor;
  };

  const refMesh = CreateCylinder(
    "referee",
    { diameter: 0.85, height: 1.95 },
    scene,
  );
  const refColorHex = getContrastingRefColor(
    state.teams[0].color,
    state.teams[1].color,
  );
  const refMat = new StandardMaterial("referee-material", scene);
  refMat.diffuseColor = Color3.FromHexString(refColorHex);
  refMat.emissiveColor = Color3.FromHexString(refColorHex).scale(0.2);
  refMesh.material = refMat;

  // Overhead carrier indicator (inverted chevron / diamond hovering above carrier's head)
  const carrierMarker = CreateCylinder(
    "carrierMarker",
    { diameterTop: 0.5, diameterBottom: 0, height: 0.45, tessellation: 6 },
    scene,
  );
  const carrierMarkerMat = new StandardMaterial("carrierMarkerMat", scene);
  carrierMarkerMat.diffuseColor = Color3.FromHexString("#facc15");
  carrierMarkerMat.emissiveColor = Color3.FromHexString("#fbbf24");
  carrierMarker.material = carrierMarkerMat;
  carrierMarker.setEnabled(false);

  // Semi-transparent glowing gain line ribbon across pitch width
  const gainLinePlane = CreateGround(
    "gainLinePlane",
    { width: PITCH.width, height: 0.7 },
    scene,
  );
  gainLinePlane.position.y = 0.035;
  const gainLineMat = new StandardMaterial("gainLineMat", scene);
  gainLineMat.diffuseColor = Color3.FromHexString("#f59e0b");
  gainLineMat.emissiveColor = Color3.FromHexString("#d97706");
  gainLineMat.alpha = 0.45;
  gainLinePlane.material = gainLineMat;

  const ball = CreateSphere("ball", { diameter: 0.45 }, scene);
  const ballMaterial = new StandardMaterial("ball-material", scene);
  ballMaterial.diffuseColor = Color3.FromHexString("#f5f5dc");
  ball.material = ballMaterial;
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

  // TV Scoreboard Bug Elements
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

  // Manager View Elements
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
    if (managerModal) {
      managerModal.classList.toggle("active", open);
    }
  };

  if (managerViewBtn) {
    managerViewBtn.addEventListener("click", () => setManagerOpen(true));
  }
  if (managerCloseBtn) {
    managerCloseBtn.addEventListener("click", () => setManagerOpen(false));
  }
  if (managerModal) {
    managerModal.addEventListener("click", (e) => {
      if (e.target === managerModal) setManagerOpen(false);
    });
  }
  if (tabTeam0) {
    tabTeam0.addEventListener("click", () => {
      selectedManagerTeam = 0;
      tabTeam0.classList.add("active");
      tabTeam1?.classList.remove("active");
    });
  }
  if (tabTeam1) {
    tabTeam1.addEventListener("click", () => {
      selectedManagerTeam = 1;
      tabTeam1.classList.add("active");
      tabTeam0?.classList.remove("active");
    });
  }
  if (subtabRoster) {
    subtabRoster.addEventListener("click", () => {
      selectedManagerView = "roster";
      subtabRoster.classList.add("active");
      subtabStats?.classList.remove("active");
    });
  }
  if (subtabStats) {
    subtabStats.addEventListener("click", () => {
      selectedManagerView = "stats";
      subtabStats.classList.add("active");
      subtabRoster?.classList.remove("active");
    });
  }

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
      if (speedDisplay) {
        speedDisplay.textContent = `${simulationSpeed.toFixed(1)}×`;
      }
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

  // Camera UI wiring
  const zoomSlider = document.getElementById(
    "zoom-slider",
  ) as HTMLInputElement | null;
  const zoomDisplay = document.getElementById("zoom-display");
  const camButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-cam]"),
  );
  const goalLineSideControl = document.getElementById("goal-line-side-control");
  const goalLineSideButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-goal-side]"),
  );
  const autoFollowRow = document.getElementById("auto-follow-row");
  const autoFollowToggle = document.getElementById(
    "auto-follow-toggle",
  ) as HTMLInputElement | null;

  const updateCamButtons = () => {
    for (const b of camButtons) {
      b.classList.toggle("active", b.dataset.cam === cameraMode);
    }
    for (const b of goalLineSideButtons) {
      b.classList.toggle("active", b.dataset.goalSide === goalLineSide);
    }
    if (goalLineSideControl)
      goalLineSideControl.hidden = cameraMode !== "goalLine";
    if (autoFollowRow) autoFollowRow.hidden = cameraMode === "free";
  };
  const updateZoomDisplay = () => {
    if (zoomDisplay) zoomDisplay.textContent = `${zoom.toFixed(1)}×`;
    if (
      zoomSlider &&
      parseFloat(zoomSlider.value).toFixed(1) !== zoom.toFixed(1)
    ) {
      zoomSlider.value = String(zoom);
    }
  };

  const positionBroadcastCamera = () => {
    const d = BASE_BROADCAST_DIST * zoom;
    if (cameraMode === "halfway") {
      broadcastCam.position.set(d, d, 0);
    } else if (cameraMode === "goalLine") {
      broadcastCam.position.set(0, d, goalLineSide === "south" ? -d : d);
    }
  };

  const updateCameraControls = () => {
    broadcastCam.detachControl();
    freeCam.detachControl();
    if (cameraMode === "free") freeCam.attachControl(canvas, true);
    else if (!autoFollowBall) broadcastCam.attachControl(canvas, true);
  };

  const applyZoomImmediate = () => {
    if (cameraMode === "free") {
      // free zoom = FOV dolly; smaller FOV = zoom in
      const fov = Math.max(0.25, Math.min(1.4, BASE_FREE_FOV / zoom));
      freeCam.fov = fov;
    } else {
      positionBroadcastCamera();
    }
    updateZoomDisplay();
  };

  const setCameraMode = (mode: CameraMode) => {
    if (mode === cameraMode) return;
    cameraMode = mode;
    scene.activeCamera = mode === "free" ? freeCam : broadcastCam;
    if (mode === "free") {
      const fov = Math.max(0.25, Math.min(1.4, BASE_FREE_FOV / zoom));
      freeCam.fov = fov;
    } else {
      positionBroadcastCamera();
      broadcastCam.setTarget(
        autoFollowBall
          ? new Vector3(state.ball.position.x, 0, state.ball.position.z)
          : Vector3.Zero(),
      );
    }
    updateCameraControls();
    updateCamButtons();
    updateZoomDisplay();
  };

  for (const btn of camButtons) {
    btn.addEventListener("click", () => {
      const m = btn.dataset.cam as CameraMode | undefined;
      if (m === "goalLine" || m === "halfway" || m === "free") setCameraMode(m);
    });
  }
  for (const btn of goalLineSideButtons) {
    btn.addEventListener("click", () => {
      const side = btn.dataset.goalSide as GoalLineSide | undefined;
      if (side !== "south" && side !== "north") return;
      goalLineSide = side;
      if (cameraMode === "goalLine") positionBroadcastCamera();
      updateCamButtons();
    });
  }
  if (autoFollowToggle) {
    autoFollowBall = autoFollowToggle.checked;
    autoFollowToggle.addEventListener("change", () => {
      autoFollowBall = autoFollowToggle.checked;
      updateCameraControls();
    });
  }
  if (zoomSlider) {
    zoomSlider.addEventListener("input", () => {
      zoom = Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, parseFloat(zoomSlider.value) || 1),
      );
      applyZoomImmediate();
    });
  }
  // wheel zoom for all modes
  canvas.addEventListener(
    "wheel",
    (e) => {
      // prevent page scroll and Babylon default if any
      e.preventDefault();
      const delta = -e.deltaY * 0.0011;
      zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
      applyZoomImmediate();
    },
    { passive: false },
  );
  // C to cycle cameras, M to toggle manager view
  window.addEventListener("keydown", (e) => {
    if (e.key === "m" || e.key === "M") {
      setManagerOpen(!managerOpen);
    }
    if (e.key === "c" || e.key === "C") {
      const order: CameraMode[] = ["halfway", "goalLine", "free"];
      const idx = order.indexOf(cameraMode);
      setCameraMode(order[(idx + 1) % order.length]);
    }
    // Q/E vertical for free cam
    if (cameraMode === "free") {
      if (e.key === "q" || e.key === "Q") {
        freeCam.position.y = Math.max(2, freeCam.position.y - 3);
      } else if (e.key === "e" || e.key === "E") {
        freeCam.position.y = Math.min(180, freeCam.position.y + 3);
      }
    }
  });

  // Continuous Q/E handling for hold
  const heldKeys = new Set<string>();
  window.addEventListener("keydown", (e) => heldKeys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => heldKeys.delete(e.key.toLowerCase()));

  // cached vectors to avoid alloc per frame
  const ballTarget = new Vector3(0, 0, 0);
  const tempWorld = new Vector3();
  const tempProj = new Vector3();

  // initial zoom display
  updateCamButtons();
  updateCameraControls();
  updateZoomDisplay();
  applyZoomImmediate();

  return {
    scene,
    getSimulationSpeed: () => simulationSpeed,
    isDebugMode: () => debugMode,
    getCameraMode: () => cameraMode,
    setCameraMode,
    getZoom: () => zoom,
    setZoom: (v: number) => {
      zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));
      applyZoomImmediate();
    },
    sync(game: GameState) {
      const ruckPhase = game.phase.kind === "ruck" ? game.phase : null;
      const maulPhase = game.phase.kind === "maul" ? game.phase : null;
      for (const player of game.players) {
        const view = views.get(player.id);
        if (!view) continue;

        const isTackledOrTackler =
          ruckPhase !== null &&
          (player.id === ruckPhase.tackledPlayerId ||
            player.id === ruckPhase.tacklerId);
        const isRuckCleaner =
          ruckPhase !== null &&
          !isTackledOrTackler &&
          (ruckPhase.joinedAttackers.includes(player.id) ||
            ruckPhase.joinedDefenders.includes(player.id)) &&
          Math.hypot(
            player.position.x - ruckPhase.position.x,
            player.position.z - ruckPhase.position.z,
          ) <= 1.8;
        const isMaulBound =
          maulPhase !== null &&
          (maulPhase.attackers.includes(player.id) ||
            maulPhase.defenders.includes(player.id));

        if (isTackledOrTackler) {
          // Lie horizontal flat on the floor at the breakdown
          view.mesh.rotation.x = Math.PI / 2;
          view.mesh.position.set(player.position.x, 0.45, player.position.z);
        } else if (isRuckCleaner || isMaulBound) {
          // Lean forward bound over the ruck
          const leanDir = player.team === 0 ? 0.35 : -0.35;
          view.mesh.rotation.x = leanDir;
          view.mesh.position.set(player.position.x, 0.85, player.position.z);
        } else {
          // Upright stance
          view.mesh.rotation.x = 0;
          view.mesh.position.set(player.position.x, 1, player.position.z);
        }

        view.material.emissiveColor =
          player.id === game.ball.carrierId
            ? view.material.diffuseColor.scale(0.35)
            : Color3.Black();
      }

      const carrier = game.players.find((p) => p.id === game.ball.carrierId);
      if (carrier) {
        const carrierView = views.get(carrier.id);
        if (carrierView) {
          carrierMarker.setEnabled(true);
          carrierMarker.position.set(
            carrier.position.x,
            carrierView.mesh.position.y + 1.45,
            carrier.position.z,
          );
          carrierMarker.rotation.y += 0.04;
        } else {
          carrierMarker.setEnabled(false);
        }
      } else {
        carrierMarker.setEnabled(false);
      }
      ball.position.set(
        game.ball.position.x,
        game.ball.position.y,
        game.ball.position.z,
      );
      refMesh.position.set(game.referee.position.x, 1, game.referee.position.z);

      // Semi-transparent gain line on turf
      const showGainLine =
        game.phase.kind === "openPlay" ||
        game.phase.kind === "ruck" ||
        game.phase.kind === "maul";
      gainLinePlane.setEnabled(showGainLine);
      if (showGainLine) {
        gainLinePlane.position.z = game.gainLineZ;
      }

      // Camera per-frame behaviour
      if (cameraMode !== "free" && autoFollowBall) {
        ballTarget.set(game.ball.position.x, 0, game.ball.position.z);
        const curTarget = broadcastCam.getTarget();
        const nextTarget = Vector3.Lerp(curTarget, ballTarget, 0.09);
        broadcastCam.setTarget(nextTarget);
      } else if (cameraMode === "free") {
        // held Q/E vertical nudge per frame (WASD handled by Babylon inputs)
        if (heldKeys.has("q"))
          freeCam.position.y = Math.max(2, freeCam.position.y - 0.22);
        if (heldKeys.has("e"))
          freeCam.position.y = Math.min(180, freeCam.position.y + 0.22);
      }

      // Format match clock and status string
      const mins = Math.floor(game.matchClockSeconds / 60)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor(game.matchClockSeconds % 60)
        .toString()
        .padStart(2, "0");
      const halfText =
        game.half === "fullTime"
          ? "Full Time"
          : game.half === 2
            ? "2nd Half"
            : "1st Half";
      const shortHalf =
        game.half === "fullTime" ? "FT" : game.half === 2 ? "2ND" : "1ST";
      const clockStr = `${mins}:${secs} (${halfText})`;
      const baseScore = `${game.teams[0].name} ${game.scores[0]} - ${game.scores[1]} ${game.teams[1].name}`;

      const p = game.phase;
      let topLevelStatus = "OPEN PLAY";
      if (p.kind === "openPlay") {
        topLevelStatus =
          game.ball.flight === "dropGoal" ? "DROP GOAL" : "OPEN PLAY";
      } else if (p.kind === "ruck") topLevelStatus = "RUCK";
      else if (p.kind === "maul") topLevelStatus = "MAUL";
      else if (p.kind === "lineout") topLevelStatus = "LINEOUT";
      else if (p.kind === "scrum") topLevelStatus = "SCRUM";
      else if (p.kind === "kickoff") {
        topLevelStatus =
          p.reason === "goalLineDropout" ? "DROP OUT" : "KICKOFF";
      } else if (p.kind === "conversion") topLevelStatus = "CONVERSION";
      else if (p.kind === "penalty") topLevelStatus = "PENALTY";

      let phaseDesc: string;
      if (p.kind === "openPlay") phaseDesc = "Open play";
      else if (p.kind === "ruck")
        phaseDesc = `Ruck ${p.stage} - ${p.tempo} ${p.play}${p.counterRuck ? " - counter ruck" : ""}`;
      else if (p.kind === "maul") phaseDesc = `Maul ${p.stage}`;
      else if (p.kind === "lineout") phaseDesc = `Lineout ${p.stage}`;
      else if (p.kind === "scrum") phaseDesc = `Scrum ${p.stage}`;
      else if (p.kind === "kickoff") {
        phaseDesc =
          p.reason === "goalLineDropout"
            ? `Goal-line dropout ${p.stage}`
            : `${p.reason === "try" ? "Try - " : p.reason === "halfTime" ? "Half-time - " : ""}Kickoff ${p.stage}`;
      } else if (p.kind === "conversion") phaseDesc = `Conversion ${p.stage}`;
      else if (p.kind === "penalty")
        phaseDesc = `Penalty ${p.choice} ${p.stage}`;
      else phaseDesc = (p as { kind: string }).kind;

      // Update TV broadcast bug
      if (tvTeam0)
        tvTeam0.classList.toggle("possession", game.possessionTeam === 0);
      if (tvTeam1)
        tvTeam1.classList.toggle("possession", game.possessionTeam === 1);
      if (tvTeam0Name)
        tvTeam0Name.textContent = game.teams[0].name.toUpperCase();
      if (tvTeam0Score) tvTeam0Score.textContent = game.scores[0].toString();
      if (tvTeam1Name)
        tvTeam1Name.textContent = game.teams[1].name.toUpperCase();
      if (tvTeam1Score) tvTeam1Score.textContent = game.scores[1].toString();
      if (tvClock) tvClock.textContent = `${mins}:${secs}`;
      if (tvHalf) tvHalf.textContent = shortHalf;
      if (tvPhasePill) tvPhasePill.textContent = `PHASE ${game.phaseCount}`;
      if (tvMeters) {
        const sign = game.distanceGained >= 0 ? "+" : "";
        tvMeters.textContent = `${sign}${game.distanceGained.toFixed(0)}m`;
      }
      if (tvStatus) tvStatus.textContent = topLevelStatus;
      const showShotClock =
        (p.kind === "conversion" && p.stage === "ready") ||
        (p.kind === "penalty" &&
          p.choice === "goal" &&
          p.stage === "executing");
      if (tvShotClock) {
        tvShotClock.hidden = !showShotClock;
        if (showShotClock)
          tvShotClock.textContent = `SHOT ${Math.max(0, Math.ceil(30 - p.elapsed * 6))}`;
      }

      if (scoreboard) {
        if (debugMode) {
          const gainPrefix = game.distanceGained >= 0 ? "+" : "";
          const phaseMetrics = `Phase ${game.phaseCount} (${gainPrefix}${game.distanceGained.toFixed(0)}m)`;
          scoreboard.textContent = `${clockStr} | ${baseScore} | ${phaseMetrics} | ${phaseDesc}`;
        } else {
          scoreboard.textContent = `${clockStr} | ${baseScore}`;
        }
      }

      // Update Manager View live data when open
      if (managerOpen && managerTeamSummary && managerRosterTbody) {
        const teamDef = game.teams[selectedManagerTeam];
        const teamPlayers = game.players.filter(
          (p) => p.team === selectedManagerTeam,
        );
        const benchSubs = game.substitutes.filter(
          (s) => s.team === selectedManagerTeam,
        );

        const formatDist = (d: number) =>
          d >= 1000 ? `${(d / 1000).toFixed(2)}km` : `${Math.round(d)}m`;

        if (selectedManagerView === "stats") {
          if (managerRosterThead) {
            managerRosterThead.innerHTML = `
              <tr>
                <th class="player-num-col">#</th>
                <th>Player / Role</th>
                <th>Distance Ran</th>
                <th>Carried</th>
                <th>Tackles</th>
                <th>Tries</th>
                <th>Breaks</th>
                <th>Passes</th>
                <th>Kicks</th>
                <th>Knock-ons</th>
                <th>Pens</th>
              </tr>
            `;
          }

          const allTeamPlayers = [...teamPlayers, ...benchSubs];
          const totalDistM = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.distanceCovered,
            0,
          );
          const totalCarriedM = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.distanceCarried,
            0,
          );
          const totalTacklesMade = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.tacklesMade,
            0,
          );
          const totalTacklesMissed = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.tacklesMissed,
            0,
          );
          const totalTries = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.triesScored,
            0,
          );
          const totalBreaks = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.lineBreaks,
            0,
          );
          const totalPassesSucc = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.successfulPasses,
            0,
          );
          const totalPassesAtt = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.totalPasses,
            0,
          );
          const totalKicksSucc = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.successfulKicks,
            0,
          );
          const totalKicksAtt = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.totalKicks,
            0,
          );
          const totalKnockOns = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.knockOns,
            0,
          );
          const totalPens = allTeamPlayers.reduce(
            (sum, p) => sum + p.stats.penaltiesConceded,
            0,
          );
          const setPieces = game.teamStats[selectedManagerTeam];

          const tacklePct =
            totalTacklesMade + totalTacklesMissed > 0
              ? Math.round(
                  (totalTacklesMade / (totalTacklesMade + totalTacklesMissed)) *
                    100,
                )
              : 100;
          const passPct =
            totalPassesAtt > 0
              ? Math.round((totalPassesSucc / totalPassesAtt) * 100)
              : 100;
          const kickPct =
            totalKicksAtt > 0
              ? Math.round((totalKicksSucc / totalKicksAtt) * 100)
              : 100;

          managerTeamSummary.innerHTML = `
            <div class="summary-item">
              <span class="summary-label">Total Distance</span>
              <span class="summary-val">${(totalDistM / 1000).toFixed(2)} km <span style="color:#94a3b8;font-size:0.72rem;">(${formatDist(totalCarriedM)} carry)</span></span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Tackles Completed</span>
              <span class="summary-val">${totalTacklesMade}/${totalTacklesMade + totalTacklesMissed} (${tacklePct}%)</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Tries & Line Breaks</span>
              <span class="summary-val">${totalTries} tries · ${totalBreaks} breaks</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Discipline & Errors</span>
              <span class="summary-val">${totalKnockOns} knock-ons · ${totalPens} pens conceded</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Contests Won / Lost</span>
              <span class="summary-val">Ruck ${setPieces.rucksWon}/${setPieces.rucksLost} · Maul ${setPieces.maulsWon}/${setPieces.maulsLost} · Scrum ${setPieces.scrumsWon}/${setPieces.scrumsLost} · Lineout ${setPieces.lineoutsWon}/${setPieces.lineoutsLost}</span>
            </div>
          `;

          const activeRows = teamPlayers
            .map((player) => {
              const s = player.stats;
              return `
                <tr>
                  <td class="player-num-col">${player.number}</td>
                  <td class="player-role-col">
                    ${player.role}
                    <span class="player-pod-badge">${player.pod}</span>
                  </td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600; color:#e2e8f0;">${formatDist(s.distanceCovered)}</span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600; color:#38bdf8;">${formatDist(s.distanceCarried)}</span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.tacklesMade} <span style="color:#94a3b8;font-size:0.75rem;">(${s.tacklesMissed})</span></span></td>
                  <td>${s.triesScored > 0 ? `<span class="stat-highlight-gold">🏉 ${s.triesScored}</span>` : `<span style="color:#64748b;">0</span>`}</td>
                  <td>${s.lineBreaks > 0 ? `<span class="stat-highlight-cyan">⚡ ${s.lineBreaks}</span>` : `<span style="color:#64748b;">0</span>`}</td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulPasses}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalPasses}</span></span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulKicks}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalKicks}</span></span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600; ${s.knockOns > 0 ? "color:#f87171;" : "color:#64748b;"}">${s.knockOns}</span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600; ${s.penaltiesConceded > 0 ? "color:#ef4444;" : "color:#64748b;"}">${s.penaltiesConceded}</span></td>
                </tr>
              `;
            })
            .join("");

          const benchRows = benchSubs
            .map((sub) => {
              const s = sub.stats;
              return `
                <tr style="opacity: ${sub.isUsed ? 0.95 : 0.65};">
                  <td class="player-num-col" style="color: #94a3b8;">${sub.number}</td>
                  <td class="player-role-col" style="color: #cbd5e1;">
                    ${sub.role} (Sub)
                    <span class="player-pod-badge">${sub.pod}</span>
                  </td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600; color:#cbd5e1;">${formatDist(s.distanceCovered)}</span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600; color:#38bdf8;">${formatDist(s.distanceCarried)}</span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.tacklesMade} <span style="color:#94a3b8;font-size:0.75rem;">(${s.tacklesMissed})</span></span></td>
                  <td>${s.triesScored > 0 ? `<span class="stat-highlight-gold">🏉 ${s.triesScored}</span>` : `<span style="color:#64748b;">0</span>`}</td>
                  <td>${s.lineBreaks > 0 ? `<span class="stat-highlight-cyan">⚡ ${s.lineBreaks}</span>` : `<span style="color:#64748b;">0</span>`}</td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulPasses}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalPasses}</span></span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600;">${s.successfulKicks}<span style="color:#94a3b8;font-size:0.75rem;">/${s.totalKicks}</span></span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600; ${s.knockOns > 0 ? "color:#f87171;" : "color:#64748b;"}">${s.knockOns}</span></td>
                  <td><span style="font-family:ui-monospace, monospace; font-weight:600; ${s.penaltiesConceded > 0 ? "color:#ef4444;" : "color:#64748b;"}">${s.penaltiesConceded}</span></td>
                </tr>
              `;
            })
            .join("");

          managerRosterTbody.innerHTML = `
            ${activeRows}
            <tr><td colspan="11" style="padding: 0.6rem 0.6rem 0.3rem; font-weight:700; color:#94a3b8; font-size:0.72rem; letter-spacing:0.04em; text-transform:uppercase; border-top:1px solid rgb(255 255 255 / 15%); background:rgb(0 0 0 / 20%);">Substitutes Bench</td></tr>
            ${benchRows}
          `;
        } else {
          if (managerRosterThead) {
            managerRosterThead.innerHTML = `
              <tr>
                <th class="player-num-col">#</th>
                <th>Player / Role</th>
                <th>Physicals</th>
                <th>Skill</th>
                <th>Condition</th>
              </tr>
            `;
          }

          const packWeight = teamPlayers
            .filter((p) => isForward(p))
            .reduce((sum, p) => sum + Math.round(p.weight), 0);

          managerTeamSummary.innerHTML = `
            <div class="summary-item">
              <span class="summary-label">Attacking Style</span>
              <span class="summary-val">${teamDef.name} — ${game.formations[selectedManagerTeam].openAttack}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">8-Man Pack Weight</span>
              <span class="summary-val">${packWeight} kg</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Defensive Line Speed</span>
              <span class="summary-val">${teamDef.lineSpeed.toFixed(1)} m/s (${game.formations[selectedManagerTeam].openDefence})</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Tendency</span>
              <span class="summary-val">Carry ${Math.round(teamDef.tendencies.carry * 100)}% · Pass ${Math.round(teamDef.tendencies.pass * 100)}% · Kick ${Math.round(teamDef.tendencies.kick * 100)}% · Maul ${Math.round(teamDef.tendencies.maul * 100)}%</span>
            </div>
          `;

          // Render Active XV
          const activeRows = teamPlayers
            .map((player) => {
              const avgSkill = Math.round(
                (player.skills.decision +
                  player.skills.handling +
                  player.skills.passing +
                  player.skills.kicking +
                  player.skills.tackling) *
                  20,
              );
              const staminaClamped = Math.max(0, Math.min(100, player.stamina));
              const staminaClass =
                staminaClamped > 65
                  ? ""
                  : staminaClamped > 35
                    ? "stamina-mid"
                    : "stamina-low";

              return `
                <tr>
                  <td class="player-num-col">${player.number}</td>
                  <td class="player-role-col">
                    ${player.role}
                    <span class="player-pod-badge">${player.pod}</span>
                  </td>
                  <td>${Math.round(player.weight)}kg · ${player.speed.toFixed(1)}m/s</td>
                  <td><span class="skill-badge">★ ${avgSkill}</span></td>
                  <td>
                    <div class="stamina-bar-container" title="Indicative Match Condition">
                      <div class="stamina-bar-fill ${staminaClass}" style="width: ${staminaClamped}%;"></div>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("");

          // Render Bench Substitutes
          const benchRows = benchSubs
            .map((sub) => {
              const avgSkill = Math.round(
                (sub.skills.decision +
                  sub.skills.handling +
                  sub.skills.passing +
                  sub.skills.kicking +
                  sub.skills.tackling) *
                  20,
              );
              const statusLabel = sub.isUsed
                ? `<span style="color:#94a3b8;font-size:0.75rem;">SUBBED ON</span>`
                : `<span style="color:#4ade80;font-size:0.75rem;">READY</span>`;

              return `
                <tr style="opacity: ${sub.isUsed ? 0.6 : 0.95};">
                  <td class="player-num-col" style="color: #94a3b8;">${sub.number}</td>
                  <td class="player-role-col" style="color: #cbd5e1;">
                    ${sub.role} (Sub)
                    <span class="player-pod-badge">${sub.pod}</span>
                  </td>
                  <td>${Math.round(sub.weight)}kg · ${sub.speed.toFixed(1)}m/s</td>
                  <td><span class="skill-badge">★ ${avgSkill}</span></td>
                  <td>${statusLabel}</td>
                </tr>
              `;
            })
            .join("");

          managerRosterTbody.innerHTML = `
            ${activeRows}
            <tr><td colspan="5" style="padding: 0.6rem 0.6rem 0.3rem; font-weight:700; color:#94a3b8; font-size:0.72rem; letter-spacing:0.04em; text-transform:uppercase; border-top:1px solid rgb(255 255 255 / 15%); background:rgb(0 0 0 / 20%);">Substitutes Bench</td></tr>
            ${benchRows}
          `;
        }
      }

      if (!debugOverlay) return;

      if (!debugMode) {
        debugOverlay.style.display = "none";
        return;
      }

      debugOverlay.style.display = "block";

      const activeCam = scene.activeCamera as
        FreeCamera | UniversalCamera | null;
      if (!activeCam) return;
      const transformMatrix = scene.getTransformMatrix();
      const renderWidth = engine.getRenderWidth();
      const renderHeight = engine.getRenderHeight();
      const viewport = activeCam.viewport.toGlobal(renderWidth, renderHeight);

      for (const player of game.players) {
        const card = playerCards.get(player.id);
        if (!card) continue;

        tempWorld.set(player.position.x, 2.2, player.position.z);
        Vector3.ProjectToRef(
          tempWorld,
          Matrix.IdentityReadOnly,
          transformMatrix,
          viewport,
          tempProj,
        );

        if (
          tempProj.z >= 0 &&
          tempProj.z <= 1 &&
          tempProj.x >= -120 &&
          tempProj.x <= renderWidth + 120 &&
          tempProj.y >= -120 &&
          tempProj.y <= renderHeight + 120
        ) {
          card.style.display = "block";
          card.style.left = `${tempProj.x}px`;
          card.style.top = `${tempProj.y}px`;

          const isCarrier = player.id === game.ball.carrierId;
          const carrierBadge = isCarrier
            ? `<span class="debug-badge badge-carrier">CARRIER</span>`
            : "";
          const offsideBadge = player.kickOffside
            ? `<span class="debug-badge badge-offside">OFFSIDE</span>`
            : "";
          const currentSpeed = Math.hypot(
            player.velocity.x,
            player.velocity.z,
          ).toFixed(1);
          const distToTarget = Math.hypot(
            player.position.x - player.intentTarget.x,
            player.position.z - player.intentTarget.z,
          ).toFixed(1);

          let extra = "";
          if (player.pendingBallAction) {
            extra += ` | Act: <span class="highlight">${player.pendingBallAction.kind} (${player.pendingBallAction.remainingSeconds.toFixed(1)}s)</span>`;
          }
          if (player.tackleCooldown > 0) {
            extra += ` | TklCD: <span class="val">${player.tackleCooldown.toFixed(1)}s</span>`;
          }
          if (player.ruckRecoverySeconds > 0) {
            extra += ` | RuckRec: <span class="val">${player.ruckRecoverySeconds.toFixed(1)}s</span>`;
          }

          card.innerHTML = `
            <div class="debug-card-header">
              <span>#${player.number} ${player.role} (${game.teams[player.team].name})</span>
              ${carrierBadge} ${offsideBadge}
            </div>
            <div class="debug-card-row">
              State: <span class="val">${player.intentKind}</span> | Spd: <span class="val">${currentSpeed}m/s</span> | Sta: <span class="val">${Math.round(player.stamina)}%</span>${extra}
            </div>
            <div class="debug-card-row">
              Target: <span class="val">(${player.intentTarget.x.toFixed(1)}, ${player.intentTarget.z.toFixed(1)})</span> <span class="val">[${distToTarget}m]</span> | Pod: <span class="val">${player.pod}</span>
            </div>
            <div class="debug-card-row">
              Stats: <span class="val">W:${player.weight}kg</span> | Skills: <span class="val">D:${player.skills.decision} H:${player.skills.handling} P:${player.skills.passing} K:${player.skills.kicking} T:${player.skills.tackling}</span>
            </div>
          `;
        } else {
          card.style.display = "none";
        }
      }

      if (ballCard) {
        tempWorld.set(
          game.ball.position.x,
          game.ball.position.y + 0.5,
          game.ball.position.z,
        );
        Vector3.ProjectToRef(
          tempWorld,
          Matrix.IdentityReadOnly,
          transformMatrix,
          viewport,
          tempProj,
        );

        if (
          tempProj.z >= 0 &&
          tempProj.z <= 1 &&
          tempProj.x >= -120 &&
          tempProj.x <= renderWidth + 120 &&
          tempProj.y >= -120 &&
          tempProj.y <= renderHeight + 120
        ) {
          ballCard.style.display = "block";
          ballCard.style.left = `${tempProj.x}px`;
          ballCard.style.top = `${tempProj.y}px`;

          const carrier = game.players.find(
            (p) => p.id === game.ball.carrierId,
          );
          const carrierText = carrier
            ? `Carried by #${carrier.number} ${carrier.role}`
            : game.ball.flight
              ? `Flight (${game.ball.flight})`
              : "Loose";

          let targetText = "None";
          if (game.ball.intendedReceiverId) {
            const receiver = game.players.find(
              (p) => p.id === game.ball.intendedReceiverId,
            );
            targetText = receiver
              ? `Receiver #${receiver.number} ${receiver.role}`
              : game.ball.intendedReceiverId;
          } else if (game.ball.kickOrigin) {
            targetText = `Kick origin (${game.ball.kickOrigin.x.toFixed(1)}, ${game.ball.kickOrigin.z.toFixed(1)})`;
          } else if (carrier) {
            targetText = `Carrier target (${carrier.intentTarget.x.toFixed(1)}, ${carrier.intentTarget.z.toFixed(1)})`;
          }

          const ballSpeed = Math.hypot(
            game.ball.velocity.x,
            game.ball.velocity.y,
            game.ball.velocity.z,
          ).toFixed(1);
          const lastTouch =
            game.ball.lastTouchedTeam !== null
              ? game.teams[game.ball.lastTouchedTeam].name
              : "None";

          ballCard.innerHTML = `
            <div class="debug-card-header">
              <span>BALL</span>
              <span class="highlight">${carrierText}</span>
            </div>
            <div class="debug-card-row">
              Pos: <span class="val">(${game.ball.position.x.toFixed(1)}, ${game.ball.position.y.toFixed(1)}, ${game.ball.position.z.toFixed(1)})</span> | Vel: <span class="val">(${game.ball.velocity.x.toFixed(1)}, ${game.ball.velocity.y.toFixed(1)}, ${game.ball.velocity.z.toFixed(1)})</span> [${ballSpeed}m/s]
            </div>
            <div class="debug-card-row">
              Target: <span class="val">${targetText}</span>
            </div>
            <div class="debug-card-row">
              Bounces left: <span class="val">${game.ball.bouncesRemaining}</span> | Last touch: <span class="val">${lastTouch}</span>
            </div>
          `;
        } else {
          ballCard.style.display = "none";
        }
      }
    },
  };
};
