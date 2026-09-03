import type React from 'react'
import { COACHING_COURSES, type CoachingCourseId, type PlaybookTactics } from '../../domain/index.ts'
import { getManagerLevel, getManagerPerks, getManagerReputationTier, getUnlockedTactics } from '../../domain/manager.ts'
import { useCareerStore } from '../store.ts'

export const ManagerView: React.FC = () => {
  const career = useCareerStore((state) => state.career)
  const enrollInCoachingCourse = useCareerStore((state) => state.enrollInCoachingCourse)
  const updateTactics = useCareerStore((state) => state.updateTactics)

  if (!career) return null

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) return null

  const mgr = career.manager
  const levelInfo = getManagerLevel(mgr.xp)
  const repTier = getManagerReputationTier(mgr.reputation)
  const perks = getManagerPerks(mgr)
  const unlocked = getUnlockedTactics(mgr)

  const totalMatches = mgr.stats.matchesManaged
  const winRate = totalMatches > 0 ? Math.round((mgr.stats.wins / totalMatches) * 100) : 0

  const renderPlaybookOption = (
    setting: keyof PlaybookTactics,
    value: string,
    title: string,
    desc: string,
    isActive: boolean,
    isUnlocked: boolean,
    lockRequirement?: string,
  ) => {
    return (
      <button
        key={value}
        type="button"
        className={`playbook-pill-btn ${isActive ? 'active' : ''}`}
        onClick={() => {
          if (isUnlocked) {
            updateTactics({ [setting]: value })
          }
        }}
        disabled={!isUnlocked}
      >
        <strong>
          <span>{title}</span>
          {isActive ? (
            <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>● Active</span>
          ) : !isUnlocked ? (
            <span style={{ color: '#f87171', fontSize: '0.7rem' }}>🔒 {lockRequirement ?? 'Locked'}</span>
          ) : null}
        </strong>
        <small>{desc}</small>
      </button>
    )
  }

  return (
    <section className="career-section">
      <header>
        <div>
          <span className="career-kicker">Manager Career & Tactics</span>
          <h2>Manager Profile & Playbook</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span
            className="group-tag"
            style={{
              background: '#38bdf818',
              color: '#38bdf8',
              borderColor: '#38bdf844',
              fontSize: '0.82rem',
              padding: '0.3rem 0.65rem',
            }}
          >
            {repTier.badge} · Rep {mgr.reputation}/100
          </span>
        </div>
      </header>

      {/* Top Dashboard: Profile & Career Stats */}
      <div className="manager-grid">
        {/* Profile Card */}
        <div className="manager-card">
          <div className="manager-header-badge">
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'block',
                }}
              >
                Manager
              </span>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>{mgr.name}</h3>
              <span
                style={{
                  fontSize: '0.82rem',
                  color: '#38bdf8',
                  fontWeight: 600,
                }}
              >
                {repTier.title}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                className="group-tag"
                style={{
                  background: '#818cf822',
                  color: '#a5b4fc',
                  borderColor: '#818cf855',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  padding: '0.35rem 0.75rem',
                }}
              >
                Level {levelInfo.level}
              </span>
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginBottom: '0.35rem',
              }}
            >
              <span>Career XP</span>
              <span>
                {mgr.xp.toLocaleString()} / {levelInfo.nextLevelXp.toLocaleString()} XP
              </span>
            </div>
            <div className="manager-xp-bar">
              <div className="manager-xp-fill" style={{ width: `${Math.round(levelInfo.progress * 100)}%` }} />
            </div>
          </div>

          {/* Active Perks Summary */}
          <div
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgb(255 255 255 / 6%)',
              borderRadius: '0.45rem',
              padding: '0.65rem 0.85rem',
              fontSize: '0.78rem',
            }}
          >
            <span
              style={{
                color: '#94a3b8',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: '0.35rem',
              }}
            >
              Active Coaching Perks
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                color: '#cbd5e1',
              }}
            >
              <div>
                📈 Squad Training:{' '}
                <strong style={{ color: '#4ade80' }}>+{Math.round(perks.trainingBonusPct * 100)}%</strong>
              </div>
              <div>
                ⚡ Match XP Gain:{' '}
                <strong style={{ color: '#38bdf8' }}>+{Math.round(perks.matchXpBonusPct * 100)}%</strong>
              </div>
              <div>
                🛡️ Tactical Discipline: <strong style={{ color: '#facc15' }}>+{perks.disciplineBonus}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Career Match Record */}
        <div className="manager-card">
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
              }}
            >
              Career Match Record
            </span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Competitive Performance</h3>
          </div>

          <div className="manager-stats-grid">
            <div className="manager-stat-box">
              <small>Matches</small>
              <strong>{totalMatches}</strong>
            </div>
            <div className="manager-stat-box">
              <small>Record (W-D-L)</small>
              <strong style={{ color: '#4ade80' }}>{mgr.stats.wins}</strong>-
              <strong style={{ color: '#facc15' }}>{mgr.stats.draws}</strong>-
              <strong style={{ color: '#f87171' }}>{mgr.stats.losses}</strong>
            </div>
            <div className="manager-stat-box">
              <small>Win Rate</small>
              <strong style={{ color: '#38bdf8' }}>{winRate}%</strong>
            </div>
            <div className="manager-stat-box">
              <small>Points For</small>
              <strong style={{ color: '#f8fafc' }}>{mgr.stats.pointsFor}</strong>
            </div>
            <div className="manager-stat-box">
              <small>Points Against</small>
              <strong style={{ color: '#94a3b8' }}>{mgr.stats.pointsAgainst}</strong>
            </div>
            <div className="manager-stat-box">
              <small>Trophies</small>
              <strong style={{ color: '#facc15' }}>🏆 {mgr.stats.trophiesWon}</strong>
            </div>
          </div>

          {/* Active Course Banner */}
          {mgr.activeCourse ? (
            (() => {
              const c = COACHING_COURSES[mgr.activeCourse.courseId]
              return (
                <div
                  style={{
                    background: 'rgba(14, 116, 144, 0.2)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '0.45rem',
                    padding: '0.75rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <strong style={{ color: '#38bdf8' }}>⏳ Active Study: {c.name}</strong>
                    <span
                      className="group-tag"
                      style={{
                        background: '#0284c7',
                        color: '#fff',
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.45rem',
                      }}
                    >
                      {mgr.activeCourse.roundsRemaining} round
                      {mgr.activeCourse.roundsRemaining > 1 ? 's' : ''} left
                    </span>
                  </div>
                  <small style={{ color: '#94a3b8' }}>
                    Completing this course unlocks new tactical capabilities in your portable playbook.
                  </small>
                </div>
              )
            })()
          ) : (
            <div
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px dashed rgb(255 255 255 / 10%)',
                borderRadius: '0.45rem',
                padding: '0.75rem',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.8rem',
              }}
            >
              No active course in progress. Enroll in a qualification below to expand your tactical toolkit.
            </div>
          )}
        </div>
      </div>

      {/* Section: Coaching Academy Qualifications */}
      <div style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '0.75rem',
          }}
        >
          <div>
            <span className="career-kicker">Professional Development</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>Coaching Academy & Qualifications</h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Club Balance: <strong style={{ color: '#4ade80' }}>£{club.balance.toLocaleString()}</strong>
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '0.85rem',
          }}
        >
          {(Object.keys(COACHING_COURSES) as CoachingCourseId[]).map((cId) => {
            const course = COACHING_COURSES[cId]
            const isCompleted = mgr.qualifications.includes(cId)
            const isActive = mgr.activeCourse?.courseId === cId
            const meetsLevel = mgr.level >= course.levelRequired
            const canAfford = club.balance >= course.cost

            return (
              <div key={cId} className={`course-card ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '1.3rem', marginRight: '0.35rem' }}>{course.badge}</span>
                    <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{course.name}</strong>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                        marginTop: '0.2rem',
                      }}
                    >
                      Category: <span style={{ color: '#38bdf8' }}>{course.category}</span> · Req:{' '}
                      <strong>Level {course.levelRequired}</strong>
                    </div>
                  </div>
                  {isCompleted ? (
                    <span
                      className="group-tag"
                      style={{
                        background: '#22c55e22',
                        color: '#4ade80',
                        borderColor: '#22c55e55',
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.5rem',
                      }}
                    >
                      🎓 Qualified
                    </span>
                  ) : isActive ? (
                    <span
                      className="group-tag"
                      style={{
                        background: '#0284c722',
                        color: '#38bdf8',
                        borderColor: '#0284c755',
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.5rem',
                      }}
                    >
                      ⏳ In Progress
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#f8fafc',
                      }}
                    >
                      £{course.cost.toLocaleString()}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: '0.76rem',
                    color: '#cbd5e1',
                    lineHeight: 1.4,
                  }}
                >
                  {course.description}
                </p>

                <div
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '0.35rem',
                    padding: '0.45rem 0.6rem',
                    fontSize: '0.72rem',
                  }}
                >
                  <span
                    style={{
                      color: '#94a3b8',
                      display: 'block',
                      marginBottom: '0.2rem',
                      fontSize: '0.68rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    Perks & Tactical Unlocks:
                  </span>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '1.1rem',
                      color: '#93c5fd',
                    }}
                  >
                    {course.perks.map((p) => (
                      <li key={`${course.id}-${p}`}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                    Duration: {course.roundsDuration} rounds
                  </small>
                  {isCompleted ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#4ade80',
                        fontWeight: 600,
                      }}
                    >
                      ✓ Completed
                    </span>
                  ) : isActive ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#38bdf8',
                        fontWeight: 600,
                      }}
                    >
                      {mgr.activeCourse?.roundsRemaining} rounds remaining
                    </span>
                  ) : !meetsLevel ? (
                    <button
                      type="button"
                      className="career-secondary-btn"
                      disabled
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                    >
                      🔒 Req Level {course.levelRequired}
                    </button>
                  ) : mgr.activeCourse !== null ? (
                    <button
                      type="button"
                      className="career-secondary-btn"
                      disabled
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                    >
                      Course in Progress
                    </button>
                  ) : !canAfford ? (
                    <button
                      type="button"
                      className="career-secondary-btn"
                      disabled
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                    >
                      Insufficient Funds
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="career-primary"
                      onClick={() => enrollInCoachingCourse(course.id)}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}
                    >
                      Enroll (£{course.cost.toLocaleString()})
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section: Portable Tactical Playbook */}
      <div className="playbook-section">
        <div style={{ marginBottom: '1rem' }}>
          <span className="career-kicker">Manager's Toolkit</span>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>Portable Tactical Playbook</h3>
          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: '0.8rem',
              color: '#94a3b8',
            }}
          >
            Your strategic philosophy and playbook structures are portable across clubs. Tactics unlocked through your
            coaching qualifications are available instantly.
          </p>
        </div>

        {/* Pillar 1: Attack Phase Structure */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              justifySelf: 'space-between',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>1. Attack Phase Play Structure</strong>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
              Current: <strong>{mgr.playbook.attackStructure.replace(/_/g, ' ').toUpperCase()}</strong>
            </span>
          </div>
          <div className="playbook-option-group">
            {renderPlaybookOption(
              'attackStructure',
              'standard',
              'Standard Balanced',
              'Balanced phase play with fluid forward support and standard wide distribution.',
              mgr.playbook.attackStructure === 'standard',
              unlocked.attackStructures.has('standard'),
            )}
            {renderPlaybookOption(
              'attackStructure',
              'pod_1_3_3_1',
              '1-3-3-1 Forward Pods',
              'Tight dual pods create continuous forward momentum and quick ball off 9.',
              mgr.playbook.attackStructure === 'pod_1_3_3_1',
              unlocked.attackStructures.has('pod_1_3_3_1'),
              '⚡ Attack Architecture',
            )}
            {renderPlaybookOption(
              'attackStructure',
              'pod_2_4_2',
              '2-4-2 Wide Pods',
              'Wide spacing stretches defensive lines with agile flankers roaming the tramlines.',
              mgr.playbook.attackStructure === 'pod_2_4_2',
              unlocked.attackStructures.has('pod_2_4_2'),
              '⚡ Attack Architecture',
            )}
            {renderPlaybookOption(
              'attackStructure',
              'wide_spread',
              'Wide Spread Architecture',
              'High-risk, expansive width with rapid backline recycling across both touchlines.',
              mgr.playbook.attackStructure === 'wide_spread',
              unlocked.attackStructures.has('wide_spread'),
              '🏆 Elite Director',
            )}
          </div>
        </div>

        {/* Pillar 2: Defensive System */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>2. Defensive System & Line Press</strong>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
              Current: <strong>{mgr.playbook.defenseStructure.replace(/_/g, ' ').toUpperCase()}</strong>
            </span>
          </div>
          <div className="playbook-option-group">
            {renderPlaybookOption(
              'defenseStructure',
              'drift',
              'Drift Containment',
              'Disciplined connected drift that slides outward to use the touchline as an extra defender.',
              mgr.playbook.defenseStructure === 'drift',
              unlocked.defenseStructures.has('drift'),
            )}
            {renderPlaybookOption(
              'defenseStructure',
              'blitz',
              'High-Pressure Blitz',
              'Aggressive line-speed rushing the first receiver to force handling errors and turnovers.',
              mgr.playbook.defenseStructure === 'blitz',
              unlocked.defenseStructures.has('blitz'),
              '🛡️ Defense Mastermind',
            )}
            {renderPlaybookOption(
              'defenseStructure',
              'pendulum_cover',
              'Pendulum Backfield Cover',
              'Back three pendulum system preventing chip kicks and territory breaches.',
              mgr.playbook.defenseStructure === 'pendulum_cover',
              unlocked.defenseStructures.has('pendulum_cover'),
              '🛡️ Defense Mastermind',
            )}
            {renderPlaybookOption(
              'defenseStructure',
              'aggressive_rush',
              'Aggressive Rush Defense',
              'Maximum line speed with fierce tackle pressure on opposing playmakers.',
              mgr.playbook.defenseStructure === 'aggressive_rush',
              unlocked.defenseStructures.has('aggressive_rush'),
              '🛡️ Defense Mastermind',
            )}
          </div>
        </div>

        {/* Pillar 3: Set Piece Focus */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>3. Set Piece & Penalty Strategy</strong>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
              Current: <strong>{mgr.playbook.setPieceFocus.replace(/_/g, ' ').toUpperCase()}</strong>
            </span>
          </div>
          <div className="playbook-option-group">
            {renderPlaybookOption(
              'setPieceFocus',
              'balanced',
              'Balanced Set Piece',
              'Standard scrum/lineout options with situational territorial kicking.',
              mgr.playbook.setPieceFocus === 'balanced',
              unlocked.setPieceFocuses.has('balanced'),
            )}
            {renderPlaybookOption(
              'setPieceFocus',
              'quick_tap',
              'Quick Tap & Go',
              'Catch defenses unorganized by tapping immediately from penalty marks.',
              mgr.playbook.setPieceFocus === 'quick_tap',
              unlocked.setPieceFocuses.has('quick_tap'),
              '🏉 Set-Piece Mastery',
            )}
            {renderPlaybookOption(
              'setPieceFocus',
              'maul_drive',
              'Rolling Maul Drive',
              'Power into 5m corners and execute disciplined forward rolling mauls.',
              mgr.playbook.setPieceFocus === 'maul_drive',
              unlocked.setPieceFocuses.has('maul_drive'),
              '🏉 Set-Piece Mastery',
            )}
            {renderPlaybookOption(
              'setPieceFocus',
              'territory_boot',
              'Territory Boot & Chase',
              'Tactical kicking pinning opposition deep in their 22 with relentless chase.',
              mgr.playbook.setPieceFocus === 'territory_boot',
              unlocked.setPieceFocuses.has('territory_boot'),
              '🏉 Set-Piece Mastery',
            )}
          </div>
        </div>

        {/* Pillar 4 & 5: Kicking Pressure & Match Tempo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Kicking Pressure */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>4. Kicking Preference</strong>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                Current: <strong>{mgr.playbook.kickPressure.toUpperCase()}</strong>
              </span>
            </div>
            <div className="playbook-option-group">
              {renderPlaybookOption(
                'kickPressure',
                'low',
                'Run / Keep Ball in Hand',
                'Emphasize carrying and phase passing over kicking.',
                mgr.playbook.kickPressure === 'low',
                true,
              )}
              {renderPlaybookOption(
                'kickPressure',
                'standard',
                'Standard Balance',
                'Balanced situational kicking on 3rd+ phase.',
                mgr.playbook.kickPressure === 'standard',
                true,
              )}
              {renderPlaybookOption(
                'kickPressure',
                'high',
                'Territorial Kicking',
                'High kick frequency to win field position battle.',
                mgr.playbook.kickPressure === 'high',
                true,
              )}
            </div>
          </div>

          {/* Match Tempo */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>5. Match Play Tempo</strong>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                Current: <strong>{mgr.playbook.tempo.replace(/_/g, ' ').toUpperCase()}</strong>
              </span>
            </div>
            <div className="playbook-option-group">
              {renderPlaybookOption(
                'tempo',
                'controlled',
                'Controlled & Patient',
                'Methodical buildup with high ball retention discipline.',
                mgr.playbook.tempo === 'controlled',
                true,
              )}
              {renderPlaybookOption(
                'tempo',
                'balanced',
                'Standard Rhythm',
                'Adapt tempo to game state and field position.',
                mgr.playbook.tempo === 'balanced',
                true,
              )}
              {renderPlaybookOption(
                'tempo',
                'high_tempo',
                'High-Octane Pace',
                'Rapid ruck recycling and maximum line speed.',
                mgr.playbook.tempo === 'high_tempo',
                true,
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
