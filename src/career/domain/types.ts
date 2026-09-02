import type { PlayerStats, TeamMatchStats } from "../../domain.ts";
import type {
  Checkpoint,
  FacilityType,
  PlayerRole,
  StaffRole,
  TrainingFocus,
  TrainingIntensity,
} from "./constants.ts";

export type TrainingPlan = {
  focus: TrainingFocus;
  intensity: TrainingIntensity;
};

export type PlayerInjury = {
  type: string;
  weeksRemaining: number;
  severity: "minor" | "moderate" | "severe";
};

export type Facilities = {
  gym: number;
  trainingGround: number;
  medicalRoom: number;
};

export type StaffMember = {
  id: string;
  role: StaffRole;
  name: string;
  level: number;
  wage: number;
};

export type LedgerCategory =
  | "matchIncome"
  | "prizeMoney"
  | "playerWages"
  | "staffWages"
  | "facilityUpgrade"
  | "staffRecruitment"
  | "medicalCosts";

export type LedgerEntry = {
  id: string;
  round: number;
  date: string;
  category: LedgerCategory;
  description: string;
  amount: number;
};

export type FixtureStatus = "scheduled" | "played";

export type PlayerCareerRecord = {
  appearances: number;
  starts: number;
  subAppearances: number;
  tries: number;
  lineBreaks: number;
  tacklesMade: number;
  tacklesMissed: number;
  distanceCovered: number;
  distanceCarried: number;
  successfulPasses: number;
  totalPasses: number;
  successfulKicks: number;
  totalKicks: number;
  penaltiesConceded: number;
  knockOns: number;
};

export type PlayerSkills = {
  decision: number;
  handling: number;
  passing: number;
  kicking: number;
  tackling: number;
};

export type Player = {
  id: string;
  name: string;
  age: number;
  role: PlayerRole;
  skills: PlayerSkills;
  speed: number;
  strength: number;
  fitness: number;
  wage: number;
  injury: PlayerInjury | null;
  careerRecord: PlayerCareerRecord;
};

export type Club = {
  id: string;
  name: string;
  color: string;
  reputation: number;
  squad: Player[];
  staff: StaffMember[];
  staffLevel: number;
  facilityLevel: number;
  facilities: Facilities;
  balance: number;
  ledger: LedgerEntry[];
  trainingPlan: TrainingPlan;
};

export type FixturePlayerPerformance = {
  playerId: string;
  clubId: string;
  name: string;
  number: number;
  role: string;
  started: boolean;
  stats: PlayerStats;
};

export type MatchResult = {
  homeScore: number;
  awayScore: number;
  homeTries?: number;
  awayTries?: number;
  homeTeamStats?: TeamMatchStats;
  awayTeamStats?: TeamMatchStats;
  players?: FixturePlayerPerformance[];
};

export type Fixture = {
  id: string;
  round: number;
  date: string;
  seed: number;
  homeClubId: string;
  awayClubId: string;
  status: FixtureStatus;
  result: MatchResult | null;
};

export type BlockingEvent = {
  id: string;
  title: string;
  message: string;
};

export type MatchReportData = {
  round: number;
  homeClubId: string;
  awayClubId: string;
  homeClubName: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  homeTeamStats?: TeamMatchStats;
  awayTeamStats?: TeamMatchStats;
  players: FixturePlayerPerformance[];
};

export type InboxMessage = BlockingEvent & {
  read: boolean;
  matchReport?: MatchReportData;
};

export type Career = {
  id: string;
  manager: { name: string };
  managedClubId: string;
  season: {
    id: string;
    name: string;
    clubs: Club[];
    fixtures: Fixture[];
  };
  currentRound: number;
  currentDate: string;
  checkpoint: Checkpoint;
  pendingEvent: BlockingEvent | null;
  inbox: InboxMessage[];
};

export type Standing = {
  clubId: string;
  clubName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  tablePoints: number;
};
