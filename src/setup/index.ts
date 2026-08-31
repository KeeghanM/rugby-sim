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
import { ensureTacticalShapes, previewPositions } from "./preview.ts";
import { renderSquad } from "./squad-view.ts";
import { renderTactics } from "./tactics-view.ts";
import { renderShapeBoard } from "./shape-board-view.ts";

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
      const positions = previewPositions(teams, selectedTeam, shapeContext, selectedShapeIndex);
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
              <option value="">Choose preset nation...</option>
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

  const wirePitch = () => {
    const pitch = root.querySelector<HTMLElement>("[data-pitch]");
    if (!pitch) return;
    const xBound = Number(pitch.dataset.xBound);
    const zBound = Number(pitch.dataset.zBound);
    for (const player of pitch.querySelectorAll<HTMLElement>(
      "[data-shape-player]",
    )) {
      player.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        player.setPointerCapture(event.pointerId);
        const positions = previewPositions(teams, selectedTeam, shapeContext, selectedShapeIndex);
        const index = Number(player.dataset.shapePlayer);
        const move = (pointer: PointerEvent) => {
          const rect = pitch.getBoundingClientRect();
          const x = clamp(
            ((pointer.clientX - rect.left) / rect.width) * xBound * 2 - xBound,
            -xBound,
            xBound,
          );
          const z = clamp(
            zBound - ((pointer.clientY - rect.top) / rect.height) * zBound * 2,
            -zBound,
            zBound,
          );
          positions[index] = { x, z };
          player.style.setProperty(
            "--x",
            `${((x + xBound) / (xBound * 2)) * 100}%`,
          );
          player.style.setProperty(
            "--z",
            `${((zBound - z) / (zBound * 2)) * 100}%`,
          );
        };
        const finish = () => {
          const shapes = ensureTacticalShapes(teams, selectedTeam, shapeContext);
          if (selectedShapeIndex >= shapes.length) selectedShapeIndex = 0;
          shapes[selectedShapeIndex].positions = positions.map((position) => ({
            ...position,
          }));
          setTactics(teams, selectedTeam, {
            tacticalShapes: { [shapeContext]: shapes },
            customFormations: { [shapeContext]: positions },
          });
          player.removeEventListener("pointermove", move);
          render();
        };
        player.addEventListener("pointermove", move);
        player.addEventListener("pointerup", finish, { once: true });
      });
    }
  };

  const wire = () => {
    root.querySelectorAll<HTMLElement>("[data-team-switch]").forEach((button) =>
      button.addEventListener("click", () => {
        selectedTeam = Number(button.dataset.teamSwitch) as Team;
        selectedPlayer = 10;
        selectedShapeIndex = 0;
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-view]").forEach((button) =>
      button.addEventListener("click", () => {
        view = button.dataset.view as SetupView;
        render();
      }),
    );
    root
      .querySelector<HTMLInputElement>("[data-team-name]")
      ?.addEventListener("change", (event) => {
        setStats(teams, selectedTeam, {
          name: (event.currentTarget as HTMLInputElement).value,
        });
        render();
      });
    root
      .querySelector<HTMLInputElement>("[data-team-color]")
      ?.addEventListener("change", (event) => {
        setStats(teams, selectedTeam, {
          color: (event.currentTarget as HTMLInputElement).value,
        });
        render();
      });
    root
      .querySelector<HTMLSelectElement>("[data-preset-nation]")
      ?.addEventListener("change", (event) => {
        const val = (event.currentTarget as HTMLSelectElement).value;
        if (val) {
          loadPreset(teams, selectedTeam, val);
          selectedPlayer = 10;
          selectedShapeIndex = 0;
          render();
        }
      });
    root
      .querySelector<HTMLElement>("[data-start]")
      ?.addEventListener("click", onStart);
    root.querySelectorAll<HTMLElement>("[data-player]").forEach((button) =>
      button.addEventListener("click", () => {
        selectedPlayer = Number(button.dataset.player);
        render();
      }),
    );
    root.querySelectorAll<HTMLInputElement>("[data-rating]").forEach((input) =>
      input.addEventListener("change", () => {
        const rating = Number(input.value);
        if (input.dataset.scope === "team") {
          setTeamRating(input.dataset.rating!, rating);
        } else {
          setPlayerRating(input.dataset.rating!, rating);
        }
        render();
      }),
    );
    root.querySelectorAll<HTMLInputElement>("[data-mix]").forEach((input) =>
      input.addEventListener("change", () => {
        adjustMix(
          input.dataset.mix as "carry" | "pass" | "kick",
          Number(input.value) / 100,
        );
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-pressure]").forEach((button) =>
      button.addEventListener("click", () => {
        const speeds = { patient: 3.7, balanced: 4.4, aggressive: 5.2 };
        setStats(teams, selectedTeam, {
          lineSpeed: speeds[button.dataset.pressure as keyof typeof speeds],
        });
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-maul]").forEach((button) =>
      button.addEventListener("click", () => {
        const choices = { move: 0.2, mixed: 0.5, drive: 0.8 };
        setTactics(teams, selectedTeam, {
          maul: choices[button.dataset.maul as keyof typeof choices],
        });
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-lineout]").forEach((button) =>
      button.addEventListener("click", () => {
        setTactics(teams, selectedTeam, {
          formations: {
            lineoutMembers: Number(button.dataset.lineout) as 4 | 5 | 6 | 7,
          },
        });
        render();
      }),
    );
    root
      .querySelectorAll<HTMLElement>("[data-shape-context]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          shapeContext = button.dataset.shapeContext as FormationContext;
          selectedShapeIndex = 0;
          render();
        }),
      );
    root.querySelectorAll<HTMLElement>("[data-shape-index]").forEach((button) =>
      button.addEventListener("click", () => {
        selectedShapeIndex = Number(button.dataset.shapeIndex);
        render();
      }),
    );
    root
      .querySelector<HTMLElement>("[data-add-shape]")
      ?.addEventListener("click", () => {
        const shapes = ensureTacticalShapes(teams, selectedTeam, shapeContext);
        const context = shapeContexts.find(
          (item) => item.value === shapeContext,
        )!;
        const newPlayIndex = shapes.length + 1;
        shapes.push({
          id: `${shapeContext}-${Date.now()}`,
          name: `Play ${newPlayIndex}`,
          weight: 50,
          preset: String(context.presets[0]),
        });
        selectedShapeIndex = shapes.length - 1;
        setTactics(teams, selectedTeam, {
          tacticalShapes: { [shapeContext]: shapes },
        });
        render();
      });
    root
      .querySelector<HTMLInputElement>("[data-shape-name]")
      ?.addEventListener("change", (event) => {
        const shapes = ensureTacticalShapes(teams, selectedTeam, shapeContext);
        if (selectedShapeIndex >= shapes.length) selectedShapeIndex = 0;
        shapes[selectedShapeIndex].name =
          (event.currentTarget as HTMLInputElement).value.trim() ||
          `Play ${selectedShapeIndex + 1}`;
        setTactics(teams, selectedTeam, {
          tacticalShapes: { [shapeContext]: shapes },
        });
        render();
      });
    root
      .querySelector<HTMLInputElement>("[data-shape-weight]")
      ?.addEventListener("input", (event) => {
        const shapes = ensureTacticalShapes(teams, selectedTeam, shapeContext);
        if (selectedShapeIndex >= shapes.length) selectedShapeIndex = 0;
        shapes[selectedShapeIndex].weight = Number(
          (event.currentTarget as HTMLInputElement).value,
        );
        setTactics(teams, selectedTeam, {
          tacticalShapes: { [shapeContext]: shapes },
        });
        render();
      });
    root
      .querySelector<HTMLElement>("[data-delete-shape]")
      ?.addEventListener("click", () => {
        const shapes = ensureTacticalShapes(teams, selectedTeam, shapeContext);
        if (shapes.length > 1) {
          shapes.splice(selectedShapeIndex, 1);
          selectedShapeIndex = Math.max(0, selectedShapeIndex - 1);
          setTactics(teams, selectedTeam, {
            tacticalShapes: { [shapeContext]: shapes },
          });
          render();
        }
      });
    root.querySelectorAll<HTMLElement>("[data-preset]").forEach((button) =>
      button.addEventListener("click", () => {
        const context = shapeContexts.find(
          (item) => item.value === shapeContext,
        )!;
        const preset =
          context.formation === "lineoutMembers"
            ? Number(button.dataset.preset)
            : button.dataset.preset!;
        const shapes = ensureTacticalShapes(teams, selectedTeam, shapeContext);
        if (selectedShapeIndex >= shapes.length) selectedShapeIndex = 0;
        shapes[selectedShapeIndex].preset = String(preset);
        delete shapes[selectedShapeIndex].positions;
        setTactics(teams, selectedTeam, {
          formations: { [context.formation]: preset },
          tacticalShapes: { [shapeContext]: shapes },
          customFormations: { [shapeContext]: null },
        });
        render();
      }),
    );
    root
      .querySelector<HTMLElement>("[data-reset-shape]")
      ?.addEventListener("click", () => {
        const shapes = ensureTacticalShapes(teams, selectedTeam, shapeContext);
        if (selectedShapeIndex >= shapes.length) selectedShapeIndex = 0;
        delete shapes[selectedShapeIndex].positions;
        setTactics(teams, selectedTeam, {
          tacticalShapes: { [shapeContext]: shapes },
          customFormations: { [shapeContext]: null },
        });
        render();
      });
    wirePitch();
  };

  render();
};
