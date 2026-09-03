import type React from 'react'
import { useEffect, useRef } from 'react'
import { Engine } from '@babylonjs/core/Engines/engine'
import type { Career, Fixture } from '../career/domain/index.ts'
import { createMatchInputForFixture } from '../career/domain/match-input.ts'
import type { GameState, MatchResult } from '../simulation/domain.ts'
import {
  createGame,
  createMatchResult,
  createSeededRandom,
  SIMULATION_STEP_SECONDS,
  updateGame,
} from '../simulation/index.ts'
import { createRenderer } from './index.ts'
import './match.css'

export interface MatchViewProps {
  career: Career
  fixture: Fixture
  onFinish: (result: MatchResult) => void
}

export const MatchView: React.FC<MatchViewProps> = ({ career, fixture, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const input = createMatchInputForFixture(career, fixture)
    const random = createSeededRandom(fixture.seed)
    const state: GameState = createGame(input, random)
    const engine = new Engine(canvas, true)

    let renderer: ReturnType<typeof createRenderer> | null = null
    let accumulatedSimulationSeconds = 0
    let isFinished = false

    const finishMatch = () => {
      if (isFinished) return
      isFinished = true
      const result = createMatchResult(state, fixture.seed)
      onFinish(result)
    }

    renderer = createRenderer(engine, canvas, state, finishMatch)

    const renderFrame = () => {
      if (!renderer || isFinished) return
      const speed = renderer.getSimulationSpeed()
      if (speed > 0) {
        accumulatedSimulationSeconds += (Math.min(engine.getDeltaTime(), 100) / 1000) * speed
        while (accumulatedSimulationSeconds >= SIMULATION_STEP_SECONDS) {
          updateGame(state, SIMULATION_STEP_SECONDS, random)
          accumulatedSimulationSeconds -= SIMULATION_STEP_SECONDS
        }
      }
      renderer.sync(state)
      renderer.scene.render()
    }

    engine.runRenderLoop(renderFrame)

    const handleResize = () => engine.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      engine.stopRenderLoop(renderFrame)
      renderer?.dispose()
      engine.dispose()
    }
  }, [career, fixture, onFinish])

  return (
    <div id="match-screen">
      {/* TV broadcast scoreboard */}
      <div id="tv-scoreboard" className="tv-bug" aria-live="polite">
        <div className="tv-top-row">
          {/* Team 0 score */}
          <div className="tv-team tv-team-0" id="tv-team-0">
            <span className="tv-team-badge" id="tv-team0-badge" />
            <span className="tv-team-name" id="tv-team0-name">
              BLU
            </span>
            <span className="tv-team-score" id="tv-team0-score">
              0
            </span>
          </div>
          <div className="tv-team-divider" />
          {/* Team 1 score */}
          <div className="tv-team tv-team-1" id="tv-team-1">
            <span className="tv-team-score" id="tv-team1-score">
              0
            </span>
            <span className="tv-team-name" id="tv-team1-name">
              RED
            </span>
            <span className="tv-team-badge" id="tv-team1-badge" />
          </div>
          {/* Match clock and half */}
          <div className="tv-clock-box">
            <span id="tv-clock" className="tv-clock">
              00:00
            </span>
            <span id="tv-half" className="tv-half">
              1ST
            </span>
          </div>
        </div>
        {/* Phase, territory, shot clock, and match status */}
        <div className="tv-bottom-bar">
          <span id="tv-phase-pill" className="tv-phase-pill">
            PHASE 1
          </span>
          <span id="tv-meters" className="tv-meters">
            +0m
          </span>
          <span id="tv-shot-clock" className="tv-shot-clock" hidden>
            SHOT 30
          </span>
          <span id="tv-status" className="tv-status">
            KICKOFF
          </span>
        </div>
      </div>

      {/* Top-center navigation and match controls */}
      <div id="top-controls" className="top-nav-bar">
        {/* Simulation speed */}
        <div className="top-nav-group">
          <span className="top-nav-label">Speed</span>
          <span id="speed-display" className="top-nav-val">
            1.0×
          </span>
          <input
            type="range"
            id="speed-slider"
            min="0"
            max="10"
            step="0.1"
            defaultValue="1"
            className="top-nav-slider"
            aria-label="Simulation speed"
          />
        </div>

        <div className="top-nav-divider" />

        {/* Camera mode */}
        <div className="top-nav-group">
          <div className="cam-buttons">
            <button type="button" id="camera-dynamic-btn" data-cam="dynamic" className="cam-btn active">
              🎬 Dynamic
            </button>
            <button type="button" id="camera-free-btn" data-cam="free" className="cam-btn">
              Free
            </button>
          </div>
        </div>

        <div className="top-nav-divider" />

        {/* Team management */}
        <button
          type="button"
          id="manager-view-btn"
          className="top-nav-btn"
          aria-controls="manager-modal"
          aria-expanded="false"
        >
          📋 Manager (M)
        </button>

        <div className="top-nav-divider" />

        {/* Exit Match / Return */}
        <button
          type="button"
          id="match-exit-btn"
          className="top-nav-btn"
          style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
        >
          🏁 End Match
        </button>
      </div>

      {/* Team management modal */}
      <dialog id="manager-modal" aria-labelledby="manager-modal-title">
        <div className="manager-dialog">
          <div className="manager-header">
            <div className="manager-title" id="manager-modal-title">
              📋 Team Management Dashboard
            </div>
            <button type="button" id="manager-close-btn" className="manager-close-btn" aria-label="Close">
              ✕
            </button>
          </div>
          <div className="manager-tabs">
            <fieldset className="manager-team-tabs" aria-label="Team" style={{ border: 0, padding: 0, margin: 0 }}>
              <button type="button" className="team-tab-btn active" data-team="0" id="tab-team-0" aria-pressed="true">
                <span className="team-tab-swatch" id="tab-team-0-swatch" />
                <span id="tab-team-0-label">Team 1</span>
              </button>
              <button type="button" className="team-tab-btn" data-team="1" id="tab-team-1" aria-pressed="false">
                <span className="team-tab-swatch" id="tab-team-1-swatch" />
                <span id="tab-team-1-label">Team 2</span>
              </button>
            </fieldset>
            <fieldset className="manager-subtabs" aria-label="View" style={{ border: 0, padding: 0, margin: 0 }}>
              <button type="button" className="manager-subtab-btn active" id="subtab-roster" aria-pressed="true">
                👥 Squad & Condition
              </button>
              <button type="button" className="manager-subtab-btn" id="subtab-stats" aria-pressed="false">
                📊 Game Stats
              </button>
            </fieldset>
          </div>
          <div className="manager-body">
            <div className="team-summary-card" id="manager-team-summary" />
            <table className="roster-table">
              <thead id="manager-roster-thead">
                <tr>
                  <th className="player-num-col">#</th>
                  <th>Player / Role</th>
                  <th>Physicals</th>
                  <th>Skill</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody id="manager-roster-tbody" />
            </table>
          </div>
        </div>
      </dialog>

      <output id="scoreboard" aria-live="polite" />
      <div id="debug-overlay" />
      <canvas ref={canvasRef} id="renderCanvas" />
    </div>
  )
}
