import {
  Color3,
  CreateBox,
  CreateCylinder,
  CreateGround,
  CreateSphere,
  DynamicTexture,
  StandardMaterial,
  Vector4,
} from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import type { GameState, Player } from "../domain.ts";
import { attackDirection, PITCH, ROLES } from "../domain.ts";

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

const getLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
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

const REF_PALETTE = [
  "#f43f5e", // vivid neon pink
  "#ec4899", // hot pink
  "#facc15", // volt yellow
  "#06b6d4", // electric cyan
  "#f97316", // bright orange
  "#a855f7", // vivid purple
  "#84cc16", // fluorescent lime
  "#0284c7", // bright electric blue
];

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
const SKIN_TONES = [
  "#fcd34d",
  "#fca5a5",
  "#d97706",
  "#b45309",
  "#78350f",
  "#fed7aa",
  "#fef08a",
  "#e2a76f",
];

const HAIR_COLORS = [
  "#18181b",
  "#3b2314",
  "#713f12",
  "#1c1917",
  "#451a03",
  "#854d0e",
  "#292524",
];

// Dynamic texture for official rugby match ball (4 panels with grip seams)
const createRugbyBallTexture = (scene: Scene) => {
  const dTex = new DynamicTexture(
    "rugby-ball-tex",
    { width: 512, height: 256 },
    scene,
    true,
  );
  const ctx = dTex.getContext() as unknown as CanvasRenderingContext2D;

  // Leather base
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, 512, 256);

  // 4 Gilbert-style chevron panel trim stripes
  const panelW = 512 / 4;
  for (let i = 0; i < 4; i++) {
    const px = i * panelW;

    // Panel border seam
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 3;
    ctx.strokeRect(px, 0, panelW, 256);

    // Aerodynamic chevron curve in cyan & navy
    ctx.fillStyle = i % 2 === 0 ? "#0284c7" : "#1e3a8a";
    ctx.beginPath();
    ctx.ellipse(px + panelW / 2, 128, panelW * 0.35, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Central grip pimple texture lines
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for (let dy = 65; dy <= 185; dy += 24) {
      ctx.fillRect(px + panelW / 2 - 10, dy, 20, 3);
    }
  }

  // Valve dot on panel 0
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(panelW / 2, 128, 6, 0, Math.PI * 2);
  ctx.fill();

  dTex.update(true);
  return dTex;
};

