import type React from 'react'
import {
  roleName,
  TRAINING_FOCUSES,
  TRAINING_INTENSITIES,
  type TrainingFocus,
  type TrainingIntensity,
} from '../../domain/index.ts'
import { useCareerStore } from '../store.ts'

export const TrainingView: React.FC = () => {
  const career = useCareerStore((state) => state.career)
  const setTrainingPlanFocus = useCareerStore((state) => state.setTrainingPlanFocus)
  const setTrainingPlanIntensity = useCareerStore((state) => state.setTrainingPlanIntensity)
  const setViewPlayerId = useCareerStore((state) => state.setViewPlayerId)

  if (!career) return null

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) return null

  const plan = club.trainingPlan
  const injuredCount = club.squad.filter((p) => p.injury !== null).length

  const focusDescriptions: Record<TrainingFocus, string> = {
    balanced: 'Standard balanced preparation across ball skills and fitness.',
    strength: 'Heavy resistance and contact training. Improves collision power and breakdown dominance (+Gym boost).',
    conditioning: 'High aerobic conditioning. Boosts stamina and match fitness across the squad.',
    handling: 'Catch, pass, and offloading under pressure. Enhances attacking execution.',
    attack: 'Backline strike plays, running lines, and set-piece launch technique.',
    defence: 'Defensive line speed, tackle technique, and turnover contact drills.',
    recovery:
      'Active rehab, hydrotherapy, and light mobility. +15% fitness boost, -50% injury risk, faster return for injured players.',
  }

  const intensityDescriptions: Record<TrainingIntensity, string> = {
    light: 'Low workload. +10% fitness recovery, minimal injury risk (0.5%), small skill progression.',
    medium: 'Standard balanced workload. Standard fitness maintenance and moderate skill gains.',
    high: 'Intense match-simulation load. -8% fitness cost, higher injury risk (6%), maximum skill development.',
  }

  return (
    <section className="career-section">
      <header style={{ flexWrap: 'wrap' }}>
        <div>
          <span className="career-kicker">Weekly Training Regimen</span>
          <h2>{club.name} Training Center</h2>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
            fontSize: '0.75rem',
            color: '#94a3b8',
            alignItems: 'center',
          }}
        >
          <span>
            Gym <strong>Lvl {club.facilities.gym}</strong>
          </span>
          <span>·</span>
          <span>
            Training Ground <strong>Lvl {club.facilities.trainingGround}</strong>
          </span>
          <span>·</span>
          <span>
            Medical <strong>Lvl {club.facilities.medicalRoom}</strong>
          </span>
        </div>
      </header>

      <div className="training-grid">
        {/* Training Configuration Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgb(255 255 255 / 10%)',
            borderRadius: '0.65rem',
            padding: '1.25rem',
            display: 'grid',
            gap: '1.25rem',
          }}
        >
          <div>
            <span className="career-kicker">1. Weekly Primary Focus</span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.4rem',
                marginTop: '0.6rem',
              }}
            >
              {TRAINING_FOCUSES.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`career-swap-btn ${plan.focus === f ? 'active' : ''}`}
                  onClick={() => setTrainingPlanFocus(f)}
                  style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}
                >
                  {roleName(f)}
                </button>
              ))}
            </div>
            <p
              style={{
                fontSize: '0.78rem',
                color: '#cbd5e1',
                marginTop: '0.65rem',
                background: 'rgba(0,0,0,0.25)',
                padding: '0.6rem 0.8rem',
                borderRadius: '0.35rem',
                borderLeft: '3px solid #38bdf8',
              }}
            >
              {focusDescriptions[plan.focus]}
            </p>
          </div>

          <div>
            <span className="career-kicker">2. Session Workload & Intensity</span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.45rem',
                marginTop: '0.6rem',
              }}
            >
              {TRAINING_INTENSITIES.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`career-swap-btn ${plan.intensity === i ? 'active' : ''}`}
                  onClick={() => setTrainingPlanIntensity(i)}
                  style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}
                >
                  {roleName(i)}
                </button>
              ))}
            </div>
            <p
              style={{
                fontSize: '0.78rem',
                color: '#cbd5e1',
                marginTop: '0.65rem',
                background: 'rgba(0,0,0,0.25)',
                padding: '0.6rem 0.8rem',
                borderRadius: '0.35rem',
                borderLeft: `3px solid ${
                  plan.intensity === 'high' ? '#ef4444' : plan.intensity === 'medium' ? '#38bdf8' : '#4ade80'
                }`,
              }}
            >
              {intensityDescriptions[plan.intensity]}
            </p>
          </div>
        </div>

        {/* Medical & Injury Room Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgb(255 255 255 / 10%)',
            borderRadius: '0.65rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span className="career-kicker">Medical & Rehab Wing</span>
            <span
              style={{
                fontSize: '0.75rem',
                color: injuredCount > 0 ? '#f87171' : '#4ade80',
                fontWeight: 700,
              }}
            >
              {injuredCount > 0 ? `${injuredCount} Player${injuredCount > 1 ? 's' : ''} Sidelined` : 'Squad Fully Fit'}
            </span>
          </div>

          {injuredCount > 0 ? (
            <div
              style={{
                display: 'grid',
                gap: '0.5rem',
                overflowY: 'auto',
                maxHeight: '280px',
              }}
            >
              {club.squad
                .filter((p) => p.injury !== null)
                .map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '0.45rem',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <button
                        type="button"
                        className="career-link-btn"
                        onClick={() => setViewPlayerId(p.id)}
                        style={{ color: '#f8fafc', fontWeight: 750 }}
                      >
                        {p.name}
                      </button>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#fca5a5',
                          marginTop: '0.15rem',
                        }}
                      >
                        {p.injury?.type} ·{' '}
                        <strong style={{ color: '#cbd5e1' }}>
                          {p.injury?.weeksRemaining} wk
                          {(p.injury?.weeksRemaining ?? 0) > 1 ? 's' : ''} remaining
                        </strong>
                      </div>
                    </div>
                    <span
                      className="group-tag"
                      style={{
                        background: 'rgba(239,68,68,0.25)',
                        color: '#fca5a5',
                        fontSize: '0.65rem',
                      }}
                    >
                      {p.injury?.severity}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div
              style={{
                padding: '2rem 1rem',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.85rem',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '0.45rem',
              }}
            >
              <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>🩺</div>
              All 23 registered squad players are currently healthy and available for selection.
            </div>
          )}

          <div
            style={{
              marginTop: 'auto',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgb(255 255 255 / 8%)',
              fontSize: '0.72rem',
              color: '#94a3b8',
              lineHeight: 1.4,
            }}
          >
            Tip: Setting focus to <strong>Recovery</strong> accelerates rehab times and protects players from training
            fatigue.
          </div>
        </div>
      </div>
    </section>
  )
}
