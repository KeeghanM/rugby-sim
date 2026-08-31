import { FreeCamera, UniversalCamera, Vector3 } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import type { GameState } from "../domain.ts";
import { attackDirection, PITCH, ROLES } from "../domain.ts";
import { clamp, distance } from "../simulation/math.ts";

export type CameraMode = "dynamic" | "free";
type DynamicShotType =
  | "broadcast"
  | "goalLine"
  | "refCam"
  | "flyOver"
  | "sidelineTight"
  | "breakawayChase";

export const createCameras = (
  scene: Scene,
  canvas: HTMLCanvasElement,
  state: GameState,
) => {
  const broadcastCam = new FreeCamera(
    "broadcastCam",
    new Vector3(52, 21, 0),
    scene,
  );
  broadcastCam.setTarget(Vector3.Zero());
  broadcastCam.inputs.removeByType("FreeCameraKeyboardMoveInput");

  const freeCam = new UniversalCamera(
    "freeCam",
    new Vector3(0, 45, -75),
    scene,
  );
  freeCam.setTarget(Vector3.Zero());
  freeCam.speed = 2.2;
  freeCam.angularSensibility = 3000;
  freeCam.keysUp = [87];
  freeCam.keysDown = [83];
  freeCam.keysLeft = [65];
  freeCam.keysRight = [68];
  (freeCam as unknown as { inertia: number }).inertia = 0.5;

  let cameraMode: CameraMode = "dynamic";
  let zoom = 1;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.3;
  const BASE_FREE_FOV = 0.8;

  scene.activeCamera = broadcastCam;

  // --- DYNAMIC BROADCAST DIRECTOR STATE ---
  let currentShot: DynamicShotType = "broadcast";
  let shotDuration = 0;
  let lastPhaseKind = "";
  const desiredCamPos = new Vector3(52, 21, 0);
  const desiredTarget = new Vector3(0, 0, 0);

  const FREE_BASE_SPEED = 2.2;
  const FREE_MAX_SPEED = 15.0;
  let moveHoldTime = 0;
  const moveKeys = new Set([
    "w",
    "a",
    "s",
    "d",
    "q",
    "e",
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
  ]);

  const heldKeys = new Set<string>();
  window.addEventListener("keydown", (e) => heldKeys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => heldKeys.delete(e.key.toLowerCase()));

  const updateCameraControls = () => {
    broadcastCam.detachControl();
    freeCam.detachControl();
    if (cameraMode === "free") freeCam.attachControl(canvas, true);
  };

  const updateCamButtons = () => {
    const camButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-cam]"),
    );
    for (const b of camButtons) {
      b.classList.toggle("active", b.dataset.cam === cameraMode);
    }
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
      shotDuration = 0;
    }
    updateCameraControls();
    updateCamButtons();
    updateZoomDisplay();
  };

  // UI Event Wiring
  const camButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-cam]"),
  );
  const zoomSlider = document.getElementById(
    "zoom-slider",
  ) as HTMLInputElement | null;

  for (const btn of camButtons) {
    btn.addEventListener("click", () => {
      const m = btn.dataset.cam as CameraMode | undefined;
      if (m === "dynamic" || m === "free") setCameraMode(m);
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
      const delta = -e.deltaY * 0.0012;
      zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
      applyZoomImmediate();
    },
    { passive: false },
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "c" || e.key === "C") {
      setCameraMode(cameraMode === "dynamic" ? "free" : "dynamic");
    }
  });

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
      if (cameraMode === "dynamic") {
        shotDuration += 0.016;

        const phase = game.phase;
        const ball = game.ball;
        const carrier = game.players.find((p) => p.id === ball.carrierId);
        const possessionTeam = game.possessionTeam;
        const attackDir = attackDirection(possessionTeam);
        const ballZ = ball.position.z;
        const ballX = ball.position.x;
        const ballY = ball.position.y;
        const hSpeed = Math.hypot(ball.velocity.x, ball.velocity.z);

        const phaseChanged = phase.kind !== lastPhaseKind;
        lastPhaseKind = phase.kind;

        // --- 1. PRIORITY EVENTS (180-Degree Consistent TV Director) ---
        let chosenShot: DynamicShotType = currentShot;
        let lerpRate = 0.08;

        const isDownfieldKick =
          (ball.flight === "kick" ||
            ball.flight === "kickoff" ||
            ball.flight === "dropGoal") &&
          hSpeed > 7;

        const isBreakaway =
          carrier && (carrier.lineBreakActive || carrier.breakawaySeconds > 0);

        const isGoalKickPhase =
          phase.kind === "conversion" ||
          (phase.kind === "penalty" && phase.choice === "goal");

        if (isDownfieldKick) {
          chosenShot = "flyOver";
        } else if (isBreakaway) {
          chosenShot = "breakawayChase";
        } else if (isGoalKickPhase) {
          chosenShot = "goalLine";
        } else if (phase.kind === "scrum" || phase.kind === "lineout") {
          if (phaseChanged || shotDuration >= 5.5) {
            chosenShot = Math.random() < 0.6 ? "refCam" : "sidelineTight";
          }
        } else if (Math.abs(ballZ) >= 28) {
          // 22m Red-Zone Attack
          if (shotDuration >= 5.0) {
            chosenShot = Math.random() < 0.45 ? "goalLine" : "broadcast";
          }
        } else {
          // Neutral Midfield Open Play (Hold broadcast for continuity)
          if (shotDuration >= 6.0) {
            chosenShot = Math.random() < 0.25 ? "sidelineTight" : "broadcast";
          }
        }

        if (chosenShot !== currentShot) {
          currentShot = chosenShot;
          shotDuration = 0;
        }

        // --- 2. 180-DEGREE BROADCAST AXIS (Cameras strictly stay on East Side X > 0) ---
        // Team 0 (South -> North) always flows Left-to-Right across the viewer's screen.
        // Team 1 (North -> South) always flows Right-to-Left. Never cross the 50/line.
        if (currentShot === "flyOver") {
          // Broadcast Cable-Cam: elevated along East sideline trailing the flight
          const kDir =
            ball.velocity.z !== 0 ? Math.sign(ball.velocity.z) : attackDir;
          desiredCamPos.set(
            28.0,
            Math.min(22.5, Math.max(9.5, ballY + 7.0)),
            ballZ - kDir * 9.0,
          );
          desiredTarget.set(
            clamp(ballX * 0.4, -18, 18),
            Math.max(0.5, ballY * 0.4),
            ballZ + kDir * 14.0,
          );
          lerpRate = 0.1;
        } else if (currentShot === "breakawayChase") {
          // Elevated tracking from broadcast side
          if (carrier) {
            desiredCamPos.set(26.0, 5.2, carrier.position.z - attackDir * 6.5);
            desiredTarget.set(
              carrier.position.x * 0.5,
              1.2,
              carrier.position.z + attackDir * 6.0,
            );
            lerpRate = 0.12;
          }
        } else if (currentShot === "refCam") {
          // Ref cam anchored on broadcast side of referee
          desiredCamPos.set(
            Math.max(5.0, game.referee.position.x + 3.5),
            2.1,
            game.referee.position.z,
          );
          desiredTarget.set(ballX * 0.6, Math.max(0.5, ballY), ballZ);
          lerpRate = 0.09;
        } else if (currentShot === "sidelineTight") {
          // Low pitchside camera on EAST broadcast touchline (never crossing to West)
          desiredCamPos.set(37.2, 3.2, ballZ - attackDir * 3.5);
          desiredTarget.set(ballX * 0.4, 0.9, ballZ + attackDir * 2.5);
          lerpRate = 0.08;
        } else if (currentShot === "goalLine") {
          // Corner gantry camera on broadcast side (X = +26 > 0)
          const targetTryLine =
            attackDir === 1 ? PITCH.tryLines.north : PITCH.tryLines.south;
          const endPosZ = targetTryLine + attackDir * 14.0;
          desiredCamPos.set(
            26.0,
            Math.min(22.0, 19.5 / Math.sqrt(zoom)),
            endPosZ,
          );
          desiredTarget.set(0, 2.0, targetTryLine - attackDir * 6.0);
          lerpRate = 0.07;
        } else {
          // Default: Main TV Broadcast Gantry under the roof canopy (X = +52)
          const gantryX = 52.0 / Math.sqrt(zoom);
          const gantryY = Math.min(23.5, 21.0 / Math.sqrt(zoom));
          desiredCamPos.set(gantryX, gantryY, ballZ * 0.72);
          desiredTarget.set(clamp(ballX * 0.4, -20, 20), 0, ballZ);
          lerpRate = 0.08;
        }

        // Smooth camera gliding interpolation
        broadcastCam.position = Vector3.Lerp(
          broadcastCam.position,
          desiredCamPos,
          lerpRate,
        );
        const curTarget = broadcastCam.getTarget();
        const nextTarget = Vector3.Lerp(curTarget, desiredTarget, lerpRate);
        broadcastCam.setTarget(nextTarget);
      } else if (cameraMode === "free") {
        const isMoving = Array.from(heldKeys).some((k) => moveKeys.has(k));
        if (isMoving) {
          moveHoldTime = Math.min(2.5, moveHoldTime + 0.035);
        } else {
          moveHoldTime = Math.max(0, moveHoldTime - 0.12);
        }

        const ramp = Math.pow(moveHoldTime / 2.5, 1.4);
        const shiftBoost = heldKeys.has("shift") ? 1.8 : 1.0;
        const currentSpeed =
          (FREE_BASE_SPEED + (FREE_MAX_SPEED - FREE_BASE_SPEED) * ramp) *
          shiftBoost;
        freeCam.speed = currentSpeed;

        const vertSpeed = (0.35 + ramp * 1.5) * shiftBoost;
        if (heldKeys.has("q")) {
          freeCam.position.y = Math.max(1.5, freeCam.position.y - vertSpeed);
        }
        if (heldKeys.has("e")) {
          freeCam.position.y = Math.min(220, freeCam.position.y + vertSpeed);
        }
      }
    },
  };
};
