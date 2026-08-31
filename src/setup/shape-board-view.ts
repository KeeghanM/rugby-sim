import type {
  FormationContext,
  MatchConfig,
  Position,
  Team,
} from "../domain.ts";
import { boundsFor, escapeHtml, shapeContexts, text } from "./types.ts";

export const renderShapeBoard = (
  teams: MatchConfig,
  selectedTeam: Team,
  shapeContext: FormationContext,
  selectedShapeIndex: number,
  positions: Position[],
  ensureTacticalShapes: (teamId: Team, context: FormationContext) => any[],
) => {
  const team = teams[selectedTeam];
  const context = shapeContexts.find((item) => item.value === shapeContext)!;
  const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
  const idx = selectedShapeIndex >= shapes.length ? 0 : selectedShapeIndex;
  const currentShape = shapes[idx] ?? shapes[0];
  const totalWeight = shapes.reduce((sum, s) => sum + Math.max(0, s.weight), 0);
  const probabilityPercent =
    totalWeight > 0
      ? Math.round((currentShape.weight / totalWeight) * 100)
      : 100;
  const bounds = boundsFor(shapeContext);

  return `
      <div class="shape-layout">
        <aside class="shape-menu">
          <span class="eyebrow">Phase</span>
          ${shapeContexts.map((item) => `<button type="button" data-shape-context="${item.value}" class="${shapeContext === item.value ? "selected" : ""}">${item.label}</button>`).join("")}
        </aside>
        <section class="shape-workbench">
          <div class="section-heading">
            <div>
              <span>Tactical Play Variations</span>
              <h2>${context.label}</h2>
            </div>
            <button type="button" class="reset-shape" data-reset-shape>Reset to preset</button>
          </div>

          <div class="shape-tabs-bar">
            <div class="shape-tabs-list">
              ${shapes
                .map(
                  (s, shapeIdx) => `
                <button type="button" class="shape-tab-btn ${shapeIdx === idx ? "selected" : ""}" data-shape-index="${shapeIdx}">
                  <b>${escapeHtml(s.name)}</b>
                  <span>${totalWeight > 0 ? Math.round((s.weight / totalWeight) * 100) : 100}%</span>
                </button>`,
                )
                .join("")}
              <button type="button" class="add-shape-btn" data-add-shape>+ Add Play</button>
            </div>
          </div>

          <div class="shape-controls-card">
            <label class="shape-name-control">
              <span>Play Name</span>
              <input type="text" data-shape-name value="${escapeHtml(currentShape.name)}" placeholder="e.g. Blue Strike, Green Pods..." />
            </label>
            <label class="shape-weight-control">
              <span>Usage Weight</span>
              <input type="range" min="5" max="100" step="5" value="${currentShape.weight}" data-shape-weight />
              <output>${probabilityPercent}% chance</output>
            </label>
            ${shapes.length > 1 ? `<button type="button" class="delete-shape-btn" data-delete-shape title="Delete play">✕ Delete</button>` : ""}
          </div>

          <div class="preset-row">
            <span class="preset-label">Base template:</span>
            ${context.presets.map((preset) => `<button type="button" data-preset="${preset}" class="${currentShape.preset === String(preset) && !currentShape.positions ? "selected" : ""}">${text(String(preset))}</button>`).join("")}
          </div>

          <div class="pitch-board" data-pitch data-x-bound="${bounds.x}" data-z-bound="${bounds.z}">
            <span class="pitch-half"></span><span class="pitch-22 north"></span><span class="pitch-22 south"></span>
            ${positions.map((position, index) => `<button type="button" class="shape-player" data-shape-player="${index}" style="--x:${((position.x + bounds.x) / (bounds.x * 2)) * 100}%;--z:${((bounds.z - position.z) / (bounds.z * 2)) * 100}%;--team-color:${team.color}">${index + 1}</button>`).join("")}
          </div>
        </section>
      </div>`;
};
