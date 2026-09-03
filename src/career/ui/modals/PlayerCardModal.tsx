import type React from 'react'
import type { Club, Player } from '../../domain/index.ts'
import { roleName } from '../../domain/index.ts'
import { Modal } from '../components/Modal.tsx'
import { formatDist, getOvrClass, getPlayerOverall, positionGroupClass } from '../formatters.ts'
import { useCareerStore } from '../store.ts'
import { SLOT_NAMES } from '../types.ts'

export interface SkillBarProps {
  label: string
  value: number
  color?: string
}

export const SkillBar: React.FC<SkillBarProps> = ({ label, value, color = '#38bdf8' }) => (
  <div
    className="player-skill-row"
    style={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr 36px',
      gap: '0.75rem',
      alignItems: 'center',
      fontSize: '0.75rem',
    }}
  >
    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{label}</span>
    <div
      className="player-skill-track"
      style={{
        height: '6px',
        background: '#334155',
        borderRadius: '3px',
        overflow: 'hidden',
      }}
    >
      <div
        className="player-skill-fill"
        style={{
          width: `${value}%`,
          height: '100%',
          background: color,
          borderRadius: '3px',
        }}
      />
    </div>
    <span
      style={{
        fontFamily: 'ui-monospace, monospace',
        fontWeight: 700,
        color: '#f8fafc',
        textAlign: 'right',
      }}
    >
      {value}
    </span>
  </div>
)

