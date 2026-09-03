import type React from 'react'
import type { Fixture } from '../../domain/index.ts'
import { fixtureTeams, formatDate } from '../formatters.ts'
import { useCareerStore } from '../store.ts'

export const FixturesView: React.FC = () => {
  const career = useCareerStore((state) => state.career)

  if (!career) return null

  const renderFixture = (fixture: Fixture) => {
    const { home, away } = fixtureTeams(career, fixture)
    const managed = home.id === career.managedClubId || away.id === career.managedClubId

    return (
      <div key={fixture.id} className={`career-fixture ${managed ? 'managed' : ''}`}>
        <time>{formatDate(fixture.date)}</time>
        <span className="fixture-club home">{home.name}</span>
        <strong>{fixture.result ? `${fixture.result.homeScore} - ${fixture.result.awayScore}` : 'v'}</strong>
        <span className="fixture-club">{away.name}</span>
      </div>
    )
  }

  return (
    <section className="career-section">
      <header>
        <div>
          <span className="career-kicker">Full calendar</span>
          <h2>Fixtures & results</h2>
        </div>
        <span>10 rounds</span>
      </header>
      <div className="career-rounds">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((round) => (
          <section key={round} className={`career-round ${round === career.currentRound ? 'current' : ''}`}>
            <h3>Round {round}</h3>
            {career.season.fixtures
              .filter((fixture) => fixture.round === round)
              .map((fixture) => renderFixture(fixture))}
          </section>
        ))}
      </div>
    </section>
  )
}
