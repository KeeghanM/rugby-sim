import { create } from 'zustand'
import {
  acknowledgeEvent,
  advanceCareer,
  type Career,
  CLUBS,
  type CoachingCourseId,
  clearReadInboxMessages,
  createCareer,
  deleteCareer,
  deleteInboxMessage,
  dismissAcademyProspect,
  enrollCoachingCourse,
  executeSeasonRollover,
  type FacilityType,
  loadCareer,
  markInboxRead,
  optimizeSquadSelection,
  type PlaybookTactics,
  promoteAcademyProspect,
  releaseSquadPlayer,
  type StaffRole,
  saveCareer,
  scoutTargetPlayer,
  setClubTrainingPlan,
  signFreeAgent,
  submitTransferBid,
  swapSquadPlayers,
  type TrainingFocus,
  type TrainingIntensity,
  updatePlaybookTactics,
  upgradeFacility,
  upgradeStaff,
} from '../index.ts'
import { runRoundSimulation } from './simulation-runner.ts'
import type { CareerView, SimulationProgress, TransfersSubTab } from './types.ts'

export interface CareerStoreState {
  career: Career | null
  view: CareerView
  selectedClubId: string
  selectedSwapIndex: number | null
  selectedMessageId: string | null
  viewPlayerId: string | null
  transfersSubTab: TransfersSubTab
  roleFilter: string
  simulationProgress: SimulationProgress | null
  loadError: string | null
  saveError: string | null

  // View & selection actions
  setView: (view: CareerView) => void
  setSelectedClubId: (id: string) => void
  setSelectedSwapIndex: (index: number | null) => void
  setSelectedMessageId: (id: string | null) => void
  setViewPlayerId: (id: string | null) => void
  setTransfersSubTab: (tab: TransfersSubTab) => void
  setRoleFilter: (filter: string) => void
  setSimulationProgress: (progress: SimulationProgress | null) => void
  closeModals: () => void

  // Career lifecycle
  init: () => void
  startNewCareer: (managerName: string, clubId: string) => void
  deleteSavedGame: () => void
  advance: () => void
  runSimulation: () => void

  // Management actions
  upgradeStaffMember: (role: StaffRole) => void
  upgradeClubFacility: (type: FacilityType) => void
  setTrainingPlanFocus: (focus: TrainingFocus) => void
  setTrainingPlanIntensity: (intensity: TrainingIntensity) => void
  autoPickTeam: (criteria: 'ovr' | 'fitness') => void
  confirmSwapPlayers: (candidateIndex: number) => void
  signFreeAgentPlayer: (playerId: string, wage: number, bonus: number) => void
  releasePlayerFromSquad: (playerId: string) => void
  scoutPlayerById: (playerId: string) => void
  submitTransferBidOnPlayer: (targetClubId: string, playerId: string, fee: number, wage: number) => void
  promoteYouthProspect: (playerId: string) => void
  dismissYouthProspect: (playerId: string) => void
  deleteInboxMessageById: (messageId: string) => void
  clearReadMessages: () => void
  readInboxMessage: (messageId: string) => void
  enrollInCoachingCourse: (courseId: CoachingCourseId) => void
  updateTactics: (tactics: Partial<PlaybookTactics>) => void
  ackEvent: () => void
  rolloverSeason: () => void
  setCareerDirect: (next: Career | null) => void
}

const persistCareer = (career: Career | null): string | null => {
  if (!career) return null
  try {
    saveCareer(career)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Save failed'
  }
}

