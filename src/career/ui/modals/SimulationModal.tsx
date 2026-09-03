import type React from 'react'
import { Modal } from '../components/Modal.tsx'
import { useCareerStore } from '../store.ts'

export const SimulationModal: React.FC = () => {
  const simulationProgress = useCareerStore((state) => state.simulationProgress)

  if (!simulationProgress) return null

  const customHeader = (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <span className="career-kicker">Match Simulation Engine</span>
      <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', color: '#f8fafc' }}>
        ⚡ Simulating Round {simulationProgress.round}
      </h3>
    </div>
  )

  return (
    <Modal maxWidth="520px" customHeader={customHeader} onClose={() => {}}>
      <div style={{ padding: '0.5rem 0', display: 'grid', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
            }}
          >
            <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{simulationProgress.fixtureText}</span>
            <strong
              style={{
                color: '#38bdf8',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {Math.round(simulationProgress.percent)}%
            </strong>
          </div>
          <div className="sim-progress-track">
            <div className="sim-progress-fill" style={{ width: `${simulationProgress.percent}%` }} />
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgb(255 255 255 / 8%)',
            borderRadius: '0.45rem',
            padding: '0.75rem 1rem',
            display: 'grid',
            gap: '0.45rem',
            minHeight: '90px',
          }}
        >
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Fixtures Status
          </span>
          {simulationProgress.results.length === 0 ? (
            <div
              style={{
                fontSize: '0.78rem',
                color: '#64748b',
                fontStyle: 'italic',
                padding: '0.5rem 0',
              }}
            >
              Computing player decisions and match phases...
            </div>
          ) : (
            simulationProgress.results.map((r) => (
              <div
                key={`${r.homeName}-${r.awayName}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.82rem',
                  borderTop: '1px solid rgb(255 255 255 / 6%)',
                  paddingTop: '0.35rem',
                }}
              >
                <span style={{ color: '#f1f5f9' }}>
                  {r.homeName} vs {r.awayName}
                </span>
                <strong
                  style={{
                    color: '#38bdf8',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {r.score}
                </strong>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
