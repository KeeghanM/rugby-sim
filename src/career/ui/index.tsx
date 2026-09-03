import { createRoot } from 'react-dom/client'
import type { MatchResult as SimulationMatchResult } from '../../simulation/domain.ts'
import type { Career, Fixture } from '../domain/index.ts'
import { CareerApp } from './CareerApp.tsx'

export { CareerApp } from './CareerApp.tsx'
export * from './formatters.ts'
export * from './store.ts'
export * from './types.ts'

export const createCareerUI = (
  root: HTMLElement,
  onWatchMatch?: (career: Career, fixture: Fixture, onFinish: (result: SimulationMatchResult) => void) => void,
) => {
  const reactRoot = createRoot(root)
  reactRoot.render(<CareerApp onWatchMatch={onWatchMatch} />)

  return {
    dispose() {
      reactRoot.unmount()
      root.replaceChildren()
    },
  }
}
