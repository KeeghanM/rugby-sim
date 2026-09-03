import type React from 'react'
import type { MatchResult as SimulationMatchResult } from '../../../simulation/domain.ts'
import {
  advanceCareer,
  type Career,
  deriveStandings,
  type Fixture,
  getManagerLevel,
  getManagerReputationTier,
  getUpcomingManagedFixture,
  roleName,
} from '../../domain/index.ts'
import { Table } from '../components/Table.tsx'
import { Tile } from '../components/Tile.tsx'
import { clubById, fixtureTeams, formatMoney, getPlayerOverall } from '../formatters.ts'
import { useCareerStore } from '../store.ts'

export interface HomeViewProps {
  onWatchMatch?: (career: Career, fixture: Fixture, onFinish: (result: SimulationMatchResult) => void) => void
}

export const HomeView: React.FC<HomeViewProps> = ({ onWatchMatch }) => {
  const career = useCareerStore((state) => state.career)
  const setView = useCareerStore((state) => state.setView)
  const advance = useCareerStore((state) => state.advance)
  const ackEvent = useCareerStore((state) => state.ackEvent)
  const rolloverSeason = useCareerStore((state) => state.rolloverSeason)
  const setCareerDirect = useCareerStore((state) => state.setCareerDirect)

  if (!career) return null

  const club = clubById(career, career.managedClubId)
  const upcoming = getUpcomingManagedFixture(career)
  const isMatchDay = career.checkpoint === 'matchDay'
  const plan = club.trainingPlan

  const avgOvr = Math.round(club.squad.reduce((sum, p) => sum + getPlayerOverall(p), 0) / club.squad.length)
  const avgFitness = Math.round(club.squad.reduce((sum, p) => sum + p.fitness, 0) / club.squad.length)
  const injuredPlayers = club.squad.filter((p) => p.injury !== null)
  const injuredMatchdayPlayers = club.squad.slice(0, 23).filter((p) => p.injury !== null).length
  const tiredMatchdayPlayers = club.squad.slice(0, 23).filter((p) => p.fitness < 70).length
  const unreadMessages = career.inbox.filter((m) => !m.read).length

  const latestFixture = [...career.season.fixtures]
    .reverse()
    .find((f) => f.status === 'played' && f.result !== null && (f.homeClubId === club.id || f.awayClubId === club.id))

  const handleWatchMatch = () => {
    if (!upcoming || !onWatchMatch) return
    onWatchMatch(career, upcoming, (matchResult) => {
      const next = advanceCareer(
        career,
        new Map([
          [
            upcoming.id,
            {
              homeScore: matchResult.score[0],
              awayScore: matchResult.score[1],
              resultObj: matchResult,
            },
          ],
        ]),
      )
      setCareerDirect(next)
    })
  }

  const playerWagesWeekly = club.squad.reduce((sum, p) => sum + p.wage, 0)
  const staffWagesWeekly = club.staff.reduce((sum, s) => sum + s.wage, 0)
  const totalWeeklyWages = playerWagesWeekly + staffWagesWeekly

  const estHomeGate = Math.round((3200 + club.reputation * 55 + 60 * 45) * 18 * 0.72)
  const estMonthlyIncome = estHomeGate * 2
  const estMonthlyExpenses = totalWeeklyWages * 4
  const estMonthlyPnL = estMonthlyIncome - estMonthlyExpenses
  const isProfit = estMonthlyPnL >= 0
  const pnlColor = isProfit ? '#4ade80' : '#f87171'
  const pnlText = isProfit ? `+${formatMoney(estMonthlyPnL)}/mo` : `-${formatMoney(Math.abs(estMonthlyPnL))}/mo`

  const mgr = career.manager
  const mgrLevel = getManagerLevel(mgr.xp)
  const repTier = getManagerReputationTier(mgr.reputation)
  const scout = club.staff.find((s) => s.role === 'chiefScout')

  return (
    <div className="career-home-grid">
      {/* Season End Banner */}
      {career.checkpoint === 'seasonEnd' &&
        (() => {
          const standings = deriveStandings(career)
          const userStandingIndex = standings.findIndex((s) => s.clubId === club.id)
          const userFinishPos = userStandingIndex !== -1 ? userStandingIndex + 1 : 6
          const champion = standings[0]

          return (
            <section
              className="career-lead-panel"
              style={{
                gridColumn: '1 / -1',
                borderLeft: '4px solid #facc15',
                background: 'linear-gradient(90deg, rgba(250, 204, 21, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
                minHeight: 'auto',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <span className="career-kicker" style={{ color: '#facc15' }}>
                    Season {career.seasonYear} Complete
                  </span>
                  <h3
                    style={{
                      margin: '0.2rem 0',
                      fontSize: '1.25rem',
                      color: '#f8fafc',
                    }}
                  >
                    🏆 {champion?.clubName ?? 'Champions'} Crowned League Champions
                  </h3>
                  <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.85rem' }}>
                    {club.name} finished <strong>#{userFinishPos}</strong> in the final standings. Proceed to process
                    player aging, contract expirations, fresh youth intake, and launch Season {career.seasonYear + 1}!
                  </p>
                </div>
                <button
                  type="button"
                  className="career-primary"
                  onClick={rolloverSeason}
                  style={{
                    background: '#facc15',
                    color: '#0f172a',
                    fontWeight: 800,
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.88rem',
                  }}
                >
                  🚀 Begin {career.seasonYear + 1} Season →
                </button>
              </div>
            </section>
          )
        })()}

      {/* Pending Event Banner */}
      {career.pendingEvent && (
        <section
          className="career-lead-panel"
          style={{
            gridColumn: '1 / -1',
            borderLeft: '4px solid #38bdf8',
            background: 'rgba(56, 189, 248, 0.1)',
            minHeight: 'auto',
            padding: '1rem 1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <span className="career-kicker" style={{ color: '#38bdf8' }}>
                Action Required
              </span>
              <h3
                style={{
                  margin: '0.2rem 0',
                  fontSize: '1.15rem',
                  color: '#f8fafc',
                }}
              >
                {career.pendingEvent.title}
              </h3>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.85rem' }}>{career.pendingEvent.message}</p>
            </div>
            <button type="button" className="career-primary" onClick={ackEvent}>
              Acknowledge
            </button>
          </div>
        </section>
      )}

      {/* Match Day Action Tile */}
      {isMatchDay &&
        upcoming &&
        (() => {
          const { home, away } = fixtureTeams(career, upcoming)
          const isHome = upcoming.homeClubId === club.id
          return (
            <section
              className="career-metric matchday-tile"
              style={{
                borderColor: 'rgba(56, 189, 248, 0.4)',
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span className="career-kicker" style={{ color: '#38bdf8' }}>
                  Match Day Action
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Rd {upcoming.round}</span>
              </div>
              <div
                style={{
                  marginTop: '0.4rem',
                  fontSize: '1rem',
                  fontWeight: 750,
                  color: '#f8fafc',
                }}
              >
                {home.name} v {away.name}
              </div>
              <p
                style={{
                  marginTop: '0.2rem',
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                }}
              >
                {isHome ? 'Home Stadium' : 'Away Stadium'}
              </p>
              <div className="matchday-readiness">
                <span className="ready">15 starters</span>
                <span className="ready">8 reserves</span>
                <span className={injuredMatchdayPlayers > 0 ? 'alert' : 'ready'}>
                  {injuredMatchdayPlayers > 0 ? `${injuredMatchdayPlayers} injured` : 'No injuries'}
                </span>
                <span className={tiredMatchdayPlayers > 0 ? 'warn' : 'ready'}>
                  {tiredMatchdayPlayers > 0 ? `${tiredMatchdayPlayers} fatigued` : 'Squad ready'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                {onWatchMatch && (
                  <button
                    type="button"
                    className="career-primary"
                    onClick={handleWatchMatch}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                  >
                    🎬 Watch 3D
                  </button>
                )}
                <button
                  type="button"
                  className="career-secondary-btn"
                  onClick={advance}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                >
                  ⚡ Quick Sim
                </button>
              </div>
            </section>
          )
        })()}

      {/* Latest Result Tile */}
      {latestFixture?.result &&
        (() => {
          const isHome = latestFixture.homeClubId === club.id
          const oppId = isHome ? latestFixture.awayClubId : latestFixture.homeClubId
          const opponent = clubById(career, oppId)
          const userScore = isHome ? latestFixture.result.homeScore : latestFixture.result.awayScore
          const oppScore = isHome ? latestFixture.result.awayScore : latestFixture.result.homeScore
          const won = userScore > oppScore
          const drawn = userScore === oppScore
          const outcomeText = drawn ? 'DRAW' : won ? 'VICTORY' : 'DEFEAT'
          const outcomeColor = drawn ? '#facc15' : won ? '#4ade80' : '#ef4444'

          return (
            <Tile
              className="result-tile"
              kicker="Latest Result"
              action={{
                label: 'Report →',
                onClick: () => setView('inbox'),
              }}
              value={`${userScore} - ${oppScore}`}
              valueBadge={{ text: outcomeText, color: outcomeColor }}
              subtitle={`vs ${opponent.name} (${isHome ? 'Home' : 'Away'})`}
              footer={`Round ${latestFixture.round} Match`}
            />
          )
        })()}

      {/* Manager Profile Tile */}
      <Tile
        className="manager-tile"
        kicker="Manager Profile"
        action={{
          label: 'Playbook →',
          onClick: () => setView('manager'),
        }}
        value={`Lvl ${mgrLevel.level}`}
        valueBadge={{
          text: repTier.badge,
          color: '#818cf8',
        }}
        content={
          <div
            style={{
              marginTop: '0.4rem',
              fontSize: '0.78rem',
              color: '#cbd5e1',
            }}
          >
            <span>
              Playbook: <strong style={{ color: '#38bdf8' }}>{mgr.playbook.attackStructure.replace(/_/g, ' ')}</strong>
            </span>
          </div>
        }
        footer={`XP: ${mgr.xp.toLocaleString()} · Courses: ${mgr.qualifications.length}/5`}
      />

      {/* Transfers Tile */}
      <Tile
        className="recruitment-tile"
        kicker="Transfers & Scouting"
        action={{
          label: 'Market →',
          onClick: () => setView('transfers'),
        }}
        value={`${career.freeAgents.length}`}
        valueBadge={{
          text: 'Free Agents',
          color: '#facc15',
        }}
        content={
          <div
            style={{
              marginTop: '0.4rem',
              fontSize: '0.78rem',
              color: '#cbd5e1',
            }}
          >
            <span>
              Scout:{' '}
              <strong style={{ color: '#38bdf8' }}>
                Lvl {scout?.level ?? 1} ({Math.round((0.4 + (scout?.level ?? 1) * 0.12) * 100)}% Acc)
              </strong>
            </span>
          </div>
        }
        footer={`Squad: ${club.squad.length}/40 · ${40 - club.squad.length} Slots Open`}
      />

      {/* Squad Profile Tile */}
      <Tile
        className="squad-tile"
        kicker="Squad Profile"
        action={{
          label: 'Team Sheet →',
          onClick: () => setView('selection'),
        }}
        value={avgOvr}
        valueBadge={{
          text: 'OVR',
          color: '#38bdf8',
          style: { pointerEvents: 'none' },
        }}
        content={
          <div
            style={{
              marginTop: '0.4rem',
              fontSize: '0.78rem',
              color: '#cbd5e1',
            }}
          >
            <span className="fitness" style={{ width: '36px' }}>
              <i style={{ width: `${avgFitness}%` }} />
            </span>
            <strong>{avgFitness}%</strong> Avg Condition
          </div>
        }
        footer={`15 Starters · 8 Bench · ${club.squad.length} Squad`}
      />

      {/* Medical & Rehab Tile */}
      <Tile
        className="medical-tile"
        kicker="Medical & Rehab"
        action={{
          label: 'Rehab Wing →',
          onClick: () => setView('training'),
        }}
        content={
          <div style={{ marginTop: '0.6rem' }}>
            {injuredPlayers.length === 0 ? (
              <>
                <strong style={{ margin: 0, fontSize: '1.8rem', color: '#4ade80' }}>0</strong>{' '}
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#4ade80',
                    fontWeight: 700,
                  }}
                >
                  Sidelined
                </span>
                <p
                  style={{
                    marginTop: '0.35rem',
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                  }}
                >
                  Squad fully healthy & available
                </p>
              </>
            ) : (
              <>
                <strong style={{ margin: 0, fontSize: '1.8rem', color: '#f87171' }}>{injuredPlayers.length}</strong>{' '}
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#f87171',
                    fontWeight: 700,
                  }}
                >
                  Sidelined
                </span>
                <p
                  style={{
                    marginTop: '0.35rem',
                    fontSize: '0.72rem',
                    color: '#fca5a5',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {injuredPlayers.map((p) => `${p.name} (${p.injury?.weeksRemaining}w)`).join(', ')}
                </p>
              </>
            )}
          </div>
        }
        footer={`Medical Room Lvl ${club.facilities.medicalRoom}`}
      />

      {/* Training Regimen Tile */}
      <Tile
        className="training-tile"
        kicker="Training Regimen"
        action={{
          label: 'Training Center →',
          onClick: () => setView('training'),
        }}
        content={
          <>
            <div style={{ marginTop: '0.6rem' }}>
              <strong style={{ margin: 0, fontSize: '1.4rem', color: '#f8fafc' }}>{roleName(plan.focus)}</strong>
            </div>
            <p
              style={{
                marginTop: '0.35rem',
                fontSize: '0.78rem',
                color: '#cbd5e1',
              }}
            >
              Intensity: <strong style={{ color: '#38bdf8' }}>{roleName(plan.intensity)}</strong>
            </p>
          </>
        }
        footer={`Gym Lvl ${club.facilities.gym} · Grounds Lvl ${club.facilities.trainingGround}`}
      />

      {/* Finances Tile */}
      <Tile
        className="finance-tile"
        kicker="Club Finances"
        action={{
          label: 'Finances →',
          onClick: () => setView('finances'),
        }}
        value={formatMoney(club.balance)}
        valueColor="#38bdf8"
        content={
          <div
            style={{
              marginTop: '0.4rem',
              fontSize: '0.78rem',
              color: '#cbd5e1',
            }}
          >
            Monthly P&L:{' '}
            <strong
              style={{
                color: pnlColor,
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.95rem',
              }}
            >
              {pnlText}
            </strong>
          </div>
        }
        footer={`Wages: -${formatMoney(totalWeeklyWages)}/wk · Gate: +${formatMoney(estHomeGate)}`}
      />

      {/* Communications Tile */}
      <Tile
        className="inbox-tile"
        kicker="Communications"
        action={{
          label: 'Open Inbox →',
          onClick: () => setView('inbox'),
        }}
        value={unreadMessages}
        valueColor={unreadMessages > 0 ? '#38bdf8' : '#94a3b8'}
        valueBadge={{
          text: 'Unread',
          color: unreadMessages > 0 ? '#38bdf8' : '#94a3b8',
        }}
        subtitle={
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
            }}
          >
            {career.inbox[0]?.title ? career.inbox[0].title : 'No new messages'}
          </span>
        }
        footer={`Total Messages: ${career.inbox.length}`}
      />

      {/* League Table Snapshot */}
      <section className="career-section career-table-preview">
        <header>
          <div>
            <span className="career-kicker">Competition</span>
            <h2>{career.season.name} Standings</h2>
          </div>
          <button type="button" onClick={() => setView('league')}>
            Full table
          </button>
        </header>
        <Table career={career} />
      </section>
    </div>
  )
}
