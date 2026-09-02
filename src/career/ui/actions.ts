import {
  acknowledgeEvent,
  advanceCareer,
  clearReadInboxMessages,
  deleteInboxMessage,
  dismissAcademyProspect,
  enrollCoachingCourse,
  executeSeasonRollover,
  markInboxRead,
  optimizeSquadSelection,
  promoteAcademyProspect,
  releaseSquadPlayer,
  scoutTargetPlayer,
  setClubTrainingPlan,
  signFreeAgent,
  submitTransferBid,
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

export const handleTransferActions = (
  target: Element | null,
  career: Career,
  callbacks: WiringCallbacks,
): boolean => {
  const signBtn = target?.closest<HTMLButtonElement>("[data-sign-free-agent]");
  if (
    signBtn?.dataset.signFreeAgent &&
    signBtn?.dataset.wage &&
    signBtn?.dataset.bonus
  ) {
    const pId = signBtn.dataset.signFreeAgent;
    const wage = Number(signBtn.dataset.wage);
    const bonus = Number(signBtn.dataset.bonus);
    callbacks.setCareer(signFreeAgent(career, pId, wage, bonus));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  const releaseBtn = target?.closest<HTMLButtonElement>(
    "[data-release-player]",
  );
  if (
    releaseBtn?.dataset.releasePlayer &&
    releaseBtn?.dataset.playerName &&
    releaseBtn?.dataset.severance
  ) {
    const pId = releaseBtn.dataset.releasePlayer;
    const pName = releaseBtn.dataset.playerName;
    const sev = Number(releaseBtn.dataset.severance);
    if (
      !confirm(
        `Release ${pName}? This will pay a £${sev.toLocaleString()} severance fee and remove the player from your squad.`,
      )
    ) {
      return true;
    }
    callbacks.setCareer(releaseSquadPlayer(career, pId));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  const scoutBtn = target?.closest<HTMLButtonElement>("[data-scout-player]");
  if (scoutBtn?.dataset.scoutPlayer) {
    const pId = scoutBtn.dataset.scoutPlayer;
    callbacks.setCareer(scoutTargetPlayer(career, pId));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  const bidBtn = target?.closest<HTMLButtonElement>("[data-bid-player]");
  if (
    bidBtn?.dataset.bidPlayer &&
    bidBtn?.dataset.targetClub &&
    bidBtn?.dataset.suggestedFee &&
    bidBtn?.dataset.wage
  ) {
    const pId = bidBtn.dataset.bidPlayer;
    const targetClub = bidBtn.dataset.targetClub;
    const fee = Number(bidBtn.dataset.suggestedFee);
    const wage = Number(bidBtn.dataset.wage);
    if (
      !confirm(
        `Submit transfer bid of £${fee.toLocaleString()} on £${wage.toLocaleString()}/wk wage?`,
      )
    ) {
      return true;
    }
    callbacks.setCareer(submitTransferBid(career, targetClub, pId, fee, wage));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  const promoteBtn = target?.closest<HTMLButtonElement>("[data-promote-youth]");
  if (promoteBtn?.dataset.promoteYouth) {
    const pId = promoteBtn.dataset.promoteYouth;
    callbacks.setCareer(promoteAcademyProspect(career, pId));
    callbacks.persist();
    callbacks.render();
    return true;
  }

  const dismissBtn = target?.closest<HTMLButtonElement>("[data-dismiss-youth]");
  if (dismissBtn?.dataset.dismissYouth) {
    const pId = dismissBtn.dataset.dismissYouth;
    if (!confirm("Dismiss this youth prospect from the academy?")) return true;
    callbacks.setCareer(dismissAcademyProspect(career, pId));
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
  if (target?.closest("[data-advance-season]")) {
    callbacks.setCareer(executeSeasonRollover(career));
    callbacks.setSelectedSwapIndex(null);
    callbacks.setSelectedMessageId(null);
    callbacks.persist();
    callbacks.render();
    return true;
  }
  if (target?.closest("[data-advance]")) {
    if (career.checkpoint === "matchDay") {
      callbacks.runRoundSimulation();
      return true;
    }
    if (career.checkpoint === "seasonEnd") {
      callbacks.setCareer(executeSeasonRollover(career));
      callbacks.setSelectedSwapIndex(null);
      callbacks.setSelectedMessageId(null);
      callbacks.persist();
      callbacks.render();
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
