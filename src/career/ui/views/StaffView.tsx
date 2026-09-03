import type React from 'react'
import {
  FACILITY_EFFECTS,
  FACILITY_NAMES,
  FACILITY_UPGRADE_COSTS,
  type FacilityType,
  STAFF_EFFECTS,
  STAFF_NAMES,
  STAFF_UPGRADE_COSTS,
} from '../../domain/index.ts'
import { formatMoney } from '../formatters.ts'
import { useCareerStore } from '../store.ts'

export const StaffView: React.FC = () => {
  const career = useCareerStore((state) => state.career)
  const upgradeStaffMember = useCareerStore((state) => state.upgradeStaffMember)
  const upgradeClubFacility = useCareerStore((state) => state.upgradeClubFacility)

  if (!career) return null

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) return null

  const facilityKeys: FacilityType[] = ['gym', 'trainingGround', 'medicalRoom']

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Coaching & Performance Staff Section */}
      <section className="career-section">
        <header style={{ flexWrap: 'wrap' }}>
          <div>
            <span className="career-kicker">Coaching & Medical Department</span>
            <h2>{club.name} Performance Staff</h2>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Total Staff Wages:{' '}
            <strong
              style={{
                color: '#f8fafc',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {formatMoney(club.staff.reduce((s, m) => s + m.wage, 0))}/wk
            </strong>
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {club.staff.map((member) => {
            const isMax = member.level >= 5
            const nextLevel = member.level + 1
            const upgradeCost = STAFF_UPGRADE_COSTS[nextLevel] ?? 0
            const canAfford = club.balance >= upgradeCost

            return (
              <div key={member.role} className="staff-card">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span className="career-kicker" style={{ color: '#94a3b8' }}>
                      {STAFF_NAMES[member.role]}
                    </span>
                    <span
                      className="group-tag"
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        borderColor: 'rgba(56, 189, 248, 0.3)',
                      }}
                    >
                      Tier {member.level} / 5
                    </span>
                  </div>
                  <h3
                    style={{
                      margin: '0.35rem 0 0.2rem',
                      fontSize: '1.1rem',
                      color: '#f8fafc',
                    }}
                  >
                    {member.name}
                  </h3>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: '#94a3b8',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    Weekly Wage: <strong style={{ color: '#cbd5e1' }}>{formatMoney(member.wage)}/wk</strong>
                  </div>
                  <p
                    style={{
                      margin: '0.65rem 0 0',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      lineHeight: 1.45,
                    }}
                  >
                    {STAFF_EFFECTS[member.role]}
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgb(255 255 255 / 8%)',
                  }}
                >
                  {isMax ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#4ade80',
                        fontWeight: 700,
                      }}
                    >
                      ✓ Maximum Tier Reached
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="career-secondary-btn"
                      onClick={() => upgradeStaffMember(member.role)}
                      disabled={!canAfford}
                      style={{
                        width: '100%',
                        fontSize: '0.75rem',
                        padding: '0.45rem 0.6rem',
                      }}
                    >
                      Recruit Tier {nextLevel} ({formatMoney(upgradeCost)})
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Club Facilities Wing Section */}
      <section className="career-section">
        <header style={{ flexWrap: 'wrap' }}>
          <div>
            <span className="career-kicker">Infrastructure & Facilities</span>
            <h2>Training & Medical Facilities</h2>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Available Club Funds:{' '}
            <strong
              style={{
                color: '#38bdf8',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {formatMoney(club.balance)}
            </strong>
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {facilityKeys.map((key) => {
            const level = club.facilities[key]
            const isMax = level >= 5
            const nextLevel = level + 1
            const upgradeCost = FACILITY_UPGRADE_COSTS[nextLevel] ?? 0
            const canAfford = club.balance >= upgradeCost

            return (
              <div key={key} className="staff-card">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span className="career-kicker" style={{ color: '#94a3b8' }}>
                      {FACILITY_NAMES[key]}
                    </span>
                    <span
                      className="group-tag"
                      style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        borderColor: 'rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      Level {level} / 5
                    </span>
                  </div>
                  <h3
                    style={{
                      margin: '0.35rem 0 0.2rem',
                      fontSize: '1.15rem',
                      color: '#f8fafc',
                    }}
                  >
                    {FACILITY_NAMES[key]}
                  </h3>
                  <p
                    style={{
                      margin: '0.65rem 0 0',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      lineHeight: 1.45,
                    }}
                  >
                    {FACILITY_EFFECTS[key]}
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgb(255 255 255 / 8%)',
                  }}
                >
                  {isMax ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#4ade80',
                        fontWeight: 700,
                      }}
                    >
                      ✓ Maximum Level Reached
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="career-primary"
                      onClick={() => upgradeClubFacility(key)}
                      disabled={!canAfford}
                      style={{
                        width: '100%',
                        fontSize: '0.75rem',
                        padding: '0.45rem 0.6rem',
                      }}
                    >
                      Upgrade to Level {nextLevel} ({formatMoney(upgradeCost)})
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
