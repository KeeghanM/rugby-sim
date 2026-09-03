import type React from 'react'
import { useEffect } from 'react'
import type { MatchResult as SimulationMatchResult } from '../../simulation/domain.ts'
import type { Career, Fixture } from '../domain/index.ts'
import { Shell } from './components/Shell.tsx'
import { PlayerCardModal } from './modals/PlayerCardModal.tsx'
import { SimulationModal } from './modals/SimulationModal.tsx'
import { SwapModal } from './modals/SwapModal.tsx'
import { useCareerStore } from './store.ts'
import { FinancesView } from './views/FinancesView.tsx'
import { FixturesView } from './views/FixturesView.tsx'
import { HomeView } from './views/HomeView.tsx'
import { InboxView } from './views/InboxView.tsx'
import { LeagueView } from './views/LeagueView.tsx'
import { ManagerView } from './views/ManagerView.tsx'
import { OnboardingView } from './views/OnboardingView.tsx'
import { SelectionView } from './views/SelectionView.tsx'
import { SquadView } from './views/SquadView.tsx'
import { StaffView } from './views/StaffView.tsx'
import { TrainingView } from './views/TrainingView.tsx'
import { TransfersView } from './views/TransfersView.tsx'

export interface CareerAppProps {
  onWatchMatch?: (career: Career, fixture: Fixture, onFinish: (result: SimulationMatchResult) => void) => void
}

export const CareerApp: React.FC<CareerAppProps> = ({ onWatchMatch }) => {
  const career = useCareerStore((state) => state.career)
  const view = useCareerStore((state) => state.view)
  const closeModals = useCareerStore((state) => state.closeModals)
  const init = useCareerStore((state) => state.init)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModals()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeModals])

  if (!career) {
    return <OnboardingView />
  }

  const renderActiveView = () => {
    switch (view) {
      case 'home':
        return <HomeView onWatchMatch={onWatchMatch} />
      case 'selection':
        return <SelectionView />
      case 'training':
        return <TrainingView />
      case 'manager':
        return <ManagerView />
      case 'transfers':
        return <TransfersView />
      case 'staff':
        return <StaffView />
      case 'finances':
        return <FinancesView />
      case 'inbox':
        return <InboxView />
      case 'squad':
        return <SquadView />
      case 'league':
        return <LeagueView />
      case 'fixtures':
        return <FixturesView />
      default:
        return <HomeView onWatchMatch={onWatchMatch} />
    }
  }

  return (
    <Shell>
      {renderActiveView()}
      <PlayerCardModal />
      <SwapModal />
      <SimulationModal />
    </Shell>
  )
}
