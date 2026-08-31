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

export type Player = {
  id: string;
  team: Team;
  number: number;
  role: Role;
  pod: Pod;
  position: Position;
  speed: number;
  weight: number;
  stamina: number;
  injuryPenalty: number;
  tackleCooldown: number;
  hardLineForSeconds: number;
};

export type Ball = {
  position: Position3;
  velocity: Position3;
  carrierId: string | null;
  flight: "pass" | "kick" | "kickoff" | null;
  intendedReceiverId: string | null;
};

export type Phase =
  | { kind: "openPlay" }
  | {
      kind: "kickoff";
      stage: "forming" | "ready" | "inFlight";
      kickingTeam: Team;
      readyForSeconds: number;
      reason: "matchStart" | "try";
    }
  | {
      kind: "ruck";
      stage: "forming" | "contest" | "ready";
      position: Position;
      attackingTeam: Team;
      strategy: "slow" | "pickAndGo";
      counterRuck: boolean;
      winningTeam: Team | null;
      elapsed: number;
      releaseAfterSeconds: number;
    };

export type GameState = {
  players: Player[];
  ball: Ball;
  scores: [number, number];
  phase: Phase;
};

export const attackDirection = (team: Team) => (team === 0 ? 1 : -1);
export const otherTeam = (team: Team): Team => (team === 0 ? 1 : 0);
