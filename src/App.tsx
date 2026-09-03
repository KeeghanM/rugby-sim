import React, { useState } from 'react'
import { CareerApp, useCareerStore } from './career/ui/index.tsx'
import { advanceCareer, type Career, type Fixture } from './career/domain/index.ts'
import type { MatchResult } from './simulation/domain.ts'
import { MatchView } from './renderer/MatchView.tsx'
import './index.css'
import './career/ui/career.css'

export const App: React.FC = () => {
  const [matchContext, setMatchContext] = useState<{
    career: Career
    fixture: Fixture
  } | null>(null)

  const handleWatchMatch = (career: Career, fixture: Fixture) => {
    setMatchContext({ career, fixture })
  }

  const handleFinishMatch = (result: MatchResult) => {
    if (!matchContext) return
    const { career, fixture } = matchContext
    const nextCareer = advanceCareer(
      career,
      new Map([
        [
          fixture.id,
          {
            homeScore: result.score[0],
            awayScore: result.score[1],
            resultObj: result,
          },
        ],
      ]),
    )
    useCareerStore.getState().setCareerDirect(nextCareer)
    setMatchContext(null)
  }

  if (matchContext) {
    return <MatchView career={matchContext.career} fixture={matchContext.fixture} onFinish={handleFinishMatch} />
  }

  return (
    <div id="career-screen">
      <CareerApp onWatchMatch={handleWatchMatch} />
    </div>
  )
}
