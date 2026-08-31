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
