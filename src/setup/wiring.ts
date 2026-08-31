import type { FormationContext, MatchConfig, Team } from "../domain.ts";
import { clamp } from "./types.ts";
import { setStats, setTactics, loadPreset } from "../teams/index.ts";
import { shapeContexts } from "./types.ts";
import { ensureTacticalShapes, previewPositions } from "./preview.ts";

export const createWiring = (
  root: HTMLElement,
  teams: MatchConfig,
  getSelectedTeam: () => Team,
  setSelectedTeam: (v: Team) => void,
  getView: () => string,
  setView: (v: any) => void,
  getSelectedPlayer: () => number,
  setSelectedPlayer: (v: number) => void,
  getShapeContext: () => FormationContext,
  setShapeContext: (v: FormationContext) => void,
  getSelectedShapeIndex: () => number,
  setSelectedShapeIndex: (v: number) => void,
  render: () => void,
  onStart: () => void,
  setPlayerRating: (k: string, r: number) => void,
  setTeamRating: (k: string, r: number) => void,
  adjustMix: (c: any, v: number) => void,
) => {
  const wirePitch = () => {
    const pitch = root.querySelector<HTMLElement>("[data-pitch]");
    if (!pitch) return;
    const xBound = Number(pitch.dataset.xBound);
    const zBound = Number(pitch.dataset.zBound);
    for (const player of pitch.querySelectorAll<HTMLElement>("[data-shape-player]")) {
      player.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        player.setPointerCapture(event.pointerId);
        const positions = previewPositions(teams, getSelectedTeam(), getShapeContext(), getSelectedShapeIndex());
        const index = Number(player.dataset.shapePlayer);
        const move = (pointer: PointerEvent) => {
          const rect = pitch.getBoundingClientRect();
          const x = clamp(((pointer.clientX - rect.left) / rect.width) * xBound * 2 - xBound, -xBound, xBound);
          const z = clamp(zBound - ((pointer.clientY - rect.top) / rect.height) * zBound * 2, -zBound, zBound);
          positions[index] = { x, z };
          player.style.setProperty("--x", `${((x + xBound) / (xBound * 2)) * 100}%`);
          player.style.setProperty("--z", `${((zBound - z) / (zBound * 2)) * 100}%`);
        };
        const finish = () => {
          const shapes = ensureTacticalShapes(teams, getSelectedTeam(), getShapeContext());
          let idx = getSelectedShapeIndex();
          if (idx >= shapes.length) idx = 0;
          shapes[idx].positions = positions.map((position) => ({ ...position }));
          setTactics(teams, getSelectedTeam(), {
            tacticalShapes: { [getShapeContext()]: shapes },
            customFormations: { [getShapeContext()]: positions },
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
        setSelectedTeam(Number(button.dataset.teamSwitch) as Team);
        setSelectedPlayer(10);
        setSelectedShapeIndex(0);
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-view]").forEach((button) =>
      button.addEventListener("click", () => {
        setView(button.dataset.view as any);
        render();
      }),
    );
    root.querySelector<HTMLInputElement>("[data-team-name]")?.addEventListener("change", (event) => {
      setStats(teams, getSelectedTeam(), { name: (event.currentTarget as HTMLInputElement).value });
      render();
    });
    root.querySelector<HTMLInputElement>("[data-team-color]")?.addEventListener("change", (event) => {
      setStats(teams, getSelectedTeam(), { color: (event.currentTarget as HTMLInputElement).value });
      render();
    });
    root.querySelector<HTMLSelectElement>("[data-preset-nation]")?.addEventListener("change", (event) => {
      const val = (event.currentTarget as HTMLSelectElement).value;
      if (val) {
        loadPreset(teams, getSelectedTeam(), val);
        setSelectedPlayer(10);
        setSelectedShapeIndex(0);
        render();
      }
    });
    root.querySelector<HTMLElement>("[data-start]")?.addEventListener("click", onStart);
    root.querySelectorAll<HTMLElement>("[data-player]").forEach((button) =>
      button.addEventListener("click", () => {
        setSelectedPlayer(Number(button.dataset.player));
        render();
      }),
    );
    root.querySelectorAll<HTMLInputElement>("[data-rating]").forEach((input) =>
      input.addEventListener("change", () => {
        const rating = Number(input.value);
        if (input.dataset.scope === "team") setTeamRating(input.dataset.rating!, rating);
        else setPlayerRating(input.dataset.rating!, rating);
        render();
      }),
    );
    root.querySelectorAll<HTMLInputElement>("[data-mix]").forEach((input) =>
      input.addEventListener("change", () => {
        adjustMix(input.dataset.mix as any, Number(input.value) / 100);
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-pressure]").forEach((button) =>
      button.addEventListener("click", () => {
        const speeds: any = { patient: 3.7, balanced: 4.4, aggressive: 5.2 };
        const key = button.dataset.pressure || "balanced";
        setStats(teams, getSelectedTeam(), { lineSpeed: speeds[key] });
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-maul]").forEach((button) =>
      button.addEventListener("click", () => {
        const choices: any = { move: 0.2, mixed: 0.5, drive: 0.8 };
        const key = button.dataset.maul || "mixed";
        setTactics(teams, getSelectedTeam(), { maul: choices[key] });
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-lineout]").forEach((button) =>
      button.addEventListener("click", () => {
        setTactics(teams, getSelectedTeam(), { formations: { lineoutMembers: Number(button.dataset.lineout) as any } });
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-shape-context]").forEach((button) =>
      button.addEventListener("click", () => {
        setShapeContext(button.dataset.shapeContext as FormationContext);
        setSelectedShapeIndex(0);
        render();
      }),
    );
    root.querySelectorAll<HTMLElement>("[data-shape-index]").forEach((button) =>
      button.addEventListener("click", () => {
        setSelectedShapeIndex(Number(button.dataset.shapeIndex));
        render();
      }),
    );
    root.querySelector<HTMLElement>("[data-add-shape]")?.addEventListener("click", () => {
      const shapes = ensureTacticalShapes(teams, getSelectedTeam(), getShapeContext());
      const context = shapeContexts.find((item) => item.value === getShapeContext())!;
      const newPlayIndex = shapes.length + 1;
      shapes.push({ id: `${getShapeContext()}-${Date.now()}`, name: `Play ${newPlayIndex}`, weight: 50, preset: String(context.presets[0]) });
      setSelectedShapeIndex(shapes.length - 1);
      setTactics(teams, getSelectedTeam(), { tacticalShapes: { [getShapeContext()]: shapes } });
      render();
    });
    root.querySelector<HTMLInputElement>("[data-shape-name]")?.addEventListener("change", (event) => {
      const shapes = ensureTacticalShapes(teams, getSelectedTeam(), getShapeContext());
      let idx = getSelectedShapeIndex();
      if (idx >= shapes.length) idx = 0;
      shapes[idx].name = (event.currentTarget as HTMLInputElement).value.trim() || `Play ${idx + 1}`;
      setTactics(teams, getSelectedTeam(), { tacticalShapes: { [getShapeContext()]: shapes } });
      render();
    });
    root.querySelector<HTMLInputElement>("[data-shape-weight]")?.addEventListener("input", (event) => {
      const shapes = ensureTacticalShapes(teams, getSelectedTeam(), getShapeContext());
      let idx = getSelectedShapeIndex();
      if (idx >= shapes.length) idx = 0;
      shapes[idx].weight = Number((event.currentTarget as HTMLInputElement).value);
      setTactics(teams, getSelectedTeam(), { tacticalShapes: { [getShapeContext()]: shapes } });
      render();
    });
    root.querySelector<HTMLElement>("[data-delete-shape]")?.addEventListener("click", () => {
      const shapes = ensureTacticalShapes(teams, getSelectedTeam(), getShapeContext());
      if (shapes.length > 1) {
        shapes.splice(getSelectedShapeIndex(), 1);
        setSelectedShapeIndex(Math.max(0, getSelectedShapeIndex() - 1));
        setTactics(teams, getSelectedTeam(), { tacticalShapes: { [getShapeContext()]: shapes } });
        render();
      }
    });
    root.querySelectorAll<HTMLElement>("[data-preset]").forEach((button) =>
      button.addEventListener("click", () => {
        const context = shapeContexts.find((item) => item.value === getShapeContext())!;
        const preset = context.formation === "lineoutMembers" ? Number(button.dataset.preset) : button.dataset.preset!;
        const shapes = ensureTacticalShapes(teams, getSelectedTeam(), getShapeContext());
        let idx = getSelectedShapeIndex();
        if (idx >= shapes.length) idx = 0;
        shapes[idx].preset = String(preset);
        delete shapes[idx].positions;
        setTactics(teams, getSelectedTeam(), { formations: { [context.formation]: preset } as any, tacticalShapes: { [getShapeContext()]: shapes }, customFormations: { [getShapeContext()]: null } });
        render();
      }),
    );
    root.querySelector<HTMLElement>("[data-reset-shape]")?.addEventListener("click", () => {
      const shapes = ensureTacticalShapes(teams, getSelectedTeam(), getShapeContext());
      let idx = getSelectedShapeIndex();
      if (idx >= shapes.length) idx = 0;
      delete shapes[idx].positions;
      setTactics(teams, getSelectedTeam(), { tacticalShapes: { [getShapeContext()]: shapes }, customFormations: { [getShapeContext()]: null } });
      render();
    });
    wirePitch();
  };
  return { wire, wirePitch };
};
