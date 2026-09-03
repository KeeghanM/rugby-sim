import type React from 'react'
import { roleName } from '../../domain/index.ts'
import { fitnessClass, getOvrClass, getPlayerOverall, positionGroupClass } from '../formatters.ts'
import { useCareerStore } from '../store.ts'

export const SquadView: React.FC = () => {
  const career = useCareerStore((state) => state.career)
  const setViewPlayerId = useCareerStore((state) => state.setViewPlayerId)

  if (!career) return null

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) return null

  return (
    <section className="career-section">
      <header>
        <div>
          <span className="career-kicker">Registered players</span>
          <h2>{club.name} squad</h2>
        </div>
        <span>{club.squad.length} players</span>
      </header>
      <div className="career-table-wrap">
        <table className="career-table squad">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th style={{ textAlign: 'center' }}>Age</th>
              <th>Role</th>
              <th style={{ textAlign: 'center' }}>Overall</th>
              <th style={{ textAlign: 'center' }}>Pace</th>
              <th style={{ textAlign: 'center' }}>Power</th>
              <th style={{ textAlign: 'center' }}>Fitness</th>
            </tr>
          </thead>
          <tbody>
            {club.squad.map((player, index) => {
              const ovr = getPlayerOverall(player)
              return (
                <tr key={player.id}>
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
                      <strong>{player.name}</strong>
                    </button>
                    {player.injury && (
                      <span
                        className="group-tag"
                        style={{
                          background: 'rgba(239,68,68,0.2)',
                          color: '#f87171',
                          fontSize: '0.62rem',
                          marginLeft: '0.35rem',
                        }}
                      >
                        ⚠️ {player.injury.weeksRemaining}w
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{player.age}</td>
                  <td>
                    <span className={`group-tag position-tag ${positionGroupClass(player.role)}`}>
                      {roleName(player.role)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className={`ovr-badge ${getOvrClass(ovr)}`}
                      onClick={() => setViewPlayerId(player.id)}
                    >
                      OVR {ovr}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>{player.speed}</td>
                  <td style={{ textAlign: 'center' }}>{player.strength}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`fitness ${fitnessClass(player.fitness)}`}>
                      <i style={{ width: `${player.fitness}%` }} />
                    </span>
                    {player.fitness}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
