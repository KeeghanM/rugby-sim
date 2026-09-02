export const CAREER_SIMULATION_VERSION = "phase-2";
export const CAREER_CONTENT_VERSION = "2026.1";

export const CLUBS = [
  { id: "harbour-sharks", name: "Harbour Sharks", color: "#167c80" },
  { id: "valley-stags", name: "Valley Stags", color: "#9b3a32" },
  { id: "city-lions", name: "City Lions", color: "#c58b21" },
  { id: "moor-wolves", name: "Moor Wolves", color: "#59677f" },
  { id: "river-bulls", name: "River Bulls", color: "#7a3f78" },
  { id: "coast-hawks", name: "Coast Hawks", color: "#34633f" },
] as const;

export const PLAYER_ROLES = [
  // 1-15: Starting XV
  "loosehead",
  "hooker",
  "tighthead",
  "lock",
  "lock",
  "blindside",
  "openside",
  "number8",
  "scrumHalf",
  "flyHalf",
  "leftWing",
  "insideCentre",
  "outsideCentre",
  "rightWing",
  "fullBack",
  // 16-23: Matchday Reserves (Bench)
  "hooker",
  "prop",
  "prop",
  "lock",
  "backRow",
  "scrumHalf",
  "flyHalf",
  "outsideBack",
  // 24-40: Senior Squad Depth & Reserves
  "loosehead",
  "tighthead",
  "hooker",
  "lock",
  "lock",
  "blindside",
  "openside",
  "number8",
  "backRow",
  "scrumHalf",
  "flyHalf",
  "insideCentre",
  "outsideCentre",
  "centre",
  "leftWing",
  "rightWing",
  "fullBack",
] as const;

export type PlayerRole = (typeof PLAYER_ROLES)[number];

export const CHECKPOINTS = [
  "monday",
  "thursday",
  "matchDay",
  "postMatch",
  "seasonEnd",
] as const;

export type Checkpoint = (typeof CHECKPOINTS)[number];

export const TRAINING_FOCUSES = [
  "balanced",
  "strength",
  "conditioning",
  "handling",
  "attack",
  "defence",
  "recovery",
] as const;

export type TrainingFocus = (typeof TRAINING_FOCUSES)[number];

export const TRAINING_INTENSITIES = ["light", "medium", "high"] as const;

export type TrainingIntensity = (typeof TRAINING_INTENSITIES)[number];

export const STAFF_ROLES = [
  "headCoach",
  "attackCoach",
  "defenceCoach",
  "scCoach",
  "physio",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_NAMES: Record<StaffRole, string> = {
  headCoach: "Head Coach",
  attackCoach: "Attack & Skills Coach",
  defenceCoach: "Defence & Contact Coach",
  scCoach: "Head of Strength & Conditioning",
  physio: "Head Physiotherapist",
};

export const STAFF_EFFECTS: Record<StaffRole, string> = {
  headCoach: "Enhances overall player development & tactical adherence.",
  attackCoach: "Boosts attack, passing, and handling training gains.",
  defenceCoach:
    "Improves tackling technique, defensive line speed, and discipline.",
  scCoach:
    "Accelerates power & speed progression; improves stamina resistance.",
  physio:
    "Speeds up injury rehabilitation and reduces match/training injury risk.",
};

export const FACILITY_NAMES = {
  gym: "High Performance Gym",
  trainingGround: "Tactical Training Grounds",
  medicalRoom: "Medical & Rehab Suite",
} as const;

export type FacilityType = keyof typeof FACILITY_NAMES;

export const FACILITY_EFFECTS = {
  gym: "Increases strength & power training gains across the squad.",
  trainingGround: "Improves skill development rate in all tactical sessions.",
  medicalRoom: "Decreases injury severity & accelerates weekly rehab recovery.",
} as const;

export const FACILITY_UPGRADE_COSTS: Record<number, number> = {
  2: 80_000,
  3: 180_000,
  4: 380_000,
  5: 750_000,
};

export const STAFF_UPGRADE_COSTS: Record<number, number> = {
  2: 40_000,
  3: 90_000,
  4: 180_000,
  5: 350_000,
};

export const ROLE_GROUPS: Record<PlayerRole, string> = {
  loosehead: "prop",
  prop: "prop",
  tighthead: "prop",
  hooker: "hooker",
  lock: "lock",
  blindside: "backRow",
  openside: "backRow",
  number8: "backRow",
  backRow: "backRow",
  scrumHalf: "scrumHalf",
  flyHalf: "flyHalf",
  insideCentre: "centre",
  outsideCentre: "centre",
  centre: "centre",
  leftWing: "outsideBack",
  rightWing: "outsideBack",
  fullBack: "outsideBack",
  outsideBack: "outsideBack",
};

export const INJURY_TYPES = [
  "Hamstring strain",
  "Ankle sprain",
  "Dead leg",
  "Shoulder knock",
  "Groin pull",
  "Calf tightness",
  "Rib cartilage injury",
  "Knee hyperextension",
] as const;

export const FIRST_NAMES = [
  "Callum",
  "Finn",
  "Rory",
  "Ellis",
  "Tom",
  "Owen",
  "Jack",
  "Liam",
  "Sam",
  "Ben",
  "Max",
  "Theo",
  "Jacob",
  "Freddie",
  "Alfie",
  "George",
  "Charlie",
  "Harry",
  "Archie",
  "Leo",
  "Isaac",
  "Elliot",
  "Mason",
  "Dylan",
] as const;

export const LAST_NAMES = [
  "Morgan",
  "Davies",
  "Evans",
  "Thomas",
  "Williams",
  "Jones",
  "Taylor",
  "Roberts",
  "Lewis",
  "Hughes",
  "Price",
  "Reed",
  "Bennett",
  "Clarke",
  "Foster",
  "Griffiths",
  "Hall",
  "James",
  "Lloyd",
  "Morris",
  "Parker",
  "Shaw",
  "Turner",
  "Walker",
] as const;
