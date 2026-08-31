import {
  type FormationContext,
  type MatchConfig,
  otherTeam,
  type Player,
  type PlayerSkills,
  type Position,
  type TacticalShape,
  type Team,
} from "./domain.ts";
import {
  ATTACK_FORMATION,
  getKickoffTarget,
  getOpenPlayTarget,
  getScrumTarget,
} from "./formations.ts";
import { createGame } from "./simulation/create-game.ts";
import {
  getPlayerProfile,
  getRolePhysicals,
  loadPreset,
  setStats,
  setTactics,
} from "./teams.ts";

type SetupView = "squad" | "tactics" | "shape";

const skillKeys = [
  "decision",
  "handling",
  "passing",
  "kicking",
  "tackling",
] as const;

const shapeContexts: {
  value: FormationContext;
  label: string;
  formation: keyof MatchConfig[Team]["formations"];
  presets: readonly (string | number)[];
}[] = [
  {
    value: "openAttack",
    label: "Open-play attack",
    formation: "openAttack",
    presets: ["balanced", "tightPods", "wide"],
  },
  {
    value: "openDefence",
    label: "Open-play defence",
    formation: "openDefence",
    presets: ["connected", "narrow", "wide"],
  },
  {
    value: "kickoffAttack",
    label: "Kick chase",
    formation: "kickoffAttack",
    presets: ["balanced", "press", "split"],
  },
  {
    value: "kickoffDefence",
    label: "Kick receipt",
    formation: "kickoffDefence",
    presets: ["deep", "pendulum", "splitField"],
  },
  {
    value: "scrumAttack",
    label: "Scrum attack",
    formation: "scrumAttack",
    presets: ["openSide", "blindSide", "splitBacks"],
  },
  {
    value: "scrumDefence",
    label: "Scrum defence",
    formation: "scrumDefence",
    presets: ["drift", "manOnMan", "blitz"],
  },
];

const text = (value: string) =>
  value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]!,
  );

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const toSpeedRating = (speed: number) =>
  Math.round(clamp(((speed - 3.8) / 2.8) * 100, 0, 100));
const fromSpeedRating = (rating: number) => 3.8 + (rating / 100) * 2.8;
const toWeightRating = (weight: number) =>
  Math.round(clamp(((weight - 75) / 50) * 100, 0, 100));
const fromWeightRating = (rating: number) => 75 + (rating / 100) * 50;

const ratingControl = (
  key: string,
  label: string,
  value: number,
  scope: "team" | "player",
) => `
  <label class="rating-control">
    <span>${label}</span>
    <input type="range" min="0" max="100" value="${Math.round(value)}" data-rating="${key}" data-scope="${scope}" />
    <output>${Math.round(value)}</output>
  </label>`;

const mixControl = (key: "carry" | "pass" | "kick", value: number) => `
  <label class="mix-control mix-${key}">
    <span>${text(key)}</span>
    <input type="range" min="0" max="100" value="${Math.round(value * 100)}" data-mix="${key}" />
    <output>${Math.round(value * 100)}%</output>
  </label>`;

