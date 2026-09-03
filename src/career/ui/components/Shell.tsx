import type React from 'react'
import { formatDate } from '../formatters.ts'
import { useCareerStore } from '../store.ts'
import { advanceLabels, type CareerView, checkpointLabels, views } from '../types.ts'
import { TopbarFixture } from './TopbarFixture.tsx'

export interface ShellProps {
  children: React.ReactNode
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const career = useCareerStore((state) => state.career)
  const view = useCareerStore((state) => state.view)
  const setView = useCareerStore((state) => state.setView)
  const advance = useCareerStore((state) => state.advance)
  const deleteSavedGame = useCareerStore((state) => state.deleteSavedGame)
  const simulationProgress = useCareerStore((state) => state.simulationProgress)
  const saveError = useCareerStore((state) => state.saveError)

  if (!career) return null

  const club = career.season.clubs.find((c) => c.id === career.managedClubId)
  if (!club) return null

  const unread = career.inbox.filter((message) => !message.read).length
  const isSimulating = simulationProgress !== null
  const isAdvanceDisabled = Boolean(career.pendingEvent) || career.checkpoint === 'seasonEnd' || isSimulating

  const handleNewCareer = () => {
    if (confirm('Delete this career and start again?')) {
      deleteSavedGame()
    }
  }

  return (
    <main className="career-shell" style={{ ['--club' as string]: club.color } as React.CSSProperties}>
      <aside className="career-sidebar">
        <div className="career-club-mark">
          <i />
          <span>{club.name}</span>
          <small>{career.manager.name}, Manager</small>
        </div>
        <nav>
          {(Object.entries(views) as [CareerView, string][]).map(([key, label]) => {
            const isActive = view === key
            return (
              <button key={key} type="button" className={isActive ? 'active' : ''} onClick={() => setView(key)}>
                <span>{label}</span>
                {key === 'inbox' && unread > 0 && <b>{unread}</b>}
              </button>
            )
          })}
        </nav>
        <button type="button" className="career-new-link" onClick={handleNewCareer}>
          New career
        </button>
      </aside>

      <section className="career-main">
        <header className="career-topbar">
          <div>
            <span>{formatDate(career.currentDate)}</span>
            <strong>{checkpointLabels[career.checkpoint]}</strong>
          </div>

          <TopbarFixture career={career} />

          <div>
            <span>Round {career.currentRound} of 10</span>
            <button type="button" onClick={advance} disabled={isAdvanceDisabled}>
              {career.pendingEvent ? 'Resolve event' : advanceLabels[career.checkpoint]}
            </button>
          </div>
        </header>

        {saveError && <p className="career-save-warning">Autosave failed: {saveError}</p>}

        <div className="career-content">{children}</div>
      </section>
    </main>
  )
}
