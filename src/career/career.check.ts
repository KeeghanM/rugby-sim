import {
  acknowledgeEvent,
  advanceCareer,
  CAREER_SAVE_KEY,
  createCareer,
  createMatchInputForFixture,
  deleteCareer,
  deriveStandings,
  getUpcomingManagedFixture,
  hasCareer,
  loadCareer,
  optimizeSquadSelection,
  parseCareerSave,
  saveCareer,
  swapSquadPlayers,
  type StorageLike,
} from "./index.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

let career = createCareer("Alex Morgan", "harbour-sharks");
assert(career.season.clubs.length === 6, "Expected six clubs");
assert(
  career.season.clubs.every((club) => club.squad.length === 23),
  "Expected 23-player squads",
);

// Test squad swapping
const firstPlayerBefore = career.season.clubs[0].squad[0].id;
const secondPlayerBefore = career.season.clubs[0].squad[1].id;
career = swapSquadPlayers(career, "harbour-sharks", 0, 1);
assert(
  career.season.clubs[0].squad[0].id === secondPlayerBefore &&
    career.season.clubs[0].squad[1].id === firstPlayerBefore,
  "Squad swap failed",
);
career = swapSquadPlayers(career, "harbour-sharks", 0, 1);

// Test optimizeSquadSelection ("ovr" and "fitness")
career = optimizeSquadSelection(career, "harbour-sharks", "ovr");
const club = career.season.clubs[0];
const propOvr1 =
  (club.squad[0].attack + club.squad[0].defence + club.squad[0].fitness) / 3;
const propOvrBench =
  (club.squad[16].attack + club.squad[16].defence + club.squad[16].fitness) / 3;
assert(
  propOvr1 >= propOvrBench,
  "Best squad selection failed to place highest OVR prop in starting XV",
);

career = optimizeSquadSelection(career, "harbour-sharks", "fitness");
const clubFit = career.season.clubs[0];
const hookerFit1 = clubFit.squad[1].fitness;
const hookerFitBench = clubFit.squad[15].fitness;
assert(
  hookerFit1 >= hookerFitBench,
  "Fittest squad selection failed to place fittest hooker in starting XV",
);

// Test match input creation for fixture
const firstFixture = career.season.fixtures[0];
const matchInput = createMatchInputForFixture(career, firstFixture);
assert(matchInput.entrants[0].starters.length === 15, "Expected 15 starters");
assert(matchInput.entrants[0].substitutes.length === 8, "Expected 8 subs");
assert(matchInput.teams[0].name === "Harbour Sharks", "Expected team name");

assert(career.season.fixtures.length === 30, "Expected 30 fixtures");
assert(
  new Set(career.season.fixtures.map((fixture) => fixture.id)).size === 30,
  "Fixture IDs differ",
);
for (let round = 1; round <= 10; round += 1) {
  assert(
    career.season.fixtures.filter((fixture) => fixture.round === round)
      .length === 3,
    "Bad round",
  );
}
const pairings = new Map<string, number>();
for (const fixture of career.season.fixtures) {
  const pair = [fixture.homeClubId, fixture.awayClubId].sort().join(":");
  pairings.set(pair, (pairings.get(pair) ?? 0) + 1);
}
assert(
  pairings.size === 15 && [...pairings.values()].every((count) => count === 2),
  "Bad schedule",
);

const blocked = advanceCareer(career);
assert(blocked === career, "Pending event did not block advancement");
career = acknowledgeEvent(career);
assert(
  career.pendingEvent === null && career.inbox[0]?.read === true,
  "Event was not acknowledged",
);
assert(
  getUpcomingManagedFixture(career)?.round === 1,
  "Upcoming fixture is wrong",
);

while (career.checkpoint !== "seasonEnd") {
  if (career.pendingEvent !== null) {
    career = acknowledgeEvent(career);
  }
  career = advanceCareer(career);
}
assert(
  career.season.fixtures.every((fixture) => fixture.status === "played"),
  "Season is incomplete",
);
assert(
  career.season.fixtures.every((fixture) => fixture.result !== null),
  "Fixture resolved without result",
);
const standings = deriveStandings(career);
assert(standings.length === 6, "Expected six standings rows");
assert(
  standings.every((row) => row.played === 10),
  "Standings played count is wrong",
);
assert(
  standings.reduce((total, row) => total + row.won, 0) ===
    standings.reduce((total, row) => total + row.lost, 0),
  "Wins and losses disagree",
);
assert(
  standings.reduce((total, row) => total + row.pointsDifference, 0) === 0,
  "Points difference does not balance",
);
assert(
  getUpcomingManagedFixture(career) === null,
  "Completed season has upcoming fixture",
);

const values = new Map<string, string>();
const storage: StorageLike = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => void values.set(key, value),
  removeItem: (key) => void values.delete(key),
};
saveCareer(career, storage);
assert(hasCareer(storage), "Saved career was not found");
assert(
  JSON.stringify(loadCareer(storage)) === JSON.stringify(career),
  "Save roundtrip changed career",
);
const validSave = values.get(CAREER_SAVE_KEY);
assert(validSave !== undefined, "Save missing");
let rejected = 0;
for (const malformed of [
  "{",
  "{}",
  validSave.replace('"schemaVersion":1', '"schemaVersion":2'),
  validSave.replace('"attack":55', '"attack":"bad"'),
]) {
  try {
    parseCareerSave(malformed);
  } catch {
    rejected += 1;
  }
}
assert(rejected === 4, "Malformed saves were accepted");
deleteCareer(storage);
assert(
  !hasCareer(storage) && loadCareer(storage) === null,
  "Career was not deleted",
);

console.log("career checks passed");
