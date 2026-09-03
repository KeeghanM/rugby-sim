import type React from 'react'
import { ROLE_GROUPS, roleName } from '../../domain/index.ts'
import { Modal } from '../components/Modal.tsx'
import { getOvrClass, getPlayerOverall } from '../formatters.ts'
import { useCareerStore } from '../store.ts'
import { SLOT_NAMES } from '../types.ts'

export const SwapModal: React.FC = () => {
  const career = useCareerStore((state) => state.career)
  const selectedSwapIndex = useCareerStore((state) => state.selectedSwapIndex)
  const setSelectedSwapIndex = useCareerStore((state) => state.setSelectedSwapIndex)
  const confirmSwapPlayers = useCareerStore((state) => state.confirmSwapPlayers)
  const setViewPlayerId = useCareerStore((state) => state.setViewPlayerId)

  if (!career || selectedSwapIndex === null) return null

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) return null

  const current = club.squad[selectedSwapIndex]
  if (!current) return null

  const currentSlot = SLOT_NAMES[selectedSwapIndex]
  const requiredGroup = ROLE_GROUPS[current.role]

  const customHeader = (
    <div>
      <span className="career-kicker">Swap Player</span>
      <h3 style={{ margin: '0.2rem 0', fontSize: '1.15rem', color: '#f8fafc' }}>
        Swapping #{selectedSwapIndex + 1} {current.name}
      </h3>
      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
        Position: <strong style={{ color: '#38bdf8' }}>{currentSlot}</strong> ({roleName(current.role)})
      </span>
    </div>
  )

  return (
    <Modal customHeader={customHeader} onClose={() => setSelectedSwapIndex(null)}>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
        Select a player below to move into the <strong>{currentSlot}</strong> slot:
      </p>
      <div className="career-table-wrap" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        <table className="career-table">
          <thead>
            <tr>
              <th style={{ width: '36px', textAlign: 'center' }}>#</th>
              <th>Player</th>
              <th>Current Slot</th>
              <th style={{ textAlign: 'center' }}>OVR</th>
              <th style={{ textAlign: 'center' }}>Fitness</th>
              <th>Status & Match</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {club.squad.map((player, index) => {
              if (index === selectedSwapIndex) return null
              const ovr = getPlayerOverall(player)
              const isExact = player.role === current.role
              const isGroup = ROLE_GROUPS[player.role] === requiredGroup

              return (
                <tr key={player.id} style={player.injury ? { opacity: 0.65 } : undefined}>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className="player-num-badge"
                      style={{
                        background: club.color,
                        width: '22px',
                        height: '22px',
                        fontSize: '0.7rem',
                      }}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="career-link-btn" onClick={() => setViewPlayerId(player.id)}>
                      {player.name}
                    </button>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {roleName(player.role)} · Age {player.age}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>{SLOT_NAMES[index] ?? 'Squad Depth'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className={`ovr-badge ${getOvrClass(ovr)}`}
                      onClick={() => setViewPlayerId(player.id)}
                    >
                      OVR {ovr}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="fitness">
                      <i style={{ width: `${player.fitness}%` }} />
                    </span>
                    {player.fitness}%
                  </td>
                  <td>
                    {player.injury ? (
                      <span
                        className="group-tag"
                        style={{
                          background: 'rgba(239,68,68,0.2)',
                          color: '#f87171',
                          borderColor: 'rgba(239,68,68,0.4)',
                        }}
                      >
                        Injured ({player.injury.weeksRemaining}w)
                      </span>
                    ) : isExact ? (
                      <span
                        className="group-tag"
                        style={{
                          background: 'rgba(34,197,94,0.15)',
                          color: '#4ade80',
                          borderColor: 'rgba(34,197,94,0.3)',
                        }}
                      >
                        ✓ Natural Role
                      </span>
                    ) : isGroup ? (
                      <span
                        className="group-tag"
                        style={{
                          background: 'rgba(56,189,248,0.15)',
                          color: '#38bdf8',
                          borderColor: 'rgba(56,189,248,0.3)',
                        }}
                      >
                        Role Group
                      </span>
                    ) : (
                      <span
                        className="group-tag"
                        style={{
                          background: 'rgba(148,163,184,0.1)',
                          color: '#94a3b8',
                          borderColor: 'transparent',
                        }}
                      >
                        Alternate
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="career-primary"
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.72rem' }}
                      onClick={() => confirmSwapPlayers(index)}
                    >
                      Swap In
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
