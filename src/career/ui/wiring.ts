import {
  advanceCareer,
  createCareer,
  getUpcomingManagedFixture,
  type Career,
  type Fixture,
} from "../domain/index.ts";
import type { MatchResult as SimulationMatchResult } from "../../domain.ts";
import { deleteCareer } from "../save/index.ts";
import {
  handleAdvancementActions,
  handleInboxActions,
  handleManagerActions,
  handlePlayerModalActions,
  handleSelectionActions,
  handleStaffAndFacilityActions,
  handleTrainingActions,
  handleTransferActions,
} from "./actions.ts";
import { views, type CareerView } from "./types.ts";
import type { TransfersSubTab } from "./views/transfers-view.ts";

export interface WiringCallbacks {
  root: HTMLElement;
  lifecycle: AbortController;
  getCareer: () => Career | null;
  setCareer: (career: Career | null) => void;
  getView: () => CareerView;
  setView: (view: CareerView) => void;
  getSelectedClubId: () => string;
  setSelectedClubId: (id: string) => void;
  getSelectedSwapIndex: () => number | null;
  setSelectedSwapIndex: (idx: number | null) => void;
  getSelectedMessageId: () => string | null;
  setSelectedMessageId: (id: string | null) => void;
  getViewPlayerId: () => string | null;
  setViewPlayerId: (id: string | null) => void;
  getTransfersSubTab: () => TransfersSubTab;
  setTransfersSubTab: (tab: TransfersSubTab) => void;
  getRoleFilter: () => string;
  setRoleFilter: (filter: string) => void;
  setLoadError: (err: string | null) => void;
  persist: () => void;
  render: () => void;
  runRoundSimulation: () => void;
  onWatchMatch?: (
    career: Career,
    fixture: Fixture,
    onFinish: (result: SimulationMatchResult) => void,
  ) => void;
}

export const createCareerWiring = (callbacks: WiringCallbacks): void => {
  const {
    root,
    lifecycle,
    getCareer,
    setCareer,
    setView,
    setSelectedClubId,
    setSelectedSwapIndex,
    setSelectedMessageId,
    setViewPlayerId,
    setLoadError,
    persist,
    render,
    onWatchMatch,
  } = callbacks;

  root.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const clubButton = target?.closest<HTMLButtonElement>("[data-club-id]");
      if (clubButton?.dataset.clubId) {
        setSelectedClubId(clubButton.dataset.clubId);
        render();
        return;
      }
      const viewButton =
        target?.closest<HTMLButtonElement>("[data-career-view]");
      const requestedView = viewButton?.dataset.careerView;
      if (requestedView && requestedView in views) {
        setView(requestedView as CareerView);
        setSelectedSwapIndex(null);
        setSelectedMessageId(null);
        setViewPlayerId(null);
        render();
        return;
      }
      if (target?.closest("[data-delete-save]")) {
        deleteCareer();
        setLoadError(null);
        render();
        return;
      }
      if (target?.closest("[data-new-career]")) {
        if (!confirm("Delete this career and start again?")) return;
        deleteCareer();
        setCareer(null);
        setLoadError(null);
        setView("home");
        render();
        return;
      }

      const transfersTabBtn = target?.closest<HTMLButtonElement>(
        "[data-transfers-tab]",
      );
      if (transfersTabBtn?.dataset.transfersTab) {
        callbacks.setTransfersSubTab(
          transfersTabBtn.dataset.transfersTab as TransfersSubTab,
        );
        render();
        return;
      }

      const career = getCareer();
      if (!career) return;

      if (handlePlayerModalActions(target, callbacks)) return;
      if (handleTrainingActions(target, career, callbacks)) return;
      if (handleManagerActions(target, career, callbacks)) return;
      if (handleTransferActions(target, career, callbacks)) return;
      if (handleSelectionActions(target, career, callbacks)) return;
      if (handleStaffAndFacilityActions(target, career, callbacks)) return;
      if (handleInboxActions(target, career, callbacks)) return;
      if (handleAdvancementActions(target, career, callbacks)) return;

      // Handle Watch Match
      if (target?.closest("[data-watch-match]")) {
        const upcoming = getUpcomingManagedFixture(career);
        if (upcoming && onWatchMatch) {
          onWatchMatch(career, upcoming, (matchResult) => {
            const current = getCareer();
            if (!current) return;
            setCareer(
              advanceCareer(
                current,
                new Map([
                  [
                    upcoming.id,
                    {
                      homeScore: matchResult.score[0],
                      awayScore: matchResult.score[1],
                      resultObj: matchResult,
                    },
                  ],
                ]),
              ),
            );
            persist();
            render();
          });
        }
      }
    },
    { signal: lifecycle.signal },
  );

  root.addEventListener(
    "change",
    (event) => {
      const select =
        event.target instanceof HTMLSelectElement ? event.target : null;
      if (select?.matches("[data-filter-free-agents]")) {
        callbacks.setRoleFilter(select.value);
        render();
      }
    },
    { signal: lifecycle.signal },
  );

  root.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (
        !(form instanceof HTMLFormElement) ||
        !form.matches("[data-create-career]")
      ) {
        return;
      }
      event.preventDefault();
      const data = new FormData(form);
      const newCareer = createCareer(
        String(data.get("managerName") ?? ""),
        callbacks.getSelectedClubId(),
      );
      setCareer(newCareer);
      setView("home");
      persist();
      render();
    },
    { signal: lifecycle.signal },
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        if (
          callbacks.getSelectedSwapIndex() !== null ||
          callbacks.getViewPlayerId() !== null
        ) {
          setSelectedSwapIndex(null);
          setViewPlayerId(null);
          render();
        }
      }
    },
    { signal: lifecycle.signal },
  );
};
