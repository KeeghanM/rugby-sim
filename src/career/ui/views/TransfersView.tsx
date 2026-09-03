import type React from 'react'
import { type PlayerRole, ROLE_GROUPS } from '../../domain/index.ts'
import { calculatePlayerMarketValue } from '../../domain/transfers.ts'
import { getOvrClass, getPlayerOverall } from '../formatters.ts'
import { useCareerStore } from '../store.ts'

export const TransfersView: React.FC = () => {
  const career = useCareerStore((state) => state.career)
  const activeSubTab = useCareerStore((state) => state.transfersSubTab)
  const setTransfersSubTab = useCareerStore((state) => state.setTransfersSubTab)
  const roleFilter = useCareerStore((state) => state.roleFilter)
  const setRoleFilter = useCareerStore((state) => state.setRoleFilter)
  const setViewPlayerId = useCareerStore((state) => state.setViewPlayerId)
  const signFreeAgentPlayer = useCareerStore((state) => state.signFreeAgentPlayer)
  const releasePlayerFromSquad = useCareerStore((state) => state.releasePlayerFromSquad)
  const scoutPlayerById = useCareerStore((state) => state.scoutPlayerById)
  const submitTransferBidOnPlayer = useCareerStore((state) => state.submitTransferBidOnPlayer)
  const promoteYouthProspect = useCareerStore((state) => state.promoteYouthProspect)
  const dismissYouthProspect = useCareerStore((state) => state.dismissYouthProspect)

  if (!career) return null

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) return null

  const scout = club.staff.find((s) => s.role === 'chiefScout')
  const scoutLevel = scout?.level ?? 1
  const isSquadFull = club.squad.length >= 40
  const totalWeeklyWages = club.squad.reduce((sum, p) => sum + p.wage, 0)

  const handleRelease = (playerId: string, name: string, severance: number) => {
    if (
      confirm(
        `Release ${name}? This will pay a £${severance.toLocaleString()} severance fee and remove the player from your squad.`,
      )
    ) {
      releasePlayerFromSquad(playerId)
    }
  }

  const handleDismissYouth = (playerId: string) => {
    if (confirm('Dismiss this youth prospect from the academy?')) {
      dismissYouthProspect(playerId)
    }
  }

  const handleBid = (rivalId: string, playerId: string, suggestedBid: number, wage: number) => {
    if (confirm(`Submit transfer bid of £${suggestedBid.toLocaleString()} on £${wage.toLocaleString()}/wk wage?`)) {
      submitTransferBidOnPlayer(rivalId, playerId, suggestedBid, wage)
    }
  }

  return (
    <section className="career-section">
      <header>
        <div>
          <span className="career-kicker">Recruitment & Roster Management</span>
          <h2>Transfers & Scouting Network</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span
            className="group-tag"
            style={{
              background: isSquadFull ? '#ef444422' : '#22c55e22',
              color: isSquadFull ? '#f87171' : '#4ade80',
              borderColor: isSquadFull ? '#ef444455' : '#22c55e55',
              fontSize: '0.82rem',
              padding: '0.3rem 0.65rem',
            }}
          >
            {club.squad.length} / 40 Senior Squad {isSquadFull ? '(FULL)' : `(${40 - club.squad.length} Available)`}
          </span>
        </div>
      </header>

      {/* Top KPI Row */}
      <div className="transfers-header-grid">
        <div className="transfers-kpi-card">
          <small>Transfer & Wage Funds</small>
          <strong style={{ color: '#4ade80' }}>£{club.balance.toLocaleString()}</strong>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Weekly Wages: £{totalWeeklyWages.toLocaleString()}/wk
          </span>
        </div>

        <div className="transfers-kpi-card">
          <small>Chief Scout Network</small>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <strong style={{ color: '#38bdf8' }}>Lvl {scoutLevel}</strong>
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{scout?.name ?? 'Recruiter'}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Scouting Accuracy:{' '}
            <strong style={{ color: '#38bdf8' }}>{Math.round((0.4 + scoutLevel * 0.12) * 100)}%</strong>
          </span>
        </div>

        <div className="transfers-kpi-card">
          <small>Market Pool</small>
          <strong style={{ color: '#facc15' }}>{career.freeAgents.length} Free Agents</strong>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Academy: {club.academySquad.length} Prospects</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="transfers-nav-tabs">
        <button
          type="button"
          className={activeSubTab === 'freeAgents' ? 'active' : ''}
          onClick={() => setTransfersSubTab('freeAgents')}
        >
          Free Agent Market ({career.freeAgents.length})
        </button>
        <button
          type="button"
          className={activeSubTab === 'squadContracts' ? 'active' : ''}
          onClick={() => setTransfersSubTab('squadContracts')}
        >
          My Squad Contracts ({club.squad.length}/40)
        </button>
        <button
          type="button"
          className={activeSubTab === 'academy' ? 'active' : ''}
          onClick={() => setTransfersSubTab('academy')}
        >
          Youth Academy ({club.academySquad.length})
        </button>
        <button
          type="button"
          className={activeSubTab === 'leagueMarket' ? 'active' : ''}
          onClick={() => setTransfersSubTab('leagueMarket')}
        >
          Rival Club Targets
        </button>
      </div>

      {/* Free Agents Tab */}
      {activeSubTab === 'freeAgents' &&
        (() => {
          const filtered = career.freeAgents.filter((p) => {
            if (roleFilter === 'all') return true
            const group = ROLE_GROUPS[p.role as PlayerRole] ?? 'centre'
            return group === roleFilter || p.role === roleFilter
          })

          return (
            <div>
              <div className="transfer-filter-row">
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Filter by Position:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ fontSize: '0.75rem' }}
                >
                  <option value="all">All Positions ({career.freeAgents.length})</option>
                  <option value="prop">Props</option>
                  <option value="hooker">Hookers</option>
                  <option value="lock">Locks</option>
                  <option value="backRow">Back Row</option>
                  <option value="scrumHalf">Scrum Halves</option>
                  <option value="flyHalf">Fly Halves</option>
                  <option value="centre">Centres</option>
                  <option value="outsideBack">Outside Backs</option>
                </select>
              </div>

              <div className="career-table-wrap">
                <table className="career-table">
                  <thead>
                    <tr>
                      <th>Player Name</th>
                      <th>Role</th>
                      <th style={{ textAlign: 'center' }}>Age</th>
                      <th style={{ textAlign: 'center' }}>OVR / Estimate</th>
                      <th style={{ textAlign: 'center' }}>Potential</th>
                      <th style={{ textAlign: 'right' }}>Wage Demand</th>
                      <th style={{ textAlign: 'right' }}>Signing Bonus</th>
                      <th style={{ textAlign: 'right', width: '190px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: 'center',
                            color: '#94a3b8',
                            padding: '2rem',
                          }}
                        >
                          No free agents found in this category.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((p) => {
                        const exactOvr = getPlayerOverall(p)
                        const report = career.scoutingReports[p.id]
                        const isScouted = report !== undefined

                        const ovrDisplay = isScouted ? (
                          scoutLevel >= 4 ? (
                            <span className={`player-ovr-badge ${getOvrClass(exactOvr)}`}>{exactOvr}</span>
                          ) : (
                            <span className="player-ovr-badge ovr-mid">
                              {report.ovrMin}-{report.ovrMax}
                            </span>
                          )
                        ) : (
                          <span className="player-ovr-badge ovr-mid">? ~{Math.round(exactOvr / 5) * 5}</span>
                        )

                        const potDisplay = isScouted ? (
                          <span
                            className="scout-badge-pill"
                            style={{
                              background: '#0284c722',
                              color: '#38bdf8',
                              borderColor: '#0284c755',
                            }}
                          >
                            ★ {report.potentialMin}-{report.potentialMax}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Unscouted</span>
                        )

                        const signingBonus = Math.round(p.wage * 2)
                        const canAffordBonus = club.balance >= signingBonus

                        return (
                          <tr key={p.id}>
                            <td>
                              <button type="button" className="career-link-btn" onClick={() => setViewPlayerId(p.id)}>
                                <strong>{p.name}</strong>
                              </button>
                              {isScouted && (
                                <small
                                  style={{
                                    display: 'block',
                                    color: '#94a3b8',
                                    fontSize: '0.68rem',
                                  }}
                                >
                                  Scouted: {report.strengths[0]}
                                </small>
                              )}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.role}</td>
                            <td style={{ textAlign: 'center' }}>{p.age}</td>
                            <td style={{ textAlign: 'center' }}>{ovrDisplay}</td>
                            <td style={{ textAlign: 'center' }}>{potDisplay}</td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontFamily: 'ui-monospace, monospace',
                                color: '#f8fafc',
                              }}
                            >
                              £{p.wage.toLocaleString()}/wk
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontFamily: 'ui-monospace, monospace',
                                color: '#94a3b8',
                              }}
                            >
                              £{signingBonus.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.4rem',
                                  justifyContent: 'flex-end',
                                }}
                              >
                                {!isScouted ? (
                                  <button
                                    type="button"
                                    className="career-secondary-btn"
                                    onClick={() => scoutPlayerById(p.id)}
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '0.25rem 0.5rem',
                                    }}
                                    title="Send Chief Scout to evaluate this player"
                                  >
                                    🔍 Scout
                                  </button>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      color: '#4ade80',
                                      alignSelf: 'center',
                                      marginRight: '0.25rem',
                                    }}
                                  >
                                    ✓ Scouted
                                  </span>
                                )}
                                {isSquadFull ? (
                                  <button
                                    type="button"
                                    className="career-secondary-btn"
                                    disabled
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '0.25rem 0.5rem',
                                    }}
                                    title="Squad is full (40 players max)"
                                  >
                                    Squad Full
                                  </button>
                                ) : !canAffordBonus ? (
                                  <button
                                    type="button"
                                    className="career-secondary-btn"
                                    disabled
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '0.25rem 0.5rem',
                                    }}
                                  >
                                    Funds Low
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="career-primary"
                                    onClick={() => signFreeAgentPlayer(p.id, p.wage, signingBonus)}
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '0.25rem 0.6rem',
                                    }}
                                  >
                                    ✍️ Sign
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

      {/* Squad Contracts Tab */}
      {activeSubTab === 'squadContracts' && (
        <div>
          <div
            style={{
              marginBottom: '0.75rem',
              fontSize: '0.8rem',
              color: '#94a3b8',
            }}
          >
            Review active contracts, market valuations, and manage roster capacity. Releasing a player pays a 4-week
            severance fee to free up squad space.
          </div>

          <div className="career-table-wrap">
            <table className="career-table">
              <thead>
                <tr>
                  <th style={{ width: '32px', textAlign: 'center' }}>#</th>
                  <th>Player Name</th>
                  <th>Position</th>
                  <th style={{ textAlign: 'center' }}>Age</th>
                  <th style={{ textAlign: 'center' }}>OVR</th>
                  <th style={{ textAlign: 'center' }}>Contract</th>
                  <th style={{ textAlign: 'right' }}>Weekly Wage</th>
                  <th style={{ textAlign: 'right' }}>Market Value</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Roster Actions</th>
                </tr>
              </thead>
              <tbody>
                {club.squad.map((p, index) => {
                  const ovr = getPlayerOverall(p)
                  const mktVal = calculatePlayerMarketValue(p)
                  const severanceCost = p.wage * 4
                  const canAffordSeverance = club.balance >= severanceCost

                  return (
                    <tr key={p.id}>
                      <td
                        style={{
                          textAlign: 'center',
                          fontSize: '0.72rem',
                          color: '#64748b',
                        }}
                      >
                        {index + 1}
                      </td>
                      <td>
                        <button type="button" className="career-link-btn" onClick={() => setViewPlayerId(p.id)}>
                          <strong>{p.name}</strong>
                        </button>
                        {p.injury && (
                          <span
                            style={{
                              color: '#f87171',
                              fontSize: '0.68rem',
                              marginLeft: '0.3rem',
                            }}
                          >
                            ({p.injury.type})
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.role}</td>
                      <td style={{ textAlign: 'center' }}>{p.age}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`player-ovr-badge ${getOvrClass(ovr)}`}>{ovr}</span>
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          fontWeight: 600,
                          color: p.contractYears <= 1 ? '#facc15' : '#4ade80',
                        }}
                      >
                        {p.contractYears} yr{p.contractYears !== 1 ? 's' : ''}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'ui-monospace, monospace',
                          color: '#f8fafc',
                        }}
                      >
                        £{p.wage.toLocaleString()}/wk
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontFamily: 'ui-monospace, monospace',
                          color: '#38bdf8',
                        }}
                      >
                        £{mktVal.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {club.squad.length <= 23 ? (
                          <button
                            type="button"
                            className="career-secondary-btn"
                            disabled
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.5rem',
                            }}
                          >
                            Min Squad
                          </button>
                        ) : !canAffordSeverance ? (
                          <button
                            type="button"
                            className="career-secondary-btn"
                            disabled
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.5rem',
                            }}
                          >
                            No Funds
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="career-swap-btn"
                            onClick={() => handleRelease(p.id, p.name, severanceCost)}
                            style={{
                              color: '#f87171',
                              fontSize: '0.72rem',
                              padding: '0.25rem 0.55rem',
                            }}
                            title={`Pay £${severanceCost.toLocaleString()} severance to release`}
                          >
                            ❌ Release
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Youth Academy Tab */}
      {activeSubTab === 'academy' &&
        (() => {
          const academyLvl = club.facilities.academy ?? 1
          const dir = club.staff.find((s) => s.role === 'academyDirector')

          return (
            <div>
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgb(255 255 255 / 8%)',
                  borderRadius: '0.55rem',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <span className="career-kicker" style={{ color: '#38bdf8' }}>
                      Youth Development Setup
                    </span>
                    <h3
                      style={{
                        margin: '0.2rem 0',
                        fontSize: '1.1rem',
                        color: '#f8fafc',
                      }}
                    >
                      Academy Infrastructure
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.78rem',
                        color: '#94a3b8',
                      }}
                    >
                      Academy Level {academyLvl}/5 · Head of Youth: <strong>{dir?.name ?? 'Academy Staff'}</strong> (Lvl{' '}
                      {dir?.level ?? 1})
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#cbd5e1',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '0.35rem',
                    }}
                  >
                    Annual Intake arrives at start of every new season.
                  </span>
                </div>
              </div>

              <div className="career-table-wrap">
                <table className="career-table">
                  <thead>
                    <tr>
                      <th>Prospect Name</th>
                      <th>Role</th>
                      <th style={{ textAlign: 'center' }}>Age</th>
                      <th style={{ textAlign: 'center' }}>OVR</th>
                      <th style={{ textAlign: 'center' }}>Potential</th>
                      <th style={{ textAlign: 'center' }}>Pace</th>
                      <th style={{ textAlign: 'center' }}>Power</th>
                      <th style={{ textAlign: 'right', width: '170px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {club.academySquad.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: 'center',
                            color: '#94a3b8',
                            padding: '2.5rem',
                          }}
                        >
                          No youth prospects currently in the academy. New intake arrives at season rollover.
                        </td>
                      </tr>
                    ) : (
                      club.academySquad.map((p) => {
                        const ovr = getPlayerOverall(p)
                        const pot = p.potential ?? 80

                        return (
                          <tr key={p.id}>
                            <td>
                              <button type="button" className="career-link-btn" onClick={() => setViewPlayerId(p.id)}>
                                <strong>{p.name}</strong>
                              </button>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.role}</td>
                            <td
                              style={{
                                textAlign: 'center',
                                fontWeight: 700,
                                color: '#38bdf8',
                              }}
                            >
                              {p.age}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`player-ovr-badge ${getOvrClass(ovr)}`}>{ovr}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className="scout-badge-pill"
                                style={{
                                  background: '#22c55e22',
                                  color: '#4ade80',
                                  borderColor: '#22c55e55',
                                }}
                              >
                                ★ {pot} POT
                              </span>
                            </td>
                            <td
                              style={{
                                textAlign: 'center',
                                fontFamily: 'ui-monospace, monospace',
                              }}
                            >
                              {p.speed}
                            </td>
                            <td
                              style={{
                                textAlign: 'center',
                                fontFamily: 'ui-monospace, monospace',
                              }}
                            >
                              {p.strength}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.4rem',
                                  justifyContent: 'flex-end',
                                }}
                              >
                                {isSquadFull ? (
                                  <button
                                    type="button"
                                    className="career-secondary-btn"
                                    disabled
                                    style={{
                                      fontSize: '0.7rem',
                                      padding: '0.25rem 0.5rem',
                                    }}
                                    title="Senior squad is full (40 max)"
                                  >
                                    Squad Full
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="career-primary"
                                    onClick={() => promoteYouthProspect(p.id)}
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '0.25rem 0.6rem',
                                    }}
                                  >
                                    🌟 Promote
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="career-swap-btn"
                                  onClick={() => handleDismissYouth(p.id)}
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '0.25rem 0.45rem',
                                    color: '#94a3b8',
                                  }}
                                  title="Dismiss prospect from academy"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

      {/* League Market Tab */}
      {activeSubTab === 'leagueMarket' &&
        (() => {
          const rivalClubs = career.season.clubs.filter((c) => c.id !== club.id)

          return (
            <div>
              <div
                style={{
                  marginBottom: '0.75rem',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                }}
              >
                Scout and submit transfer fee bids for contracted players at rival clubs in the National Club League.
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {rivalClubs.map((rival) => (
                  <div
                    key={rival.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid rgb(255 255 255 / 8%)',
                      borderRadius: '0.55rem',
                      padding: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          className="player-num-badge"
                          style={{
                            background: rival.color,
                            width: '14px',
                            height: '14px',
                          }}
                        />
                        <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{rival.name}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          (Rep: {rival.reputation} · Squad: {rival.squad.length})
                        </span>
                      </div>
                    </div>

                    <div className="career-table-wrap">
                      <table className="career-table">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Role</th>
                            <th style={{ textAlign: 'center' }}>Age</th>
                            <th style={{ textAlign: 'center' }}>OVR</th>
                            <th style={{ textAlign: 'right' }}>Wage</th>
                            <th style={{ textAlign: 'right' }}>Est. Market Value</th>
                            <th style={{ textAlign: 'right', width: '180px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rival.squad.slice(0, 8).map((p, idx) => {
                            const ovr = getPlayerOverall(p)
                            const mktVal = calculatePlayerMarketValue(p)
                            const isStarter = idx < 15
                            const suggestedBid = isStarter ? Math.round(mktVal * 1.3) : mktVal
                            const report = career.scoutingReports[p.id]
                            const isScouted = report !== undefined

                            return (
                              <tr key={p.id}>
                                <td>
                                  <button
                                    type="button"
                                    className="career-link-btn"
                                    onClick={() => setViewPlayerId(p.id)}
                                  >
                                    <strong>{p.name}</strong>
                                  </button>
                                </td>
                                <td
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#94a3b8',
                                  }}
                                >
                                  {p.role}
                                </td>
                                <td style={{ textAlign: 'center' }}>{p.age}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`player-ovr-badge ${getOvrClass(ovr)}`}>{ovr}</span>
                                </td>
                                <td
                                  style={{
                                    textAlign: 'right',
                                    fontFamily: 'ui-monospace, monospace',
                                    color: '#94a3b8',
                                  }}
                                >
                                  £{p.wage.toLocaleString()}/wk
                                </td>
                                <td
                                  style={{
                                    textAlign: 'right',
                                    fontFamily: 'ui-monospace, monospace',
                                    color: '#38bdf8',
                                  }}
                                >
                                  £{mktVal.toLocaleString()}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      gap: '0.35rem',
                                      justifyContent: 'flex-end',
                                    }}
                                  >
                                    {!isScouted ? (
                                      <button
                                        type="button"
                                        className="career-secondary-btn"
                                        onClick={() => scoutPlayerById(p.id)}
                                        style={{
                                          fontSize: '0.7rem',
                                          padding: '0.2rem 0.45rem',
                                        }}
                                      >
                                        🔍 Scout
                                      </button>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '0.68rem',
                                          color: '#4ade80',
                                          alignSelf: 'center',
                                        }}
                                      >
                                        ✓ Scouted
                                      </span>
                                    )}
                                    {isSquadFull ? (
                                      <button
                                        type="button"
                                        className="career-secondary-btn"
                                        disabled
                                        style={{
                                          fontSize: '0.7rem',
                                          padding: '0.2rem 0.45rem',
                                        }}
                                      >
                                        Full
                                      </button>
                                    ) : club.balance < suggestedBid ? (
                                      <button
                                        type="button"
                                        className="career-secondary-btn"
                                        disabled
                                        style={{
                                          fontSize: '0.7rem',
                                          padding: '0.2rem 0.45rem',
                                        }}
                                      >
                                        Low Funds
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="career-primary"
                                        onClick={() =>
                                          handleBid(rival.id, p.id, suggestedBid, Math.round(p.wage * 1.1))
                                        }
                                        style={{
                                          fontSize: '0.7rem',
                                          padding: '0.2rem 0.55rem',
                                        }}
                                      >
                                        💼 Bid £{Math.round(suggestedBid / 1000)}k
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
    </section>
  )
}
