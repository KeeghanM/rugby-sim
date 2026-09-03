import type React from 'react'
import { Table } from '../components/Table.tsx'
import { useCareerStore } from '../store.ts'

export const LeagueView: React.FC = () => {
  const career = useCareerStore((state) => state.career)

  if (!career) return null

  return (
    <section className="career-section">
      <header>
        <div>
          <span className="career-kicker">2026 season</span>
          <h2>{career.season.name}</h2>
        </div>
        <span>Round {career.currentRound} / 10</span>
      </header>
      <Table career={career} />
    </section>
  )
}
