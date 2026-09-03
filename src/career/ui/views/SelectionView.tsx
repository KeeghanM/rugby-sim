import type React from 'react'
import type { Player } from '../../domain/index.ts'
import { roleName } from '../../domain/index.ts'
import { getOvrClass, getPlayerOverall } from '../formatters.ts'
import { useCareerStore } from '../store.ts'
import { SLOT_NAMES } from '../types.ts'

export const SelectionView: React.FC = () => {
  const career = useCareerStore((state) => state.career)
  const setSelectedSwapIndex = useCareerStore((state) => state.setSelectedSwapIndex)
  const setViewPlayerId = useCareerStore((state) => state.setViewPlayerId)
  const autoPickTeam = useCareerStore((state) => state.autoPickTeam)

  if (!career) return null

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) return null

  const starters = club.squad.slice(0, 15)
  const bench = club.squad.slice(15, 23)
  const depth = club.squad.slice(23)

  const renderRow = (player: Player, index: number, slotName: string) => {
    const ovr = getPlayerOverall(player)
    const ovrClass = getOvrClass(ovr)

    return (
      <tr key={player.id} style={player.injury ? { background: 'rgba(239,68,68,0.08)' } : undefined}>
        <td style={{ textAlign: 'center' }}>
          <span className="player-num-badge" style={{ background: club.color }}>
            {index + 1}
          </span>
        </td>
        <td>
          <div className="player-role-title">
            <button type="button" className="career-link-btn" onClick={() => setViewPlayerId(player.id)}>
              {player.name}
            </button>
            <span className="group-tag" style={{ fontSize: '0.65rem' }}>
              {slotName}
            </span>
            {player.injury && (
              <span
                className="group-tag"
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  color: '#f87171',
                  borderColor: 'rgba(239,68,68,0.4)',
                  fontSize: '0.65rem',
                }}
              >
                ⚠️ {player.injury.type} ({player.injury.weeksRemaining}w)
              </span>
            )}
          </div>
        </td>
        <td style={{ textAlign: 'center' }}>{player.age}</td>
        <td>{roleName(player.role)}</td>
        <td style={{ textAlign: 'center' }}>
          <button type="button" className={`ovr-badge ${ovrClass}`} onClick={() => setViewPlayerId(player.id)}>
            OVR {ovr}
          </button>
        </td>
        <td style={{ textAlign: 'center' }}>{player.speed}</td>
        <td style={{ textAlign: 'center' }}>{player.strength}</td>
        <td style={{ textAlign: 'center' }}>
          <span className="fitness">
            <i style={{ width: `${player.fitness}%` }} />
          </span>
          {player.fitness}%
        </td>
        <td style={{ textAlign: 'center' }}>
          <button type="button" className="career-swap-btn" onClick={() => setSelectedSwapIndex(index)}>
            Swap
          </button>
        </td>
      </tr>
    )
  }

  return (
    <section className="career-section">
      <header style={{ flexWrap: 'wrap' }}>
        <div>
          <span className="career-kicker">Matchday Selection</span>
          <h2>{club.name} Team Sheet</h2>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button type="button" className="career-secondary-btn" onClick={() => autoPickTeam('ovr')}>
            ⭐ Pick Best (OVR)
          </button>
          <button type="button" className="career-secondary-btn" onClick={() => autoPickTeam('fitness')}>
            ⚡ Pick Fittest
          </button>
        </div>
      </header>

      <div className="career-table-wrap">
        <table className="career-table squad">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              <th>Player & Slot</th>
              <th style={{ textAlign: 'center' }}>Age</th>
              <th>Natural Role</th>
              <th style={{ textAlign: 'center' }}>Overall</th>
              <th style={{ textAlign: 'center' }}>Pace</th>
              <th style={{ textAlign: 'center' }}>Power</th>
              <th style={{ textAlign: 'center' }}>Fitness</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="section-divider-row">
              <td colSpan={9}>Starting XV (1 - 15)</td>
            </tr>
            {starters.map((p, i) => renderRow(p, i, SLOT_NAMES[i] ?? 'Starter'))}
            <tr className="section-divider-row">
              <td colSpan={9}>Finishing Reserves (16 - 23)</td>
            </tr>
            {bench.map((p, i) => renderRow(p, i + 15, SLOT_NAMES[i + 15] ?? 'Reserve'))}
            {depth.length > 0 && (
              <>
                <tr className="section-divider-row">
                  <td colSpan={9}>Senior Squad Reserves & Depth (24 - {club.squad.length})</td>
                </tr>
                {depth.map((p, i) => renderRow(p, i + 23, 'Reserves'))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
