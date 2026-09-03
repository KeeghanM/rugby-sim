import {
  acknowledgeEvent,
  advanceCareer,
  CAREER_SAVE_KEY,
  createCareer,
  createMatchInputForFixture,
  deleteCareer,
  deriveStandings,
  dismissAcademyProspect,
  enrollCoachingCourse,
  executeSeasonRollover,
  getManagerLevel,
  getPlayerOverall,
  getUpcomingManagedFixture,
  hasCareer,
  loadCareer,
  optimizeSquadSelection,
  parseCareerSave,
  promoteAcademyProspect,
  releaseSquadPlayer,
  saveCareer,
  scoutTargetPlayer,
  signFreeAgent,
  submitTransferBid,
  swapSquadPlayers,
  updatePlaybookTactics,
  upgradeFacility,
  upgradeStaff,
  type StorageLike,
} from './index.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

let career = createCareer('Alex Morgan', 'harbour-sharks')
assert(career.season.clubs.length === 6, 'Expected six clubs')
assert(
  career.season.clubs.every((club) => club.squad.length === 40),
  'Expected 40-player squads',
)

// Test facility and staff upgrades
const initialBalance = career.season.clubs[0].balance
const initialGym = career.season.clubs[0].facilities.gym
career = upgradeFacility(career, 'harbour-sharks', 'gym')
const upgradedClub = career.season.clubs[0]
assert(upgradedClub.facilities.gym === initialGym + 1, 'Gym upgrade failed')
assert(upgradedClub.balance < initialBalance, 'Upgrade cost was not deducted')
assert(upgradedClub.ledger.length === 1, 'Ledger entry was not recorded')

const initialHeadCoach = upgradedClub.staff.find((s) => s.role === 'headCoach')
assert(initialHeadCoach !== undefined, 'Initial head coach not found')
career = upgradeStaff(career, 'harbour-sharks', 'headCoach')
const staffUpgradedClub = career.season.clubs[0]
const newHeadCoach = staffUpgradedClub.staff.find((s) => s.role === 'headCoach')
assert(newHeadCoach !== undefined, 'New head coach not found')
assert(newHeadCoach.level === initialHeadCoach.level + 1, 'Staff upgrade failed')
assert(staffUpgradedClub.ledger.length === 2, 'Staff ledger entry missing')

// Test squad swapping
const firstPlayerBefore = career.season.clubs[0].squad[0].id
const secondPlayerBefore = career.season.clubs[0].squad[1].id
career = swapSquadPlayers(career, 'harbour-sharks', 0, 1)
assert(
  career.season.clubs[0].squad[0].id === secondPlayerBefore && career.season.clubs[0].squad[1].id === firstPlayerBefore,
  'Squad swap failed',
)
career = swapSquadPlayers(career, 'harbour-sharks', 0, 1)

// Test optimizeSquadSelection ("ovr" and "fitness")
career = optimizeSquadSelection(career, 'harbour-sharks', 'ovr')
const club = career.season.clubs[0]
const propOvr1 = getPlayerOverall(club.squad[0])
const propOvrBench = getPlayerOverall(club.squad[16])
assert(propOvr1 >= propOvrBench, 'Best squad selection failed to place highest OVR prop in starting XV')

career = optimizeSquadSelection(career, 'harbour-sharks', 'fitness')
const clubFit = career.season.clubs[0]
const hookerFit1 = clubFit.squad[1].fitness
const hookerFitBench = clubFit.squad[15].fitness
assert(hookerFit1 >= hookerFitBench, 'Fittest squad selection failed to place fittest hooker in starting XV')

// Test Manager Progression, Badges, and Playbook
assert(career.manager.level === 1, 'Manager initial level should be 1')
assert(career.manager.reputation === 35, 'Manager initial reputation should be 35')
assert(career.manager.qualifications.length === 0, 'Manager initial qualifications should be empty')
assert(career.manager.playbook.attackStructure === 'standard', 'Playbook default attack structure should be standard')
assert(getManagerLevel(250).level === 3, 'XP 250 should be Level 3')

// Test Playbook Updating
career = updatePlaybookTactics(career, {
  tempo: 'high_tempo',
  kickPressure: 'high',
})
assert(career.manager.playbook.tempo === 'high_tempo', 'Playbook tempo update failed')

