import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import {
  COACHING_COURSES,
  type AttackStructurePreset,
  type Career,
  type Club,
  type CoachingCourseId,
  type DefenseStructurePreset,
  type KickPressurePreset,
  type MatchTempoPreset,
  type SetPieceFocusPreset,
} from "../../domain/index.ts";
import {
  getManagerLevel,
  getManagerPerks,
  getManagerReputationTier,
  getUnlockedTactics,
  isTacticsUnlocked,
} from "../../domain/manager.ts";

const MANAGER_STYLES = `
  .manager-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }
  .manager-card {
    background: linear-gradient(180deg, rgb(15 23 42 / 70%) 0%, rgb(15 23 42 / 90%) 100%);
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 0.65rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .manager-header-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .manager-xp-bar {
    background: rgba(0, 0, 0, 0.4);
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgb(255 255 255 / 8%);
  }
  .manager-xp-fill {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%);
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  .manager-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6rem;
    text-align: center;
  }
  .manager-stat-box {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgb(255 255 255 / 6%);
    border-radius: 0.4rem;
    padding: 0.5rem 0.4rem;
  }
  .manager-stat-box small {
    display: block;
    color: #94a3b8;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.2rem;
  }
  .manager-stat-box strong {
    font-size: 1rem;
    color: #f8fafc;
    font-family: ui-monospace, monospace;
  }
  .course-card {
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgb(255 255 255 / 8%);
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    transition: border-color 0.15s;
  }
  .course-card.completed {
    border-color: rgba(74, 222, 128, 0.3);
    background: rgba(22, 101, 52, 0.08);
  }
  .course-card.active {
    border-color: rgba(56, 189, 248, 0.4);
    background: rgba(14, 116, 144, 0.1);
  }
  .playbook-section {
    background: linear-gradient(180deg, rgb(15 23 42 / 70%) 0%, rgb(15 23 42 / 90%) 100%);
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 0.65rem;
    padding: 1.25rem;
    margin-top: 1.25rem;
  }
  .playbook-option-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.65rem;
    margin-top: 0.5rem;
  }
  .playbook-pill-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.75rem 0.85rem;
    border-radius: 0.45rem;
    border: 1px solid rgb(255 255 255 / 10%);
    background: rgba(0, 0, 0, 0.25);
    color: #cbd5e1;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
    width: 100%;
  }
  .playbook-pill-btn:hover:not(:disabled) {
    border-color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
  }
  .playbook-pill-btn.active {
    border-color: #38bdf8;
    background: rgba(56, 189, 248, 0.18);
    color: #f8fafc;
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.25);
  }
  .playbook-pill-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    border-style: dashed;
  }
  .playbook-pill-btn strong {
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    justify-content: space-between;
  }
  .playbook-pill-btn small {
    font-size: 0.72rem;
    color: #94a3b8;
    margin-top: 0.25rem;
    line-height: 1.35;
  }
`;

registerStyles("career-manager", MANAGER_STYLES);

