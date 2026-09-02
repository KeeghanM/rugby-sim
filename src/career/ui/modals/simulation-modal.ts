import { escapeHtml } from "../../../html.ts";
import { createWindow, registerStyles } from "../../../ui/index.ts";
import type { SimulationProgress } from "../types.ts";

const SIM_MODAL_STYLES = `
  .sim-progress-track {
    height: 8px;
    background: #0f172a;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 12%);
  }
  .sim-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8, #818cf8);
    border-radius: 4px;
    transition: width 0.15s ease;
  }
`;

registerStyles("career-sim-modal", SIM_MODAL_STYLES);

export const renderSimulationModal = (sim: SimulationProgress): string => {
  const customHeader = `
    <div style="flex: 1; text-align: center;">
      <span class="career-kicker">Match Simulation Engine</span>
      <h3 style="margin: 0.25rem 0 0; font-size: 1.25rem; color: #f8fafc;">
        ⚡ Simulating Round ${sim.round}
      </h3>
    </div>`;

  const body = `
    <div style="padding: 0.5rem 0; display: grid; gap: 1.25rem;">
      <div style="display: grid; gap: 0.5rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.78rem;">
          <span style="color: #cbd5e1; font-weight: 500;">${escapeHtml(sim.fixtureText)}</span>
          <strong style="color: #38bdf8; font-family: ui-monospace, monospace;">${Math.round(sim.percent)}%</strong>
        </div>
        <div class="sim-progress-track">
          <div class="sim-progress-fill" style="width: ${sim.percent}%;"></div>
        </div>
      </div>

      <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgb(255 255 255 / 8%); border-radius: 0.45rem; padding: 0.75rem 1rem; display: grid; gap: 0.45rem; min-height: 90px;">
        <span style="font-size: 0.68rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Fixtures Status</span>
        ${
          sim.results.length === 0
            ? `<div style="font-size: 0.78rem; color: #64748b; font-style: italic; padding: 0.5rem 0;">Computing player decisions and match phases...</div>`
            : sim.results
                .map(
                  (r) => `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; border-top: 1px solid rgb(255 255 255 / 6%); padding-top: 0.35rem;">
                <span style="color: #f1f5f9;">${escapeHtml(r.homeName)} vs ${escapeHtml(r.awayName)}</span>
                <strong style="color: #38bdf8; font-family: ui-monospace, monospace;">${r.score}</strong>
              </div>`,
                )
                .join("")
        }
      </div>
    </div>`;

  return createWindow({
    maxWidth: "520px",
    customHeader,
    body,
  });
};