let lockedTacticRejected = false
try {
  career = updatePlaybookTactics(career, { attackStructure: 'pod_1_3_3_1' })
} catch {
  lockedTacticRejected = true
}
assert(lockedTacticRejected, 'Locked tactic was allowed without required qualification')

// Test Course Enrollment
const balanceBeforeCourse = career.season.clubs[0].balance
career = enrollCoachingCourse(career, 'wr_foundation')
assert(career.manager.activeCourse?.courseId === 'wr_foundation', 'Course enrollment failed')
assert(career.season.clubs[0].balance === balanceBeforeCourse - 5000, 'Course tuition was not deducted')

let doubleEnrollRejected = false
try {
  career = enrollCoachingCourse(career, 'attack_architecture')
} catch {
  doubleEnrollRejected = true
}
assert(doubleEnrollRejected, 'Concurrent course enrollment was allowed')

// Test Transfers & Scouting Network
assert(career.freeAgents.length === 24, 'Free agents pool size should be 24')
const firstFA = career.freeAgents[0]
career = scoutTargetPlayer(career, firstFA.id)
assert(career.scoutingReports[firstFA.id] !== undefined, 'Scouting report was not generated')
assert(career.scoutingReports[firstFA.id].revealed, 'Scouting report should be revealed')

// Test Release Squad Player (to open squad space)
const playerToRelease = career.season.clubs[0].squad[39]
const balanceBeforeRelease = career.season.clubs[0].balance
career = releaseSquadPlayer(career, playerToRelease.id)
assert(career.season.clubs[0].squad.length === 39, 'Squad size should decrease to 39')
assert(career.season.clubs[0].balance < balanceBeforeRelease, 'Severance fee should be deducted')
assert(
  career.freeAgents.some((p) => p.id === playerToRelease.id),
  'Released player should enter free agents',
)

// Test Sign Free Agent
career = signFreeAgent(career, firstFA.id, firstFA.wage, Math.round(firstFA.wage * 2))
assert(career.season.clubs[0].squad.length === 40, 'Squad size should return to 40')
assert(!career.freeAgents.some((p) => p.id === firstFA.id), 'Signed player should be removed from free agents')

// Test Transfer Bidding on Rival Club Player
const playerToRelease2 = career.season.clubs[0].squad[39]
career = releaseSquadPlayer(career, playerToRelease2.id)

const rivalPlayer = career.season.clubs[1].squad[35]
const rivalBalanceBefore = career.season.clubs[1].balance

// Test underbid rejection
let underbidRejected = false
try {
  career = submitTransferBid(career, 'valley-stags', rivalPlayer.id, 20_000, 2000)
} catch {
  underbidRejected = true
}
assert(underbidRejected, 'Low transfer bid was unexpectedly accepted')

// Test realistic bid acceptance
career = submitTransferBid(career, 'valley-stags', rivalPlayer.id, 160_000, 2200)
assert(
  career.season.clubs[0].squad.some((p) => p.id === rivalPlayer.id),
  'Transferred player should join buyer squad',
)
assert(career.season.clubs[1].balance === rivalBalanceBefore + 160_000, 'Seller club should receive transfer fee')

// Test Youth Academy
assert(career.season.clubs[0].academySquad.length === 6, 'Youth academy squad size should be 6')
const firstProspect = career.season.clubs[0].academySquad[0]
// Release a player to make room in senior squad
const playerToRelease3 = career.season.clubs[0].squad[39]
career = releaseSquadPlayer(career, playerToRelease3.id)
career = promoteAcademyProspect(career, firstProspect.id)
assert(
  career.season.clubs[0].squad.some((p) => p.id === firstProspect.id),
  'Youth prospect promotion failed',
)
assert(
  !career.season.clubs[0].academySquad.some((p) => p.id === firstProspect.id),
  'Promoted prospect was not removed from academy',
)

const secondProspect = career.season.clubs[0].academySquad[0]
career = dismissAcademyProspect(career, secondProspect.id)
assert(
  !career.season.clubs[0].academySquad.some((p) => p.id === secondProspect.id),
  'Dismissed prospect was not removed from academy',
)

// Test match input creation for fixture
const firstFixture = career.season.fixtures[0]
const matchInput = createMatchInputForFixture(career, firstFixture)
assert(matchInput.entrants[0].starters.length === 15, 'Expected 15 starters')
assert(matchInput.entrants[0].substitutes.length === 8, 'Expected 8 subs')
assert(matchInput.teams[0].name === 'Harbour Sharks', 'Expected team name')

