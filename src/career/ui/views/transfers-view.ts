import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import {
  ROLE_GROUPS,
  type Career,
  type Club,
  type Player,
  type PlayerRole,
} from "../../domain/index.ts";
import {
  calculatePlayerMarketValue,
  generateScoutingReport,
} from "../../domain/transfers.ts";
import { formatMoney, getOvrClass, getPlayerOverall } from "../formatters.ts";

const TRANSFERS_STYLES = `
  .transfers-header-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.85rem;
    margin-bottom: 1.25rem;
  }
  .transfers-kpi-card {
    background: linear-gradient(180deg, rgb(15 23 42 / 70%) 0%, rgb(15 23 42 / 90%) 100%);
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 0.55rem;
    padding: 0.9rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .transfers-kpi-card small {
    color: #94a3b8;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .transfers-kpi-card strong {
    font-size: 1.3rem;
    color: #f8fafc;
    font-family: ui-monospace, monospace;
  }
  .transfers-nav-tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 1px solid rgb(255 255 255 / 12%);
    padding-bottom: 0.75rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }
  .transfers-nav-tabs button {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgb(255 255 255 / 10%);
    color: #94a3b8;
    border-radius: 0.4rem;
    padding: 0.45rem 0.9rem;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .transfers-nav-tabs button.active {
    background: #0284c7;
    border-color: #38bdf8;
    color: #ffffff;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
  }
  .transfers-nav-tabs button:hover:not(.active) {
    background: #1e293b;
    color: #f8fafc;
  }
  .transfer-filter-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .transfer-filter-row select, .transfer-filter-row input {
    background: #0f172a;
    border: 1px solid rgb(255 255 255 / 15%);
    color: #f8fafc;
    border-radius: 0.35rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }
  .scout-badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.45rem;
    border-radius: 0.35rem;
    font-size: 0.7rem;
    font-weight: 700;
    border: 1px solid transparent;
  }
`;

registerStyles("career-transfers", TRANSFERS_STYLES);

export type TransfersSubTab =
  "freeAgents" | "squadContracts" | "leagueMarket" | "academy";

export const renderTransfersView = (
  career: Career,
  club: Club,
  activeSubTab: TransfersSubTab = "freeAgents",
  roleFilter: string = "all",
): string => {
  const scout = club.staff.find((s) => s.role === "chiefScout");
  const scoutLevel = scout?.level ?? 1;
  const isSquadFull = club.squad.length >= 40;
  const totalWeeklyWages = club.squad.reduce((sum, p) => sum + p.wage, 0);

  return `<section class="career-section">
    <header>
      <div>
        <span class="career-kicker">Recruitment & Roster Management</span>
        <h2>Transfers & Scouting Network</h2>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <span class="group-tag" style="background: ${isSquadFull ? "#ef444422" : "#22c55e22"}; color: ${isSquadFull ? "#f87171" : "#4ade80"}; border-color: ${isSquadFull ? "#ef444455" : "#22c55e55"}; font-size: 0.82rem; padding: 0.3rem 0.65rem;">
          ${club.squad.length} / 40 Senior Squad ${isSquadFull ? "(FULL)" : `(${40 - club.squad.length} Available)`}
        </span>
      </div>
    </header>

    <!-- Top KPI Row -->
    <div class="transfers-header-grid">
      <div class="transfers-kpi-card">
        <small>Transfer & Wage Funds</small>
        <strong style="color: #4ade80;">£${club.balance.toLocaleString()}</strong>
        <span style="font-size: 0.72rem; color: #94a3b8;">Weekly Wages: £${totalWeeklyWages.toLocaleString()}/wk</span>
      </div>

      <div class="transfers-kpi-card">
        <small>Chief Scout Network</small>
        <div style="display: flex; align-items: baseline; gap: 0.4rem;">
          <strong style="color: #38bdf8;">Lvl ${scoutLevel}</strong>
          <span style="font-size: 0.78rem; color: #cbd5e1;">${escapeHtml(scout?.name ?? "Recruiter")}</span>
        </div>
        <span style="font-size: 0.72rem; color: #94a3b8;">
          Scouting Accuracy: <strong style="color: #38bdf8;">${Math.round((0.4 + scoutLevel * 0.12) * 100)}%</strong>
        </span>
      </div>

      <div class="transfers-kpi-card">
        <small>Market Pool</small>
        <strong style="color: #facc15;">${career.freeAgents.length} Free Agents</strong>
        <span style="font-size: 0.72rem; color: #94a3b8;">Academy: ${club.academySquad.length} Prospects</span>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div class="transfers-nav-tabs">
      <button type="button" class="${activeSubTab === "freeAgents" ? "active" : ""}" data-transfers-tab="freeAgents">
        Free Agent Market (${career.freeAgents.length})
      </button>
      <button type="button" class="${activeSubTab === "squadContracts" ? "active" : ""}" data-transfers-tab="squadContracts">
        My Squad Contracts (${club.squad.length}/40)
      </button>
      <button type="button" class="${activeSubTab === "academy" ? "active" : ""}" data-transfers-tab="academy">
        Youth Academy (${club.academySquad.length})
      </button>
      <button type="button" class="${activeSubTab === "leagueMarket" ? "active" : ""}" data-transfers-tab="leagueMarket">
        Rival Club Targets
      </button>
    </div>

    <!-- Active Tab Content -->
    ${
      activeSubTab === "freeAgents"
        ? renderFreeAgentsTab(career, club, scoutLevel, roleFilter)
        : activeSubTab === "squadContracts"
          ? renderSquadContractsTab(career, club)
          : activeSubTab === "academy"
            ? renderAcademyTab(career, club)
            : renderLeagueMarketTab(career, club, scoutLevel)
    }
  </section>`;
};

