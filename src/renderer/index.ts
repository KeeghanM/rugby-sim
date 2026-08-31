import { Color3, HemisphericLight, Vector3 } from "@babylonjs/core";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import type { GameState } from "../domain.ts";
import { createPitch } from "./pitch.ts";
import { createEnvironment } from "./environment.ts";
import { createPlayerViews, syncPlayers } from "./players.ts";
import { createCameras } from "./cameras.ts";
import { createUI, syncUI } from "./ui.ts";

export type CameraMode = "halfway" | "goalLine" | "free";

export const createRenderer = (
  engine: Engine,
  canvas: HTMLCanvasElement,
  state: GameState,
) => {
  const scene = new Scene(engine);
  const env = createEnvironment(scene);
  createPitch(scene);

  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.92;
  light.groundColor = Color3.FromHexString("#dbeafe");

  const {
    views,
    refMesh,
    ar1Mesh,
    ar2Mesh,
    carrierMarker,
    gainLinePlane,
    ball,
  } = createPlayerViews(scene, state);
  const cameras = createCameras(scene, canvas, state);
  const ui = createUI(state);

  return {
    scene,
    getSimulationSpeed: ui.getSimulationSpeed,
    isDebugMode: ui.isDebugMode,
    getCameraMode: cameras.getCameraMode,
    setCameraMode: cameras.setCameraMode,
    getZoom: cameras.getZoom,
    setZoom: cameras.setZoom,
    sync(game: GameState) {
      cameras.sync(game);
      const isRefCam = cameras.getCurrentShot() === "refCam";
      syncPlayers(
        game,
        views as any,
        refMesh as any,
        ar1Mesh as any,
        ar2Mesh as any,
        carrierMarker as any,
        gainLinePlane as any,
        ball as any,
        isRefCam,
      );
      env.updateScoreboards(game);
      syncUI(
        game,
        ui as any,
        scene as any,
        engine as any,
        ui.isDebugMode(),
        ui.getManagerOpen(),
        ui.getSelectedManagerTeam(),
        ui.getSelectedManagerView(),
      );
    },
  };
};