export const PlayerCardModal: React.FC = () => {
  const career = useCareerStore((state) => state.career)
  const viewPlayerId = useCareerStore((state) => state.viewPlayerId)
  const setViewPlayerId = useCareerStore((state) => state.setViewPlayerId)

  if (!career || !viewPlayerId) return null

  let foundPlayer: Player | undefined
  let foundClub: Club | undefined
  let foundSlot: number | undefined

  for (const c of career.season.clubs) {
    const pIndex = c.squad.findIndex((p) => p.id === viewPlayerId)
    if (pIndex !== -1) {
      foundPlayer = c.squad[pIndex]
      foundClub = c
      if (c.id === career.managedClubId) foundSlot = pIndex
      break
    }
    const aIndex = c.academySquad.findIndex((p) => p.id === viewPlayerId)
    if (aIndex !== -1) {
      foundPlayer = c.academySquad[aIndex]
      foundClub = c
      break
    }
  }

  if (!foundPlayer) {
    const freeAgent = career.freeAgents.find((p) => p.id === viewPlayerId)
    if (freeAgent) {
      foundPlayer = freeAgent
    }
  }

  if (!foundPlayer) return null

  const clubColor = foundClub?.color ?? '#38bdf8'
  const clubName = foundClub?.name ?? 'Free Agent'
  const ovr = getPlayerOverall(foundPlayer)
  const { decision, handling, passing, kicking, tackling } = foundPlayer.skills
  const speed = foundPlayer.speed
  const strength = foundPlayer.strength

  const slotInfo = foundSlot !== undefined ? `#${foundSlot + 1} ${SLOT_NAMES[foundSlot]}` : roleName(foundPlayer.role)

  const rec = foundPlayer.careerRecord
  const totalTackles = rec.tacklesMade + rec.tacklesMissed
  const tacklePct = totalTackles > 0 ? Math.round((rec.tacklesMade / totalTackles) * 100) : 0
  const passPct = rec.totalPasses > 0 ? Math.round((rec.successfulPasses / rec.totalPasses) * 100) : 0
  const kickPct = rec.totalKicks > 0 ? Math.round((rec.successfulKicks / rec.totalKicks) * 100) : 0

  const customHeader = (
    <div className="player-profile-header" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
      <div
        className="player-shirt"
        style={
          {
            ['--team-color' as string]: clubColor,
            width: '3.2rem',
            height: '2.8rem',
            fontSize: '1.1rem',
            margin: 0,
          } as React.CSSProperties
        }
      >
        <span>{foundSlot !== undefined ? foundSlot + 1 : ''}</span>
      </div>
      <div>
        <span className="career-kicker">{clubName} · Player Profile</span>
        <h3
          style={{
            margin: '0.2rem 0',
            fontSize: '1.3rem',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {foundPlayer.name}
          <span className={`ovr-badge ${getOvrClass(ovr)}`}>OVR {ovr}</span>
        </h3>
        <div
          style={{
            fontSize: '0.78rem',
            color: '#94a3b8',
            display: 'flex',
            gap: '0.6rem',
            alignItems: 'center',
            marginTop: '0.2rem',
          }}
        >
          <span className={`group-tag position-tag ${positionGroupClass(foundPlayer.role)}`}>{slotInfo}</span>
          <span>·</span>
          <span>Age {foundPlayer.age}</span>
          <span>·</span>
          <span>
            Natural: <strong>{roleName(foundPlayer.role)}</strong>
          </span>
          <span>·</span>
          <span className="player-potential">Potential {foundPlayer.potential}</span>
        </div>
      </div>
    </div>
  )

  return (
    <Modal
      className="player-profile-modal"
      maxWidth="620px"
      customHeader={customHeader}
      onClose={() => setViewPlayerId(null)}
    >
      <div
        style={{
          display: 'grid',
          gap: '1.15rem',
          maxHeight: '75vh',
          overflowY: 'auto',
        }}
      >
        {foundPlayer.injury && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '0.45rem',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <div>
              <strong style={{ color: '#ef4444' }}>Injured: {foundPlayer.injury.type}</strong> (
              {foundPlayer.injury.severity})
              <div
                style={{
                  fontSize: '0.76rem',
                  color: '#cbd5e1',
                  marginTop: '0.15rem',
                }}
              >
                Estimated return: {foundPlayer.injury.weeksRemaining} week
                {foundPlayer.injury.weeksRemaining > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        <div
          className="player-physical-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.65rem',
          }}
        >
          <div
            className="player-physical-stat pace"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgb(255 255 255 / 10%)',
              borderRadius: '0.45rem',
              padding: '0.75rem',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}
            >
              Pace / Speed
            </span>
            <strong
              style={{
                display: 'block',
                fontSize: '1.4rem',
                color: '#38bdf8',
                fontFamily: 'ui-monospace, monospace',
                marginTop: '0.2rem',
              }}
            >
              {speed}
            </strong>
          </div>
          <div
            className="player-physical-stat power"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgb(255 255 255 / 10%)',
              borderRadius: '0.45rem',
              padding: '0.75rem',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}
            >
              Power / Strength
            </span>
            <strong
              style={{
                display: 'block',
                fontSize: '1.4rem',
                color: '#4ade80',
                fontFamily: 'ui-monospace, monospace',
                marginTop: '0.2rem',
              }}
            >
              {strength}
            </strong>
          </div>
          <div
            className="player-physical-stat condition"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgb(255 255 255 / 10%)',
              borderRadius: '0.45rem',
              padding: '0.75rem',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}
            >
              Condition
            </span>
            <strong
              style={{
                display: 'block',
                fontSize: '1.4rem',
                color: '#facc15',
                fontFamily: 'ui-monospace, monospace',
                marginTop: '0.2rem',
              }}
            >
              {foundPlayer.fitness}%
            </strong>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgb(255 255 255 / 10%)',
            borderRadius: '0.5rem',
            padding: '1rem',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#38bdf8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Season Career Record
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {rec.appearances} Apps ({rec.starts} Starts, {rec.subAppearances} Subs)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.65rem',
              fontSize: '0.8rem',
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '0.5rem',
                borderRadius: '0.35rem',
              }}
            >
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: '0.68rem',
                  display: 'block',
                }}
              >
                SCORING
              </span>
              <strong style={{ color: '#facc15', fontSize: '1.05rem' }}>{rec.tries}</strong>{' '}
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Tries</span> ·{' '}
              <strong style={{ color: '#38bdf8' }}>{rec.lineBreaks}</strong>{' '}
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Breaks</span>
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '0.5rem',
                borderRadius: '0.35rem',
              }}
            >
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: '0.68rem',
                  display: 'block',
                }}
              >
                TACKLE %
              </span>
              <strong style={{ color: '#4ade80', fontSize: '1.05rem' }}>{tacklePct}%</strong>{' '}
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                ({rec.tacklesMade}/{totalTackles})
              </span>
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '0.5rem',
                borderRadius: '0.35rem',
              }}
            >
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: '0.68rem',
                  display: 'block',
                }}
              >
                METRES CARRIED
              </span>
              <strong style={{ color: '#38bdf8', fontSize: '1.05rem' }}>{formatDist(rec.distanceCarried)}</strong>
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '0.5rem',
                borderRadius: '0.35rem',
              }}
            >
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: '0.68rem',
                  display: 'block',
                }}
              >
                PASSING ACCURACY
              </span>
              <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{passPct}%</strong>{' '}
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                ({rec.successfulPasses}/{rec.totalPasses})
              </span>
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '0.5rem',
                borderRadius: '0.35rem',
              }}
            >
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: '0.68rem',
                  display: 'block',
                }}
              >
                KICK SUCCESS
              </span>
              <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{kickPct}%</strong>{' '}
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                ({rec.successfulKicks}/{rec.totalKicks})
              </span>
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '0.5rem',
                borderRadius: '0.35rem',
              }}
            >
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: '0.68rem',
                  display: 'block',
                }}
              >
                DISCIPLINE / ERRORS
              </span>
              <strong
                style={{
                  color: rec.penaltiesConceded > 0 ? '#f87171' : '#cbd5e1',
                  fontSize: '1.05rem',
                }}
              >
                {rec.penaltiesConceded}p
              </strong>{' '}
              · <strong style={{ color: '#cbd5e1' }}>{rec.knockOns}k</strong>
            </div>
          </div>
        </div>

        {/* Technical Skills Breakdown */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgb(255 255 255 / 8%)',
            borderRadius: '0.5rem',
            padding: '1rem',
            display: 'grid',
            gap: '0.65rem',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Technical Breakdown
          </span>
          <SkillBar label="Decision Making" value={decision} color="#60a5fa" />
          <SkillBar label="Handling & Catching" value={handling} color="#38bdf8" />
          <SkillBar label="Passing Execution" value={passing} color="#4ade80" />
          <SkillBar label="Kicking Range" value={kicking} color="#facc15" />
          <SkillBar label="Tackling & Contact" value={tackling} color="#f472b6" />
        </div>
      </div>
    </Modal>
  )
}
