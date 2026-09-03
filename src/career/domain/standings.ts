import type { Career, Fixture, Standing } from './types.ts'

export function deriveStandings(career: Career): Standing[] {
  const table = new Map(
    career.season.clubs.map((club) => [
      club.id,
      {
        clubId: club.id,
        clubName: club.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDifference: 0,
        tablePoints: 0,
      },
    ]),
  )

  for (const fixture of career.season.fixtures) {
    if (fixture.status !== 'played' || fixture.result === null) continue
    const home = table.get(fixture.homeClubId)
    const away = table.get(fixture.awayClubId)
    if (home === undefined || away === undefined) throw new Error('Fixture references unknown club')
    home.played += 1
    away.played += 1
    home.pointsFor += fixture.result.homeScore
    home.pointsAgainst += fixture.result.awayScore
    away.pointsFor += fixture.result.awayScore
    away.pointsAgainst += fixture.result.homeScore
    if (fixture.result.homeScore > fixture.result.awayScore) {
      home.won += 1
      away.lost += 1
      home.tablePoints += 4
    } else if (fixture.result.homeScore < fixture.result.awayScore) {
      away.won += 1
      home.lost += 1
      away.tablePoints += 4
    } else {
      home.drawn += 1
      away.drawn += 1
      home.tablePoints += 2
      away.tablePoints += 2
    }
  }

  return [...table.values()]
    .map((standing) => ({
      ...standing,
      pointsDifference: standing.pointsFor - standing.pointsAgainst,
    }))
    .sort(
      (a, b) =>
        b.tablePoints - a.tablePoints ||
        b.pointsDifference - a.pointsDifference ||
        b.pointsFor - a.pointsFor ||
        a.clubId.localeCompare(b.clubId),
    )
}

export function getUpcomingManagedFixture(career: Career): Fixture | null {
  return (
    career.season.fixtures.find(
      (fixture) =>
        fixture.status === 'scheduled' &&
        (fixture.homeClubId === career.managedClubId || fixture.awayClubId === career.managedClubId),
    ) ?? null
  )
}