// Creates a 512x512 dynamic texture for player jersey with big bold number on back
const createPlayerTexture = (
  scene: Scene,
  player: Player,
  teamColorHex: string,
) => {
  const dTex = new DynamicTexture(
    `player-tex-${player.id}`,
    { width: 512, height: 512 },
    scene,
    false,
  );
  const ctx = dTex.getContext() as unknown as CanvasRenderingContext2D;

  const isLightJersey = getLuminance(teamColorHex) > 135;
  const numColor = isLightJersey ? "#0f172a" : "#ffffff";
  const numOutline = isLightJersey ? "#ffffff" : "#000000";
  const shortsColor = isLightJersey ? "#1e293b" : "#f8fafc";
  const collarColor = isLightJersey ? "#0f172a" : "#ffffff";

  // Individual hair & skin tone
  const seed = (player.number * 7 + player.slotIndex * 13) % 100;
  const hairColor = HAIR_COLORS[seed % HAIR_COLORS.length];
  const skinTone = SKIN_TONES[(seed * 3) % SKIN_TONES.length];

  // Base background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 512, 512);

  // === 1. BACK (X: 0 to 180, Y: 0 to 512) ===
  // Upper back neck / hair trim
  ctx.fillStyle = hairColor;
  ctx.fillRect(0, 0, 180, 20);
  ctx.fillStyle = skinTone;
  ctx.fillRect(35, 20, 110, 18);

  // Jersey body
  ctx.fillStyle = teamColorHex;
  ctx.fillRect(0, 38, 180, 322);

  // Collar band
  ctx.fillStyle = collarColor;
  ctx.fillRect(25, 38, 130, 20);

  // Athletic seams
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(25, 40);
  ctx.lineTo(35, 360);
  ctx.moveTo(155, 40);
  ctx.lineTo(145, 360);
  ctx.stroke();

  // Large Bold Player Number on Back
  const numStr = String(player.number);
  ctx.font = "900 150px 'Arial Black', Impact, 'Segoe UI Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 14;
  ctx.strokeStyle = numOutline;
  ctx.strokeText(numStr, 90, 195);
  ctx.fillStyle = numColor;
  ctx.fillText(numStr, 90, 195);

  // Rugby shorts (back)
  ctx.fillStyle = shortsColor;
  ctx.fillRect(0, 360, 180, 152);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 360, 180, 12); // waistband

  // === 2. FRONT (X: 180 to 360, Y: 0 to 512) ===
  // Face / neck area
  ctx.fillStyle = skinTone;
  ctx.fillRect(180, 0, 180, 48);

  // Hair trim at top of forehead
  ctx.fillStyle = hairColor;
  ctx.fillRect(180, 0, 180, 14);

  // Jersey body
  ctx.fillStyle = teamColorHex;
  ctx.fillRect(180, 48, 180, 312);

  // Collar V-neck
  ctx.fillStyle = collarColor;
  ctx.beginPath();
  ctx.moveTo(235, 48);
  ctx.lineTo(270, 85);
  ctx.lineTo(305, 48);
  ctx.fill();

  // Front chest band / team stripe
  ctx.fillStyle = isLightJersey ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.24)";
  ctx.fillRect(180, 120, 180, 36);

  // Small chest number / badge
  ctx.font = "bold 38px 'Arial Black', sans-serif";
  ctx.fillStyle = numColor;
  ctx.strokeStyle = numOutline;
  ctx.lineWidth = 4;
  ctx.strokeText(numStr, 315, 138);
  ctx.fillText(numStr, 315, 138);

  // Rugby shorts (front)
  ctx.fillStyle = shortsColor;
  ctx.fillRect(180, 360, 180, 152);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(180, 360, 180, 12); // waistband

  // === 3. SIDES (X: 360 to 450, Y: 0 to 512) ===
  // Hair side / ear
  ctx.fillStyle = hairColor;
  ctx.fillRect(360, 0, 90, 20);
  ctx.fillStyle = skinTone;
  ctx.fillRect(360, 20, 90, 24);

  // Jersey sleeve
  ctx.fillStyle = teamColorHex;
  ctx.fillRect(360, 44, 90, 160);
  // Sleeve cuff
  ctx.fillStyle = collarColor;
  ctx.fillRect(360, 192, 90, 12);

  // Skin arms
  ctx.fillStyle = skinTone;
  ctx.fillRect(360, 204, 90, 156);

  // Shorts side
  ctx.fillStyle = shortsColor;
  ctx.fillRect(360, 360, 90, 152);
  // Shorts side stripe
  ctx.fillStyle = teamColorHex;
  ctx.fillRect(398, 360, 14, 152);

  // === 4. TOP (Head/Hair) & BOTTOM (Boots) (X: 450 to 512, Y: 0 to 512) ===
  // Top (Head of Hair)
  ctx.fillStyle = hairColor;
  ctx.fillRect(450, 0, 62, 256);
  // Hair texture highlights
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(455, 30, 52, 10);
  ctx.fillRect(458, 80, 46, 12);
  ctx.fillRect(455, 140, 52, 10);

  // Bottom (Boots & Socks)
  ctx.fillStyle = teamColorHex;
  ctx.fillRect(450, 256, 62, 120); // socks
  ctx.fillStyle = "#090d16";
  ctx.fillRect(450, 376, 62, 136); // boots

  dTex.update(true);
  return dTex;
};

