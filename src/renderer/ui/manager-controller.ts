import type { Team } from '../../simulation/domain.ts'
import { isEditableTarget } from '../../lib/dom.ts'

export type ManagerView = 'roster' | 'stats'

type ManagerElements = {
  dialog: HTMLDialogElement
  opener: HTMLButtonElement
  closeButton: HTMLButtonElement
  teamTabs: [HTMLButtonElement, HTMLButtonElement]
  viewTabs: Record<ManagerView, HTMLButtonElement>
}

export const createManagerController = (elements: ManagerElements, signal: AbortSignal) => {
  let selectedTeam: Team = 0
  let selectedView: ManagerView = 'roster'
  let restoreFocus: HTMLElement | null = null
  let dirty = true
  let lastRenderAt = -Infinity

  const markSelection = () => {
    elements.teamTabs.forEach((tab, team) => {
      const selected = team === selectedTeam
      tab.classList.toggle('active', selected)
      tab.setAttribute('aria-pressed', String(selected))
    })
    for (const [view, tab] of Object.entries(elements.viewTabs) as [ManagerView, HTMLButtonElement][]) {
      const selected = view === selectedView
      tab.classList.toggle('active', selected)
      tab.setAttribute('aria-pressed', String(selected))
    }
    dirty = true
  }

  const open = () => {
    if (elements.dialog.open) return
    restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : elements.opener
    elements.opener.setAttribute('aria-expanded', 'true')
    dirty = true
    elements.dialog.showModal()
    elements.closeButton.focus()
  }

  const close = () => {
    if (elements.dialog.open) elements.dialog.close()
  }

  elements.opener.addEventListener('click', open, { signal })
  elements.closeButton.addEventListener('click', close, { signal })
  elements.dialog.addEventListener(
    'click',
    (event) => {
      if (event.target === elements.dialog) close()
    },
    { signal },
  )
  elements.dialog.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault()
      close()
    },
    { signal },
  )
  elements.dialog.addEventListener(
    'close',
    () => {
      elements.opener.setAttribute('aria-expanded', 'false')
      const focusTarget = restoreFocus?.isConnected ? restoreFocus : elements.opener
      restoreFocus = null
      focusTarget.focus()
    },
    { signal },
  )
  elements.teamTabs.forEach((tab, team) => {
    tab.addEventListener(
      'click',
      () => {
        selectedTeam = team as Team
        markSelection()
      },
      { signal },
    )
  })
  for (const [view, tab] of Object.entries(elements.viewTabs) as [ManagerView, HTMLButtonElement][]) {
    tab.addEventListener(
      'click',
      () => {
        selectedView = view
        markSelection()
      },
      { signal },
    )
  }
  window.addEventListener(
    'keydown',
    (event) => {
      if (
        !elements.dialog.open &&
        !event.repeat &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !isEditableTarget(event.target) &&
        (event.key === 'm' || event.key === 'M')
      ) {
        open()
      }
    },
    { signal },
  )

  markSelection()

  return {
    isOpen: () => elements.dialog.open,
    getSelectedTeam: () => selectedTeam,
    getSelectedView: () => selectedView,
    shouldRender(now: number) {
      if (!elements.dialog.open) return false
      if (!dirty && now - lastRenderAt < 250) return false
      dirty = false
      lastRenderAt = now
      return true
    },
    dispose() {
      restoreFocus = null
      if (elements.dialog.open) elements.dialog.close()
    },
  }
}

export type ManagerController = ReturnType<typeof createManagerController>
