import type React from 'react'
import { useState } from 'react'
import { CLUBS } from '../../domain/index.ts'
import { useCareerStore } from '../store.ts'

export const OnboardingView: React.FC = () => {
  const selectedClubId = useCareerStore((state) => state.selectedClubId)
  const setSelectedClubId = useCareerStore((state) => state.setSelectedClubId)
  const loadError = useCareerStore((state) => state.loadError)
  const deleteSavedGame = useCareerStore((state) => state.deleteSavedGame)
  const startNewCareer = useCareerStore((state) => state.startNewCareer)

  const [managerName, setManagerName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!managerName.trim()) return
    startNewCareer(managerName.trim(), selectedClubId)
  }

  return (
    <main className="career-onboarding">
      <section className="career-intro">
        <span>Rugby Sim</span>
        <h1>
          Take the club.
          <br />
          Shape the season.
        </h1>
        <p>Ten rounds. One league. Every decision builds toward match day.</p>
      </section>
      <form className="career-create" onSubmit={handleSubmit}>
        <span className="career-kicker">New career</span>
        <h2>Sign your first contract</h2>
        {loadError && (
          <div className="career-save-error">
            <strong>Save could not be loaded.</strong>
            <span>{loadError}</span>
            <button type="button" onClick={deleteSavedGame}>
              Delete damaged save
            </button>
          </div>
        )}
        <label>
          Manager name
          <input
            name="managerName"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            required
            maxLength={40}
            autoComplete="name"
            placeholder="Your name"
          />
        </label>
        <fieldset>
          <legend>Choose club</legend>
          <div className="career-club-options">
            {CLUBS.map((club) => {
              const isSelected = club.id === selectedClubId
              return (
                <button
                  key={club.id}
                  type="button"
                  aria-pressed={isSelected}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => setSelectedClubId(club.id)}
                  style={{ ['--club' as string]: club.color } as React.CSSProperties}
                >
                  <i />
                  <span>{club.name}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
        <button className="career-primary" type="submit">
          Begin career
        </button>
      </form>
    </main>
  )
}
