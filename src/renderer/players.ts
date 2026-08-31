import {
  Color3,
  CreateCylinder,
  CreateGround,
  CreateSphere,
  StandardMaterial,
} from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import type { GameState } from "../domain.ts";
import { PITCH } from "../domain.ts";

export const createPlayerViews = (scene: Scene, state: GameState) => {
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
    "#facc15",
    "#ec4899",
    "#06b6d4",
    "#f97316",
    "#a855f7",
    "#ffffff",
    "#18181b",
    "#84cc16",
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

  return { views, refMesh, carrierMarker, gainLinePlane, ball };
};

export const syncPlayers = (
  game: GameState,
  views: Map<string, { mesh: any; material: any }>,
  refMesh: any,
  carrierMarker: any,
  gainLinePlane: any,
  ball: any,
) => {
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
      view.mesh.rotation.x = Math.PI / 2;
      view.mesh.position.set(player.position.x, 0.45, player.position.z);
    } else if (isRuckCleaner || isMaulBound) {
      const leanDir = player.team === 0 ? 0.35 : -0.35;
      view.mesh.rotation.x = leanDir;
      view.mesh.position.set(player.position.x, 0.85, player.position.z);
    } else {
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

  const showGainLine =
    game.phase.kind === "openPlay" ||
    game.phase.kind === "ruck" ||
    game.phase.kind === "maul";
  gainLinePlane.setEnabled(showGainLine);
  if (showGainLine) {
    gainLinePlane.position.z = game.gainLineZ;
  }
};
