import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import type { Club, LedgerCategory } from "../../domain/index.ts";
import { formatMoney } from "../formatters.ts";

const FINANCES_VIEW_STYLES = `
  .finance-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .finance-summary-card {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 0.55rem;
    padding: 1rem 1.15rem;
  }
`;

registerStyles("career-finances-view", FINANCES_VIEW_STYLES);

const categoryBadge = (cat: LedgerCategory) => {
  switch (cat) {
    case "matchIncome":
      return `<span class="group-tag" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.3);">Match Gate</span>`;
    case "playerWages":
      return `<span class="group-tag" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3);">Player Wages</span>`;
    case "staffWages":
      return `<span class="group-tag" style="background: rgba(234, 179, 8, 0.15); color: #facc15; border-color: rgba(234, 179, 8, 0.3);">Staff Wages</span>`;
    case "facilityUpgrade":
      return `<span class="group-tag" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">Facility Upgrade</span>`;
    case "staffRecruitment":
      return `<span class="group-tag" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border-color: rgba(168, 85, 247, 0.3);">Staff Recruit</span>`;
    default:
      return `<span class="group-tag" style="background: rgba(148, 163, 184, 0.1); color: #94a3b8;">Other</span>`;
  }
};

export const renderFinancesView = (club: Club): string => {
  const playerWages = club.squad.reduce((sum, p) => sum + p.wage, 0);
  const staffWages = club.staff.reduce((sum, s) => sum + s.wage, 0);
  const totalWeeklyExpenses = playerWages + staffWages;

  return `<section class="career-section">
    <header style="flex-wrap: wrap;">
      <div>
        <span class="career-kicker">Club Financial Operations</span>
        <h2>${escapeHtml(club.name)} Financial Statement</h2>
      </div>
      <div style="font-size: 0.85rem; color: #94a3b8;">
        Available Balance: <strong style="color: #38bdf8; font-family: ui-monospace, monospace; font-size: 1.15rem;">${formatMoney(club.balance)}</strong>
      </div>
    </header>

    <!-- Financial Cashflow & Operational Summary -->
    <div class="finance-summary-grid">
      <div class="finance-summary-card">
        <span class="career-kicker" style="font-size: 0.65rem;">Player Payroll</span>
        <strong style="display: block; font-size: 1.35rem; color: #f87171; font-family: ui-monospace, monospace; margin-top: 0.25rem;">
          -${formatMoney(playerWages)}<small style="font-size: 0.75rem; color: #94a3b8;">/wk</small>
        </strong>
        <span style="font-size: 0.74rem; color: #94a3b8;">${club.squad.length} contract players</span>
      </div>

      <div class="finance-summary-card">
        <span class="career-kicker" style="font-size: 0.65rem;">Staff Payroll</span>
        <strong style="display: block; font-size: 1.35rem; color: #facc15; font-family: ui-monospace, monospace; margin-top: 0.25rem;">
          -${formatMoney(staffWages)}<small style="font-size: 0.75rem; color: #94a3b8;">/wk</small>
        </strong>
        <span style="font-size: 0.74rem; color: #94a3b8;">${club.staff.length} coaching & medical staff</span>
      </div>

      <div class="finance-summary-card">
        <span class="career-kicker" style="font-size: 0.65rem;">Home Gate Estimate</span>
        <strong style="display: block; font-size: 1.35rem; color: #4ade80; font-family: ui-monospace, monospace; margin-top: 0.25rem;">
          +${formatMoney(Math.round(4200 * 18 * 0.72))}<small style="font-size: 0.75rem; color: #94a3b8;">/match</small>
        </strong>
        <span style="font-size: 0.74rem; color: #94a3b8;">Reputation ${club.reputation}/100</span>
      </div>

      <div class="finance-summary-card">
        <span class="career-kicker" style="font-size: 0.65rem;">Weekly Fixed Outgoings</span>
        <strong style="display: block; font-size: 1.35rem; color: #f87171; font-family: ui-monospace, monospace; margin-top: 0.25rem;">
          -${formatMoney(totalWeeklyExpenses)}<small style="font-size: 0.75rem; color: #94a3b8;">/wk</small>
        </strong>
        <span style="font-size: 0.74rem; color: #94a3b8;">Total weekly operations</span>
      </div>
    </div>

    <!-- Transaction Ledger Statement Table -->
    <div>
      <span class="career-kicker" style="margin-bottom: 0.6rem; display: block;">Transaction Ledger & Audit</span>
      <div class="career-table-wrap">
        <table class="career-table">
          <thead>
            <tr>
              <th style="width: 100px;">Date</th>
              <th style="width: 60px; text-align: center;">Round</th>
              <th style="width: 140px;">Category</th>
              <th>Description</th>
              <th style="text-align: right; width: 140px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${
              club.ledger.length === 0
                ? `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 2rem;">No financial transactions recorded yet this season.</td></tr>`
                : club.ledger
                    .map(
                      (tx) => `
                    <tr>
                      <td style="color: #94a3b8; font-size: 0.75rem;">${tx.date}</td>
                      <td style="text-align: center; color: #94a3b8;">Rd ${tx.round}</td>
                      <td>${categoryBadge(tx.category)}</td>
                      <td style="color: #cbd5e1; font-size: 0.8rem;">${escapeHtml(tx.description)}</td>
                      <td style="text-align: right; font-family: ui-monospace, monospace; font-weight: 700; color: ${tx.amount > 0 ? "#4ade80" : "#f87171"};">
                        ${tx.amount > 0 ? `+${formatMoney(tx.amount)}` : `-${formatMoney(Math.abs(tx.amount))}`}
                      </td>
                    </tr>`,
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  </section>`;
};
