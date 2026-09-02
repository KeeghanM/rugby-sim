import type { ActiveTeamFormations, MatchConfig } from "../domain.ts";
import { loadPreset, setStats, setTactics } from "../teams/index.ts";
import { previewPositions, resolveTacticalShapes } from "./preview.ts";
import {
  clamp,
  setupViews,
  shapeContexts,
  type SetupState,
  type SetupView,
} from "./types.ts";

type Mix = "carry" | "pass" | "kick";

type WiringContext = {
  root: HTMLElement;
  teams: MatchConfig;
  state: SetupState;
  render: () => void;
  onStart: () => void;
  setPlayerRating: (key: string, rating: number) => void;
  setPlayerModifier: (key: string, delta: number) => void;
  setTeamRating: (key: string, rating: number) => void;
  adjustMix: (changed: Mix, value: number) => void;
};

const pressureSpeeds = { patient: 3.7, balanced: 4.4, aggressive: 5.2 };
const maulChoices = { move: 0.2, mixed: 0.5, drive: 0.8 };
const isSetupView = (value: string): value is SetupView => value in setupViews;

const isKeyOf = <T extends object>(
  value: string,
  object: T,
): value is Extract<keyof T, string> => value in object;

export const createWiring = ({
  root,
  teams,
  state,
  render,
  onStart,
  setPlayerRating,
  setPlayerModifier,
  setTeamRating,
  adjustMix,
}: WiringContext) => {
  const controller = new AbortController();
  const listenerOptions = { signal: controller.signal };

  const target = <T extends Element>(event: Event, selector: string) => {
    const element =
      event.target instanceof Element
        ? event.target.closest<T>(selector)
        : null;
    return element && root.contains(element) ? element : null;
  };

  const currentShapes = () => {
    const shapes = resolveTacticalShapes(
      teams,
      state.selectedTeam,
      state.shapeContext,
    );
    const index =
      state.selectedShapeIndex < shapes.length ? state.selectedShapeIndex : 0;
    return { shapes, index, shape: shapes[index] };
  };

  const saveShapes = (shapes: ReturnType<typeof resolveTacticalShapes>) =>
    setTactics(teams, state.selectedTeam, {
      tacticalShapes: { [state.shapeContext]: shapes },
    });

  const handleClick = (event: MouseEvent) => {
    const teamSwitch = target<HTMLElement>(event, "[data-team-switch]");
    if (teamSwitch) {
      state.selectedTeam = teamSwitch.dataset.teamSwitch === "1" ? 1 : 0;
      state.selectedPlayer = 10;
      state.selectedShapeIndex = 0;
      render();
      return;
    }

    const viewButton = target<HTMLElement>(event, "[data-view]");
    if (viewButton) {
      const view = viewButton.dataset.view;
      if (view && isSetupView(view)) state.view = view;
      render();
      return;
    }

    if (target(event, "[data-start]")) {
      onStart();
      return;
    }

    const player = target<HTMLElement>(event, "[data-player]");
    if (player) {
      state.selectedPlayer = Number(player.dataset.player);
      render();
      return;
    }

    const pressure = target<HTMLElement>(event, "[data-pressure]");
    if (pressure) {
      const key = pressure.dataset.pressure ?? "balanced";
      if (isKeyOf(key, pressureSpeeds)) {
        setStats(teams, state.selectedTeam, { lineSpeed: pressureSpeeds[key] });
        render();
      }
      return;
    }

    const maul = target<HTMLElement>(event, "[data-maul]");
    if (maul) {
      const key = maul.dataset.maul ?? "mixed";
      if (isKeyOf(key, maulChoices)) {
        setTactics(teams, state.selectedTeam, { maul: maulChoices[key] });
        render();
      }
      return;
    }

    const lineout = target<HTMLElement>(event, "[data-lineout]");
    if (lineout) {
      const size = Number(lineout.dataset.lineout);
      if ([4, 5, 6, 7].includes(size)) {
        setTactics(teams, state.selectedTeam, {
          formations: {
            lineoutMembers: size as ActiveTeamFormations["lineoutMembers"],
          },
        });
        render();
      }
      return;
    }

    const shapeContext = target<HTMLElement>(event, "[data-shape-context]");
    if (shapeContext) {
      const context = shapeContext.dataset.shapeContext;
      const selectedContext = shapeContexts.find(
        (item) => item.value === context,
      );
      if (selectedContext) {
        state.shapeContext = selectedContext.value;
        state.selectedShapeIndex = 0;
        render();
      }
      return;
    }

    const shapeIndex = target<HTMLElement>(event, "[data-shape-index]");
    if (shapeIndex) {
      state.selectedShapeIndex = Number(shapeIndex.dataset.shapeIndex);
      render();
      return;
    }

    if (target(event, "[data-add-shape]")) {
      const { shapes } = currentShapes();
      const context = shapeContexts.find(
        (item) => item.value === state.shapeContext,
      )!;
      shapes.push({
        id: `${state.shapeContext}-${Date.now()}`,
        name: `Shape ${shapes.length + 1}`,
        weight: 50,
        preset: String(context.presets[0]),
      });
      state.selectedShapeIndex = shapes.length - 1;
      saveShapes(shapes);
      render();
      return;
    }

    if (target(event, "[data-delete-shape]")) {
      const { shapes, index } = currentShapes();
      if (shapes.length > 1) {
        shapes.splice(index, 1);
        state.selectedShapeIndex = Math.max(0, index - 1);
        saveShapes(shapes);
        render();
      }
      return;
    }

    const presetButton = target<HTMLElement>(event, "[data-preset]");
    if (presetButton) {
      const preset = presetButton.dataset.preset;
      if (preset !== undefined) {
        const { shapes, shape } = currentShapes();
        shape.preset = preset;
        delete shape.positions;
        saveShapes(shapes);
        render();
      }
      return;
    }

    if (target(event, "[data-reset-shape]")) {
      const { shapes, shape } = currentShapes();
      delete shape.positions;
      saveShapes(shapes);
      render();
    }
  };

  const handleChange = (event: Event) => {
    const input = target<HTMLInputElement | HTMLSelectElement>(
      event,
      "input, select",
    );
    if (!input) return;

    if (input.matches("[data-team-name]")) {
      setStats(teams, state.selectedTeam, { name: input.value });
    } else if (input.matches("[data-team-color]")) {
      setStats(teams, state.selectedTeam, { color: input.value });
    } else if (input.matches("[data-preset-nation]")) {
      if (!input.value) return;
      loadPreset(teams, state.selectedTeam, input.value);
      state.selectedPlayer = 10;
      state.selectedShapeIndex = 0;
    } else if (input instanceof HTMLInputElement && input.dataset.rating) {
      const rating = Number(input.value);
      if (input.dataset.scope === "team") {
        setTeamRating(input.dataset.rating, rating);
      } else {
        setPlayerRating(input.dataset.rating, rating);
      }
    } else if (input instanceof HTMLInputElement && input.dataset.modifier) {
      setPlayerModifier(input.dataset.modifier, Number(input.value));
    } else if (input instanceof HTMLInputElement && input.dataset.mix) {
      const mix = input.dataset.mix;
      if (mix === "carry" || mix === "pass" || mix === "kick") {
        adjustMix(mix, Number(input.value) / 100);
      }
    } else if (input.matches("[data-shape-name]")) {
      const { shapes, index, shape } = currentShapes();
      shape.name = input.value.trim() || `Shape ${index + 1}`;
      saveShapes(shapes);
    } else if (
      input instanceof HTMLInputElement &&
      input.matches("[data-shape-weight]")
    ) {
      const { shapes, shape } = currentShapes();
      shape.weight = Number(input.value);
      saveShapes(shapes);
    } else {
      return;
    }
    render();
  };

  const handleInput = (event: Event) => {
    const input = target<HTMLInputElement>(event, 'input[type="range"]');
    if (!input) return;
    const output =
      input.parentElement?.querySelector<HTMLOutputElement>("output");
    if (!output) return;

    if (input.dataset.modifier) {
      const delta = Number(input.value);
      output.value = delta > 0 ? `+${delta}` : String(delta);
      output.style.color =
        delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#94a3b8";
      const total = input.parentElement?.querySelector<HTMLElement>(
        "[data-modifier-total]",
      );
      if (total)
        total.textContent = String(
          Math.round(Number(input.dataset.effectiveBase) + delta),
        );
    } else if (input.dataset.mix) {
      output.value = `${input.value}%`;
    } else if (input.matches("[data-shape-weight]")) {
      const { shapes, index } = currentShapes();
      const total = shapes.reduce(
        (sum, shape, shapeIndex) =>
          sum +
          Math.max(
            0,
            shapeIndex === index ? Number(input.value) : shape.weight,
          ),
        0,
      );
      output.value = `${total > 0 ? Math.round((Number(input.value) / total) * 100) : 100}% chance`;
    } else {
      output.value = input.value;
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    const player = target<HTMLElement>(event, "[data-shape-player]");
    const pitch = player?.closest<HTMLElement>("[data-pitch]");
    if (!player || !pitch) return;

    event.preventDefault();
    player.setPointerCapture(event.pointerId);
    const xBound = Number(pitch.dataset.xBound);
    const zBound = Number(pitch.dataset.zBound);
    const positions = previewPositions(
      teams,
      state.selectedTeam,
      state.shapeContext,
      state.selectedShapeIndex,
    );
    const playerIndex = Number(player.dataset.shapePlayer);

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
      positions[playerIndex] = { x, z };
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
      const { shapes, shape } = currentShapes();
      shape.positions = positions.map((position) => ({ ...position }));
      saveShapes(shapes);
      player.removeEventListener("pointermove", move);
      player.removeEventListener("pointerup", finish);
      player.removeEventListener("pointercancel", finish);
      render();
    };

    player.addEventListener("pointermove", move, listenerOptions);
    player.addEventListener("pointerup", finish, listenerOptions);
    player.addEventListener("pointercancel", finish, listenerOptions);
  };

  root.addEventListener("click", handleClick, listenerOptions);
  root.addEventListener("change", handleChange, listenerOptions);
  root.addEventListener("input", handleInput, listenerOptions);
  root.addEventListener("pointerdown", handlePointerDown, listenerOptions);

  return () => controller.abort();
};