// Dynamic texture for referee with custom label on back
const createRefereeTexture = (
  scene: Scene,
  refColorHex: string,
  label = "REF",
) => {
  const dTex = new DynamicTexture(
    `ref-tex-${label}`,
    { width: 512, height: 512 },
    scene,
    false,
  );
  const ctx = dTex.getContext() as unknown as CanvasRenderingContext2D;

  const isLight = getLuminance(refColorHex) > 135;
  const textColor = isLight ? "#0f172a" : "#ffffff";
  const textOutline = isLight ? "#ffffff" : "#000000";

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 512, 512);

  // === 1. BACK (X: 0..180) ===
  ctx.fillStyle = "#18181b"; // hair
  ctx.fillRect(0, 0, 180, 20);
  ctx.fillStyle = "#fed7aa"; // neck
  ctx.fillRect(35, 20, 110, 18);

  ctx.fillStyle = refColorHex;
  ctx.fillRect(0, 38, 180, 322);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(25, 38, 130, 20); // collar

  ctx.font = "900 110px 'Arial Black', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 12;
  ctx.strokeStyle = textOutline;
  ctx.strokeText(label, 90, 195);
  ctx.fillStyle = textColor;
  ctx.fillText(label, 90, 195);

  // Ref shorts (back)
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 360, 180, 152);

  // === 2. FRONT (X: 180..360) ===
  ctx.fillStyle = "#fed7aa"; // face/neck
  ctx.fillRect(180, 0, 180, 48);
  ctx.fillStyle = "#18181b"; // hair
  ctx.fillRect(180, 0, 180, 14);

  ctx.fillStyle = refColorHex;
  ctx.fillRect(180, 48, 180, 312);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(205, 48, 130, 20); // collar

  // Chest pockets
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(200, 110, 50, 50);
  ctx.fillRect(290, 110, 50, 50);

  // Ref shorts (front)
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(180, 360, 180, 152);

  // === 3. SIDES (X: 360..450) ===
  ctx.fillStyle = "#18181b";
  ctx.fillRect(360, 0, 90, 20);
  ctx.fillStyle = "#fed7aa";
  ctx.fillRect(360, 20, 90, 24);

  ctx.fillStyle = refColorHex;
  ctx.fillRect(360, 44, 90, 160);
  ctx.fillStyle = "#fed7aa";
  ctx.fillRect(360, 204, 90, 156);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(360, 360, 90, 152);

  // === 4. TOP & BOTTOM (X: 450..512) ===
  ctx.fillStyle = "#18181b"; // full hair
  ctx.fillRect(450, 0, 62, 256);
  ctx.fillStyle = "#0f172a"; // boots
  ctx.fillRect(450, 256, 62, 256);

  dTex.update(true);
  return dTex;
};

