import {
  acknowledgeEvent,
  advanceCareer,
  clearReadInboxMessages,
  deleteInboxMessage,
  enrollCoachingCourse,
  markInboxRead,
  optimizeSquadSelection,
  setClubTrainingPlan,
  swapSquadPlayers,
  updatePlaybookTactics,
  upgradeFacility,
  upgradeStaff,
  type Career,
  type CoachingCourseId,
  type FacilityType,
  type PlaybookTactics,
  type StaffRole,
  type TrainingFocus,
  type TrainingIntensity,
} from "../domain/index.ts";
import type { WiringCallbacks } from "./wiring.ts";

export const handleStaffAndFacilityActions = (
  target: Element | null,
  career: Career,
  callbacks: WiringCallbacks,
): boolean => {
  const staffBtn = target?.closest<HTMLButtonElement>("[data-upgrade-staff]");
  if (staffBtn?.dataset.upgradeStaff) {
    const role = staffBtn.dataset.upgradeStaff as StaffRole;
    callbacks.setCareer(upgradeStaff(career, career.managedClubId, role));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  const facilityBtn = target?.closest<HTMLButtonElement>(
    "[data-upgrade-facility]",
  );
  if (facilityBtn?.dataset.upgradeFacility) {
    const facType = facilityBtn.dataset.upgradeFacility as FacilityType;
    callbacks.setCareer(upgradeFacility(career, career.managedClubId, facType));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  return false;
};

export const handleTrainingActions = (
  target: Element | null,
  career: Career,
  callbacks: WiringCallbacks,
): boolean => {
  const focusBtn = target?.closest<HTMLButtonElement>("[data-set-focus]");
  if (focusBtn?.dataset.setFocus) {
    const focus = focusBtn.dataset.setFocus as TrainingFocus;
    callbacks.setCareer(
      setClubTrainingPlan(career, career.managedClubId, { focus }),
    );
    callbacks.persist();
    callbacks.render();
    return true;
  }
  const intensityBtn = target?.closest<HTMLButtonElement>(
    "[data-set-intensity]",
  );
  if (intensityBtn?.dataset.setIntensity) {
    const intensity = intensityBtn.dataset.setIntensity as TrainingIntensity;
    callbacks.setCareer(
      setClubTrainingPlan(career, career.managedClubId, { intensity }),
    );
    callbacks.persist();
    callbacks.render();
    return true;
  }
  return false;
};

export const handleSelectionActions = (
  target: Element | null,
  career: Career,
  callbacks: WiringCallbacks,
): boolean => {
  const autoPick = target?.closest<HTMLButtonElement>("[data-auto-pick]");
  if (autoPick?.dataset.autoPick) {
    const criteria = autoPick.dataset.autoPick as "ovr" | "fitness";
    callbacks.setCareer(
      optimizeSquadSelection(career, career.managedClubId, criteria),
    );
    callbacks.setSelectedSwapIndex(null);
    callbacks.persist();
    callbacks.render();
    return true;
  }
  const openSwapBtn = target?.closest<HTMLButtonElement>("[data-open-swap]");
  if (openSwapBtn?.dataset.openSwap) {
    callbacks.setSelectedSwapIndex(Number(openSwapBtn.dataset.openSwap));
    callbacks.render();
    return true;
  }
  if (
    target?.closest("[data-close-swap-modal]") ||
    target?.matches('[data-backdrop-close="swap"]')
  ) {
    callbacks.setSelectedSwapIndex(null);
    callbacks.render();
    return true;
  }
  const confirmSwapBtn = target?.closest<HTMLButtonElement>(
    "[data-confirm-swap]",
  );
  const currentSwapIndex = callbacks.getSelectedSwapIndex();
  if (confirmSwapBtn?.dataset.confirmSwap && currentSwapIndex !== null) {
    const candidateIndex = Number(confirmSwapBtn.dataset.confirmSwap);
    callbacks.setCareer(
      swapSquadPlayers(
        career,
        career.managedClubId,
        currentSwapIndex,
        candidateIndex,
      ),
    );
    callbacks.setSelectedSwapIndex(null);
    callbacks.persist();
    callbacks.render();
    return true;
  }
  return false;
};

export const handlePlayerModalActions = (
  target: Element | null,
  callbacks: WiringCallbacks,
): boolean => {
  const viewPlayerBtn = target?.closest<HTMLElement>("[data-view-player]");
  if (viewPlayerBtn?.dataset.viewPlayer) {
    callbacks.setViewPlayerId(viewPlayerBtn.dataset.viewPlayer);
    callbacks.render();
    return true;
  }
  if (
    target?.closest("[data-close-player-card]") ||
    target?.matches('[data-backdrop-close="player"]')
  ) {
    callbacks.setViewPlayerId(null);
    callbacks.render();
    return true;
  }
  return false;
};

export const handleInboxActions = (
  target: Element | null,
  career: Career,
  callbacks: WiringCallbacks,
): boolean => {
  const deleteBtn = target?.closest<HTMLButtonElement>("[data-delete-message]");
  if (deleteBtn?.dataset.deleteMessage) {
    const msgId = deleteBtn.dataset.deleteMessage;
    callbacks.setCareer(deleteInboxMessage(career, msgId));
    if (callbacks.getSelectedMessageId() === msgId) {
      callbacks.setSelectedMessageId(null);
    }
    callbacks.persist();
    callbacks.render();
    return true;
  }

  if (target?.closest("[data-clear-read-inbox]")) {
    callbacks.setCareer(clearReadInboxMessages(career));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  if (target?.closest("[data-back-inbox]")) {
    callbacks.setSelectedMessageId(null);
    callbacks.render();
    return true;
  }
  const message = target?.closest<HTMLButtonElement>("[data-message-id]");
  if (message?.dataset.messageId) {
    callbacks.setSelectedMessageId(message.dataset.messageId);
    callbacks.setCareer(markInboxRead(career, message.dataset.messageId));
    callbacks.persist();
    callbacks.render();
    return true;
  }
  return false;
};

export const handleManagerActions = (
  target: Element | null,
  career: Career,
  callbacks: WiringCallbacks,
): boolean => {
  const enrollBtn = target?.closest<HTMLButtonElement>("[data-enroll-course]");
  if (enrollBtn?.dataset.enrollCourse) {
    const courseId = enrollBtn.dataset.enrollCourse as CoachingCourseId;
    callbacks.setCareer(enrollCoachingCourse(career, courseId));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  const pbBtn = target?.closest<HTMLButtonElement>("[data-playbook-setting]");
  if (pbBtn?.dataset.playbookSetting && pbBtn?.dataset.playbookValue) {
    const setting = pbBtn.dataset.playbookSetting as keyof PlaybookTactics;
    const value = pbBtn.dataset.playbookValue;
    callbacks.setCareer(updatePlaybookTactics(career, { [setting]: value }));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  return false;
};

export const handleAdvancementActions = (
  target: Element | null,
  career: Career,
  callbacks: WiringCallbacks,
): boolean => {
  if (target?.closest("[data-ack-event]")) {
    callbacks.setCareer(acknowledgeEvent(career));
    callbacks.persist();
    callbacks.render();
    return true;
  }
  if (target?.closest("[data-advance]")) {
    if (career.checkpoint === "matchDay") {
      callbacks.runRoundSimulation();
      return true;
    }
    callbacks.setCareer(advanceCareer(career));
    callbacks.setSelectedSwapIndex(null);
    callbacks.persist();
    callbacks.render();
    return true;
  }
  return false;
};
