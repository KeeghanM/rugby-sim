import {
  Color3,
  CreateCylinder,
  CreateDashedLines,
  CreateGround,
  CreateLines,
  CreateSphere,
  FreeCamera,
  HemisphericLight,
  Matrix,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import type { GameState } from "./domain.ts";
import { PITCH } from "./domain.ts";
import { TEAMS } from "./teams.ts";

const createPitch = (scene: Scene) => {
  const ground = CreateGround(
    "ground",
    { width: PITCH.width, height: PITCH.totalLength },
    scene,
  );
  const groundMaterial = new StandardMaterial("ground-material", scene);
  groundMaterial.diffuseColor = Color3.FromHexString("#3f9b0b");
  ground.material = groundMaterial;

  const mark = (name: string, from: Vector3, to: Vector3, dashed = false) => {
    const line = dashed
      ? CreateDashedLines(name, { points: [from, to], dashSize: 1, gapSize: 1 }, scene)
      : CreateLines(name, { points: [from, to] }, scene);
    line.color = Color3.White();
  };
  const across = (name: string, z: number, dashed = false) =>
    mark(
      name,
      new Vector3(PITCH.touchLines.left, 0.02, z),
      new Vector3(PITCH.touchLines.right, 0.02, z),
      dashed,
    );
  const along = (name: string, x: number, dashed = false) =>
    mark(
      name,
      new Vector3(x, 0.02, PITCH.tryLines.south),
      new Vector3(x, 0.02, PITCH.tryLines.north),
      dashed,
    );

  mark(
    "left-touch-line",
    new Vector3(PITCH.touchLines.left, 0.02, PITCH.deadBallLines.south),
    new Vector3(PITCH.touchLines.left, 0.02, PITCH.deadBallLines.north),
  );
  mark(
    "right-touch-line",
    new Vector3(PITCH.touchLines.right, 0.02, PITCH.deadBallLines.south),
    new Vector3(PITCH.touchLines.right, 0.02, PITCH.deadBallLines.north),
  );
  across("south-dead-ball-line", PITCH.deadBallLines.south);
  across("north-dead-ball-line", PITCH.deadBallLines.north);
  across("south-try-line", PITCH.tryLines.south);
  across("north-try-line", PITCH.tryLines.north);
  across("south-five-metre-line", PITCH.fiveMetreLines.south, true);
  across("north-five-metre-line", PITCH.fiveMetreLines.north, true);
  across("south-22-metre-line", PITCH.twentyTwoMetreLines.south);
  across("north-22-metre-line", PITCH.twentyTwoMetreLines.north);
  across("south-10-metre-line", PITCH.tenMetreLines.south, true);
  across("halfway-line", PITCH.halfwayLine);
  across("north-10-metre-line", PITCH.tenMetreLines.north, true);
  along("left-five-metre-line", PITCH.fiveMetreLines.left, true);
  along("right-five-metre-line", PITCH.fiveMetreLines.right, true);
  along("left-fifteen-metre-line", PITCH.fifteenMetreLines.left, true);
  along("right-fifteen-metre-line", PITCH.fifteenMetreLines.right, true);
};

export const createRenderer = (
  engine: Engine,
  canvas: HTMLCanvasElement,
  state: GameState,
) => {
  const scene = new Scene(engine);
  const camera = new FreeCamera("camera", new Vector3(0, 85, -85), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(canvas, true);
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;
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
        TEAMS[player.team].color,
      );
      mesh.material = material;
      return [player.id, { mesh, material }] as const;
    }),
  );
  const ball = CreateSphere("ball", { diameter: 0.45 }, scene);
  const ballMaterial = new StandardMaterial("ball-material", scene);
  ballMaterial.diffuseColor = Color3.FromHexString("#f5f5dc");
  ball.material = ballMaterial;
  const scoreboard = document.getElementById("scoreboard");

  const speedSlider = document.getElementById("speed-slider") as HTMLInputElement | null;
  const speedDisplay = document.getElementById("speed-display");
  const debugToggle = document.getElementById("debug-toggle") as HTMLInputElement | null;
  const debugOverlay = document.getElementById("debug-overlay");

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

  const tempWorld = new Vector3();
  const tempProj = new Vector3();

  return {
    scene,
    getSimulationSpeed: () => simulationSpeed,
    isDebugMode: () => debugMode,
    sync(game: GameState) {
      for (const player of game.players) {
        const view = views.get(player.id);
        if (!view) continue;
        view.mesh.position.set(player.position.x, 1, player.position.z);
        view.material.emissiveColor = player.id === game.ball.carrierId
          ? Color3.FromHexString("#facc15")
          : Color3.Black();
      }
      ball.position.set(
        game.ball.position.x,
        game.ball.position.y,
        game.ball.position.z,
      );

      const baseScore = `${TEAMS[0].name} ${game.scores[0]} - ${game.scores[1]} ${TEAMS[1].name}`;
      if (scoreboard) {
        if (debugMode) {
          const phase =
            game.phase.kind === "openPlay"
              ? "Open play"
              : game.phase.kind === "ruck"
                ? `Ruck ${game.phase.stage} - ${game.phase.tempo} ${game.phase.play}${game.phase.counterRuck ? " - counter ruck" : ""}`
                : game.phase.kind === "lineout"
                  ? `Lineout ${game.phase.stage}`
                  : game.phase.reason === "goalLineDropout"
                    ? `Goal-line dropout ${game.phase.stage}`
                    : `${game.phase.reason === "try" ? "Try - " : ""}Kickoff ${game.phase.stage}`;
          scoreboard.textContent = `${baseScore} | ${phase}`;
        } else {
          scoreboard.textContent = baseScore;
        }
      }

      if (!debugOverlay) return;

      if (!debugMode) {
        debugOverlay.style.display = "none";
        return;
      }

      debugOverlay.style.display = "block";

      const transformMatrix = scene.getTransformMatrix();
      const renderWidth = engine.getRenderWidth();
      const renderHeight = engine.getRenderHeight();
      const viewport = camera.viewport.toGlobal(renderWidth, renderHeight);

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
              <span>#${player.number} ${player.role} (${TEAMS[player.team].name})</span>
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
              ? TEAMS[game.ball.lastTouchedTeam].name
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
