import { syncManager } from "./sync-manager.ts";
import { syncDebug } from "./sync-debug.ts";
import type { GameState } from "../../domain.ts";
import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";

export const syncUI = (
  game: GameState,
  ctx: any,
  scene: Scene,
  engine: Engine,
  debugMode: boolean,
  managerOpen: boolean,
  selectedManagerTeam: 0 | 1,
  selectedManagerView: "roster" | "stats",
) => {
  // Scoreboard & TV sync (kept inline for brevity, ~60 lines)
  const {
    scoreboard, tvTeam0, tvTeam1, tvTeam0Name, tvTeam0Score, tvTeam1Name, tvTeam1Score, tvClock, tvHalf, tvPhasePill, tvMeters, tvStatus, tvShotClock,
  } = ctx;
  const mins = Math.floor(game.matchClockSeconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(game.matchClockSeconds % 60).toString().padStart(2, "0");
  const halfText = game.half === "fullTime" ? "Full Time" : game.half === 2 ? "2nd Half" : "1st Half";
  const shortHalf = game.half === "fullTime" ? "FT" : game.half === 2 ? "2ND" : "1ST";
  const clockStr = `${mins}:${secs} (${halfText})`;
  const baseScore = `${game.teams[0].name} ${game.scores[0]} - ${game.scores[1]} ${game.teams[1].name}`;
  const p: any = game.phase;
  let topLevelStatus = "OPEN PLAY";
  if (p.kind === "openPlay") topLevelStatus = game.ball.flight === "dropGoal" ? "DROP GOAL" : "OPEN PLAY";
  else if (p.kind === "ruck") topLevelStatus = "RUCK";
  else if (p.kind === "maul") topLevelStatus = "MAUL";
  else if (p.kind === "lineout") topLevelStatus = "LINEOUT";
  else if (p.kind === "scrum") topLevelStatus = "SCRUM";
  else if (p.kind === "kickoff") topLevelStatus = p.reason === "goalLineDropout" ? "DROP OUT" : "KICKOFF";
  else if (p.kind === "conversion") topLevelStatus = "CONVERSION";
  else if (p.kind === "penalty") topLevelStatus = "PENALTY";
  let phaseDesc: string;
  if (p.kind === "openPlay") phaseDesc = "Open play";
  else if (p.kind === "ruck") phaseDesc = `Ruck ${p.stage} - ${p.tempo} ${p.play}`;
  else if (p.kind === "maul") phaseDesc = `Maul ${p.stage}`;
  else if (p.kind === "lineout") phaseDesc = `Lineout ${p.stage}`;
  else if (p.kind === "scrum") phaseDesc = `Scrum ${p.stage}`;
  else if (p.kind === "kickoff") phaseDesc = p.reason === "goalLineDropout" ? `Goal-line dropout ${p.stage}` : `Kickoff ${p.stage}`;
  else if (p.kind === "conversion") phaseDesc = `Conversion ${p.stage}`;
  else if (p.kind === "penalty") phaseDesc = `Penalty ${p.choice} ${p.stage}`;
  else phaseDesc = (p as any).kind;
  if (tvTeam0) tvTeam0.classList.toggle("possession", game.possessionTeam === 0);
  if (tvTeam1) tvTeam1.classList.toggle("possession", game.possessionTeam === 1);
  if (tvTeam0Name) tvTeam0Name.textContent = game.teams[0].name.toUpperCase();
  if (tvTeam0Score) tvTeam0Score.textContent = game.scores[0].toString();
  if (tvTeam1Name) tvTeam1Name.textContent = game.teams[1].name.toUpperCase();
  if (tvTeam1Score) tvTeam1Score.textContent = game.scores[1].toString();
  if (tvClock) tvClock.textContent = `${mins}:${secs}`;
  if (tvHalf) tvHalf.textContent = shortHalf;
  if (tvPhasePill) tvPhasePill.textContent = `PHASE ${game.phaseCount}`;
  if (tvMeters) { const sign = game.distanceGained >= 0 ? "+" : ""; tvMeters.textContent = `${sign}${game.distanceGained.toFixed(0)}m`; }
  if (tvStatus) tvStatus.textContent = topLevelStatus;
  const showShotClock = (p.kind === "conversion" && p.stage === "ready") || (p.kind === "penalty" && p.choice === "goal" && p.stage === "executing");
  if (tvShotClock) { tvShotClock.hidden = !showShotClock; if (showShotClock) tvShotClock.textContent = `SHOT ${Math.max(0, Math.ceil(30 - p.elapsed * 6))}`; }
  if (scoreboard) {
    if (ctx.debugMode) {
      const gainPrefix = game.distanceGained >= 0 ? "+" : "";
      const phaseMetrics = `Phase ${game.phaseCount} (${gainPrefix}${game.distanceGained.toFixed(0)}m)`;
      scoreboard.textContent = `${clockStr} | ${baseScore} | ${phaseMetrics} | ${phaseDesc}`;
    } else {
      scoreboard.textContent = `${clockStr} | ${baseScore}`;
    }
  }
  syncManager(game, ctx, selectedManagerTeam, selectedManagerView, managerOpen);
  syncDebug(game, ctx, scene, engine, debugMode);
};