export const createPlayerViews = (scene: Scene, state: GameState) => {
  // Texture strips:
  // Strip 1: Back (0.0 to 0.35)
  // Strip 2: Front (0.35 to 0.70)
  // Strip 3: Sides (0.70 to 0.88)
  // Strip 4: Top/Bottom (0.88 to 1.0)
  //
  // BabylonJS Box faceUV order:
  // face 0: front (+Z) -> Strip 2 (Front) - v: 1.0 -> 0.0 (right-side up)
  // face 1: back (-Z) -> Strip 1 (Back with number) - v: 0.0 -> 1.0 (right-side up)
  // face 2: right (+X) -> Strip 3 (Sides) - v: 1.0 -> 0.0
  // face 3: left (-X) -> Strip 3 (Sides) - v: 1.0 -> 0.0
  // face 4: top (+Y) -> Strip 4 (Top/Head) - v: 0.5 -> 1.0 (shows hair)
  // face 5: bottom (-Y) -> Strip 4 (Bottom/Boots) - v: 0.0 -> 0.5
  const playerFaceUV = [
    new Vector4(0.7, 1.0, 0.35, 0.0), // face 0: front (+Z)
    new Vector4(0.0, 0.0, 0.35, 1.0), // face 1: back (-Z)
    new Vector4(0.7, 1.0, 0.88, 0.0), // face 2: right (+X)
    new Vector4(0.88, 1.0, 0.7, 0.0), // face 3: left (-X)
    new Vector4(0.88, 0.5, 1.0, 1.0), // face 4: top (+Y)
    new Vector4(0.88, 0.0, 1.0, 0.5), // face 5: bottom (-Y)
  ];
  const views = new Map(
    state.players.map((player) => {
      // Rugby player rectangular body
      const width = Math.min(
        1.1,
        Math.max(0.8, 0.78 + (player.weight - 80) * 0.005),
      );
      const depth = 0.48;
      const height = 1.92;

      const mesh = CreateBox(
        player.id,
        { width, depth, height, faceUV: playerFaceUV },
        scene,
      );

      const teamColor = state.teams[player.team].color;
      const texture = createPlayerTexture(scene, player, teamColor);

      const material = new StandardMaterial(`${player.id}-material`, scene);
      material.diffuseTexture = texture;
      material.specularColor = new Color3(0.08, 0.08, 0.08);
      material.specularPower = 16;
      mesh.material = material;

      // Initial rotation: Team 0 faces +Z (0), Team 1 faces -Z (Math.PI)
      mesh.rotation.y = player.team === 0 ? 0 : Math.PI;

      return [player.id, { mesh, material }] as const;
    }),
  );

  const refColorHex = getContrastingRefColor(
    state.teams[0].color,
    state.teams[1].color,
  );

  const refMesh = CreateBox(
    "referee",
    { width: 0.82, depth: 0.44, height: 1.9, faceUV: playerFaceUV },
    scene,
  );
  const refMat = new StandardMaterial("referee-material", scene);
  refMat.diffuseTexture = createRefereeTexture(scene, refColorHex, "REF");
  refMat.specularColor = new Color3(0.08, 0.08, 0.08);
  refMesh.material = refMat;

  // 2x Assistant Referees (Touch Judges)
  const arMat = new StandardMaterial("ar-material", scene);
  arMat.diffuseTexture = createRefereeTexture(scene, refColorHex, "AR");
  arMat.specularColor = new Color3(0.08, 0.08, 0.08);

  const ar1Mesh = CreateBox(
    "assistant-ref-1",
    { width: 0.8, depth: 0.44, height: 1.88, faceUV: playerFaceUV },
    scene,
  );
  ar1Mesh.material = arMat;

  const ar2Mesh = CreateBox(
    "assistant-ref-2",
    { width: 0.8, depth: 0.44, height: 1.88, faceUV: playerFaceUV },
    scene,
  );
  ar2Mesh.material = arMat;

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

  const ball = CreateSphere("ball", { diameter: 0.44, segments: 16 }, scene);
  ball.scaling.set(0.72, 0.72, 1.28);
  const ballMaterial = new StandardMaterial("ball-material", scene);
  ballMaterial.diffuseTexture = createRugbyBallTexture(scene);
  ballMaterial.specularColor = new Color3(0.18, 0.18, 0.18);
  ballMaterial.specularPower = 32;
  ball.material = ballMaterial;

  return {
    views,
    refMesh,
    ar1Mesh,
    ar2Mesh,
    carrierMarker,
    gainLinePlane,
    ball,
  };
};

