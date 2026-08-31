export const PITCH = {
  width: 70,
  totalLength: 120,
  touchLines: { left: -35, right: 35 },
  deadBallLines: { south: -60, north: 60 },
  tryLines: { south: -50, north: 50 },
  twentyTwoMetreLines: { south: -28, north: 28 },
  tenMetreLines: { south: -10, north: 10 },
  halfwayLine: 0,
  fiveMetreLines: { left: -30, right: 30, south: -45, north: 45 },
  fifteenMetreLines: { left: -20, right: 20 },
} as const;

export const ROLES = {
  TightHead: "Tight Head",
  Hooker: "Hooker",
  LooseHead: "Loose Head",
  Lock: "Lock",
  OpenSideFlanker: "Open Side Flanker",
  BlindSideFlanker: "Blind Side Flanker",
  NumberEight: "Number Eight",
  ScrumHalf: "Scrum Half",
  FlyHalf: "Fly Half",
  InsideCentre: "Inside Centre",
  OutsideCentre: "Outside Centre",
  Wing: "Wing",
  FullBack: "Full Back",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type Team = 0 | 1;
export type Pod = "left" | "middle" | "right" | "backline";
export type Position = { x: number; z: number };
export type Position3 = Position & { y: number };
export type PlayerSkills = {
  decision: number;
  handling: number;
  passing: number;
  kicking: number;
  tackling: number;
};

export type PendingBallAction =
  | {
      kind: "pass";
      receiverId: string;
      clearance: boolean;
      remainingSeconds: number;
    }
  | {
      kind: "kick";
      target: Position;
      flight: "kick" | "kickoff" | "lineout" | "grubber";
      remainingSeconds: number;
    };

export type Player = {
  id: string;
  team: Team;
  number: number;
  slotIndex: number;
  role: Role;
  pod: Pod;
  position: Position;
  laneX: number;
  velocity: Position;
  intentTarget: Position;
  intentKind: string;
  intentForSeconds: number;
  decisionForSeconds: number;
  speed: number;
  weight: number;
  stamina: number;
  injuryPenalty: number;
  tackleCooldown: number;
  hardLineForSeconds: number;
  kickOffside: boolean;
  ruckRecoverySeconds: number;
  pendingBallAction: PendingBallAction | null;
  skills: PlayerSkills;
};

export type Ball = {
  position: Position3;
  velocity: Position3;
  carrierId: string | null;
  flight: "pass" | "kick" | "kickoff" | "lineout" | "rolling" | "grubber" | null;
  intendedReceiverId: string | null;
  lastTouchedTeam: Team | null;
  kickOrigin: Position | null;
  bouncesRemaining: number;
};

export type Referee = {
  position: Position;
  velocity: Position;
};

export type Phase =
  | { kind: "openPlay" }
  | {
      kind: "kickoff";
      stage: "forming" | "ready" | "inFlight";
      kickingTeam: Team;
      readyForSeconds: number;
      reason: "matchStart" | "try" | "goalLineDropout" | "halfTime";
    }
  | {
      kind: "ruck";
      stage: "arrivals" | "secure" | "available";
      position: Position;
      attackingTeam: Team;
      tempo: "quick" | "slow";
      play: "pass" | "pickAndGo" | "boxKick" | "clearance";
      counterRuck: boolean;
      winningTeam: Team | null;
      elapsed: number;
      attackers: string[];
      defenders: string[];
      tackledPlayerId: string;
      tacklerId: string;
    }
  | {
      kind: "lineout";
      stage: "forming" | "ready" | "inFlight";
      position: Position;
      throwingTeam: Team;
      elapsed: number;
    }
  | {
      kind: "scrum";
      stage: "forming" | "set" | "channeling";
      position: Position;
      feedingTeam: Team;
      elapsed: number;
      winningTeam: Team | null;
    }
  | {
      kind: "conversion";
      stage: "setup" | "kick";
      position: Position;
      kickingTeam: Team;
      elapsed: number;
    }
  | {
      kind: "penalty";
      stage: "decision" | "executing";
      position: Position;
      awardedTeam: Team;
      choice: "touch" | "goal" | "tap";
      elapsed: number;
    };

export type ActiveTeamFormations = {
  kickoffAttack: "balanced" | "press" | "split";
  kickoffDefence: "deep" | "pendulum" | "splitField";
  openAttack: "balanced" | "tightPods" | "wide";
  openDefence: "connected" | "narrow" | "wide";
  lineoutMembers: 4 | 5 | 6 | 7;
  lineoutNonParticipants: "backline" | "split" | "maulDefence";
  scrumAttack: "openSide" | "blindSide" | "splitBacks";
  scrumDefence: "drift" | "manOnMan" | "blitz";
};

export type Substitute = {
  id: string;
  team: Team;
  number: number;
  role: Role;
  pod: Pod;
  speed: number;
  weight: number;
  skills: PlayerSkills;
  isUsed: boolean;
};

export type GameState = {
  players: Player[];
  substitutes: Substitute[];
  recentSubstitution: string | null;
  ball: Ball;
  scores: [number, number];
  phase: Phase;
  pendingClearanceKickerId: string | null;
  defensiveLineZ: [number, number];
  attackFlow: [-1 | 1, -1 | 1];
  formations: Record<Team, ActiveTeamFormations>;
  matchClockSeconds: number;
  half: 1 | 2 | "fullTime";
  referee: Referee;
  phaseCount: number;
  possessionTeam: Team;
  gainLineZ: number;
  possessionOriginZ: number;
  distanceGained: number;
};

export const attackDirection = (team: Team) => (team === 0 ? 1 : -1);
export const otherTeam = (team: Team): Team => (team === 0 ? 1 : 0);
