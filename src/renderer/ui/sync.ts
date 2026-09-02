import { syncManager } from "./sync-manager.ts";
import { syncDebug } from "./sync-debug.ts";
import type { GameState } from "../../domain.ts";
import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import type { UIContext } from "./create.ts";

export const syncUI = (
  game: GameState,
  ctx: UIContext,
  scene: Scene,
  engine: Engine,
) => {
  // Main scoreboard and TV broadcast scoreboard.
  const {
    scoreboard,
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
  } = ctx;
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
  if (p.kind === "openPlay")
    topLevelStatus =
      game.ball.flight === "dropGoal" ? "DROP GOAL" : "OPEN PLAY";
  else if (p.kind === "ruck") topLevelStatus = "RUCK";
  else if (p.kind === "maul") topLevelStatus = "MAUL";
  else if (p.kind === "lineout") topLevelStatus = "LINEOUT";
  else if (p.kind === "scrum") topLevelStatus = "SCRUM";
  else if (p.kind === "kickoff")
    topLevelStatus = p.reason === "goalLineDropout" ? "DROP OUT" : "KICKOFF";
  else if (p.kind === "conversion") topLevelStatus = "CONVERSION";
  else if (p.kind === "penalty") topLevelStatus = "PENALTY";
  let phaseDesc = "Open play";
  if (p.kind === "openPlay") phaseDesc = "Open play";
  else if (p.kind === "ruck")
    phaseDesc = `Ruck ${p.stage} - ${p.tempo} ${p.play}`;
  else if (p.kind === "maul") phaseDesc = `Maul ${p.stage}`;
  else if (p.kind === "lineout") phaseDesc = `Lineout ${p.stage}`;
  else if (p.kind === "scrum") phaseDesc = `Scrum ${p.stage}`;
  else if (p.kind === "kickoff")
    phaseDesc =
      p.reason === "goalLineDropout"
        ? `Goal-line dropout ${p.stage}`
        : `Kickoff ${p.stage}`;
  else if (p.kind === "conversion") phaseDesc = `Conversion ${p.stage}`;
  else if (p.kind === "penalty") phaseDesc = `Penalty ${p.choice} ${p.stage}`;
  if (tvTeam0) {
    const isPoss = game.possessionTeam === 0;
    tvTeam0.classList.toggle("possession", isPoss);
    tvTeam0.style.borderBottomColor = isPoss
      ? game.teams[0].color
      : "transparent";
    tvTeam0.style.background = isPoss
      ? `${game.teams[0].color}33`
      : "transparent";
    ctx.tvTeam0Badge.style.backgroundColor = game.teams[0].color;
    ctx.tvTeam0Badge.style.boxShadow = `0 0 8px ${game.teams[0].color}`;
  }
  if (tvTeam1) {
    const isPoss = game.possessionTeam === 1;
    tvTeam1.classList.toggle("possession", isPoss);
    tvTeam1.style.borderBottomColor = isPoss
      ? game.teams[1].color
      : "transparent";
    tvTeam1.style.background = isPoss
      ? `${game.teams[1].color}33`
      : "transparent";
    ctx.tvTeam1Badge.style.backgroundColor = game.teams[1].color;
    ctx.tvTeam1Badge.style.boxShadow = `0 0 8px ${game.teams[1].color}`;
  }
  if (tvTeam0Name) tvTeam0Name.textContent = game.teams[0].name.toUpperCase();
  if (tvTeam0Score) tvTeam0Score.textContent = game.scores[0].toString();
  if (tvTeam1Name) tvTeam1Name.textContent = game.teams[1].name.toUpperCase();
  if (tvTeam1Score) tvTeam1Score.textContent = game.scores[1].toString();
  if (tvClock) tvClock.textContent = `${mins}:${secs}`;
  if (tvHalf) tvHalf.textContent = shortHalf;

  // Phase and gain metrics apply only to live contest phases.
  const isOpenPlayOrRuck =
    p.kind === "openPlay" || p.kind === "ruck" || p.kind === "maul";

  if (tvPhasePill) {
    tvPhasePill.hidden = !isOpenPlayOrRuck;
    if (isOpenPlayOrRuck) tvPhasePill.textContent = `PHASE ${game.phaseCount}`;
  }
  if (tvMeters) {
    tvMeters.hidden = !isOpenPlayOrRuck;
    if (isOpenPlayOrRuck) {
      const sign = game.distanceGained >= 0 ? "+" : "";
      tvMeters.textContent = `${sign}${game.distanceGained.toFixed(0)}m`;
    }
  }
  if (tvStatus) tvStatus.textContent = topLevelStatus;
  const showShotClock =
    (p.kind === "conversion" && p.stage === "ready") ||
    (p.kind === "penalty" && p.choice === "goal" && p.stage === "executing");
  if (tvShotClock) {
    tvShotClock.hidden = !showShotClock;
    if (showShotClock)
      tvShotClock.textContent = `SHOT ${Math.max(0, Math.ceil(30 - p.elapsed * 6))}`;
  }
  if (scoreboard) {
    if (ctx.isDebugMode()) {
      const gainPrefix = game.distanceGained >= 0 ? "+" : "";
      const phaseMetrics = `Phase ${game.phaseCount} (${gainPrefix}${game.distanceGained.toFixed(0)}m)`;
      scoreboard.textContent = `${clockStr} | ${baseScore} | ${phaseMetrics} | ${phaseDesc}`;
    } else {
      scoreboard.textContent = `${clockStr} | ${baseScore}`;
    }
  }
  if (ctx.manager.shouldRender(performance.now())) {
    syncManager(
      game,
      ctx,
      ctx.manager.getSelectedTeam(),
      ctx.manager.getSelectedView(),
    );
  }
  syncDebug(game, ctx, scene, engine);
};
