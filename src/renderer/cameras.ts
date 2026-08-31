import { FreeCamera, UniversalCamera, Vector3 } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import type { GameState } from "../domain.ts";

export type CameraMode = "halfway" | "goalLine" | "free";
type GoalLineSide = "south" | "north";

export const createCameras = (
  scene: Scene,
  canvas: HTMLCanvasElement,
  state: GameState,
) => {
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
  freeCam.keysUp = [87];
  freeCam.keysDown = [83];
  freeCam.keysLeft = [65];
  freeCam.keysRight = [68];
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

  const updateCamButtons = () => {
    const camButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-cam]"),
    );
    const goalLineSideControl = document.getElementById(
      "goal-line-side-control",
    );
    const goalLineSideButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-goal-side]"),
    );
    const autoFollowRow = document.getElementById("auto-follow-row");
    for (const b of camButtons) {
      b.classList.toggle("active", b.dataset.cam === cameraMode);
    }
    for (const b of goalLineSideButtons) {
      b.classList.toggle("active", b.dataset.goalSide === goalLineSide);
    }
    if (goalLineSideControl)
      (goalLineSideControl as HTMLElement).hidden = cameraMode !== "goalLine";
    if (autoFollowRow)
      (autoFollowRow as HTMLElement).hidden = cameraMode === "free";
  };

  const updateZoomDisplay = () => {
    const zoomDisplay = document.getElementById("zoom-display");
    const zoomSlider = document.getElementById(
      "zoom-slider",
    ) as HTMLInputElement | null;
    if (zoomDisplay) zoomDisplay.textContent = `${zoom.toFixed(1)}×`;
    if (
      zoomSlider &&
      parseFloat(zoomSlider.value).toFixed(1) !== zoom.toFixed(1)
    ) {
      zoomSlider.value = String(zoom);
    }
  };

  const applyZoomImmediate = () => {
    if (cameraMode === "free") {
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

  // Wiring
  const camButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-cam]"),
  );
  const goalLineSideButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-goal-side]"),
  );
  const autoFollowToggle = document.getElementById(
    "auto-follow-toggle",
  ) as HTMLInputElement | null;
  const zoomSlider = document.getElementById(
    "zoom-slider",
  ) as HTMLInputElement | null;

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
      const goalLineSideControl = document.getElementById(
        "goal-line-side-control",
      );
      const autoFollowRow = document.getElementById("auto-follow-row");
      // update buttons
      for (const b of goalLineSideButtons) {
        b.classList.toggle("active", b.dataset.goalSide === goalLineSide);
      }
      if (goalLineSideControl)
        (goalLineSideControl as HTMLElement).hidden = cameraMode !== "goalLine";
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
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0011;
      zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
      applyZoomImmediate();
    },
    { passive: false },
  );
  window.addEventListener("keydown", (e) => {
    if (e.key === "m" || e.key === "M") {
      const managerModal = document.getElementById("manager-modal");
      const isOpen = managerModal?.classList.contains("active");
      if (managerModal) managerModal.classList.toggle("active", !isOpen);
    }
    if (e.key === "c" || e.key === "C") {
      const order: CameraMode[] = ["halfway", "goalLine", "free"];
      const idx = order.indexOf(cameraMode);
      setCameraMode(order[(idx + 1) % order.length]);
    }
    if (cameraMode === "free") {
      if (e.key === "q" || e.key === "Q") {
        freeCam.position.y = Math.max(2, freeCam.position.y - 3);
      } else if (e.key === "e" || e.key === "E") {
        freeCam.position.y = Math.min(180, freeCam.position.y + 3);
      }
    }
  });

  const heldKeys = new Set<string>();
  window.addEventListener("keydown", (e) => heldKeys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => heldKeys.delete(e.key.toLowerCase()));

  const ballTarget = new Vector3(0, 0, 0);

  updateCamButtons();
  updateCameraControls();
  updateZoomDisplay();
  applyZoomImmediate();

  return {
    broadcastCam,
    freeCam,
    getCameraMode: () => cameraMode,
    setCameraMode,
    getZoom: () => zoom,
    setZoom: (v: number) => {
      zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));
      applyZoomImmediate();
    },
    sync: (game: GameState) => {
      if (cameraMode !== "free" && autoFollowBall) {
        ballTarget.set(game.ball.position.x, 0, game.ball.position.z);
        const curTarget = broadcastCam.getTarget();
        const nextTarget = Vector3.Lerp(curTarget, ballTarget, 0.09);
        broadcastCam.setTarget(nextTarget);
      } else if (cameraMode === "free") {
        if (heldKeys.has("q"))
          freeCam.position.y = Math.max(2, freeCam.position.y - 0.22);
        if (heldKeys.has("e"))
          freeCam.position.y = Math.min(180, freeCam.position.y + 0.22);
      }
    },
  };
};