function renderFreeAgentsTab(
  career: Career,
  club: Club,
  scoutLevel: number,
  roleFilter: string,
): string {
  const isSquadFull = club.squad.length >= 40;

  const filtered = career.freeAgents.filter((p) => {
    if (roleFilter === "all") return true;
    const group = ROLE_GROUPS[p.role as PlayerRole] ?? "centre";
    return group === roleFilter || p.role === roleFilter;
  });

  return `<div>
    <div class="transfer-filter-row">
      <span style="font-size: 0.78rem; color: #94a3b8;">Filter by Position:</span>
      <select data-filter-free-agents style="font-size: 0.75rem;">
        <option value="all" ${roleFilter === "all" ? "selected" : ""}>All Positions (${career.freeAgents.length})</option>
        <option value="prop" ${roleFilter === "prop" ? "selected" : ""}>Props</option>
        <option value="hooker" ${roleFilter === "hooker" ? "selected" : ""}>Hookers</option>
        <option value="lock" ${roleFilter === "lock" ? "selected" : ""}>Locks</option>
        <option value="backRow" ${roleFilter === "backRow" ? "selected" : ""}>Back Row</option>
        <option value="scrumHalf" ${roleFilter === "scrumHalf" ? "selected" : ""}>Scrum Halves</option>
        <option value="flyHalf" ${roleFilter === "flyHalf" ? "selected" : ""}>Fly Halves</option>
        <option value="centre" ${roleFilter === "centre" ? "selected" : ""}>Centres</option>
        <option value="outsideBack" ${roleFilter === "outsideBack" ? "selected" : ""}>Outside Backs</option>
      </select>
    </div>

    <div class="career-table-wrap">
      <table class="career-table">
        <thead>
          <tr>
            <th>Player Name</th>
            <th>Role</th>
            <th style="text-align: center;">Age</th>
            <th style="text-align: center;">OVR / Estimate</th>
            <th style="text-align: center;">Potential</th>
            <th style="text-align: right;">Wage Demand</th>
            <th style="text-align: right;">Signing Bonus</th>
            <th style="text-align: right; width: 190px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            filtered.length === 0
              ? `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 2rem;">No free agents found in this category.</td></tr>`
              : filtered
                  .map((p) => {
                    const exactOvr = getPlayerOverall(p);
                    const report = career.scoutingReports[p.id];
                    const isScouted = report !== undefined;

                    const ovrDisplay = isScouted
                      ? scoutLevel >= 4
                        ? `<span class="player-ovr-badge ${getOvrClass(exactOvr)}">${exactOvr}</span>`
                        : `<span class="player-ovr-badge ovr-mid">${report.ovrMin}-${report.ovrMax}</span>`
                      : `<span class="player-ovr-badge ovr-mid">? ~${Math.round(exactOvr / 5) * 5}</span>`;

                    const potDisplay = isScouted
                      ? `<span class="scout-badge-pill" style="background: #0284c722; color: #38bdf8; border-color: #0284c755;">★ ${report.potentialMin}-${report.potentialMax}</span>`
                      : `<span style="color: #64748b; font-size: 0.72rem;">Unscouted</span>`;

                    const signingBonus = Math.round(p.wage * 2);
                    const canAffordBonus = club.balance >= signingBonus;

                    return `<tr>
                      <td>
                        <button type="button" class="career-link-btn" data-view-player="${p.id}">
                          <strong>${escapeHtml(p.name)}</strong>
                        </button>
                        ${isScouted ? `<small style="display:block; color:#94a3b8; font-size:0.68rem;">Scouted: ${report.strengths[0]}</small>` : ""}
                      </td>
                      <td style="font-size: 0.75rem; color: #94a3b8;">${escapeHtml(p.role)}</td>
                      <td style="text-align: center;">${p.age}</td>
                      <td style="text-align: center;">${ovrDisplay}</td>
                      <td style="text-align: center;">${potDisplay}</td>
                      <td style="text-align: right; font-family: ui-monospace, monospace; color: #f8fafc;">£${p.wage.toLocaleString()}/wk</td>
                      <td style="text-align: right; font-family: ui-monospace, monospace; color: #94a3b8;">£${signingBonus.toLocaleString()}</td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                          ${
                            !isScouted
                              ? `<button type="button" class="career-secondary-btn" data-scout-player="${p.id}" style="font-size: 0.72rem; padding: 0.25rem 0.5rem;" title="Send Chief Scout to evaluate this player">
                                  🔍 Scout
                                </button>`
                              : `<span style="font-size: 0.7rem; color: #4ade80; align-self: center; margin-right: 0.25rem;">✓ Scouted</span>`
                          }
                          ${
                            isSquadFull
                              ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.72rem; padding: 0.25rem 0.5rem;" title="Squad is full (40 players max)">
                                  Squad Full
                                </button>`
                              : !canAffordBonus
                                ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.72rem; padding: 0.25rem 0.5rem;">
                                    Funds Low
                                  </button>`
                                : `<button type="button" class="career-primary-btn" data-sign-free-agent="${p.id}" data-wage="${p.wage}" data-bonus="${signingBonus}" style="font-size: 0.72rem; padding: 0.25rem 0.6rem;">
                                    ✍️ Sign
                                  </button>`
                          }
                        </div>
                      </td>
                    </tr>`;
                  })
                  .join("")
          }
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderSquadContractsTab(career: Career, club: Club): string {
  return `<div>
    <div style="margin-bottom: 0.75rem; font-size: 0.8rem; color: #94a3b8;">
      Review active contracts, market valuations, and manage roster capacity. Releasing a player pays a 4-week severance fee to free up squad space.
    </div>

    <div class="career-table-wrap">
      <table class="career-table">
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">#</th>
            <th>Player Name</th>
            <th>Position</th>
            <th style="text-align: center;">Age</th>
            <th style="text-align: center;">OVR</th>
            <th style="text-align: center;">Contract</th>
            <th style="text-align: right;">Weekly Wage</th>
            <th style="text-align: right;">Market Value</th>
            <th style="text-align: right; width: 140px;">Roster Actions</th>
          </tr>
        </thead>
        <tbody>
          ${club.squad
            .map((p, index) => {
              const ovr = getPlayerOverall(p);
              const mktVal = calculatePlayerMarketValue(p);
              const severanceCost = p.wage * 4;
              const canAffordSeverance = club.balance >= severanceCost;

              return `<tr>
                <td style="text-align: center; font-size: 0.72rem; color: #64748b;">${index + 1}</td>
                <td>
                  <button type="button" class="career-link-btn" data-view-player="${p.id}">
                    <strong>${escapeHtml(p.name)}</strong>
                  </button>
                  ${p.injury ? `<span style="color:#f87171; font-size:0.68rem; margin-left:0.3rem;">(${p.injury.type})</span>` : ""}
                </td>
                <td style="font-size: 0.75rem; color: #94a3b8;">${escapeHtml(p.role)}</td>
                <td style="text-align: center;">${p.age}</td>
                <td style="text-align: center;">
                  <span class="player-ovr-badge ${getOvrClass(ovr)}">${ovr}</span>
                </td>
                <td style="text-align: center; font-weight: 600; color: ${p.contractYears <= 1 ? "#facc15" : "#4ade80"};">
                  ${p.contractYears} yr${p.contractYears !== 1 ? "s" : ""}
                </td>
                <td style="text-align: right; font-family: ui-monospace, monospace; color: #f8fafc;">£${p.wage.toLocaleString()}/wk</td>
                <td style="text-align: right; font-family: ui-monospace, monospace; color: #38bdf8;">£${mktVal.toLocaleString()}</td>
                <td style="text-align: right;">
                  ${
                    club.squad.length <= 23
                      ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">Min Squad</button>`
                      : !canAffordSeverance
                        ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">No Funds</button>`
                        : `<button type="button" class="career-swap-btn" data-release-player="${p.id}" data-player-name="${escapeHtml(p.name)}" data-severance="${severanceCost}" style="color: #f87171; font-size: 0.72rem; padding: 0.25rem 0.55rem;" title="Pay £${severanceCost.toLocaleString()} severance to release">
                            ❌ Release
                          </button>`
                  }
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderAcademyTab(career: Career, club: Club): string {
  const isSquadFull = club.squad.length >= 40;
  const academyLvl = club.facilities.academy ?? 1;
  const dir = club.staff.find((s) => s.role === "academyDirector");

  return `<div>
    <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgb(255 255 255 / 8%); border-radius: 0.55rem; padding: 1rem; margin-bottom: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <span class="career-kicker" style="color: #38bdf8;">Youth Development Setup</span>
          <h3 style="margin: 0.2rem 0; font-size: 1.1rem; color: #f8fafc;">Academy Infrastructure</h3>
          <p style="margin: 0; font-size: 0.78rem; color: #94a3b8;">
            Academy Level ${academyLvl}/5 · Head of Youth: <strong>${escapeHtml(dir?.name ?? "Academy Staff")}</strong> (Lvl ${dir?.level ?? 1})
          </p>
        </div>
        <span style="font-size: 0.75rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 0.4rem 0.75rem; border-radius: 0.35rem;">
          Annual Intake arrives at start of every new season.
        </span>
      </div>
    </div>

    <div class="career-table-wrap">
      <table class="career-table">
        <thead>
          <tr>
            <th>Prospect Name</th>
            <th>Role</th>
            <th style="text-align: center;">Age</th>
            <th style="text-align: center;">OVR</th>
            <th style="text-align: center;">Potential</th>
            <th style="text-align: center;">Speed</th>
            <th style="text-align: center;">Power</th>
            <th style="text-align: right; width: 170px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            club.academySquad.length === 0
              ? `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 2.5rem;">No youth prospects currently in the academy. New intake arrives at season rollover.</td></tr>`
              : club.academySquad
                  .map((p) => {
                    const ovr = getPlayerOverall(p);
                    const pot = p.potential ?? 80;

                    return `<tr>
                      <td>
                        <button type="button" class="career-link-btn" data-view-player="${p.id}">
                          <strong>${escapeHtml(p.name)}</strong>
                        </button>
                      </td>
                      <td style="font-size: 0.75rem; color: #94a3b8;">${escapeHtml(p.role)}</td>
                      <td style="text-align: center; font-weight: 700; color: #38bdf8;">${p.age}</td>
                      <td style="text-align: center;">
                        <span class="player-ovr-badge ${getOvrClass(ovr)}">${ovr}</span>
                      </td>
                      <td style="text-align: center;">
                        <span class="scout-badge-pill" style="background: #22c55e22; color: #4ade80; border-color: #22c55e55;">
                          ★ ${pot} POT
                        </span>
                      </td>
                      <td style="text-align: center; font-family: ui-monospace, monospace;">${p.speed}</td>
                      <td style="text-align: center; font-family: ui-monospace, monospace;">${p.strength}</td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                          ${
                            isSquadFull
                              ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.7rem; padding: 0.25rem 0.5rem;" title="Senior squad is full (40 max)">
                                  Squad Full
                                </button>`
                              : `<button type="button" class="career-primary-btn" data-promote-youth="${p.id}" style="font-size: 0.72rem; padding: 0.25rem 0.6rem;">
                                  🌟 Promote
                                </button>`
                          }
                          <button type="button" class="career-swap-btn" data-dismiss-youth="${p.id}" style="font-size: 0.72rem; padding: 0.25rem 0.45rem; color: #94a3b8;" title="Dismiss prospect from academy">
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>`;
                  })
                  .join("")
          }
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderLeagueMarketTab(
  career: Career,
  club: Club,
  scoutLevel: number,
): string {
  const isSquadFull = club.squad.length >= 40;
  const rivalClubs = career.season.clubs.filter((c) => c.id !== club.id);

  return `<div>
    <div style="margin-bottom: 0.75rem; font-size: 0.8rem; color: #94a3b8;">
      Scout and submit transfer fee bids for contracted players at rival clubs in the National Club League.
    </div>

    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      ${rivalClubs
        .map((rival) => {
          return `<div style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgb(255 255 255 / 8%); border-radius: 0.55rem; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="player-num-badge" style="background: ${rival.color}; width: 14px; height: 14px;"></span>
                <strong style="color: #f8fafc; font-size: 0.95rem;">${escapeHtml(rival.name)}</strong>
                <span style="font-size: 0.72rem; color: #94a3b8;">(Rep: ${rival.reputation} · Squad: ${rival.squad.length})</span>
              </div>
            </div>

            <div class="career-table-wrap">
              <table class="career-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Role</th>
                    <th style="text-align: center;">Age</th>
                    <th style="text-align: center;">OVR</th>
                    <th style="text-align: right;">Wage</th>
                    <th style="text-align: right;">Est. Market Value</th>
                    <th style="text-align: right; width: 180px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${rival.squad
                    .slice(0, 8)
                    .map((p, idx) => {
                      const ovr = getPlayerOverall(p);
                      const mktVal = calculatePlayerMarketValue(p);
                      const isStarter = idx < 15;
                      const suggestedBid = isStarter
                        ? Math.round(mktVal * 1.3)
                        : mktVal;
                      const report = career.scoutingReports[p.id];
                      const isScouted = report !== undefined;

                      return `<tr>
                        <td>
                          <button type="button" class="career-link-btn" data-view-player="${p.id}">
                            <strong>${escapeHtml(p.name)}</strong>
                          </button>
                        </td>
                        <td style="font-size: 0.75rem; color: #94a3b8;">${escapeHtml(p.role)}</td>
                        <td style="text-align: center;">${p.age}</td>
                        <td style="text-align: center;">
                          <span class="player-ovr-badge ${getOvrClass(ovr)}">${ovr}</span>
                        </td>
                        <td style="text-align: right; font-family: ui-monospace, monospace; color: #94a3b8;">£${p.wage.toLocaleString()}/wk</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace; color: #38bdf8;">£${mktVal.toLocaleString()}</td>
                        <td style="text-align: right;">
                          <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                            ${
                              !isScouted
                                ? `<button type="button" class="career-secondary-btn" data-scout-player="${p.id}" style="font-size: 0.7rem; padding: 0.2rem 0.45rem;">
                                    🔍 Scout
                                  </button>`
                                : `<span style="font-size: 0.68rem; color: #4ade80; align-self: center;">✓ Scouted</span>`
                            }
                            ${
                              isSquadFull
                                ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.7rem; padding: 0.2rem 0.45rem;">Full</button>`
                                : club.balance < suggestedBid
                                  ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.7rem; padding: 0.2rem 0.45rem;">Low Funds</button>`
                                  : `<button type="button" class="career-primary-btn" data-bid-player="${p.id}" data-target-club="${rival.id}" data-suggested-fee="${suggestedBid}" data-wage="${Math.round(p.wage * 1.1)}" style="font-size: 0.7rem; padding: 0.2rem 0.55rem;">
                                      💼 Bid £${Math.round(suggestedBid / 1000)}k
                                    </button>`
                            }
                          </div>
                        </td>
                      </tr>`;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>`;
        })
        .join("")}
    </div>
  </div>`;
}
