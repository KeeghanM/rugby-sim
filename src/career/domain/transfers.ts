import { getPlayerOverall } from "./selection.ts";
import type {
  Career,
  Club,
  InboxMessage,
  Player,
  ScoutingReport,
  TransferOffer,
} from "./types.ts";

export function calculatePlayerMarketValue(player: Player): number {
  const ovr = getPlayerOverall(player);
  let ageMultiplier = 1.0;
  if (player.age <= 22) ageMultiplier = 1.35;
  else if (player.age <= 26) ageMultiplier = 1.2;
  else if (player.age <= 29) ageMultiplier = 1.0;
  else if (player.age <= 32) ageMultiplier = 0.65;
  else ageMultiplier = 0.35;

  const base = Math.pow(Math.max(45, ovr) / 50, 4) * 22_000;
  const value = Math.round((base * ageMultiplier) / 1000) * 1000;
  return Math.max(10_000, value);
}

export function generateScoutingReport(
  player: Player,
  scoutLevel: number,
  currentRound: number,
): ScoutingReport {
  const ovr = getPlayerOverall(player);
  const potential =
    player.potential ?? Math.min(99, ovr + Math.max(0, 30 - player.age));

  // Accuracy and margin of error based on Chief Scout level (1 to 5)
  // Level 1: error +- 5
  // Level 3: error +- 2
  // Level 5: error 0 (exact)
  const errorMargin = Math.max(0, 6 - scoutLevel);
  const ovrMin = Math.max(40, ovr - errorMargin);
  const ovrMax = Math.min(99, ovr + errorMargin);

  const potErrorMargin = Math.max(0, 8 - scoutLevel * 1.5);
  const potentialMin = Math.max(40, Math.round(potential - potErrorMargin));
  const potentialMax = Math.min(99, Math.round(potential + potErrorMargin));

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (player.speed >= 75) strengths.push("Explosive pace and acceleration");
  else if (player.speed < 55) weaknesses.push("Limited top-end speed");

  if (player.strength >= 75)
    strengths.push("Dominant physical power & collision impact");
  else if (player.strength < 55) weaknesses.push("Vulnerable in heavy contact");

  if (player.skills.tackling >= 75)
    strengths.push("Rock-solid defensive tackle technique");
  else if (player.skills.tackling < 55)
    weaknesses.push("Prone to missed tackles in open play");

  if (player.skills.handling >= 75)
    strengths.push("Silky ball handling and offloading");
  else if (player.skills.handling < 55)
    weaknesses.push("Susceptible to handling errors in traffic");

  if (strengths.length === 0)
    strengths.push("Balanced all-round fundamental skillset");
  if (weaknesses.length === 0)
    weaknesses.push("No glaring technical deficiencies");

  return {
    playerId: player.id,
    revealed: true,
    accuracy: Math.min(1.0, 0.4 + scoutLevel * 0.12),
    ovrMin,
    ovrMax,
    potentialMin,
    potentialMax,
    strengths,
    weaknesses,
    scoutedRound: currentRound,
  };
}

export function scoutTargetPlayer(career: Career, playerId: string): Career {
  const managedClub = career.season.clubs.find(
    (c) => c.id === career.managedClubId,
  );
  if (!managedClub) throw new Error("Managed club not found");

  const scout = managedClub.staff.find((s) => s.role === "chiefScout");
  const scoutLevel = scout?.level ?? 1;

  // Find player across free agents and other clubs
  let foundPlayer = career.freeAgents.find((p) => p.id === playerId);
  if (!foundPlayer) {
    for (const club of career.season.clubs) {
      foundPlayer = club.squad.find((p) => p.id === playerId);
      if (foundPlayer) break;
    }
  }

  if (!foundPlayer) throw new Error("Player not found to scout");

  const report = generateScoutingReport(
    foundPlayer,
    scoutLevel,
    career.currentRound,
  );

  return {
    ...career,
    scoutingReports: {
      ...career.scoutingReports,
      [playerId]: report,
    },
  };
}

