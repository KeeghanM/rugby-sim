import type { MatchConfig, PlayerSkills } from "../domain.ts";
import { ATTACK_FORMATION } from "../formations/index.ts";
import { getPlayerProfile, setStats, setTactics } from "../teams/index.ts";
import { previewPositions, resolveTacticalShapes } from "./preview.ts";
import { renderShapeBoard } from "./shape-board-view.ts";
import { renderSquad } from "./squad-view.ts";
import { renderTactics } from "./tactics-view.ts";
import {
  escapeHtml,
  fromSpeedRating,
  fromWeightRating,
  skillKeys,
  setupViews,
  toSpeedRating,
  toWeightRating,
} from "./types.ts";
import type { SetupState } from "./types.ts";
import { createWiring } from "./wiring.ts";

export type { SetupView } from "./types.ts";

export const createMatchSetup = (
  root: HTMLElement,
  teams: MatchConfig,
  onStart: () => void,
) => {
  const state: SetupState = {
    selectedTeam: 0,
    view: "squad",
    selectedPlayer: 10,
    shapeContext: "openAttack",
    selectedShapeIndex: 0,
  };

  setTactics(teams, 0, { formationVariation: 0 });
  setTactics(teams, 1, { formationVariation: 0 });

  const setPlayerModifier = (key: string, delta: number) => {
    const current =
      teams[state.selectedTeam].playerOverrides[state.selectedPlayer] ?? {};
    const team = teams[state.selectedTeam];
    const slot = ATTACK_FORMATION[state.selectedPlayer - 1];
    if ((skillKeys as readonly string[]).includes(key)) {
      setStats(teams, state.selectedTeam, {
        playerOverrides: {
          [state.selectedPlayer]: {
            ...current,
            skills: {
              ...current.skills,
              [key]: Math.max(
                0.05,
                Math.min(
                  0.99,
                  team.defaultSkills[key as keyof PlayerSkills] + delta / 100,
                ),
              ),
            },
          },
        },
      });
      return;
    }
    const naturalProfile = getPlayerProfile(
      state.selectedTeam,
      state.selectedPlayer,
      slot.role,
      {
        ...teams,
        [state.selectedTeam]: {
          ...team,
          playerOverrides: {
            ...team.playerOverrides,
            [state.selectedPlayer]: {
              ...current,
              [key === "speed" ? "speedMultiplier" : "weightMultiplier"]: 1,
            },
          },
        },
      },
    );
    const teamRating =
      ((team[key === "speed" ? "speedMultiplier" : "weightMultiplier"] - 0.8) /
        0.4) *
      100;
    const desired =
      key === "speed"
        ? fromSpeedRating(teamRating + delta)
        : fromWeightRating(teamRating + delta);
    const baseline =
      key === "speed" ? naturalProfile.speed : naturalProfile.weight;
    setStats(teams, state.selectedTeam, {
      playerOverrides: {
        [state.selectedPlayer]: {
          ...current,
          [key === "speed" ? "speedMultiplier" : "weightMultiplier"]:
            desired / baseline,
        },
      },
    });
  };

  const setPlayerRating = (key: string, rating: number) => {
    const team = teams[state.selectedTeam];
    const baseline =
      key === "speed" || key === "weight"
        ? ((team[key === "speed" ? "speedMultiplier" : "weightMultiplier"] -
            0.8) /
            0.4) *
          100
        : team.defaultSkills[key as keyof PlayerSkills] * 100;
    setPlayerModifier(key, rating - baseline);
  };

  const setTeamRating = (key: string, rating: number) => {
    if (key === "speed" || key === "weight") {
      setStats(teams, state.selectedTeam, {
        [key === "speed" ? "speedMultiplier" : "weightMultiplier"]:
          0.8 + (rating / 100) * 0.4,
      });
      return;
    }
    for (const override of Object.values(
      teams[state.selectedTeam].playerOverrides,
    )) {
      if (override?.skills) delete override.skills[key as keyof PlayerSkills];
    }
    setStats(teams, state.selectedTeam, {
      skills: { [key]: rating / 100 },
    });
  };

  const render = () => {
    const team = teams[state.selectedTeam];
    let content = "";
    if (state.view === "squad")
      content = renderSquad(teams, state.selectedTeam, state.selectedPlayer);
    else if (state.view === "tactics")
      content = renderTactics(teams, state.selectedTeam);
    else {
      const positions = previewPositions(
        teams,
        state.selectedTeam,
        state.shapeContext,
        state.selectedShapeIndex,
      );
      content = renderShapeBoard(
        teams,
        state.selectedTeam,
        state.shapeContext,
        state.selectedShapeIndex,
        positions,
        resolveTacticalShapes(teams, state.selectedTeam, state.shapeContext),
      );
    }

    root.innerHTML = `
      <main class="config-shell" style="--active-team:${team.color}">
        <header class="config-header">
          <div class="config-brand"><span>Rugby Sim</span><h1>Match Room</h1></div>
          <div class="team-switcher">
             ${([0, 1] as const).map((teamId) => `<button type="button" data-team-switch="${teamId}" class="${state.selectedTeam === teamId ? "selected" : ""}" style="--swatch:${teams[teamId].color}"><i></i>${escapeHtml(teams[teamId].name)}</button>`).join("")}
          </div>
          <label class="preset-selector">
            <span>Preset</span>
            <select data-preset-nation>
              <option value="">Choose preset team...</option>
              <option value="nz">New Zealand (All Blacks)</option>
              <option value="sa">South Africa (Springboks)</option>
              <option value="ire">Ireland</option>
              <option value="fra">France (Les Bleus)</option>
              <option value="eng">England</option>
              <option value="sco">Scotland</option>
              <option value="aus">Australia (Wallabies)</option>
              <option value="arg">Argentina (Los Pumas)</option>
              <option value="wal">Wales</option>
              <option value="ita">Italy (Azzurri)</option>
              <option value="local">Northern RFC (Tier 5/6 England)</option>
            </select>
          </label>
          <button type="button" class="start-match" data-start>Kick off</button>
        </header>
        <nav class="config-tabs">
           ${Object.entries(setupViews)
             .map(
               ([view, label]) =>
                 `<button type="button" data-view="${view}" class="${state.view === view ? "selected" : ""}">${label}</button>`,
             )
             .join("")}
          <label class="team-identity"><span>Team name</span><input data-team-name value="${escapeHtml(team.name)}" /><input type="color" data-team-color value="${team.color}" aria-label="Team colour" /></label>
        </nav>
        <div class="config-content">${content}</div>
      </main>`;
  };

  const adjustMix = (changed: "carry" | "pass" | "kick", value: number) => {
    const tendencies = teams[state.selectedTeam].tendencies;
    const others = (["carry", "pass", "kick"] as const).filter(
      (key) => key !== changed,
    );
    const remainder = 1 - value;
    const previousOtherTotal = others.reduce(
      (total, key) => total + tendencies[key],
      0,
    );
    const next = {
      carry: tendencies.carry,
      pass: tendencies.pass,
      kick: tendencies.kick,
    };
    next[changed] = value;
    for (const key of others) {
      next[key] =
        previousOtherTotal === 0
          ? remainder / 2
          : (tendencies[key] / previousOtherTotal) * remainder;
    }
    setTactics(teams, state.selectedTeam, next);
  };

  const dispose = createWiring({
    root,
    teams,
    state,
    render,
    onStart,
    setPlayerRating,
    setPlayerModifier,
    setTeamRating,
    adjustMix,
  });

  render();
  return { dispose };
};
