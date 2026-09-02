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
  "chiefScout",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_NAMES: Record<StaffRole, string> = {
  headCoach: "Head Coach",
  attackCoach: "Attack & Skills Coach",
  defenceCoach: "Defence & Contact Coach",
  scCoach: "Head of Strength & Conditioning",
  physio: "Head Physiotherapist",
  chiefScout: "Head of Recruitment & Scouting",
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
  chiefScout:
    "Improves scouting accuracy and reveals hidden player potentials.",
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

export type CoachingCourseId =
  | "wr_foundation"
  | "attack_architecture"
  | "defense_mastermind"
  | "setpiece_mastery"
  | "elite_director";

export type AttackStructurePreset =
  "standard" | "pod_1_3_3_1" | "pod_2_4_2" | "wide_spread";

export type DefenseStructurePreset =
  "drift" | "blitz" | "pendulum_cover" | "aggressive_rush";

export type SetPieceFocusPreset =
  "balanced" | "quick_tap" | "maul_drive" | "territory_boot";

export type KickPressurePreset = "low" | "standard" | "high";
export type MatchTempoPreset = "controlled" | "balanced" | "high_tempo";

export type CoachingCourseInfo = {
  id: CoachingCourseId;
  name: string;
  badge: string;
  category: "Foundation" | "Attack" | "Defense" | "Set Piece" | "Elite";
  levelRequired: number;
  cost: number;
  roundsDuration: number;
  description: string;
  perks: string[];
  unlocks: {
    attackStructures?: AttackStructurePreset[];
    defenseStructures?: DefenseStructurePreset[];
    setPieceFocuses?: SetPieceFocusPreset[];
    trainingBonusPct?: number;
    disciplineBonus?: number;
    matchXpBonusPct?: number;
  };
};

export const COACHING_COURSES: Record<CoachingCourseId, CoachingCourseInfo> = {
  wr_foundation: {
    id: "wr_foundation",
    name: "World Rugby Level 1 (Foundation)",
    badge: "📜",
    category: "Foundation",
    levelRequired: 1,
    cost: 5_000,
    roundsDuration: 2,
    description:
      "Fundamental coaching principles, training drills, and foundational player development.",
    perks: ["+5% Squad Training Efficiency", "+10% Match XP Gain"],
    unlocks: {
      trainingBonusPct: 0.05,
      matchXpBonusPct: 0.1,
    },
  },
  attack_architecture: {
    id: "attack_architecture",
    name: "Attack Architecture & Pods Specialist",
    badge: "⚡",
    category: "Attack",
    levelRequired: 2,
    cost: 15_000,
    roundsDuration: 3,
    description:
      "Advanced phase play structures, 1-3-3-1 and 2-4-2 forward pods to manipulate defensive edges.",
    perks: [
      "Unlocks 1-3-3-1 Forward Pod Structure",
      "Unlocks 2-4-2 Wide Pod Structure",
      "Unlocks High-Tempo Play",
    ],
    unlocks: {
      attackStructures: ["pod_1_3_3_1", "pod_2_4_2"],
    },
  },
  defense_mastermind: {
    id: "defense_mastermind",
    name: "Defensive Mastermind & Blitz Systems",
    badge: "🛡️",
    category: "Defense",
    levelRequired: 2,
    cost: 20_000,
    roundsDuration: 3,
    description:
      "High-pressure blitz rush defense, drift containment, and backfield pendulum coverage.",
    perks: [
      "Unlocks Blitz Press Defense",
      "Unlocks Pendulum Backfield Cover",
      "Unlocks Aggressive Rush Defense",
    ],
    unlocks: {
      defenseStructures: ["blitz", "pendulum_cover", "aggressive_rush"],
    },
  },
  setpiece_mastery: {
    id: "setpiece_mastery",
    name: "Set-Piece & Breakdown Mastery",
    badge: "🏉",
    category: "Set Piece",
    levelRequired: 3,
    cost: 30_000,
    roundsDuration: 4,
    description:
      "Technical scrummaging, deceptive lineout movements, rolling maul dominance, and breakdown poaching.",
    perks: [
      "Unlocks Maul Drive Focus",
      "Unlocks Territory Boot Strategy",
      "Unlocks Quick Tap Strategy",
    ],
    unlocks: {
      setPieceFocuses: ["quick_tap", "maul_drive", "territory_boot"],
    },
  },
  elite_director: {
    id: "elite_director",
    name: "Elite Director of Rugby License",
    badge: "🏆",
    category: "Elite",
    levelRequired: 4,
    cost: 60_000,
    roundsDuration: 5,
    description:
      "The highest coaching qualification in professional rugby. Elite leadership, tactical masterminding, and mental discipline.",
    perks: [
      "+10% Squad Training Efficiency",
      "+15 Manager Reputation",
      "+5 Squad Tactical Discipline",
      "Unlocks Wide Spread Attack",
    ],
    unlocks: {
      trainingBonusPct: 0.1,
      disciplineBonus: 5,
      attackStructures: ["wide_spread"],
    },
  },
};

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
];

export const MANAGER_REPUTATION_TIERS = [
  { min: 90, title: "Legend of the Game", badge: "⭐ Legend" },
  { min: 75, title: "Elite Director", badge: "🥇 Elite" },
  { min: 60, title: "Established Tactician", badge: "🥈 Established" },
  { min: 40, title: "Respected Coach", badge: "🥉 Respected" },
  { min: 20, title: "Club Manager", badge: "🛡️ Pro" },
  { min: 0, title: "Rookie Coach", badge: "🔰 Rookie" },
] as const;