export const useCareerStore = create<CareerStoreState>((set, get) => ({
  career: null,
  view: 'home',
  selectedClubId: CLUBS[0].id,
  selectedSwapIndex: null,
  selectedMessageId: null,
  viewPlayerId: null,
  transfersSubTab: 'freeAgents',
  roleFilter: 'all',
  simulationProgress: null,
  loadError: null,
  saveError: null,

  setView: (view) =>
    set({
      view,
      selectedSwapIndex: null,
      selectedMessageId: null,
      viewPlayerId: null,
    }),

  setSelectedClubId: (selectedClubId) => set({ selectedClubId }),
  setSelectedSwapIndex: (selectedSwapIndex) => set({ selectedSwapIndex }),
  setSelectedMessageId: (selectedMessageId) => set({ selectedMessageId }),
  setViewPlayerId: (viewPlayerId) => set({ viewPlayerId }),
  setTransfersSubTab: (transfersSubTab) => set({ transfersSubTab }),
  setRoleFilter: (roleFilter) => set({ roleFilter }),
  setSimulationProgress: (simulationProgress) => set({ simulationProgress }),
  closeModals: () =>
    set({
      selectedSwapIndex: null,
      viewPlayerId: null,
    }),

  init: () => {
    try {
      const career = loadCareer()
      set({ career, loadError: null })
    } catch (error) {
      set({
        loadError: error instanceof Error ? error.message : 'Unknown save error',
      })
    }
  },

  startNewCareer: (managerName, clubId) => {
    const career = createCareer(managerName, clubId)
    const saveError = persistCareer(career)
    set({ career, view: 'home', saveError })
  },

  deleteSavedGame: () => {
    deleteCareer()
    set({
      career: null,
      view: 'home',
      loadError: null,
      saveError: null,
      selectedSwapIndex: null,
      selectedMessageId: null,
      viewPlayerId: null,
    })
  },

  setCareerDirect: (career) => {
    const saveError = persistCareer(career)
    set({ career, saveError })
  },

  advance: () => {
    const { career } = get()
    if (!career) return
    if (career.checkpoint === 'matchDay') {
      get().runSimulation()
      return
    }
    if (career.checkpoint === 'seasonEnd') {
      get().rolloverSeason()
      return
    }
    const nextCareer = advanceCareer(career)
    const saveError = persistCareer(nextCareer)
    set({
      career: nextCareer,
      selectedSwapIndex: null,
      saveError,
    })
  },

  runSimulation: () => {
    runRoundSimulation({
      getCareer: () => get().career,
      setCareer: (next) => {
        set({ career: next })
      },
      setSimulationProgress: (prog) => {
        set({ simulationProgress: prog })
      },
      render: () => {},
      persist: () => {
        const err = persistCareer(get().career)
        set({ saveError: err })
      },
    })
  },

  upgradeStaffMember: (role) => {
    const { career } = get()
    if (!career) return
    const next = upgradeStaff(career, career.managedClubId, role)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  upgradeClubFacility: (type) => {
    const { career } = get()
    if (!career) return
    const next = upgradeFacility(career, career.managedClubId, type)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  setTrainingPlanFocus: (focus) => {
    const { career } = get()
    if (!career) return
    const next = setClubTrainingPlan(career, career.managedClubId, { focus })
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  setTrainingPlanIntensity: (intensity) => {
    const { career } = get()
    if (!career) return
    const next = setClubTrainingPlan(career, career.managedClubId, {
      intensity,
    })
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  autoPickTeam: (criteria) => {
    const { career } = get()
    if (!career) return
    const next = optimizeSquadSelection(career, career.managedClubId, criteria)
    const saveError = persistCareer(next)
    set({ career: next, selectedSwapIndex: null, saveError })
  },

  confirmSwapPlayers: (candidateIndex) => {
    const { career, selectedSwapIndex } = get()
    if (!career || selectedSwapIndex === null) return
    const next = swapSquadPlayers(career, career.managedClubId, selectedSwapIndex, candidateIndex)
    const saveError = persistCareer(next)
    set({ career: next, selectedSwapIndex: null, saveError })
  },

  signFreeAgentPlayer: (playerId, wage, bonus) => {
    const { career } = get()
    if (!career) return
    const next = signFreeAgent(career, playerId, wage, bonus)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  releasePlayerFromSquad: (playerId) => {
    const { career } = get()
    if (!career) return
    const next = releaseSquadPlayer(career, playerId)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  scoutPlayerById: (playerId) => {
    const { career } = get()
    if (!career) return
    const next = scoutTargetPlayer(career, playerId)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  submitTransferBidOnPlayer: (targetClubId, playerId, fee, wage) => {
    const { career } = get()
    if (!career) return
    const next = submitTransferBid(career, targetClubId, playerId, fee, wage)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  promoteYouthProspect: (playerId) => {
    const { career } = get()
    if (!career) return
    const next = promoteAcademyProspect(career, playerId)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  dismissYouthProspect: (playerId) => {
    const { career } = get()
    if (!career) return
    const next = dismissAcademyProspect(career, playerId)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  deleteInboxMessageById: (messageId) => {
    const { career, selectedMessageId } = get()
    if (!career) return
    const next = deleteInboxMessage(career, messageId)
    const saveError = persistCareer(next)
    set({
      career: next,
      selectedMessageId: selectedMessageId === messageId ? null : selectedMessageId,
      saveError,
    })
  },

  clearReadMessages: () => {
    const { career } = get()
    if (!career) return
    const next = clearReadInboxMessages(career)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  readInboxMessage: (messageId) => {
    const { career } = get()
    if (!career) return
    const next = markInboxRead(career, messageId)
    const saveError = persistCareer(next)
    set({ career: next, selectedMessageId: messageId, saveError })
  },

  enrollInCoachingCourse: (courseId) => {
    const { career } = get()
    if (!career) return
    const next = enrollCoachingCourse(career, courseId)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  updateTactics: (tactics) => {
    const { career } = get()
    if (!career) return
    const next = updatePlaybookTactics(career, tactics)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  ackEvent: () => {
    const { career } = get()
    if (!career) return
    const next = acknowledgeEvent(career)
    const saveError = persistCareer(next)
    set({ career: next, saveError })
  },

  rolloverSeason: () => {
    const { career } = get()
    if (!career) return
    const next = executeSeasonRollover(career)
    const saveError = persistCareer(next)
    set({
      career: next,
      selectedSwapIndex: null,
      selectedMessageId: null,
      saveError,
    })
  },
}))