export function signFreeAgent(
  career: Career,
  playerId: string,
  offeredWage: number,
  signingBonus: number,
): Career {
  const freeAgent = career.freeAgents.find((p) => p.id === playerId);
  if (!freeAgent) throw new Error("Free agent player not found");

  const managedClub = career.season.clubs.find(
    (c) => c.id === career.managedClubId,
  );
  if (!managedClub) throw new Error("Managed club not found");

  if (managedClub.squad.length >= 40) {
    throw new Error(
      "Squad limit reached (40 players). Release a player before signing free agents.",
    );
  }

  const totalUpfrontCost = signingBonus;
  if (managedClub.balance < totalUpfrontCost) {
    throw new Error(
      `Insufficient club balance (£${managedClub.balance.toLocaleString()} available, £${totalUpfrontCost.toLocaleString()} required for signing bonus)`,
    );
  }

  // Player contract demands
  const minAcceptableWage = Math.round(freeAgent.wage * 0.9);
  if (offeredWage < minAcceptableWage) {
    throw new Error(
      `${freeAgent.name} rejected your offer. Demands at least £${minAcceptableWage.toLocaleString()}/wk.`,
    );
  }

  const signedPlayer: Player = {
    ...freeAgent,
    wage: offeredWage,
    contractYears: 2,
  };

  const updatedClubs = career.season.clubs.map((club) => {
    if (club.id !== career.managedClubId) return club;
    return {
      ...club,
      balance: club.balance - totalUpfrontCost,
      squad: [...club.squad, signedPlayer],
      ledger: [
        {
          id: `ledger-sign-${Date.now()}`,
          round: career.currentRound,
          date: career.currentDate,
          category: "transferSpend" as const,
          description: `Free Agent Signing Bonus: ${signedPlayer.name}`,
          amount: -totalUpfrontCost,
        },
        ...club.ledger,
      ],
    };
  });

  const updatedFreeAgents = career.freeAgents.filter((p) => p.id !== playerId);

  const confirmMessage: InboxMessage = {
    id: `transfer-sign-${signedPlayer.id}-${Date.now()}`,
    title: `✍️ Free Agent Signed: ${signedPlayer.name}`,
    message: `${signedPlayer.name} has signed a 2-year contract with ${managedClub.name} at £${offeredWage.toLocaleString()}/wk (Signing bonus: £${signingBonus.toLocaleString()}).`,
    read: false,
  };

  return {
    ...career,
    season: {
      ...career.season,
      clubs: updatedClubs,
    },
    freeAgents: updatedFreeAgents,
    inbox: [confirmMessage, ...career.inbox],
  };
}

export function releaseSquadPlayer(career: Career, playerId: string): Career {
  const managedClub = career.season.clubs.find(
    (c) => c.id === career.managedClubId,
  );
  if (!managedClub) throw new Error("Managed club not found");

  const player = managedClub.squad.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found in club squad");

  if (managedClub.squad.length <= 23) {
    throw new Error(
      "Cannot release player: club must maintain at least 23 players for matchday team sheets.",
    );
  }

  // Severance fee: 4 weeks of wages
  const severance = player.wage * 4;
  if (managedClub.balance < severance) {
    throw new Error(
      `Insufficient funds for contract severance fee (£${managedClub.balance.toLocaleString()} available, £${severance.toLocaleString()} required).`,
    );
  }

  const updatedClubs = career.season.clubs.map((club) => {
    if (club.id !== career.managedClubId) return club;
    return {
      ...club,
      balance: club.balance - severance,
      squad: club.squad.filter((p) => p.id !== playerId),
      ledger: [
        {
          id: `ledger-release-${Date.now()}`,
          round: career.currentRound,
          date: career.currentDate,
          category: "severanceSpend" as const,
          description: `Contract Severance: ${player.name} (${player.contractYears}y remaining)`,
          amount: -severance,
        },
        ...club.ledger,
      ],
    };
  });

  // Released player enters Free Agents pool
  const updatedFreeAgents = [
    {
      ...player,
      contractYears: 0,
      fitness: 85,
    },
    ...career.freeAgents,
  ];

  return {
    ...career,
    season: {
      ...career.season,
      clubs: updatedClubs,
    },
    freeAgents: updatedFreeAgents,
  };
}

