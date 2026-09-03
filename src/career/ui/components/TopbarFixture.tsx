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
    <div
      className="topbar-fixture-pill"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgb(255 255 255 / 10%)',
        borderRadius: '0.4rem',
        padding: '0.35rem 0.75rem',
        fontSize: '0.78rem',
      }}
    >
      <span
        style={{
          color: '#38bdf8',
          fontWeight: 800,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
        }}
      >
        Next Rd {upcoming.round}:
      </span>
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: home.color,
        }}
      />
      <span style={{ fontWeight: 700, color: '#f8fafc' }}>{home.name}</span>
      <span style={{ color: '#64748b', fontWeight: 600 }}>v</span>
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: away.color,
        }}
      />
      <span style={{ fontWeight: 700, color: '#f8fafc' }}>{away.name}</span>
      <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>({formatDate(upcoming.date)})</span>
    </div>
  )
}
