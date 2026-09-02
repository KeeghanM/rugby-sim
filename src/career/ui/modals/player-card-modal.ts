import { escapeHtml } from "../../../html.ts";
import { createWindow, registerStyles } from "../../../ui/index.ts";
import type { Club, Player } from "../../domain/index.ts";
import { formatDist, getOvrClass, getPlayerOverall } from "../formatters.ts";
import { roleName } from "../../domain/index.ts";
import { SLOT_NAMES } from "../types.ts";

const PLAYER_CARD_STYLES = `
  .player-shirt {
    display: grid;
    place-items: center;
    background: var(--team-color);
    clip-path: polygon(18% 0, 35% 10%, 65% 10%, 82% 0, 100% 24%, 85% 38%, 80% 100%, 20% 100%, 15% 38%, 0 24%);
    color: white;
    font: 900 1.45rem Georgia, serif;
  }
`;

registerStyles("career-player-card", PLAYER_CARD_STYLES);

export const renderSkillBar = (
  label: string,
  value: number,
  color = "#38bdf8",
): string => `
  <div style="display: grid; grid-template-columns: 140px 1fr 36px; gap: 0.75rem; align-items: center; font-size: 0.75rem;">
    <span style="color: #cbd5e1; font-weight: 600;">${label}</span>
    <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
      <div style="width: ${value}%; height: 100%; background: ${color}; border-radius: 3px;"></div>
    </div>
    <span style="font-family: ui-monospace, monospace; font-weight: 700; color: #f8fafc; text-align: right;">${value}</span>
  </div>`;