assert(career.season.fixtures.length === 30, 'Expected 30 fixtures')
assert(new Set(career.season.fixtures.map((fixture) => fixture.id)).size === 30, 'Fixture IDs differ')
for (let round = 1; round <= 10; round += 1) {
  assert(career.season.fixtures.filter((fixture) => fixture.round === round).length === 3, 'Bad round')
}
const pairings = new Map<string, number>()
for (const fixture of career.season.fixtures) {
  const pair = [fixture.homeClubId, fixture.awayClubId].sort().join(':')
  pairings.set(pair, (pairings.get(pair) ?? 0) + 1)
}
assert(pairings.size === 15 && [...pairings.values()].every((count) => count === 2), 'Bad schedule')

const blocked = advanceCareer(career)
assert(blocked === career, 'Pending event did not block advancement')
career = acknowledgeEvent(career)
assert(
  career.pendingEvent === null && career.inbox.find((m) => m.id === 'board-welcome')?.read === true,
  'Event was not acknowledged',
)
assert(getUpcomingManagedFixture(career)?.round === 1, 'Upcoming fixture is wrong')

while (career.checkpoint !== 'seasonEnd') {
  if (career.pendingEvent !== null) {
    career = acknowledgeEvent(career)
  }
  career = advanceCareer(career)
}
assert(
  career.season.fixtures.every((fixture) => fixture.status === 'played'),
  'Season is incomplete',
)
assert(
  career.season.fixtures.every((fixture) => fixture.result !== null),
  'Fixture resolved without result',
)
assert(career.manager.qualifications.includes('wr_foundation'), 'Enrolled course was not completed')
assert(career.manager.stats.matchesManaged === 10, 'Manager matches managed should be 10')
assert(career.manager.xp > 0, 'Manager XP was not earned')
const standings = deriveStandings(career)
assert(standings.length === 6, 'Expected six standings rows')
assert(
  standings.every((row) => row.played === 10),
  'Standings played count is wrong',
)
assert(
  standings.reduce((total, row) => total + row.won, 0) === standings.reduce((total, row) => total + row.lost, 0),
  'Wins and losses disagree',
)
assert(standings.reduce((total, row) => total + row.pointsDifference, 0) === 0, 'Points difference does not balance')
assert(getUpcomingManagedFixture(career) === null, 'Completed season has upcoming fixture')

// Test Season Rollover to Year 2
const balanceBeforeRollover = career.season.clubs[0].balance
career = executeSeasonRollover(career)
assert(career.seasonYear === 2027, 'Season year should advance to 2027')
assert(career.currentRound === 1, 'Round should reset to 1')
assert(career.checkpoint === 'monday', 'Checkpoint should reset to monday')
assert(career.history.length === 1, 'Season history should contain 1 archive')
assert(career.history[0].year === 2026, 'Archived season year should be 2026')
assert(career.season.clubs[0].balance > balanceBeforeRollover, 'Prize money was not awarded to club')
assert(career.season.fixtures.length === 30, 'New season should have 30 fixtures')
assert(
  career.season.fixtures.every((f) => f.status === 'scheduled'),
  'New fixtures should be scheduled',
)

const values = new Map<string, string>()
const storage: StorageLike = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => void values.set(key, value),
  removeItem: (key) => void values.delete(key),
}
saveCareer(career, storage)
assert(hasCareer(storage), 'Saved career was not found')
assert(JSON.stringify(loadCareer(storage)) === JSON.stringify(career), 'Save roundtrip changed career')
const validSave = values.get(CAREER_SAVE_KEY)
assert(validSave !== undefined, 'Save missing')
let rejected = 0
for (const malformed of [
  '{',
  '{}',
  validSave.replace('"schemaVersion":1', '"schemaVersion":2'),
  validSave.replace('"decision":', '"decision":"bad"'),
]) {
  try {
    parseCareerSave(malformed)
  } catch {
    rejected += 1
  }
}
assert(rejected === 4, 'Malformed saves were accepted')
deleteCareer(storage)
assert(!hasCareer(storage) && loadCareer(storage) === null, 'Career was not deleted')

console.log('career checks passed')