export function submitTransferBid(
  career: Career,
  targetClubId: string,
  playerId: string,
  offeredFee: number,
  offeredWage: number,
): Career {
  const buyerClub = career.season.clubs.find(
    (c) => c.id === career.managedClubId,
  );
  const sellerClub = career.season.clubs.find((c) => c.id === targetClubId);
  if (!buyerClub || !sellerClub) throw new Error("Club not found");

  if (buyerClub.squad.length >= 40) {
    throw new Error(
      "Squad limit reached (40 players). Release a player before making transfer bids.",
    );
  }

  if (buyerClub.balance < offeredFee) {
    throw new Error(
      `Insufficient club balance (£${buyerClub.balance.toLocaleString()} available, £${offeredFee.toLocaleString()} required for transfer fee)`,
    );
  }

  const player = sellerClub.squad.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found in target club");

  const playerIndex = sellerClub.squad.findIndex((p) => p.id === playerId);
  const isStarter = playerIndex < 15;
  const marketVal = calculatePlayerMarketValue(player);

  // AI evaluation threshold
  const minRequiredFee = isStarter
    ? Math.round(marketVal * 1.25)
    : Math.round(marketVal * 0.95);

  if (offeredFee < minRequiredFee) {
    throw new Error(
      `${sellerClub.name} rejected your £${offeredFee.toLocaleString()} bid for ${player.name}. They value the player at minimum £${minRequiredFee.toLocaleString()}.`,
    );
  }

  if (offeredWage < Math.round(player.wage * 1.05)) {
    throw new Error(
      `${player.name} rejected personal terms. Demands at least £${Math.round(player.wage * 1.05).toLocaleString()}/wk.`,
    );
  }

  // Transfer executed!
  const transferredPlayer: Player = {
    ...player,
    wage: offeredWage,
    contractYears: 3,
  };

  const updatedClubs = career.season.clubs.map((club) => {
    if (club.id === buyerClub.id) {
      return {
        ...club,
        balance: club.balance - offeredFee,
        squad: [...club.squad, transferredPlayer],
        ledger: [
          {
            id: `ledger-buy-${Date.now()}`,
            round: career.currentRound,
            date: career.currentDate,
            category: "transferSpend" as const,
            description: `Transfer Fee Paid: ${transferredPlayer.name} (from ${sellerClub.name})`,
            amount: -offeredFee,
          },
          ...club.ledger,
        ],
      };
    }
    if (club.id === sellerClub.id) {
      return {
        ...club,
        balance: club.balance + offeredFee,
        squad: club.squad.filter((p) => p.id !== playerId),
        ledger: [
          {
            id: `ledger-sell-${Date.now()}`,
            round: career.currentRound,
            date: career.currentDate,
            category: "transferIncome" as const,
            description: `Transfer Fee Received: ${transferredPlayer.name} (to ${buyerClub.name})`,
            amount: offeredFee,
          },
          ...club.ledger,
        ],
      };
    }
    return club;
  });

  const confirmMsg: InboxMessage = {
    id: `transfer-complete-${transferredPlayer.id}-${Date.now()}`,
    title: `🤝 Transfer Complete: ${transferredPlayer.name}`,
    message: `Deal agreed! ${transferredPlayer.name} has joined ${buyerClub.name} from ${sellerClub.name} for a fee of £${offeredFee.toLocaleString()} on £${offeredWage.toLocaleString()}/wk.`,
    read: false,
  };

  return {
    ...career,
    season: {
      ...career.season,
      clubs: updatedClubs,
    },
    inbox: [confirmMsg, ...career.inbox],
  };
}

export function respondToIncomingTransferBid(
  career: Career,
  offerId: string,
  decision: "accept" | "reject",
): Career {
  const offer = career.transferOffers.find((o) => o.id === offerId);
  if (!offer) throw new Error("Transfer offer not found");

  const sellerClub = career.season.clubs.find((c) => c.id === offer.fromClubId);
  const buyerClub = career.season.clubs.find((c) => c.id === offer.toClubId);
  if (!sellerClub || !buyerClub)
    throw new Error("Club involved in transfer not found");

  const player = sellerClub.squad.find((p) => p.id === offer.playerId);
  if (!player) throw new Error("Player no longer at club");

  const updatedOffers = career.transferOffers.map((o) =>
    o.id === offerId
      ? { ...o, status: decision as "accepted" | "rejected" }
      : o,
  );

  if (decision === "reject") {
    const rejectMsg: InboxMessage = {
      id: `bid-rejected-${offer.id}`,
      title: `Transfer Bid Rejected: ${player.name}`,
      message: `You rejected ${buyerClub.name}'s offer of £${offer.offeredFee.toLocaleString()} for ${player.name}.`,
      read: false,
    };
    return {
      ...career,
      transferOffers: updatedOffers,
      inbox: [rejectMsg, ...career.inbox],
    };
  }

  // Accepted: execute sale
  const transferredPlayer: Player = {
    ...player,
    wage: offer.offeredWage,
    contractYears: 2,
  };

  const updatedClubs = career.season.clubs.map((club) => {
    if (club.id === sellerClub.id) {
      return {
        ...club,
        balance: club.balance + offer.offeredFee,
        squad: club.squad.filter((p) => p.id !== player.id),
        ledger: [
          {
            id: `ledger-sell-${Date.now()}`,
            round: career.currentRound,
            date: career.currentDate,
            category: "transferIncome" as const,
            description: `Transfer Fee Received: ${player.name} (to ${buyerClub.name})`,
            amount: offer.offeredFee,
          },
          ...club.ledger,
        ],
      };
    }
    if (club.id === buyerClub.id) {
      return {
        ...club,
        balance: club.balance - offer.offeredFee,
        squad: [...club.squad, transferredPlayer],
        ledger: [
          {
            id: `ledger-buy-${Date.now()}`,
            round: career.currentRound,
            date: career.currentDate,
            category: "transferSpend" as const,
            description: `Transfer Fee Paid: ${player.name} (from ${sellerClub.name})`,
            amount: -offer.offeredFee,
          },
          ...club.ledger,
        ],
      };
    }
    return club;
  });

  const acceptMsg: InboxMessage = {
    id: `bid-accepted-${offer.id}`,
    title: `💰 Transfer Completed: ${player.name} Sold`,
    message: `${player.name} has completed a transfer to ${buyerClub.name} for £${offer.offeredFee.toLocaleString()}. Funds have been credited to your club balance.`,
    read: false,
  };

  return {
    ...career,
    season: {
      ...career.season,
      clubs: updatedClubs,
    },
    transferOffers: updatedOffers,
    inbox: [acceptMsg, ...career.inbox],
  };
}