export const renderPlayerCardModal = (
  player: Player,
  club: Club,
  slotIndex?: number,
): string => {
  const ovr = getPlayerOverall(player);
  const decision = Math.round(
    Math.min(99, player.attack * 0.5 + player.defence * 0.5),
  );
  const handling = Math.round(Math.min(99, player.attack * 0.9 + 5));
  const passing = Math.round(Math.min(99, player.attack * 0.85 + 8));
  const kicking = Math.round(Math.min(99, player.attack * 0.8 + 12));
  const tackling = Math.round(Math.min(99, player.defence * 0.95 + 4));

  const slotInfo =
    slotIndex !== undefined
      ? `#${slotIndex + 1} ${SLOT_NAMES[slotIndex]}`
      : roleName(player.role);

  const rec = player.careerRecord;
  const totalTackles = rec.tacklesMade + rec.tacklesMissed;
  const tacklePct =
    totalTackles > 0 ? Math.round((rec.tacklesMade / totalTackles) * 100) : 0;
  const passPct =
    rec.totalPasses > 0
      ? Math.round((rec.successfulPasses / rec.totalPasses) * 100)
      : 0;
  const kickPct =
    rec.totalKicks > 0
      ? Math.round((rec.successfulKicks / rec.totalKicks) * 100)
      : 0;

  const customHeader = `
    <div style="display: flex; align-items: center; gap: 0.85rem;">
      <div class="player-shirt" style="--team-color:${club.color}; width: 3.2rem; height: 2.8rem; font-size: 1.1rem; margin: 0;">
        <span>${slotIndex !== undefined ? slotIndex + 1 : ""}</span>
      </div>
      <div>
        <span class="career-kicker">${escapeHtml(club.name)} · Player Profile</span>
        <h3 style="margin: 0.2rem 0; font-size: 1.3rem; color: #f8fafc; display: flex; align-items: center; gap: 0.6rem;">
          ${escapeHtml(player.name)}
          <span class="ovr-badge ${getOvrClass(ovr)}">OVR ${ovr}</span>
        </h3>
        <div style="font-size: 0.78rem; color: #94a3b8; display: flex; gap: 0.6rem; align-items: center; margin-top: 0.2rem;">
          <span style="color: #38bdf8; font-weight: 700;">${slotInfo}</span>
          <span>·</span>
          <span>Age ${player.age}</span>
          <span>·</span>
          <span>Natural: <strong>${roleName(player.role)}</strong></span>
        </div>
      </div>
    </div>`;

  const body = `
    <div style="display: grid; gap: 1.15rem; max-height: 75vh; overflow-y: auto;">
      ${
        player.injury
          ? `<div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 0.45rem; padding: 0.75rem 1rem; color: #fca5a5; display: flex; align-items: center; gap: 0.6rem;">
              <span style="font-size: 1.1rem;">⚠️</span>
              <div>
                <strong style="color: #ef4444;">Injured: ${escapeHtml(player.injury.type)}</strong> (${player.injury.severity})
                <div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 0.15rem;">Estimated return: ${player.injury.weeksRemaining} week${player.injury.weeksRemaining > 1 ? "s" : ""}</div>
              </div>
            </div>`
          : ""
      }

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.65rem;">
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.45rem; padding: 0.75rem; text-align: center;">
          <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Attack Rating</span>
          <strong style="display: block; font-size: 1.4rem; color: #38bdf8; font-family: ui-monospace, monospace; margin-top: 0.2rem;">${player.attack}</strong>
        </div>
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.45rem; padding: 0.75rem; text-align: center;">
          <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Defence Rating</span>
          <strong style="display: block; font-size: 1.4rem; color: #4ade80; font-family: ui-monospace, monospace; margin-top: 0.2rem;">${player.defence}</strong>
        </div>
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.45rem; padding: 0.75rem; text-align: center;">
          <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Condition</span>
          <strong style="display: block; font-size: 1.4rem; color: #facc15; font-family: ui-monospace, monospace; margin-top: 0.2rem;">${player.fitness}%</strong>
        </div>
      </div>

      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgb(255 255 255 / 10%); border-radius: 0.5rem; padding: 1rem; display: grid; gap: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 0.72rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">Season Career Record</span>
          <span style="font-size: 0.75rem; color: #94a3b8; font-family: ui-monospace, monospace;">
            ${rec.appearances} Apps (${rec.starts} Starts, ${rec.subAppearances} Subs)
          </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.65rem; font-size: 0.8rem;">
          <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
            <span style="color: #94a3b8; font-size: 0.68rem; display: block;">SCORING</span>
            <strong style="color: #facc15; font-size: 1.05rem;">${rec.tries}</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">Tries</span> · <strong style="color: #38bdf8;">${rec.lineBreaks}</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">Breaks</span>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
            <span style="color: #94a3b8; font-size: 0.68rem; display: block;">TACKLE %</span>
            <strong style="color: #4ade80; font-size: 1.05rem;">${tacklePct}%</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">(${rec.tacklesMade}/${totalTackles})</span>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
            <span style="color: #94a3b8; font-size: 0.68rem; display: block;">METRES CARRIED</span>
            <strong style="color: #38bdf8; font-size: 1.05rem;">${formatDist(rec.distanceCarried)}</strong>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
            <span style="color: #94a3b8; font-size: 0.68rem; display: block;">PASSING ACCURACY</span>
            <strong style="color: #f8fafc; font-size: 1.05rem;">${passPct}%</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">(${rec.successfulPasses}/${rec.totalPasses})</span>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
            <span style="color: #94a3b8; font-size: 0.68rem; display: block;">KICK SUCCESS</span>
            <strong style="color: #f8fafc; font-size: 1.05rem;">${kickPct}%</strong> <span style="font-size: 0.72rem; color: #cbd5e1;">(${rec.successfulKicks}/${rec.totalKicks})</span>
          </div>
          <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 0.35rem;">
            <span style="color: #94a3b8; font-size: 0.68rem; display: block;">DISCIPLINE / ERRORS</span>
            <strong style="color: ${rec.penaltiesConceded > 0 ? "#f87171" : "#cbd5e1"}; font-size: 1.05rem;">${rec.penaltiesConceded}p</strong> · <strong style="color: #cbd5e1;">${rec.knockOns}k</strong>
          </div>
        </div>
      </div>

      <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgb(255 255 255 / 8%); border-radius: 0.5rem; padding: 1rem; display: grid; gap: 0.65rem;">
        <span style="font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Technical Breakdown</span>
        ${renderSkillBar("Decision Making", decision, "#60a5fa")}
        ${renderSkillBar("Handling & Catching", handling, "#38bdf8")}
        ${renderSkillBar("Passing Execution", passing, "#4ade80")}
        ${renderSkillBar("Kicking Range", kicking, "#facc15")}
        ${renderSkillBar("Tackling & Contact", tackling, "#f472b6")}
      </div>
    </div>`;

  return createWindow({
    maxWidth: "620px",
    customHeader,
    body,
    backdropCloseAttr: 'data-backdrop-close="player"',
    closeBtnAttr: "data-close-player-card",
  });
};