export const syncPlayers = (
  game: GameState,
  views: Map<string, { mesh: any; material: any }>,
  refMesh: any,
  ar1Mesh: any,
  ar2Mesh: any,
  carrierMarker: any,
  gainLinePlane: any,
  ball: any,
) => {
  const ruckPhase = game.phase.kind === "ruck" ? game.phase : null;
  const maulPhase = game.phase.kind === "maul" ? game.phase : null;

  for (const player of game.players) {
    const view = views.get(player.id);
    if (!view) continue;

    const isTackled =
      ruckPhase !== null && player.id === ruckPhase.tackledPlayerId;
    const isRuckCleaner =
      ruckPhase !== null &&
      !isTackled &&
      (ruckPhase.joinedAttackers.includes(player.id) ||
        ruckPhase.joinedDefenders.includes(player.id)) &&
      Math.hypot(
        player.position.x - ruckPhase.position.x,
        player.position.z - ruckPhase.position.z,
      ) <= 2.2;
    const isMaulBound =
      maulPhase !== null &&
      (maulPhase.attackers.includes(player.id) ||
        maulPhase.defenders.includes(player.id));

    const lineoutPhase = game.phase.kind === "lineout" ? game.phase : null;

    // Player yaw rotation based on phase context, role, velocity, or team attack direction
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    let targetYaw = player.team === 0 ? 0 : Math.PI;

    if (maulPhase && isMaulBound) {
      // Maul participants must always face head-on into the contest
      targetYaw =
        player.team === maulPhase.attackingTeam
          ? attackDirection(maulPhase.attackingTeam) === 1
            ? 0
            : Math.PI
          : attackDirection(maulPhase.attackingTeam) === 1
            ? Math.PI
            : 0;
    } else if (ruckPhase && isRuckCleaner) {
      // Ruck cleaners always face toward the opposing side across the gate
      targetYaw =
        player.team === ruckPhase.attackingTeam
          ? attackDirection(ruckPhase.attackingTeam) === 1
            ? 0
            : Math.PI
          : attackDirection(ruckPhase.attackingTeam) === 1
            ? Math.PI
            : 0;
    } else if (
      lineoutPhase &&
      player.team === lineoutPhase.throwingTeam &&
      player.role === ROLES.Hooker
    ) {
      // Throwing hooker faces into the pitch across the touchline
      targetYaw = player.position.x < 0 ? Math.PI / 2 : -Math.PI / 2;
    } else if (
      lineoutPhase &&
      player.team !== lineoutPhase.throwingTeam &&
      player.role === ROLES.Hooker
    ) {
      // Defending hooker faces towards the throwing hooker
      targetYaw = player.position.x < 0 ? -Math.PI / 2 : Math.PI / 2;
    } else if (speed > 0.2) {
      targetYaw = Math.atan2(player.velocity.x, player.velocity.z);
    }

    // Smooth yaw rotation
    let diff = targetYaw - view.mesh.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    view.mesh.rotation.y += diff * 0.28;

    if (isTackled) {
      view.mesh.rotation.x = Math.PI / 2;
      view.mesh.position.set(player.position.x, 0.25, player.position.z);
    } else if (isRuckCleaner || isMaulBound) {
      // Forward lean into ruck (positive pitch angle tilts forward in local space for both teams)
      view.mesh.rotation.x = 0.38;
      view.mesh.position.set(player.position.x, 0.85, player.position.z);
    } else if (player.ruckRecoverySeconds > 0) {
      // Disengaging / getting back up in reverse order after ruck
      if (player.ruckRecoverySeconds > 1.8) {
        // Still prone on ground
        view.mesh.rotation.x = Math.PI / 2;
        view.mesh.position.set(player.position.x, 0.25, player.position.z);
      } else {
        // Pushing up / rising
        const progress = player.ruckRecoverySeconds / 1.8;
        view.mesh.rotation.x = 0.38 * progress;
        view.mesh.position.set(
          player.position.x,
          0.96 - 0.25 * progress,
          player.position.z,
        );
      }
    } else {
      view.mesh.rotation.x = 0;
      view.mesh.position.set(player.position.x, 0.96, player.position.z);
    }

    view.material.emissiveColor =
      player.id === game.ball.carrierId
        ? new Color3(0.25, 0.25, 0.08)
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

  const hSpeed = Math.hypot(game.ball.velocity.x, game.ball.velocity.z);
  const vSpeed = game.ball.velocity.y;
  const ballSpeed = Math.hypot(hSpeed, vSpeed);

  if (game.ball.carrierId) {
    const carrier = game.players.find((p) => p.id === game.ball.carrierId);
    if (carrier) {
      ball.rotation.y = carrier.team === 0 ? 0.3 : Math.PI - 0.3;
      ball.rotation.x = 0.35;
      ball.rotation.z = 0.15;
    }
  } else if (game.ball.flight === "pass" || game.ball.flight === "lineout") {
    const flightYaw = Math.atan2(game.ball.velocity.x, game.ball.velocity.z);
    const flightPitch = -Math.atan2(vSpeed, Math.max(0.1, hSpeed));
    ball.rotation.y = flightYaw;
    ball.rotation.x = flightPitch;
    ball.rotation.z += 0.32;
  } else if (
    game.ball.flight === "kick" ||
    game.ball.flight === "kickoff" ||
    game.ball.flight === "dropGoal"
  ) {
    const flightYaw = Math.atan2(game.ball.velocity.x, game.ball.velocity.z);
    ball.rotation.y = flightYaw;
    ball.rotation.x += 0.22;
  } else if (game.ball.flight === "grubber" || game.ball.flight === "rolling") {
    if (hSpeed > 0.1) {
      const rollYaw = Math.atan2(game.ball.velocity.x, game.ball.velocity.z);
      ball.rotation.y = rollYaw;
      ball.rotation.x += hSpeed * 0.18;
    }
  }

  // Referee position and facing
  refMesh.position.set(game.referee.position.x, 0.95, game.referee.position.z);
  const refSpeed = Math.hypot(game.referee.velocity.x, game.referee.velocity.z);
  if (refSpeed > 0.2) {
    const refTargetYaw = Math.atan2(
      game.referee.velocity.x,
      game.referee.velocity.z,
    );
    let rDiff = refTargetYaw - refMesh.rotation.y;
    while (rDiff < -Math.PI) rDiff += Math.PI * 2;
    while (rDiff > Math.PI) rDiff -= Math.PI * 2;
    refMesh.rotation.y += rDiff * 0.25;
  }

  // Assistant Referees position and facing
  if (game.referee.assistants && ar1Mesh && ar2Mesh) {
    const ar1 = game.referee.assistants[0];
    const ar2 = game.referee.assistants[1];
    ar1Mesh.position.set(ar1.position.x, 0.95, ar1.position.z);
    ar2Mesh.position.set(ar2.position.x, 0.95, ar2.position.z);

    const ar1Speed = Math.hypot(ar1.velocity.x, ar1.velocity.z);
    let ar1TargetYaw = Math.PI / 2; // facing East into pitch
    if (ar1Speed > 0.2)
      ar1TargetYaw = Math.atan2(ar1.velocity.x, ar1.velocity.z);
    let rDiff1 = ar1TargetYaw - ar1Mesh.rotation.y;
    while (rDiff1 < -Math.PI) rDiff1 += Math.PI * 2;
    while (rDiff1 > Math.PI) rDiff1 -= Math.PI * 2;
    ar1Mesh.rotation.y += rDiff1 * 0.25;

    const ar2Speed = Math.hypot(ar2.velocity.x, ar2.velocity.z);
    let ar2TargetYaw = -Math.PI / 2; // facing West into pitch
    if (ar2Speed > 0.2)
      ar2TargetYaw = Math.atan2(ar2.velocity.x, ar2.velocity.z);
    let rDiff2 = ar2TargetYaw - ar2Mesh.rotation.y;
    while (rDiff2 < -Math.PI) rDiff2 += Math.PI * 2;
    while (rDiff2 > Math.PI) rDiff2 -= Math.PI * 2;
    ar2Mesh.rotation.y += rDiff2 * 0.25;
  }

  const showGainLine =
    game.phase.kind === "openPlay" ||
    game.phase.kind === "ruck" ||
    game.phase.kind === "maul";
  gainLinePlane.setEnabled(showGainLine);
  if (showGainLine) {
    gainLinePlane.position.z = game.gainLineZ;
  }
};
