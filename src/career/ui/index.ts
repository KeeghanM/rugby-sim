import {
  CLUBS,
  loadCareer,
  saveCareer,
  type Career,
  type Club,
  type Fixture,
  type Player,
} from "../index.ts";
import { renderShell } from "./components/shell.ts";
import { renderTopbarFixture } from "./components/topbar-fixture.ts";
import { clubById } from "./formatters.ts";
import { renderPlayerCardModal } from "./modals/player-card-modal.ts";
import { renderSimulationModal } from "./modals/simulation-modal.ts";
import { runRoundSimulation } from "./simulation-runner.ts";
import type { CareerView, SimulationProgress } from "./types.ts";
import { renderFixtures } from "./views/fixtures-view.ts";
import { renderFinancesView } from "./views/finances-view.ts";
import { renderHome } from "./views/home-view.ts";
import { renderInbox } from "./views/inbox-view.ts";
import { renderLeague } from "./views/league-view.ts";
import { renderManagerView } from "./views/manager-view.ts";
import { renderCareerSetup } from "./views/onboarding-view.ts";
import { renderSelection } from "./views/selection-view.ts";
import { renderSquad } from "./views/squad-view.ts";
import { renderStaffView } from "./views/staff-view.ts";
import { renderTraining } from "./views/training-view.ts";
import { createCareerWiring } from "./wiring.ts";

export const createCareerUI = (
  root: HTMLElement,
  onExhibition: () => void,
  onWatchMatch?: (
    career: Career,
    fixture: Fixture,
    onFinish: (result: { homeScore: number; awayScore: number }) => void,
  ) => void,
) => {
  const lifecycle = new AbortController();
  let career: Career | null = null;
  let view: CareerView = "home";
  let selectedClubId: string = CLUBS[0].id;
  let selectedSwapIndex: number | null = null;
  let selectedMessageId: string | null = null;
  let viewPlayerId: string | null = null;
  let simulationProgress: SimulationProgress | null = null;
  let loadError: string | null = null;
  let saveError: string | null = null;

  try {
    career = loadCareer();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown save error";
  }

  const persist = () => {
    if (!career) return;
    try {
      saveCareer(career);
      saveError = null;
    } catch (error) {
      saveError = error instanceof Error ? error.message : "Save failed";
    }
  };

  const render = () => {
    if (!career) {
      root.innerHTML = renderCareerSetup(selectedClubId, loadError);
      return;
    }
    const club = clubById(career, career.managedClubId);
    const content =
      view === "home"
        ? renderHome(career, club)
        : view === "selection"
          ? renderSelection(club, selectedSwapIndex)
          : view === "training"
            ? renderTraining(club)
            : view === "manager"
              ? renderManagerView(career, club)
              : view === "staff"
                ? renderStaffView(club)
                : view === "finances"
                  ? renderFinancesView(club)
                  : view === "inbox"
                    ? renderInbox(career, selectedMessageId)
                    : view === "squad"
                      ? renderSquad(club)
                      : view === "league"
                        ? renderLeague(career)
                        : renderFixtures(career);

    let playerModalHtml = "";
    if (viewPlayerId) {
      let foundPlayer: Player | undefined;
      let foundClub: Club | undefined;
      let foundSlot: number | undefined;

      for (const c of career.season.clubs) {
        const pIndex = c.squad.findIndex((p) => p.id === viewPlayerId);
        if (pIndex !== -1) {
          foundPlayer = c.squad[pIndex];
          foundClub = c;
          if (c.id === career.managedClubId) foundSlot = pIndex;
          break;
        }
      }

      if (foundPlayer && foundClub) {
        playerModalHtml = renderPlayerCardModal(
          foundPlayer,
          foundClub,
          foundSlot,
        );
      }
    }

    const simModalHtml = simulationProgress
      ? renderSimulationModal(simulationProgress)
      : "";

    const topbarFixtureHtml = renderTopbarFixture(career);
    const modalsHtml = `${playerModalHtml}${simModalHtml}`;

    root.innerHTML = renderShell({
      career,
      club,
      view,
      content,
      topbarFixtureHtml,
      modalsHtml,
      saveError,
      isSimulating: simulationProgress !== null,
    });
  };

  const executeRoundSimulation = () => {
    runRoundSimulation({
      getCareer: () => career,
      setCareer: (next) => {
        career = next;
      },
      setSimulationProgress: (prog) => {
        simulationProgress = prog;
      },
      render,
      persist,
    });
  };

  createCareerWiring({
    root,
    lifecycle,
    getCareer: () => career,
    setCareer: (next) => {
      career = next;
    },
    getView: () => view,
    setView: (next) => {
      view = next;
    },
    getSelectedClubId: () => selectedClubId,
    setSelectedClubId: (id) => {
      selectedClubId = id;
    },
    getSelectedSwapIndex: () => selectedSwapIndex,
    setSelectedSwapIndex: (idx) => {
      selectedSwapIndex = idx;
    },
    getSelectedMessageId: () => selectedMessageId,
    setSelectedMessageId: (id) => {
      selectedMessageId = id;
    },
    getViewPlayerId: () => viewPlayerId,
    setViewPlayerId: (id) => {
      viewPlayerId = id;
    },
    setLoadError: (err) => {
      loadError = err;
    },
    persist,
    render,
    runRoundSimulation: executeRoundSimulation,
    onExhibition,
    onWatchMatch,
  });

  render();
  return {
    dispose() {
      lifecycle.abort();
      root.replaceChildren();
    },
  };
};
