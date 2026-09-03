import type React from 'react'
import { type Career, getUpcomingManagedFixture } from '../../domain/index.ts'
import { fixtureTeams, formatDate } from '../formatters.ts'

export interface TopbarFixtureProps {
  career: Career
}

export const TopbarFixture: React.FC<TopbarFixtureProps> = ({ career }) => {
  const upcoming = getUpcomingManagedFixture(career)
  if (!upcoming) return null

  const { home, away } = fixtureTeams(career, upcoming)

  return (
    <div className="topbar-fixture-pill">
      <span className="topbar-fixture-round">Next · Rd {upcoming.round}</span>
      <span className="topbar-club-dot" style={{ background: home.color }} />
      <strong>{home.name}</strong>
      <span className="topbar-versus">v</span>
      <span className="topbar-club-dot" style={{ background: away.color }} />
      <strong>{away.name}</strong>
      <time>{formatDate(upcoming.date)}</time>
    </div>
  )
}
