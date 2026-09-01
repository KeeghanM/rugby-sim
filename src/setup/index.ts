import {
  type FormationContext,
  type MatchConfig,
  otherTeam,
  type PlayerSkills,
  type Position,
  type TacticalShape,
  type Team,
} from "../domain.ts";
import {
  ATTACK_FORMATION,
  getKickoffTarget,
  getOpenPlayTarget,
  getScrumTarget,
} from "../formations/index.ts";
import { createGame } from "../simulation/create-game.ts";
import {
  getPlayerProfile,
  getRolePhysicals,
  loadPreset,
  setStats,
  setTactics,
} from "../teams/index.ts";
import { ensureTacticalShapes, previewPositions } from "./preview.ts";
import { renderShapeBoard } from "./shape-board-view.ts";
import { renderSquad } from "./squad-view.ts";
import { renderTactics } from "./tactics-view.ts";
import {
  boundsFor,
  clamp,
  escapeHtml,
  fromSpeedRating,
  fromWeightRating,
  shapeContexts,
  skillKeys,
  text,
  toSpeedRating,
  toWeightRating,
} from "./types.ts";
import { createWiring } from "./wiring.ts";

type SetupView = "squad" | "tactics" | "shape";

export const createMatchSetup = (
  root: HTMLElement,
  teams: MatchConfig,
  onStart: () => void,
) => {
  let selectedTeam: Team = 0;
  let view: SetupView = "squad";
  let selectedPlayer = 10;
  let shapeContext: FormationContext = "openAttack";
  let selectedShapeIndex = 0;

  setTactics(teams, 0, { formationVariation: 0 });
  setTactics(teams, 1, { formationVariation: 0 });

  // preview helpers extracted to ./preview.ts

  const setPlayerModifier = (key: string, delta: number) => {
    const current = teams[selectedTeam].playerOverrides[selectedPlayer] ?? {};
    if ((skillKeys as readonly string[]).includes(key)) {
      const currentSkillsDelta = current.skillsDelta ?? {};
      setStats(teams, selectedTeam, {
        playerOverrides: {
          [selectedPlayer]: {
            ...current,
            skillsDelta: {
              ...currentSkillsDelta,
              [key]: delta,
            },
          },
        },
      });
      return;
    }
    setStats(teams, selectedTeam, {
      playerOverrides: {
        [selectedPlayer]: {
          ...current,
          [key === "speed" ? "speedDelta" : "weightDelta"]: delta,
        },
      },
    });
  };

  const setPlayerRating = (key: string, rating: number) => {
    const slot = ATTACK_FORMATION[selectedPlayer - 1];
    const profile = getPlayerProfile(
      selectedTeam,
      selectedPlayer,
      slot.role,
      teams,
    );
    const current = teams[selectedTeam].playerOverrides[selectedPlayer] ?? {};
    if ((skillKeys as readonly string[]).includes(key)) {
      setStats(teams, selectedTeam, {
        playerOverrides: {
          [selectedPlayer]: {
            ...current,
            skills: { ...profile.skills, [key]: rating / 100 },
          },
        },
      });
      return;
    }
    const base = getRolePhysicals(slot.role);
    setStats(teams, selectedTeam, {
      playerOverrides: {
        [selectedPlayer]: {
          ...current,
          [key === "speed" ? "speedMultiplier" : "weightMultiplier"]:
            key === "speed"
              ? fromSpeedRating(rating) /
                (base.speed * teams[selectedTeam].speedMultiplier)
              : fromWeightRating(rating) /
                (base.weight * teams[selectedTeam].weightMultiplier),
        },
      },
    });
  };

  const setTeamRating = (key: string, rating: number) => {
    if (key === "speed" || key === "weight") {
      setStats(teams, selectedTeam, {
        [key === "speed" ? "speedMultiplier" : "weightMultiplier"]:
          0.8 + (rating / 100) * 0.4,
      });
      return;
    }
    for (const override of Object.values(teams[selectedTeam].playerOverrides)) {
      if (override?.skills) delete override.skills[key as keyof PlayerSkills];
    }
    setStats(teams, selectedTeam, {
      skills: { [key]: rating / 100 },
    });
  };

  const render = () => {
    const team = teams[selectedTeam];
    let content = "";
    if (view === "squad")
      content = renderSquad(teams, selectedTeam, selectedPlayer);
    else if (view === "tactics") content = renderTactics(teams, selectedTeam);
    else {
      const positions = previewPositions(
        teams,
        selectedTeam,
        shapeContext,
        selectedShapeIndex,
      );
      content = renderShapeBoard(
        teams,
        selectedTeam,
        shapeContext,
        selectedShapeIndex,
        positions,
        (teamId, ctx) => ensureTacticalShapes(teams, teamId, ctx),
      );
    }

    root.innerHTML = `
      <main class="config-shell" style="--active-team:${team.color}">
        <header class="config-header">
          <div class="config-brand"><span>Rugby Sim</span><h1>Match Room</h1></div>
          <div class="team-switcher">
            ${([0, 1] as const).map((teamId) => `<button type="button" data-team-switch="${teamId}" class="${selectedTeam === teamId ? "selected" : ""}" style="--swatch:${teams[teamId].color}"><i></i>${escapeHtml(teams[teamId].name)}</button>`).join("")}
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
          ${(["squad", "tactics", "shape"] as const).map((tab) => `<button type="button" data-view="${tab}" class="${view === tab ? "selected" : ""}">${tab === "shape" ? "Shape Board" : text(tab)}</button>`).join("")}
          <label class="team-identity"><span>Team name</span><input data-team-name value="${escapeHtml(team.name)}" /><input type="color" data-team-color value="${team.color}" aria-label="Team colour" /></label>
        </nav>
        <div class="config-content">${content}</div>
      </main>`;
    wire();
  };

  const adjustMix = (changed: "carry" | "pass" | "kick", value: number) => {
    const tendencies = teams[selectedTeam].tendencies;
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
    setTactics(teams, selectedTeam, next);
  };

  const wire = createWiring(
    root,
    teams,
    () => selectedTeam,
    (v) => (selectedTeam = v),
    (v) => (view = v),
    (v) => (selectedPlayer = v),
    () => shapeContext,
    (v) => (shapeContext = v),
    () => selectedShapeIndex,
    (v) => (selectedShapeIndex = v),
    render,
    onStart,
    setPlayerRating,
    setPlayerModifier,
    setTeamRating,
    adjustMix,
  );

  render();
};