const boundsFor = (context: FormationContext) =>
  context.startsWith("scrum")
    ? { x: 25, z: 20 }
    : context.startsWith("open")
      ? { x: 35, z: 30 }
      : { x: 35, z: 50 };

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

  const ensureTacticalShapes = (
    teamId: Team,
    context: FormationContext,
  ): TacticalShape[] => {
    if (!teams[teamId].tacticalShapes) {
      teams[teamId].tacticalShapes = {};
    }
    let shapes = teams[teamId].tacticalShapes![context];
    if (!shapes || shapes.length === 0) {
      const configItem = shapeContexts.find((c) => c.value === context)!;
      const defaultPreset = String(
        teams[teamId].formations[configItem.formation],
      );
      shapes = [
        {
          id: `${context}-1`,
          name: "Play 1 (Primary)",
          weight: 60,
          preset: defaultPreset,
          positions: teams[teamId].customFormations[context]?.map((p) => ({
            ...p,
          })),
        },
        {
          id: `${context}-2`,
          name: "Play 2 (Alternate)",
          weight: 40,
          preset: configItem.presets[1]
            ? String(configItem.presets[1])
            : defaultPreset,
        },
      ];
      teams[teamId].tacticalShapes![context] = shapes;
    }
    return shapes;
  };

  const players = () =>
    ATTACK_FORMATION.map((slot, index) => ({
      ...slot,
      number: index + 1,
      profile: getPlayerProfile(selectedTeam, index + 1, slot.role, teams),
    }));

  const setPlayerRating = (key: string, rating: number) => {
    const slot = ATTACK_FORMATION[selectedPlayer - 1];
    const profile = getPlayerProfile(
      selectedTeam,
      selectedPlayer,
      slot.role,
      teams,
    );
    const current = teams[selectedTeam].playerOverrides[selectedPlayer] ?? {};
    if (skillKeys.includes(key as keyof PlayerSkills)) {
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

  const previewPositions = (): Position[] => {
    const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
    if (selectedShapeIndex >= shapes.length) selectedShapeIndex = 0;
    const currentShape = shapes[selectedShapeIndex] ?? shapes[0];

    if (currentShape.positions && currentShape.positions.length > 0) {
      return currentShape.positions.map((position) => ({ ...position }));
    }

    const custom = teams[selectedTeam].customFormations[shapeContext];
    if (custom) return custom.map((position) => ({ ...position }));

    const game = createGame(teams, () => 0.5);
    const ownPlayers = game.players.filter(
      (player) => player.team === selectedTeam,
    );
    const direction = selectedTeam === 0 ? 1 : -1;
    const formation = { ...game.formations[selectedTeam] };
    if (currentShape.preset) {
      const contextItem = shapeContexts.find(
        (item) => item.value === shapeContext,
      );
      if (contextItem) {
        (formation as any)[contextItem.formation] = currentShape.preset;
      }
    }
    const opponentCarrier = game.players.find(
      (player) =>
        player.team === otherTeam(selectedTeam) && player.number === 10,
    )!;
    opponentCarrier.position = { x: 0, z: 0 };
    const ownCarrier = ownPlayers.find((player) => player.number === 10)!;
    ownCarrier.position = { x: 0, z: 0 };

    return ownPlayers.map((player) => {
      let target: Position;
      if (shapeContext === "openAttack") {
        target = getOpenPlayTarget(
          player,
          ownCarrier,
          undefined,
          formation.openAttack,
          formation.openDefence,
        );
      } else if (shapeContext === "openDefence") {
        target = getOpenPlayTarget(
          player,
          opponentCarrier,
          0,
          formation.openAttack,
          formation.openDefence,
        );
      } else if (shapeContext === "kickoffAttack") {
        target = getKickoffTarget(
          player,
          selectedTeam,
          "matchStart",
          formation.kickoffAttack,
          formation.kickoffDefence,
        );
      } else if (shapeContext === "kickoffDefence") {
        target = getKickoffTarget(
          player,
          otherTeam(selectedTeam),
          "matchStart",
          formation.kickoffAttack,
          formation.kickoffDefence,
        );
      } else {
        target = getScrumTarget(
          player,
          { x: 0, z: 0 },
          shapeContext === "scrumAttack"
            ? selectedTeam
            : otherTeam(selectedTeam),
          formation.scrumAttack,
          formation.scrumDefence,
        );
      }
      return {
        x: target.x,
        z: target.z * direction,
      };
    });
  };

  const renderSquad = () => {
    const team = teams[selectedTeam];
    const roster = players();
    const selected = roster[selectedPlayer - 1];
    const profile = selected.profile;
    return `
      <div class="squad-layout">
        <section class="team-ratings">
          <div class="section-heading"><div><span>Whole squad</span><h2>Baseline ratings</h2></div><p>Move one slider to coach that quality across all 23 players. Individual differences remain visible below.</p></div>
          <div class="ratings-grid">
            ${ratingControl("speed", "Pace", ((team.speedMultiplier - 0.8) / 0.4) * 100, "team")}
            ${ratingControl("weight", "Power", ((team.weightMultiplier - 0.8) / 0.4) * 100, "team")}
            ${skillKeys.map((key) => ratingControl(key, text(key), team.defaultSkills[key] * 100, "team")).join("")}
          </div>
        </section>
        <section class="roster-panel">
          <div class="section-heading"><div><span>Starting XV</span><h2>Select player</h2></div></div>
          <div class="roster-head"><span>#</span><span>Role</span><span>Pace</span><span>Power</span><span>Decision</span><span>Handle</span><span>Pass</span><span>Kick</span><span>Tackle</span></div>
          <div class="roster-list">
            ${roster
              .map(
                (player) => `
                <button type="button" class="roster-row ${player.number === selectedPlayer ? "selected" : ""}" data-player="${player.number}">
                  <b>${player.number}</b><span>${player.role}</span>
                  <i>${toSpeedRating(player.profile.speed)}</i><i>${toWeightRating(player.profile.weight)}</i>
                  <i>${Math.round(player.profile.skills.decision * 100)}</i><i>${Math.round(player.profile.skills.handling * 100)}</i>
                  <i>${Math.round(player.profile.skills.passing * 100)}</i><i>${Math.round(player.profile.skills.kicking * 100)}</i><i>${Math.round(player.profile.skills.tackling * 100)}</i>
                </button>`,
              )
              .join("")}
          </div>
        </section>
        <aside class="player-editor">
          <div class="player-shirt" style="--team-color:${team.color}"><span>${selectedPlayer}</span></div>
          <div><span class="eyebrow">Individual training</span><h2>#${selectedPlayer} ${selected.role}</h2></div>
          <div class="player-rating-list">
            ${ratingControl("speed", "Pace", toSpeedRating(profile.speed), "player")}
            ${ratingControl("weight", "Power", toWeightRating(profile.weight), "player")}
            ${skillKeys.map((key) => ratingControl(key, text(key), profile.skills[key] * 100, "player")).join("")}
          </div>
        </aside>
      </div>`;
  };

  const renderTactics = () => {
    const team = teams[selectedTeam];
    const pressure =
      team.lineSpeed < 4.1
        ? "patient"
        : team.lineSpeed > 4.8
          ? "aggressive"
          : "balanced";
    const maul =
      team.tendencies.maul < 0.35
        ? "move"
        : team.tendencies.maul > 0.65
          ? "drive"
          : "mixed";
    return `
      <div class="tactics-layout">
        <section class="tactic-block">
          <div class="section-heading"><div><span>With ball</span><h2>Attack balance</h2></div><strong>100%</strong></div>
          <div class="mix-stack">
            ${mixControl("carry", team.tendencies.carry)}
            ${mixControl("pass", team.tendencies.pass)}
            ${mixControl("kick", team.tendencies.kick)}
          </div>
          <div class="mix-bar"><i style="width:${team.tendencies.carry * 100}%"></i><i style="width:${team.tendencies.pass * 100}%"></i><i style="width:${team.tendencies.kick * 100}%"></i></div>
        </section>
        <section class="tactic-block">
          <div class="section-heading"><div><span>Without ball</span><h2>Defensive pressure</h2></div></div>
          <div class="choice-row">
            ${[
              ["patient", "Patient", "Hold shape, conserve energy"],
              ["balanced", "Balanced", "Connected pressure"],
              ["aggressive", "Aggressive", "Fast line, higher fatigue"],
            ]
              .map(
                ([value, title, detail]) =>
                  `<button type="button" data-pressure="${value}" class="choice ${pressure === value ? "selected" : ""}"><b>${title}</b><span>${detail}</span></button>`,
              )
              .join("")}
          </div>
        </section>
        <section class="tactic-block">
          <div class="section-heading"><div><span>Lineout ball</span><h2>Drive or distribute</h2></div></div>
          <div class="choice-row">
            ${[
              ["move", "Move it", "Play away from lineout"],
              ["mixed", "Mix it", "Keep defence guessing"],
              ["drive", "Drive", "Build mauls often"],
            ]
              .map(
                ([value, title, detail]) =>
                  `<button type="button" data-maul="${value}" class="choice ${maul === value ? "selected" : ""}"><b>${title}</b><span>${detail}</span></button>`,
              )
              .join("")}
          </div>
          <div class="lineout-size"><span>Preferred lineout size</span>${[4, 5, 6, 7].map((size) => `<button type="button" data-lineout="${size}" class="number-choice ${team.formations.lineoutMembers === size ? "selected" : ""}">${size}</button>`).join("")}</div>
        </section>
      </div>`;
  };

  const renderShape = () => {
    const team = teams[selectedTeam];
    const context = shapeContexts.find((item) => item.value === shapeContext)!;
    const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
    if (selectedShapeIndex >= shapes.length) selectedShapeIndex = 0;
    const currentShape = shapes[selectedShapeIndex] ?? shapes[0];
    const totalWeight = shapes.reduce(
      (sum, s) => sum + Math.max(0, s.weight),
      0,
    );
    const probabilityPercent =
      totalWeight > 0
        ? Math.round((currentShape.weight / totalWeight) * 100)
        : 100;
    const positions = previewPositions();
    const bounds = boundsFor(shapeContext);

    return `
      <div class="shape-layout">
        <aside class="shape-menu">
          <span class="eyebrow">Phase</span>
          ${shapeContexts.map((item) => `<button type="button" data-shape-context="${item.value}" class="${shapeContext === item.value ? "selected" : ""}">${item.label}</button>`).join("")}
        </aside>
        <section class="shape-workbench">
          <div class="section-heading">
            <div>
              <span>Tactical Play Variations</span>
              <h2>${context.label}</h2>
            </div>
            <button type="button" class="reset-shape" data-reset-shape>Reset to preset</button>
          </div>

          <div class="shape-tabs-bar">
            <div class="shape-tabs-list">
              ${shapes
                .map(
                  (s, idx) => `
                <button type="button" class="shape-tab-btn ${idx === selectedShapeIndex ? "selected" : ""}" data-shape-index="${idx}">
                  <b>${escapeHtml(s.name)}</b>
                  <span>${totalWeight > 0 ? Math.round((s.weight / totalWeight) * 100) : 100}%</span>
                </button>`,
                )
                .join("")}
              <button type="button" class="add-shape-btn" data-add-shape>+ Add Play</button>
            </div>
          </div>

          <div class="shape-controls-card">
            <label class="shape-name-control">
              <span>Play Name</span>
              <input type="text" data-shape-name value="${escapeHtml(currentShape.name)}" placeholder="e.g. Blue Strike, Green Pods..." />
            </label>
            <label class="shape-weight-control">
              <span>Usage Weight</span>
              <input type="range" min="5" max="100" step="5" value="${currentShape.weight}" data-shape-weight />
              <output>${probabilityPercent}% chance</output>
            </label>
            ${shapes.length > 1 ? `<button type="button" class="delete-shape-btn" data-delete-shape title="Delete play">✕ Delete</button>` : ""}
          </div>

          <div class="preset-row">
            <span class="preset-label">Base template:</span>
            ${context.presets.map((preset) => `<button type="button" data-preset="${preset}" class="${currentShape.preset === String(preset) && !currentShape.positions ? "selected" : ""}">${text(String(preset))}</button>`).join("")}
          </div>

          <div class="pitch-board" data-pitch data-x-bound="${bounds.x}" data-z-bound="${bounds.z}">
            <span class="pitch-half"></span><span class="pitch-22 north"></span><span class="pitch-22 south"></span>
            ${positions.map((position, index) => `<button type="button" class="shape-player" data-shape-player="${index}" style="--x:${((position.x + bounds.x) / (bounds.x * 2)) * 100}%;--z:${((bounds.z - position.z) / (bounds.z * 2)) * 100}%;--team-color:${team.color}">${index + 1}</button>`).join("")}
          </div>
        </section>
      </div>`;
  };

  const render = () => {
    const team = teams[selectedTeam];
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
        <div class="config-content">${view === "squad" ? renderSquad() : view === "tactics" ? renderTactics() : renderShape()}</div>
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
        const positions = previewPositions();
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
          const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
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
        const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
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
        const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
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
        const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
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
        const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
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
        const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
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
        const shapes = ensureTacticalShapes(selectedTeam, shapeContext);
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