export const renderManagerView = (career: Career, club: Club): string => {
  const mgr = career.manager;
  const levelInfo = getManagerLevel(mgr.xp);
  const repTier = getManagerReputationTier(mgr.reputation);
  const perks = getManagerPerks(mgr);
  const unlocked = getUnlockedTactics(mgr);

  const totalMatches = mgr.stats.matchesManaged;
  const winRate =
    totalMatches > 0 ? Math.round((mgr.stats.wins / totalMatches) * 100) : 0;

  return `<section class="career-section">
    <header>
      <div>
        <span class="career-kicker">Manager Career & Tactics</span>
        <h2>Manager Profile & Playbook</h2>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <span class="group-tag" style="background: #38bdf818; color: #38bdf8; border-color: #38bdf844; font-size: 0.82rem; padding: 0.3rem 0.65rem;">
          ${repTier.badge} · Rep ${mgr.reputation}/100
        </span>
      </div>
    </header>

    <!-- Top Dashboard: Profile & Career Stats -->
    <div class="manager-grid">
      <!-- Profile Card -->
      <div class="manager-card">
        <div class="manager-header-badge">
          <div>
            <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Manager</span>
            <h3 style="margin: 0; font-size: 1.25rem; color: #f8fafc;">${escapeHtml(mgr.name)}</h3>
            <span style="font-size: 0.82rem; color: #38bdf8; font-weight: 600;">${repTier.title}</span>
          </div>
          <div style="text-align: right;">
            <span class="group-tag" style="background: #818cf822; color: #a5b4fc; border-color: #818cf855; font-size: 0.95rem; font-weight: 800; padding: 0.35rem 0.75rem;">
              Level ${levelInfo.level}
            </span>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.35rem;">
            <span>Career XP</span>
            <span>${mgr.xp.toLocaleString()} / ${levelInfo.nextLevelXp.toLocaleString()} XP</span>
          </div>
          <div class="manager-xp-bar">
            <div class="manager-xp-fill" style="width: ${Math.round(levelInfo.progress * 100)}%;"></div>
          </div>
        </div>

        <!-- Active Perks Summary -->
        <div style="background: rgba(0,0,0,0.2); border: 1px solid rgb(255 255 255 / 6%); border-radius: 0.45rem; padding: 0.65rem 0.85rem; font-size: 0.78rem;">
          <span style="color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.35rem;">Active Coaching Perks</span>
          <div style="display: flex; flex-direction: column; gap: 0.25rem; color: #cbd5e1;">
            <div>📈 Squad Training: <strong style="color: #4ade80;">+${Math.round(perks.trainingBonusPct * 100)}%</strong></div>
            <div>⚡ Match XP Gain: <strong style="color: #38bdf8;">+${Math.round(perks.matchXpBonusPct * 100)}%</strong></div>
            <div>🛡️ Tactical Discipline: <strong style="color: #facc15;">+${perks.disciplineBonus}</strong></div>
          </div>
        </div>
      </div>

      <!-- Career Match Record -->
      <div class="manager-card">
        <div>
          <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Career Match Record</span>
          <h3 style="margin: 0; font-size: 1.1rem; color: #f8fafc;">Competitive Performance</h3>
        </div>

        <div class="manager-stats-grid">
          <div class="manager-stat-box">
            <small>Matches</small>
            <strong>${totalMatches}</strong>
          </div>
          <div class="manager-stat-box">
            <small>Record (W-D-L)</small>
            <strong style="color: #4ade80;">${mgr.stats.wins}</strong>-<strong style="color: #facc15;">${mgr.stats.draws}</strong>-<strong style="color: #f87171;">${mgr.stats.losses}</strong>
          </div>
          <div class="manager-stat-box">
            <small>Win Rate</small>
            <strong style="color: #38bdf8;">${winRate}%</strong>
          </div>
          <div class="manager-stat-box">
            <small>Points For</small>
            <strong style="color: #f8fafc;">${mgr.stats.pointsFor}</strong>
          </div>
          <div class="manager-stat-box">
            <small>Points Against</small>
            <strong style="color: #94a3b8;">${mgr.stats.pointsAgainst}</strong>
          </div>
          <div class="manager-stat-box">
            <small>Trophies</small>
            <strong style="color: #facc15;">🏆 ${mgr.stats.trophiesWon}</strong>
          </div>
        </div>

        <!-- Active Course Banner (if any) -->
        ${
          mgr.activeCourse
            ? (() => {
                const c = COACHING_COURSES[mgr.activeCourse.courseId];
                return `<div style="background: rgba(14, 116, 144, 0.2); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 0.45rem; padding: 0.75rem; font-size: 0.8rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <strong style="color: #38bdf8;">⏳ Active Study: ${escapeHtml(c.name)}</strong>
                    <span class="group-tag" style="background:#0284c7; color:#fff; font-size:0.7rem; padding:0.15rem 0.45rem;">${mgr.activeCourse.roundsRemaining} round${mgr.activeCourse.roundsRemaining > 1 ? "s" : ""} left</span>
                  </div>
                  <small style="color: #94a3b8;">Completing this course unlocks new tactical capabilities in your portable playbook.</small>
                </div>`;
              })()
            : `<div style="background: rgba(0,0,0,0.2); border: 1px dashed rgb(255 255 255 / 10%); border-radius: 0.45rem; padding: 0.75rem; text-align: center; color: #94a3b8; font-size: 0.8rem;">
                No active course in progress. Enroll in a qualification below to expand your tactical toolkit.
              </div>`
        }
      </div>
    </div>

    <!-- Section: Coaching Academy Qualifications -->
    <div style="margin-top: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.75rem;">
        <div>
          <span class="career-kicker">Professional Development</span>
          <h3 style="margin: 0; font-size: 1.15rem; color: #f8fafc;">Coaching Academy & Qualifications</h3>
        </div>
        <span style="font-size: 0.78rem; color: #94a3b8;">Club Balance: <strong style="color: #4ade80;">£${club.balance.toLocaleString()}</strong></span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.85rem;">
        ${(Object.keys(COACHING_COURSES) as CoachingCourseId[])
          .map((cId) => {
            const course = COACHING_COURSES[cId];
            const isCompleted = mgr.qualifications.includes(cId);
            const isActive = mgr.activeCourse?.courseId === cId;
            const meetsLevel = mgr.level >= course.levelRequired;
            const canAfford = club.balance >= course.cost;

            return `<div class="course-card ${isCompleted ? "completed" : isActive ? "active" : ""}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                <div>
                  <span style="font-size: 1.3rem; margin-right: 0.35rem;">${course.badge}</span>
                  <strong style="color: #f8fafc; font-size: 0.9rem;">${escapeHtml(course.name)}</strong>
                  <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.2rem;">
                    Category: <span style="color: #38bdf8;">${course.category}</span> · Req: <strong>Level ${course.levelRequired}</strong>
                  </div>
                </div>
                ${
                  isCompleted
                    ? `<span class="group-tag" style="background: #22c55e22; color: #4ade80; border-color: #22c55e55; font-size: 0.72rem; padding: 0.2rem 0.5rem;">🎓 Qualified</span>`
                    : isActive
                      ? `<span class="group-tag" style="background: #0284c722; color: #38bdf8; border-color: #0284c755; font-size: 0.72rem; padding: 0.2rem 0.5rem;">⏳ In Progress</span>`
                      : `<span style="font-size: 0.78rem; font-weight: 700; color: #f8fafc;">£${course.cost.toLocaleString()}</span>`
                }
              </div>

              <p style="margin: 0; font-size: 0.76rem; color: #cbd5e1; line-height: 1.4;">${escapeHtml(course.description)}</p>

              <div style="background: rgba(0,0,0,0.25); border-radius: 0.35rem; padding: 0.45rem 0.6rem; font-size: 0.72rem;">
                <span style="color: #94a3b8; display: block; margin-bottom: 0.2rem; font-size: 0.68rem; text-transform: uppercase;">Perks & Tactical Unlocks:</span>
                <ul style="margin: 0; padding-left: 1.1rem; color: #93c5fd;">
                  ${course.perks.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
                </ul>
              </div>

              <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                <small style="color: #94a3b8; font-size: 0.72rem;">Duration: ${course.roundsDuration} rounds</small>
                ${
                  isCompleted
                    ? `<span style="font-size: 0.75rem; color: #4ade80; font-weight: 600;">✓ Completed</span>`
                    : isActive
                      ? `<span style="font-size: 0.75rem; color: #38bdf8; font-weight: 600;">${mgr.activeCourse?.roundsRemaining} rounds remaining</span>`
                      : !meetsLevel
                        ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.72rem; padding: 0.3rem 0.6rem;">🔒 Req Level ${course.levelRequired}</button>`
                        : mgr.activeCourse !== null
                          ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.72rem; padding: 0.3rem 0.6rem;">Course in Progress</button>`
                          : !canAfford
                            ? `<button type="button" class="career-secondary-btn" disabled style="font-size: 0.72rem; padding: 0.3rem 0.6rem;">Insufficient Funds</button>`
                            : `<button type="button" class="career-primary-btn" data-enroll-course="${course.id}" style="font-size: 0.75rem; padding: 0.35rem 0.8rem;">
                                Enroll (£${course.cost.toLocaleString()})
                              </button>`
                }
              </div>
            </div>`;
          })
          .join("")}
      </div>
    </div>

    <!-- Section: Portable Tactical Playbook -->
    <div class="playbook-section">
      <div style="margin-bottom: 1rem;">
        <span class="career-kicker">Manager's Toolkit</span>
        <h3 style="margin: 0; font-size: 1.2rem; color: #f8fafc;">Portable Tactical Playbook</h3>
        <p style="margin: 0.25rem 0 0; font-size: 0.8rem; color: #94a3b8;">
          Your strategic philosophy and playbook structures are portable across clubs. Tactics unlocked through your coaching qualifications are available instantly.
        </p>
      </div>

      <!-- Pillar 1: Attack Phase Structure -->
      <div style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <strong style="color: #f8fafc; font-size: 0.88rem;">1. Attack Phase Play Structure</strong>
          <span style="font-size: 0.72rem; color: #38bdf8;">Current: <strong>${mgr.playbook.attackStructure.replace(/_/g, " ").toUpperCase()}</strong></span>
        </div>
        <div class="playbook-option-group">
          ${renderPlaybookOption(
            "attackStructure",
            "standard",
            "Standard Balanced",
            "Balanced phase play with fluid forward support and standard wide distribution.",
            mgr.playbook.attackStructure === "standard",
            unlocked.attackStructures.has("standard"),
          )}
          ${renderPlaybookOption(
            "attackStructure",
            "pod_1_3_3_1",
            "1-3-3-1 Forward Pods",
            "Tight dual pods create continuous forward momentum and quick ball off 9.",
            mgr.playbook.attackStructure === "pod_1_3_3_1",
            unlocked.attackStructures.has("pod_1_3_3_1"),
            "⚡ Attack Architecture",
          )}
          ${renderPlaybookOption(
            "attackStructure",
            "pod_2_4_2",
            "2-4-2 Wide Pods",
            "Wide spacing stretches defensive lines with agile flankers roaming the tramlines.",
            mgr.playbook.attackStructure === "pod_2_4_2",
            unlocked.attackStructures.has("pod_2_4_2"),
            "⚡ Attack Architecture",
          )}
          ${renderPlaybookOption(
            "attackStructure",
            "wide_spread",
            "Wide Spread Architecture",
            "High-risk, expansive width with rapid backline recycling across both touchlines.",
            mgr.playbook.attackStructure === "wide_spread",
            unlocked.attackStructures.has("wide_spread"),
            "🏆 Elite Director",
          )}
        </div>
      </div>

      <!-- Pillar 2: Defensive System -->
      <div style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <strong style="color: #f8fafc; font-size: 0.88rem;">2. Defensive System & Line Press</strong>
          <span style="font-size: 0.72rem; color: #38bdf8;">Current: <strong>${mgr.playbook.defenseStructure.replace(/_/g, " ").toUpperCase()}</strong></span>
        </div>
        <div class="playbook-option-group">
          ${renderPlaybookOption(
            "defenseStructure",
            "drift",
            "Drift Containment",
            "Disciplined connected drift that slides outward to use the touchline as an extra defender.",
            mgr.playbook.defenseStructure === "drift",
            unlocked.defenseStructures.has("drift"),
          )}
          ${renderPlaybookOption(
            "defenseStructure",
            "blitz",
            "High-Pressure Blitz",
            "Aggressive line-speed rushing the first receiver to force handling errors and turnovers.",
            mgr.playbook.defenseStructure === "blitz",
            unlocked.defenseStructures.has("blitz"),
            "🛡️ Defense Mastermind",
          )}
          ${renderPlaybookOption(
            "defenseStructure",
            "pendulum_cover",
            "Pendulum Backfield Cover",
            "Back three pendulum system preventing chip kicks and territory breaches.",
            mgr.playbook.defenseStructure === "pendulum_cover",
            unlocked.defenseStructures.has("pendulum_cover"),
            "🛡️ Defense Mastermind",
          )}
          ${renderPlaybookOption(
            "defenseStructure",
            "aggressive_rush",
            "Aggressive Rush Defense",
            "Maximum line speed with fierce tackle pressure on opposing playmakers.",
            mgr.playbook.defenseStructure === "aggressive_rush",
            unlocked.defenseStructures.has("aggressive_rush"),
            "🛡️ Defense Mastermind",
          )}
        </div>
      </div>

      <!-- Pillar 3: Set Piece Focus -->
      <div style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <strong style="color: #f8fafc; font-size: 0.88rem;">3. Set Piece & Penalty Strategy</strong>
          <span style="font-size: 0.72rem; color: #38bdf8;">Current: <strong>${mgr.playbook.setPieceFocus.replace(/_/g, " ").toUpperCase()}</strong></span>
        </div>
        <div class="playbook-option-group">
          ${renderPlaybookOption(
            "setPieceFocus",
            "balanced",
            "Balanced Set Piece",
            "Standard scrum/lineout options with situational territorial kicking.",
            mgr.playbook.setPieceFocus === "balanced",
            unlocked.setPieceFocuses.has("balanced"),
          )}
          ${renderPlaybookOption(
            "setPieceFocus",
            "quick_tap",
            "Quick Tap & Go",
            "Catch defenses unorganized by tapping immediately from penalty marks.",
            mgr.playbook.setPieceFocus === "quick_tap",
            unlocked.setPieceFocuses.has("quick_tap"),
            "🏉 Set-Piece Mastery",
          )}
          ${renderPlaybookOption(
            "setPieceFocus",
            "maul_drive",
            "Rolling Maul Drive",
            "Power into 5m corners and execute disciplined forward rolling mauls.",
            mgr.playbook.setPieceFocus === "maul_drive",
            unlocked.setPieceFocuses.has("maul_drive"),
            "🏉 Set-Piece Mastery",
          )}
          ${renderPlaybookOption(
            "setPieceFocus",
            "territory_boot",
            "Territory Boot & Chase",
            "Tactical kicking pinning opposition deep in their 22 with relentless chase.",
            mgr.playbook.setPieceFocus === "territory_boot",
            unlocked.setPieceFocuses.has("territory_boot"),
            "🏉 Set-Piece Mastery",
          )}
        </div>
      </div>

      <!-- Pillar 4 & 5: Kicking Pressure & Match Tempo -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
        <!-- Kicking Pressure -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="color: #f8fafc; font-size: 0.88rem;">4. Kicking Preference</strong>
            <span style="font-size: 0.72rem; color: #38bdf8;">Current: <strong>${mgr.playbook.kickPressure.toUpperCase()}</strong></span>
          </div>
          <div class="playbook-option-group">
            ${renderPlaybookOption(
              "kickPressure",
              "low",
              "Run / Keep Ball in Hand",
              "Emphasize carrying and phase passing over kicking.",
              mgr.playbook.kickPressure === "low",
              true,
            )}
            ${renderPlaybookOption(
              "kickPressure",
              "standard",
              "Standard Balance",
              "Balanced situational kicking on 3rd+ phase.",
              mgr.playbook.kickPressure === "standard",
              true,
            )}
            ${renderPlaybookOption(
              "kickPressure",
              "high",
              "Territorial Kicking",
              "High kick frequency to win field position battle.",
              mgr.playbook.kickPressure === "high",
              true,
            )}
          </div>
        </div>

        <!-- Match Tempo -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="color: #f8fafc; font-size: 0.88rem;">5. Match Play Tempo</strong>
            <span style="font-size: 0.72rem; color: #38bdf8;">Current: <strong>${mgr.playbook.tempo.replace(/_/g, " ").toUpperCase()}</strong></span>
          </div>
          <div class="playbook-option-group">
            ${renderPlaybookOption(
              "tempo",
              "controlled",
              "Controlled & Patient",
              "Methodical buildup with high ball retention discipline.",
              mgr.playbook.tempo === "controlled",
              true,
            )}
            ${renderPlaybookOption(
              "tempo",
              "balanced",
              "Standard Rhythm",
              "Adapt tempo to game state and field position.",
              mgr.playbook.tempo === "balanced",
              true,
            )}
            ${renderPlaybookOption(
              "tempo",
              "high_tempo",
              "High-Octane Pace",
              "Rapid ruck recycling and maximum line speed.",
              mgr.playbook.tempo === "high_tempo",
              true,
            )}
          </div>
        </div>
      </div>
    </div>
  </section>`;
};

function renderPlaybookOption(
  setting: string,
  value: string,
  title: string,
  desc: string,
  isActive: boolean,
  isUnlocked: boolean,
  lockRequirement?: string,
): string {
  return `<button type="button"
    class="playbook-pill-btn ${isActive ? "active" : ""}"
    data-playbook-setting="${setting}"
    data-playbook-value="${value}"
    ${!isUnlocked ? "disabled" : ""}
  >
    <strong>
      <span>${escapeHtml(title)}</span>
      ${
        isActive
          ? `<span style="color: #38bdf8; font-size: 0.75rem;">● Active</span>`
          : !isUnlocked
            ? `<span style="color: #f87171; font-size: 0.7rem;">🔒 ${escapeHtml(lockRequirement ?? "Locked")}</span>`
            : ""
      }
    </strong>
    <small>${escapeHtml(desc)}</small>
  </button>`;
}
