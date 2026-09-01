# Rugby Sim

Rugby Sim is a simulation-first rugby management game rendered in the browser with Babylon.js. The aim is to model a complete match from individual player movement and decisions, then give the manager meaningful control over selection, tactics, formations, and eventually a career spanning multiple clubs.

This is an active prototype. Match logic, tuning, and management systems are still evolving.

## Vision

The game should produce believable rugby through interacting systems rather than scripted highlights. Player attributes, fatigue, positioning, tactical instructions, phase state, and weighted decisions combine to determine what happens on the pitch.

Core principles:

- **Simulation first:** tries, turnovers, kicks, and mistakes emerge from the same match model.
- **Meaningful management:** team setup and tactical choices should visibly change how a side plays.
- **Extensible tactics:** formations and plays are long-term game systems, not fixed setup options.
- **Readable outcomes:** broadcast presentation, live statistics, and Monte Carlo analysis make the simulation understandable.
- **Keep it simple:** prefer direct domain code and small state machines over speculative abstractions.

## Current Game

### Match simulation

- Thirty active players with role-based physical profiles, skills, stamina, movement, and decisions.
- Open play, tackles, rucks, mauls, scrums, lineouts, kickoffs, penalties, conversions, and substitutions.
- Passing, interceptions, tactical kicks, grubbers, drop goals, 50/22s, handling errors, ball flight, and unpredictable bounces.
- Possession, gain-line, defensive-line, offside, breakdown, and set-piece state.
- Referee and assistant-referee positioning, including dead-ball and restart handling.
- Per-player and per-team match statistics.

### Team management

- International presets plus a local club preset.
- Editable team identity, squad ratings, individual player attributes, and training-style modifiers.
- Carry, pass, kick, maul, line-speed, pressure, and set-piece tactical controls.
- Formation presets for open play, kickoffs, lineouts, and scrums.
- Shape Board for creating weighted tactical shapes with custom player positions.
- Manager dashboard for squad condition and match performance.

### Presentation

- Babylon.js 3D stadium, pitch, players, officials, ball, scoreboards, and match UI.
- Dynamic broadcast camera director with tactical, chase, goal-line, flyover, and referee views.
- First-person Ref Cam and free-camera controls.
- Live score, clock, phase, field-position, and manager statistics displays.

### Analysis

- Seeded match simulation for reproducible investigation.
- Monte Carlo runner for comparing teams over many complete matches.
- Aggregate wins, scores, tries, handling, tackle completion, and contest win rates.

## Tactical Model

Tactics are intended to grow into one of the main management systems:

- A **formation** describes where players should organize for a game context, such as open attack, open defence, kickoff, or scrum.
- A **tactical shape** is a weighted formation option a team may select during a match.
- A **play** will describe coordinated actions from a formation: runners, passes, kicks, decoys, timing, and conditions for using it.
- A **playbook collection** will group formations and plays curated by the manager.

Formations and tactical shapes already exist. Plays and portable playbook collections are planned. The model deliberately leaves room for more contexts and richer instructions without replacing current team data.

## Roadmap

Roadmap describes direction, not fixed release order.

### Tactical depth

- Add a play model on top of formations and tactical shapes.
- Define when plays are available and how players choose or execute them.
- Support manager-created formations, plays, and curated playbook collections.
- Improve tactical feedback so managers can understand why a structure succeeds or fails.

### Manager Career Mode

- Add a persistent manager career that can move between clubs.
- Let managers build their own tactical identity over time.
- Carry manager-owned playbook collections from club to club.
- Adapt those collections to each squad rather than tying tactics permanently to one team.

Detailed career progression, club movement, and persistence rules remain to be designed. They should be added only when their domain rules are clear.

### Simulation development

- Continue improving player decisions, phase transitions, laws, set pieces, and ball behaviour.
- Tune attribute impact and tactical trade-offs using seeded matches and aggregate simulation.
- Expand statistics and diagnostics where they help explain match outcomes.
- Keep deterministic state transitions separate from probabilistic decisions where practical.

### Product development

- Save manager, team, formation, play, and playbook data once those schemas stabilize.
- Improve onboarding and in-game explanations for tactical systems.
- Expand club content and career presentation after core simulation and tactics are dependable.

## Project Structure

```text
src/
  domain/       Shared match types, constants, and core terminology
  formations/   Formation targets and positional rules
  teams/        Presets, profiles, team editing, and tactical selection
  simulation/   Match creation, decisions, movement, ball logic, and phases
  renderer/     Babylon.js scene, cameras, players, stadium, and match UI
  setup/        Pregame squad, tactics, and Shape Board interface
```

Simulation state lives in `GameState`. Each tick computes player commands, applies movement and ball actions, then advances active phase state machines. Rendering reads game state but does not decide match outcomes.

## Development

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

Other commands:

- `npm run build` type-checks and creates a production build.
- `npm run qa` runs strict TypeScript checks and verifies formatting without rewriting files.
- `npm run preview` serves the production build locally.
- `npm run monte-carlo -- <matches> <team-0-skill> <team-1-skill>` runs aggregate simulations.

Example: compare two closely matched teams across 100 games:

```bash
npm run monte-carlo -- 100 75 80
```

Skill arguments are percentages. Monte Carlo seeds start at `1` and increment for each match, making a run reproducible with the same code and inputs.

## Verification Policy

This project intentionally has no unit-test suite while match logic is changing rapidly. Most outcomes are probabilistic, and useful correctness checks currently concern complete match behaviour and distributions rather than fixed outcomes from isolated functions. Maintaining narrow fixtures during this phase would freeze temporary tuning values and create more churn than confidence.

Changes must still be verified with:

- Strict TypeScript and formatting checks through `npm run qa`.
- Production builds for integration and bundling changes.
- Browser play-throughs for affected match scenarios and UI flows.
- Seeded simulations for reproducible match defects.
- Monte Carlo runs when simulation behaviour or tuning changes.

Focused automated tests should be added when rules and public contracts stabilize, or sooner for deterministic regressions these checks cannot reliably expose.
