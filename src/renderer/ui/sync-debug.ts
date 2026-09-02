import { Matrix, Vector3 } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import type { GameState } from "../../domain.ts";
import { escapeHtml } from "../../html.ts";
import type { UIContext } from "./create.ts";

export const syncDebug = (
  game: GameState,
  ctx: UIContext,
  scene: Scene,
  engine: Engine,
) => {
  const { playerCards, ballCard, tempWorld, tempProj, debugOverlay } = ctx;
  if (!ctx.isDebugMode()) {
    debugOverlay.style.display = "none";
    return;
  }
  debugOverlay.style.display = "block";
  const activeCam = scene.activeCamera;
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
      if (player.pendingBallAction)
        extra += ` | Act: <span class="highlight">${player.pendingBallAction.kind} (${player.pendingBallAction.remainingSeconds.toFixed(1)}s)</span>`;
      if (player.tackleCooldown > 0)
        extra += ` | TklCD: <span class="val">${player.tackleCooldown.toFixed(1)}s</span>`;
      if (player.ruckRecoverySeconds > 0)
        extra += ` | RuckRec: <span class="val">${player.ruckRecoverySeconds.toFixed(1)}s</span>`;
      card.innerHTML = `<div class="debug-card-header"><span>#${player.number} ${player.role} (${escapeHtml(game.teams[player.team].name)})</span> ${carrierBadge} ${offsideBadge}</div><div class="debug-card-row">State: <span class="val">${player.intentKind}</span> | Spd: <span class="val">${currentSpeed}m/s</span> | Sta: <span class="val">${Math.round(player.stamina)}%</span>${extra}</div><div class="debug-card-row">Target: <span class="val">(${player.intentTarget.x.toFixed(1)}, ${player.intentTarget.z.toFixed(1)})</span> <span class="val">[${distToTarget}m]</span> | Pod: <span class="val">${player.pod}</span></div><div class="debug-card-row">Stats: <span class="val">W:${player.weight}kg</span> | Skills: <span class="val">D:${player.skills.decision} H:${player.skills.handling} P:${player.skills.passing} K:${player.skills.kicking} T:${player.skills.tackling}</span></div>`;
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
        (player) => player.id === game.ball.carrierId,
      );
      const carrierText = carrier
        ? `Carried by #${carrier.number} ${carrier.role}`
        : game.ball.flight
          ? `Flight (${game.ball.flight})`
          : "Loose";
      let targetText = "None";
      if (game.ball.intendedReceiverId) {
        const receiver = game.players.find(
          (player) => player.id === game.ball.intendedReceiverId,
        );
        targetText = receiver
          ? `Receiver #${receiver.number} ${receiver.role}`
          : game.ball.intendedReceiverId;
      } else if (game.ball.kickOrigin)
        targetText = `Kick origin (${game.ball.kickOrigin.x.toFixed(1)}, ${game.ball.kickOrigin.z.toFixed(1)})`;
      else if (carrier)
        targetText = `Carrier target (${carrier.intentTarget.x.toFixed(1)}, ${carrier.intentTarget.z.toFixed(1)})`;
      const ballSpeed = Math.hypot(
        game.ball.velocity.x,
        game.ball.velocity.y,
        game.ball.velocity.z,
      ).toFixed(1);
      const lastTouch =
        game.ball.lastTouchedTeam !== null
          ? escapeHtml(game.teams[game.ball.lastTouchedTeam].name)
          : "None";
      ballCard.innerHTML = `<div class="debug-card-header"><span>BALL</span> <span class="highlight">${carrierText}</span></div><div class="debug-card-row">Pos: <span class="val">(${game.ball.position.x.toFixed(1)}, ${game.ball.position.y.toFixed(1)}, ${game.ball.position.z.toFixed(1)})</span> | Vel: <span class="val">(${game.ball.velocity.x.toFixed(1)}, ${game.ball.velocity.y.toFixed(1)}, ${game.ball.velocity.z.toFixed(1)})</span> [${ballSpeed}m/s]</div><div class="debug-card-row">Target: <span class="val">${targetText}</span></div><div class="debug-card-row">Bounces left: <span class="val">${game.ball.bouncesRemaining}</span> | Last touch: <span class="val">${lastTouch}</span></div>`;
    } else {
      ballCard.style.display = "none";
    }
  }
};
