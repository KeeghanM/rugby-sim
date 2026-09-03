import { simulateMatch } from '../../simulation/index.ts'
import { advanceCareer, type Career, createMatchInputForFixture, type RecordedMatchResult } from '../domain/index.ts'
import { clubById } from './formatters.ts'
import type { SimulationProgress } from './types.ts'

export interface SimulationRunnerCallbacks {
  getCareer: () => Career | null
  setCareer: (next: Career) => void
  setSimulationProgress: (progress: SimulationProgress | null) => void
  render: () => void
  persist: () => void
}

export const runRoundSimulation = async (callbacks: SimulationRunnerCallbacks): Promise<void> => {
  const career = callbacks.getCareer()
  if (career?.checkpoint !== 'matchDay') return

  const currentRound = career.currentRound
  const roundFixtures = career.season.fixtures.filter((f) => f.round === currentRound && f.status === 'scheduled')
  const recordedResultsMap = new Map<string, RecordedMatchResult>()

  callbacks.setSimulationProgress({
    round: currentRound,
    percent: 5,
    fixtureText: 'Initializing match simulation engine...',
    results: [],
  })
  callbacks.render()
  await new Promise((r) => setTimeout(r, 60))

  for (let i = 0; i < roundFixtures.length; i += 1) {
    const fixture = roundFixtures[i]
    const home = clubById(career, fixture.homeClubId)
    const away = clubById(career, fixture.awayClubId)

    callbacks.setSimulationProgress({
      round: currentRound,
      percent: Math.round(((i + 0.3) / roundFixtures.length) * 100),
      fixtureText: `Simulating: ${home.name} vs ${away.name}...`,
      results:
        recordedResultsMap.size > 0
          ? Array.from(recordedResultsMap.entries()).map(([fId, sc]) => {
              const fix = career.season.fixtures.find((f) => f.id === fId)
              const homeClubId = fix?.homeClubId ?? ''
              const awayClubId = fix?.awayClubId ?? ''
              return {
                homeName: homeClubId ? clubById(career, homeClubId).name : '',
                awayName: awayClubId ? clubById(career, awayClubId).name : '',
                score: `${sc.homeScore} - ${sc.awayScore}`,
              }
            })
          : [],
    })
    callbacks.render()
    await new Promise((r) => setTimeout(r, 70))

    const input = createMatchInputForFixture(career, fixture)
    const result = simulateMatch({ input, seed: fixture.seed })
    const score = { homeScore: result.score[0], awayScore: result.score[1] }
    recordedResultsMap.set(fixture.id, { ...score, resultObj: result })

    const updatedResults = Array.from(recordedResultsMap.entries()).map(([fId, sc]) => {
      const fix = career.season.fixtures.find((f) => f.id === fId)
      const homeClubId = fix?.homeClubId ?? ''
      const awayClubId = fix?.awayClubId ?? ''
      return {
        homeName: homeClubId ? clubById(career, homeClubId).name : '',
        awayName: awayClubId ? clubById(career, awayClubId).name : '',
        score: `${sc.homeScore} - ${sc.awayScore}`,
      }
    })

    callbacks.setSimulationProgress({
      round: currentRound,
      percent: Math.round(((i + 1) / roundFixtures.length) * 100),
      fixtureText: `Completed: ${home.name} ${score.homeScore} - ${score.awayScore} ${away.name}`,
      results: updatedResults,
    })
    callbacks.render()
    await new Promise((r) => setTimeout(r, 90))
  }

  const advanced = advanceCareer(career, recordedResultsMap)
  callbacks.setCareer(advanced)
  callbacks.setSimulationProgress(null)
  callbacks.persist()
  callbacks.render()
}
