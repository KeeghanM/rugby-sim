import { createMatchConfig, rollTeamTactics } from "../teams/index.ts";
import { resolveTacticalShapes } from "./preview.ts";

const teams = createMatchConfig();
teams[0].customFormations.openAttack = [{ x: 3, z: 4 }];
if (teams[0].tacticalShapes) delete teams[0].tacticalShapes.openAttack;

const before = JSON.stringify(teams);
const resolved = resolveTacticalShapes(teams, 0, "openAttack");
if (JSON.stringify(teams) !== before) {
  throw new Error("Shape resolution mutated team configuration");
}
if (resolved[0].positions?.[0].x !== 3) {
  throw new Error("Legacy positions were not adopted by generated shape");
}

teams[0].tacticalShapes = {
  ...teams[0].tacticalShapes,
  openAttack: [
    { id: "selected", name: "Selected", weight: 1, preset: "balanced" },
  ],
};
const rolled = rollTeamTactics(0, () => 0, teams);
if (rolled.shapePositions.openAttack !== undefined) {
  throw new Error("Selected shape incorrectly inherited legacy positions");
}

console.log("setup checks passed");
