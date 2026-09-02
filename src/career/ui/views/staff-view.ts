import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import {
  FACILITY_EFFECTS,
  FACILITY_NAMES,
  FACILITY_UPGRADE_COSTS,
  STAFF_EFFECTS,
  STAFF_NAMES,
  STAFF_UPGRADE_COSTS,
  type Club,
  type FacilityType,
  type StaffRole,
} from "../../domain/index.ts";
import { formatMoney } from "../formatters.ts";

const STAFF_VIEW_STYLES = `
  .staff-card {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 0.6rem;
    padding: 1.15rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.85rem;
  }
`;

registerStyles("career-staff-view", STAFF_VIEW_STYLES);

export const renderStaffView = (club: Club): string => {
  const facilityKeys: FacilityType[] = ["gym", "trainingGround", "medicalRoom"];

  return `<div style="display: grid; gap: 1.5rem;">
    <!-- Coaching & Performance Staff Section -->
    <section class="career-section">
      <header style="flex-wrap: wrap;">
        <div>
          <span class="career-kicker">Coaching & Medical Department</span>
          <h2>${escapeHtml(club.name)} Performance Staff</h2>
        </div>
        <div style="font-size: 0.8rem; color: #94a3b8;">
          Total Staff Wages: <strong style="color: #f8fafc; font-family: ui-monospace, monospace;">${formatMoney(club.staff.reduce((s, m) => s + m.wage, 0))}/wk</strong>
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
        ${club.staff
          .map((member) => {
            const isMax = member.level >= 5;
            const nextLevel = member.level + 1;
            const upgradeCost = STAFF_UPGRADE_COSTS[nextLevel] ?? 0;
            const canAfford = club.balance >= upgradeCost;

            return `
            <div class="staff-card">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span class="career-kicker" style="color: #94a3b8;">${STAFF_NAMES[member.role]}</span>
                  <span class="group-tag" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">
                    Tier ${member.level} / 5
                  </span>
                </div>
                <h3 style="margin: 0.35rem 0 0.2rem; font-size: 1.1rem; color: #f8fafc;">
                  ${escapeHtml(member.name)}
                </h3>
                <div style="font-size: 0.74rem; color: #94a3b8; font-family: ui-monospace, monospace;">
                  Weekly Wage: <strong style="color: #cbd5e1;">${formatMoney(member.wage)}/wk</strong>
                </div>
                <p style="margin: 0.65rem 0 0; font-size: 0.78rem; color: #cbd5e1; line-height: 1.45;">
                  ${STAFF_EFFECTS[member.role]}
                </p>
              </div>

              <div style="padding-top: 0.75rem; border-top: 1px solid rgb(255 255 255 / 8%);">
                ${
                  isMax
                    ? `<span style="font-size: 0.75rem; color: #4ade80; font-weight: 700;">✓ Maximum Tier Reached</span>`
                    : `<button type="button" class="career-secondary-btn" data-upgrade-staff="${member.role}" ${!canAfford ? "disabled" : ""} style="width: 100%; font-size: 0.75rem; padding: 0.45rem 0.6rem;">
                        Recruit Tier ${nextLevel} (${formatMoney(upgradeCost)})
                      </button>`
                }
              </div>
            </div>`;
          })
          .join("")}
      </div>
    </section>

    <!-- Club Facilities Wing Section -->
    <section class="career-section">
      <header style="flex-wrap: wrap;">
        <div>
          <span class="career-kicker">Infrastructure & Facilities</span>
          <h2>Training & Medical Facilities</h2>
        </div>
        <div style="font-size: 0.8rem; color: #94a3b8;">
          Available Club Funds: <strong style="color: #38bdf8; font-family: ui-monospace, monospace;">${formatMoney(club.balance)}</strong>
        </div>
      </header>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
        ${facilityKeys
          .map((key) => {
            const level = club.facilities[key];
            const isMax = level >= 5;
            const nextLevel = level + 1;
            const upgradeCost = FACILITY_UPGRADE_COSTS[nextLevel] ?? 0;
            const canAfford = club.balance >= upgradeCost;

            return `
            <div class="staff-card">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span class="career-kicker" style="color: #94a3b8;">${FACILITY_NAMES[key]}</span>
                  <span class="group-tag" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.3);">
                    Level ${level} / 5
                  </span>
                </div>
                <h3 style="margin: 0.35rem 0 0.2rem; font-size: 1.15rem; color: #f8fafc;">
                  ${FACILITY_NAMES[key]}
                </h3>
                <p style="margin: 0.65rem 0 0; font-size: 0.78rem; color: #cbd5e1; line-height: 1.45;">
                  ${FACILITY_EFFECTS[key]}
                </p>
              </div>

              <div style="padding-top: 0.75rem; border-top: 1px solid rgb(255 255 255 / 8%);">
                ${
                  isMax
                    ? `<span style="font-size: 0.75rem; color: #4ade80; font-weight: 700;">✓ Maximum Level Reached</span>`
                    : `<button type="button" class="career-primary" data-upgrade-facility="${key}" ${!canAfford ? "disabled" : ""} style="width: 100%; font-size: 0.75rem; padding: 0.45rem 0.6rem;">
                        Upgrade to Level ${nextLevel} (${formatMoney(upgradeCost)})
                      </button>`
                }
              </div>
            </div>`;
          })
          .join("")}
      </div>
    </section>
  </div>`;
};
