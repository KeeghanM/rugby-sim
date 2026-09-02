import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import {
  roleName,
  TRAINING_FOCUSES,
  TRAINING_INTENSITIES,
  type Club,
  type TrainingFocus,
  type TrainingIntensity,
} from "../../domain/index.ts";

const TRAINING_STYLES = `
  .training-grid {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 1.25rem;
  }
  @media (max-width: 900px) {
    .training-grid {
      grid-template-columns: 1fr;
    }
  }
`;

registerStyles("career-training", TRAINING_STYLES);

export const renderTraining = (club: Club): string => {
  const plan = club.trainingPlan;
  const injuredCount = club.squad.filter((p) => p.injury !== null).length;

  const focusDescriptions: Record<TrainingFocus, string> = {
    balanced: "Standard balanced preparation across ball skills and fitness.",
    strength:
      "Heavy resistance and contact training. Improves collision power and breakdown dominance (+Gym boost).",
    conditioning:
      "High aerobic conditioning. Boosts stamina and match fitness across the squad.",
    handling:
      "Catch, pass, and offloading under pressure. Enhances attacking execution.",
    attack:
      "Backline strike plays, running lines, and set-piece launch technique.",
    defence:
      "Defensive line speed, tackle technique, and turnover contact drills.",
    recovery:
      "Active rehab, hydrotherapy, and light mobility. +15% fitness boost, -50% injury risk, faster return for injured players.",
  };

  const intensityDescriptions: Record<TrainingIntensity, string> = {
    light:
      "Low workload. +10% fitness recovery, minimal injury risk (0.5%), small skill progression.",
    medium:
      "Standard balanced workload. Standard fitness maintenance and moderate skill gains.",
    high: "Intense match-simulation load. -8% fitness cost, higher injury risk (6%), maximum skill development.",
  };

  return `<section class="career-section">
    <header style="flex-wrap: wrap;">
      <div>
        <span class="career-kicker">Weekly Training Regimen</span>
        <h2>${escapeHtml(club.name)} Training Center</h2>
      </div>
      <div style="display: flex; gap: 0.6rem; font-size: 0.75rem; color: #94a3b8; align-items: center;">
        <span>Gym <strong>Lvl ${club.facilities.gym}</strong></span>
        <span>·</span>
        <span>Training Ground <strong>Lvl ${club.facilities.trainingGround}</strong></span>
        <span>·</span>
        <span>Medical <strong>Lvl ${club.facilities.medicalRoom}</strong></span>
      </div>
    </header>

    <div class="training-grid">
      <!-- Training Configuration Card -->
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.65rem; padding: 1.25rem; display: grid; gap: 1.25rem;">
        <div>
          <span class="career-kicker">1. Weekly Primary Focus</span>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.4rem; margin-top: 0.6rem;">
            ${TRAINING_FOCUSES.map(
              (
                f,
              ) => `<button type="button" class="career-swap-btn ${plan.focus === f ? "active" : ""}" data-set-focus="${f}" style="padding: 0.5rem 0.65rem; text-align: center;">
                ${roleName(f)}
              </button>`,
            ).join("")}
          </div>
          <p style="font-size: 0.78rem; color: #cbd5e1; margin-top: 0.65rem; background: rgba(0,0,0,0.25); padding: 0.6rem 0.8rem; border-radius: 0.35rem; border-left: 3px solid #38bdf8;">
            ${focusDescriptions[plan.focus]}
          </p>
        </div>

        <div>
          <span class="career-kicker">2. Session Workload & Intensity</span>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem; margin-top: 0.6rem;">
            ${TRAINING_INTENSITIES.map(
              (
                i,
              ) => `<button type="button" class="career-swap-btn ${plan.intensity === i ? "active" : ""}" data-set-intensity="${i}" style="padding: 0.5rem 0.65rem; text-align: center;">
                ${roleName(i)}
              </button>`,
            ).join("")}
          </div>
          <p style="font-size: 0.78rem; color: #cbd5e1; margin-top: 0.65rem; background: rgba(0,0,0,0.25); padding: 0.6rem 0.8rem; border-radius: 0.35rem; border-left: 3px solid ${plan.intensity === "high" ? "#ef4444" : plan.intensity === "medium" ? "#38bdf8" : "#4ade80"};">
            ${intensityDescriptions[plan.intensity]}
          </p>
        </div>
      </div>

      <!-- Medical & Injury Room Card -->
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.65rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span class="career-kicker">Medical & Rehab Wing</span>
          <span style="font-size: 0.75rem; color: ${injuredCount > 0 ? "#f87171" : "#4ade80"}; font-weight: 700;">
            ${injuredCount > 0 ? `${injuredCount} Player${injuredCount > 1 ? "s" : ""} Sidelined` : "Squad Fully Fit"}
          </span>
        </div>

        ${
          injuredCount > 0
            ? `<div style="display: grid; gap: 0.5rem; overflow-y: auto; max-height: 280px;">
                ${club.squad
                  .filter((p) => p.injury !== null)
                  .map(
                    (p) => `
                  <div style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: 0.45rem; padding: 0.65rem 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <button type="button" class="career-link-btn" data-view-player="${p.id}" style="color:#f8fafc; font-weight: 750;">
                        ${escapeHtml(p.name)}
                      </button>
                      <div style="font-size: 0.72rem; color: #fca5a5; margin-top: 0.15rem;">
                        ${escapeHtml(p.injury!.type)} · <strong style="color: #cbd5e1;">${p.injury!.weeksRemaining} wk${p.injury!.weeksRemaining > 1 ? "s" : ""} remaining</strong>
                      </div>
                    </div>
                    <span class="group-tag" style="background:rgba(239,68,68,0.25); color:#fca5a5; font-size: 0.65rem;">${p.injury!.severity}</span>
                  </div>`,
                  )
                  .join("")}
              </div>`
            : `<div style="padding: 2rem 1rem; text-align: center; color: #94a3b8; font-size: 0.85rem; background: rgba(0,0,0,0.2); border-radius: 0.45rem;">
                <div style="font-size: 1.6rem; margin-bottom: 0.4rem;">🩺</div>
                All 23 registered squad players are currently healthy and available for selection.
              </div>`
        }

        <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid rgb(255 255 255 / 8%); font-size: 0.72rem; color: #94a3b8; line-height: 1.4;">
          Tip: Setting focus to <strong>Recovery</strong> accelerates rehab times and protects players from training fatigue.
        </div>
      </div>
    </div>
  </section>`;
};
