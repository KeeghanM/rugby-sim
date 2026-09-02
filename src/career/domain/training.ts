import { INJURY_TYPES } from "./constants.ts";
import type {
  BlockingEvent,
  Career,
  InboxMessage,
  PlayerInjury,
  TrainingPlan,
} from "./types.ts";

export function setClubTrainingPlan(
  career: Career,
  clubId: string,
  plan: Partial<TrainingPlan>,
): Career {
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club;
        return {
          ...club,
          trainingPlan: { ...club.trainingPlan, ...plan },
        };
      }),
    },
  };
}

export function resolveWeeklyTraining(career: Career): Career {
  let trainingEvent: BlockingEvent | null = null;
  const newInboxMessages: InboxMessage[] = [];

  const updatedClubs = career.season.clubs.map((club) => {
    const isManaged = club.id === career.managedClubId;
    const plan = club.trainingPlan;
    const medLevel = club.facilities?.medicalRoom ?? club.facilityLevel ?? 1;
    const gymLevel = club.facilities?.gym ?? club.staffLevel ?? 1;

    const updatedSquad = club.squad.map((player) => {
      // 1. Process existing injury recovery
      if (player.injury !== null) {
        const recoverySpeed = plan.focus === "recovery" ? 1.5 : 1.0;
        const newRemaining = Math.max(
          0,
          player.injury.weeksRemaining - recoverySpeed,
        );
        if (newRemaining <= 0) {
          if (isManaged) {
            newInboxMessages.push({
              id: `recovery-${player.id}-${career.currentRound}`,
              title: `Injury Recovery: ${player.name}`,
              message: `${player.name} has completed recovery from their ${player.injury.type} and is now available for selection.`,
              read: false,
            });
          }
          return {
            ...player,
            injury: null,
            fitness: Math.min(100, player.fitness + 15),
          };
        }
        return {
          ...player,
          injury: { ...player.injury, weeksRemaining: Math.ceil(newRemaining) },
          fitness: Math.min(100, player.fitness + 5),
        };
      }

      // 2. Training impact on healthy players
      let fitnessDelta = 0;
      let attackDelta = 0;
      let defenceDelta = 0;

      if (plan.intensity === "light") fitnessDelta += 10;
      else if (plan.intensity === "medium") fitnessDelta += 2;
      else if (plan.intensity === "high") fitnessDelta -= 8;

      if (plan.focus === "recovery") fitnessDelta += 14;
      else if (plan.focus === "conditioning") fitnessDelta += 8;
      else if (plan.focus === "strength") {
        attackDelta += Math.random() < 0.3 + gymLevel * 0.1 ? 1 : 0;
        defenceDelta += Math.random() < 0.3 + gymLevel * 0.1 ? 1 : 0;
      } else if (plan.focus === "attack" || plan.focus === "handling") {
        attackDelta += Math.random() < 0.45 ? 1 : 0;
      } else if (plan.focus === "defence") {
        defenceDelta += Math.random() < 0.45 ? 1 : 0;
      }

      const nextFitness = Math.max(
        25,
        Math.min(100, player.fitness + fitnessDelta),
      );
      const nextAttack = Math.min(99, player.attack + attackDelta);
      const nextDefence = Math.min(99, player.defence + defenceDelta);

      // 3. Roll for training injury
      let injuryRisk = 0.02;
      if (plan.intensity === "light") injuryRisk = 0.005;
      else if (plan.intensity === "high") injuryRisk = 0.06;

      if (plan.focus === "recovery") injuryRisk *= 0.3;
      if (nextFitness < 50) injuryRisk += 0.03;
      injuryRisk = Math.max(0.002, injuryRisk - medLevel * 0.008);

      if (Math.random() < injuryRisk) {
        const injuryType =
          INJURY_TYPES[Math.floor(Math.random() * INJURY_TYPES.length)];
        const weeks = Math.floor(Math.random() * 3) + 1;
        const injury: PlayerInjury = {
          type: injuryType,
          weeksRemaining: weeks,
          severity: weeks >= 3 ? "severe" : weeks === 2 ? "moderate" : "minor",
        };

        if (isManaged && !trainingEvent) {
          trainingEvent = {
            id: `training-injury-${player.id}-${career.currentRound}`,
            title: `Training Injury: ${player.name}`,
            message: `${player.name} sustained a ${injuryType} in Tuesday's training session and will be unavailable for ${weeks} week${weeks > 1 ? "s" : ""}.`,
          };
          newInboxMessages.push({ ...trainingEvent, read: false });
        }

        return {
          ...player,
          attack: nextAttack,
          defence: nextDefence,
          fitness: Math.max(20, nextFitness - 15),
          injury,
        };
      }

      return {
        ...player,
        attack: nextAttack,
        defence: nextDefence,
        fitness: nextFitness,
      };
    });

    return { ...club, squad: updatedSquad };
  });

  return {
    ...career,
    season: { ...career.season, clubs: updatedClubs },
    pendingEvent: trainingEvent ?? career.pendingEvent,
    inbox: newInboxMessages.concat(career.inbox),
  };
}
