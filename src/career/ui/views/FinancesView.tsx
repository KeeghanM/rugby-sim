import type React from 'react'
import type { LedgerCategory } from '../../domain/index.ts'
import { formatMoney } from '../formatters.ts'
import { useCareerStore } from '../store.ts'

export const categoryBadge = (cat: LedgerCategory) => {
  switch (cat) {
    case 'matchIncome':
      return (
        <span
          className="group-tag"
          style={{
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80',
            borderColor: 'rgba(34, 197, 94, 0.3)',
          }}
        >
          Match Gate
        </span>
      )
    case 'playerWages':
      return (
        <span
          className="group-tag"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          Player Wages
        </span>
      )
    case 'staffWages':
      return (
        <span
          className="group-tag"
          style={{
            background: 'rgba(234, 179, 8, 0.15)',
            color: '#facc15',
            borderColor: 'rgba(234, 179, 8, 0.3)',
          }}
        >
          Staff Wages
        </span>
      )
    case 'facilityUpgrade':
      return (
        <span
          className="group-tag"
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            borderColor: 'rgba(56, 189, 248, 0.3)',
          }}
        >
          Facility Upgrade
        </span>
      )
    case 'staffRecruitment':
      return (
        <span
          className="group-tag"
          style={{
            background: 'rgba(168, 85, 247, 0.15)',
            color: '#c084fc',
            borderColor: 'rgba(168, 85, 247, 0.3)',
          }}
        >
          Staff Recruit
        </span>
      )
    default:
      return (
        <span className="group-tag" style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' }}>
          Other
        </span>
      )
  }
}

export const FinancesView: React.FC = () => {
  const career = useCareerStore((state) => state.career)

  if (!career) return null

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) return null

  const playerWages = club.squad.reduce((sum, p) => sum + p.wage, 0)
  const staffWages = club.staff.reduce((sum, s) => sum + s.wage, 0)
  const totalWeeklyExpenses = playerWages + staffWages

  return (
    <section className="career-section">
      <header style={{ flexWrap: 'wrap' }}>
        <div>
          <span className="career-kicker">Club Financial Operations</span>
          <h2>{club.name} Financial Statement</h2>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Available Balance:{' '}
          <strong
            style={{
              color: '#38bdf8',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '1.15rem',
            }}
          >
            {formatMoney(club.balance)}
          </strong>
        </div>
      </header>

      {/* Financial Cashflow & Operational Summary */}
      <div className="finance-summary-grid">
        <div className="finance-summary-card">
          <span className="career-kicker" style={{ fontSize: '0.65rem' }}>
            Player Payroll
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '1.35rem',
              color: '#f87171',
              fontFamily: 'ui-monospace, monospace',
              marginTop: '0.25rem',
            }}
          >
            -{formatMoney(playerWages)}
            <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/wk</small>
          </strong>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{club.squad.length} contract players</span>
        </div>

        <div className="finance-summary-card">
          <span className="career-kicker" style={{ fontSize: '0.65rem' }}>
            Staff Payroll
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '1.35rem',
              color: '#facc15',
              fontFamily: 'ui-monospace, monospace',
              marginTop: '0.25rem',
            }}
          >
            -{formatMoney(staffWages)}
            <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/wk</small>
          </strong>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{club.staff.length} coaching & medical staff</span>
        </div>

        <div className="finance-summary-card">
          <span className="career-kicker" style={{ fontSize: '0.65rem' }}>
            Home Gate Estimate
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '1.35rem',
              color: '#4ade80',
              fontFamily: 'ui-monospace, monospace',
              marginTop: '0.25rem',
            }}
          >
            +{formatMoney(Math.round(4200 * 18 * 0.72))}
            <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/match</small>
          </strong>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Reputation {club.reputation}/100</span>
        </div>

        <div className="finance-summary-card">
          <span className="career-kicker" style={{ fontSize: '0.65rem' }}>
            Weekly Fixed Outgoings
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '1.35rem',
              color: '#f87171',
              fontFamily: 'ui-monospace, monospace',
              marginTop: '0.25rem',
            }}
          >
            -{formatMoney(totalWeeklyExpenses)}
            <small style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/wk</small>
          </strong>
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Total weekly operations</span>
        </div>
      </div>

      {/* Transaction Ledger Statement Table */}
      <div>
        <span className="career-kicker" style={{ marginBottom: '0.6rem', display: 'block' }}>
          Transaction Ledger & Audit
        </span>
        <div className="career-table-wrap">
          <table className="career-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Date</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Round</th>
                <th style={{ width: '140px' }}>Category</th>
                <th>Description</th>
                <th style={{ textAlign: 'right', width: '140px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {club.ledger.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: 'center',
                      color: '#94a3b8',
                      padding: '2rem',
                    }}
                  >
                    No financial transactions recorded yet this season.
                  </td>
                </tr>
              ) : (
                club.ledger.map((tx) => (
                  <tr key={`${tx.date}-${tx.round}-${tx.description}-${tx.amount}`}>
                    <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{tx.date}</td>
                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>Rd {tx.round}</td>
                    <td>{categoryBadge(tx.category)}</td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{tx.description}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontFamily: 'ui-monospace, monospace',
                        fontWeight: 700,
                        color: tx.amount > 0 ? '#4ade80' : '#f87171',
                      }}
                    >
                      {tx.amount > 0 ? `+${formatMoney(tx.amount)}` : `-${formatMoney(Math.abs(tx.amount))}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
