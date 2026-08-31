import {
  Color3,
  CreateCylinder,
  CreateDashedLines,
  CreateGround,
  CreateLines,
  FreeCamera,
  HemisphericLight,
  StandardMaterial,
} from "@babylonjs/core";
import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Materials/PBR/pbrMaterial";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/loaders/glTF";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true);
const SIMULATION_SPEED = 0.25;

const PITCH = {
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

enum InjuryType {
  Sprain = "Sprain",
  Fracture = "Fracture",
  Concussion = "Concussion",
  MuscleStrain = "Muscle Strain",
  Dislocation = "Dislocation",
}
enum SeverityLevel {
  Mild = 1,
  Moderate = 5,
  Severe = 10,
}
type Injury = {
  type: InjuryType;
  severity: SeverityLevel; // 1-10 scale
  recoveryTime: number; // in days
};
enum Role {
  TightHead = "Tight Head",
  Hooker = "Hooker",
  LooseHead = "Loose Head",
  Lock = "Lock",
  OpenSideFlanker = "Open Side Flanker",
  BlindSideFlanker = "Blind Side Flanker",
  NumberEight = "Number Eight",
  ScrumHalf = "Scrum Half",
  FlyHalf = "Fly Half",
  InsideCentre = "Inside Centre",
  OutsideCentre = "Outside Centre",
  Wing = "Wing",
  FullBack = "Full Back",
}

const players: Player[] = [];

const LINEUP: ReadonlyArray<{ role: Role; x: number; z: number }> = [
  { role: Role.LooseHead, x: -3, z: -3 },
  { role: Role.Hooker, x: 0, z: -3 },
  { role: Role.TightHead, x: 3, z: -3 },
  { role: Role.Lock, x: -2, z: -6 },
  { role: Role.Lock, x: 2, z: -6 },
  { role: Role.BlindSideFlanker, x: -5, z: -8 },
  { role: Role.OpenSideFlanker, x: 5, z: -8 },
  { role: Role.NumberEight, x: 0, z: -9 },
  { role: Role.ScrumHalf, x: 7, z: -7 },
  { role: Role.FlyHalf, x: 10, z: -12 },
  { role: Role.Wing, x: -30, z: -15 },
  { role: Role.InsideCentre, x: 14, z: -15 },
  { role: Role.OutsideCentre, x: 19, z: -18 },
  { role: Role.Wing, x: 30, z: -15 },
  { role: Role.FullBack, x: 0, z: -27 },
];

class Player {
  public team: 0 | 1;
  public role: Role;
  public position: Vector3;
  private mesh: any;
  private material: StandardMaterial;
  private _hasBall = false;
  private speed: number;
  private direction: Vector3;
  private weight: number;
  private strength: number;
  private stamina: number;
  private injuries: Injury[];

  constructor(
    scene: Scene,
    role: Role,
    team: 0 | 1,
    number: number,
    position: Vector3,
  ) {
    this.mesh = CreateCylinder(
      `team-${team}-player-${number}`,
      { diameter: 1, height: 2 },
      scene,
    );
    this.mesh.position.copyFrom(position);
    this.position = this.mesh.position;
    this.material = new StandardMaterial(`team-${team}-kit`, scene);
    this.material.diffuseColor = Color3.FromHexString(
      team === 0 ? "#1d4ed8" : "#dc2626",
    );
    this.mesh.material = this.material;
    this.speed = 5;
    this.role = role;
    this.team = team;
    this.direction = new Vector3(0, 0, team === 0 ? 1 : -1);
    this.weight = 70; // in kg
    this.strength = 50; // arbitrary units
    this.stamina = 100; // arbitrary units
    this.injuries = [];
  }

  get hasBall() {
    return this._hasBall;
  }

  set hasBall(hasBall: boolean) {
    this._hasBall = hasBall;
    this.material.emissiveColor = hasBall
      ? Color3.FromHexString("#facc15")
      : Color3.Black();
  }

  private runWithBall(deltaSeconds: number) {
    // A players speed is affected by stamina and inury status
    const speed =
      this.speed * (this.stamina / 100) -
      this.injuries.reduce((acc, injury) => acc + injury.severity, 0) * 0.1;
    this.position.addInPlace(this.direction.scale(speed * deltaSeconds));
  }

  private passBall(teammate: Player) {
    if (!this.hasBall) return;
    this.hasBall = false;
    teammate.hasBall = true;
    // Ball travels instantly for simplicity TODO: Add ball physics and trajectory, interceptions, logic about how to pass, what technique, kick pass, etc etc.
  }

  private attemptTackle(ballCarrier: Player) {}

  chooseAction(deltaSeconds: number) {
    // Find who currently has the ball
    const ballCarrier = players.find((p) => p.hasBall);
    const ballOnMyTeam = ballCarrier?.team === this.team;
    const distanceToBall = ballCarrier
      ? Vector3.Distance(this.position, ballCarrier.position)
      : Infinity;

    if (this.hasBall) {
      // If I have the ball, decide whether to pass or run
      // Look for space ahead of me/gaps/distance to nearest defender, distance to tryline, and team mates in better position.
      const nearestDefender = findNearestPlayer(this, this.team === 0 ? 1 : 0);
      const distanceToTryLine =
        this.team === 0
          ? PITCH.tryLines.north - this.position.z
          : this.position.z - PITCH.tryLines.south;
      // team mate in better position for now is just, team mate close to me with a further away defender than my nearest defender
      const bestTeammate = players
        .filter((p) => p.team === this.team && p !== this)
        .reduce(
          (best, teammate) => {
            const distanceToTeammate = Vector3.Distance(
              this.position,
              teammate.position,
            );
            const nearestDefenderToTeammate = findNearestPlayer(
              teammate,
              this.team === 0 ? 1 : 0,
            );
            const distanceToNearestDefender = nearestDefenderToTeammate
              ? Vector3.Distance(
                  teammate.position,
                  nearestDefenderToTeammate.position,
                )
              : Infinity;

            if (
              !best ||
              (distanceToNearestDefender >
                Vector3.Distance(
                  best.position,
                  findNearestPlayer(best, this.team === 0 ? 1 : 0)?.position ||
                    new Vector3(0, 0, 0),
                ) &&
                distanceToTeammate <
                  Vector3.Distance(this.position, best.position))
            ) {
              return teammate;
            }
            return best;
          },
          null as Player | null,
        );

      if (bestTeammate) {
        const distanceToBestTeammate = Vector3.Distance(
          this.position,
          bestTeammate.position,
        );
        const nearestDefenderToBestTeammate = findNearestPlayer(
          bestTeammate,
          this.team === 0 ? 1 : 0,
        );
        const distanceToNearestDefenderToBestTeammate =
          nearestDefenderToBestTeammate
            ? Vector3.Distance(
                bestTeammate.position,
                nearestDefenderToBestTeammate.position,
              )
            : Infinity;

        if (
          distanceToNearestDefenderToBestTeammate >
            Vector3.Distance(
              this.position,
              nearestDefender?.position || new Vector3(0, 0, 0),
            ) &&
          Vector3.Distance(this.position, nearestDefender!.position) < 3
        ) {
          // Pass to best teammate
          this.passBall(bestTeammate);
          return;
        } else {
          // Run with the ball
          this.runWithBall(deltaSeconds);
          return;
        }
      } else {
        // No better teammate, run with the ball
        this.runWithBall(deltaSeconds);
        return;
      }
    } else if (ballOnMyTeam) {
      // If my team has the ball, move to support the ball carrier
      if (ballCarrier) {
        const directionToBallCarrier = ballCarrier.position
          .subtract(this.position)
          .normalize();
        this.direction = directionToBallCarrier;
        this.position.addInPlace(
          this.direction.scale(this.speed * deltaSeconds),
        );
      }
    } else {
      // We're defending, move towards the ball carrier
      if (ballCarrier) {
        const directionToBallCarrier = ballCarrier.position
          .subtract(this.position)
          .normalize();
        this.direction = directionToBallCarrier;
        this.position.addInPlace(
          this.direction.scale(this.speed * deltaSeconds),
        );
        // If we're close enough, attempt a tackle
        const tackleThreshold = this.strength / 100;
        if (
          Vector3.Distance(this.position, ballCarrier.position) <=
          tackleThreshold
        ) {
          this.attemptTackle(ballCarrier);
        }
      }
    }
  }
}

const findNearestPlayer = (player: Player, team: 0 | 1) => {
  let nearestPlayer: Player | null = null;
  let minDistance = Infinity;

  for (const otherPlayer of players) {
    if (otherPlayer === player || otherPlayer.team !== team) continue;

    const distance = Vector3.Distance(player.position, otherPlayer.position);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPlayer = otherPlayer;
    }
  }

  return nearestPlayer;
};

const createPitch = (scene: Scene) => {
  const ground = CreateGround(
    "ground",
    { width: PITCH.width, height: PITCH.totalLength },
    scene,
  );
  const groundMaterial = new StandardMaterial("groundMaterial", scene);
  groundMaterial.diffuseColor = Color3.FromHexString("#3f9b0b");
  ground.material = groundMaterial;

  const mark = (name: string, from: Vector3, to: Vector3, dashed = false) => {
    const line = dashed
      ? CreateDashedLines(
          name,
          { points: [from, to], dashSize: 1, gapSize: 1 },
          scene,
        )
      : CreateLines(name, { points: [from, to] }, scene);
    line.color = Color3.White();
  };
  const acrossPitch = (name: string, z: number, dashed = false) =>
    mark(
      name,
      new Vector3(PITCH.touchLines.left, 0.02, z),
      new Vector3(PITCH.touchLines.right, 0.02, z),
      dashed,
    );
  const alongPitch = (name: string, x: number, dashed = false) =>
    mark(
      name,
      new Vector3(x, 0.02, PITCH.tryLines.south),
      new Vector3(x, 0.02, PITCH.tryLines.north),
      dashed,
    );

  mark(
    "left-touch-line",
    new Vector3(PITCH.touchLines.left, 0.02, PITCH.deadBallLines.south),
    new Vector3(PITCH.touchLines.left, 0.02, PITCH.deadBallLines.north),
  );
  mark(
    "right-touch-line",
    new Vector3(PITCH.touchLines.right, 0.02, PITCH.deadBallLines.south),
    new Vector3(PITCH.touchLines.right, 0.02, PITCH.deadBallLines.north),
  );
  acrossPitch("south-dead-ball-line", PITCH.deadBallLines.south);
  acrossPitch("north-dead-ball-line", PITCH.deadBallLines.north);
  acrossPitch("south-try-line", PITCH.tryLines.south);
  acrossPitch("north-try-line", PITCH.tryLines.north);
  acrossPitch("south-five-metre-line", PITCH.fiveMetreLines.south, true);
  acrossPitch("north-five-metre-line", PITCH.fiveMetreLines.north, true);
  acrossPitch("south-22-metre-line", PITCH.twentyTwoMetreLines.south);
  acrossPitch("north-22-metre-line", PITCH.twentyTwoMetreLines.north);
  acrossPitch("south-10-metre-line", PITCH.tenMetreLines.south, true);
  acrossPitch("halfway-line", PITCH.halfwayLine);
  acrossPitch("north-10-metre-line", PITCH.tenMetreLines.north, true);
  alongPitch("left-five-metre-line", PITCH.fiveMetreLines.left, true);
  alongPitch("right-five-metre-line", PITCH.fiveMetreLines.right, true);
  alongPitch("left-fifteen-metre-line", PITCH.fifteenMetreLines.left, true);
  alongPitch("right-fifteen-metre-line", PITCH.fifteenMetreLines.right, true);
};

const createScene = async () => {
  const scene = new Scene(engine);
  const camera = new FreeCamera("camera", new Vector3(0, 85, -85), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(canvas, true);
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  createPitch(scene);

  for (const team of [0, 1] as const) {
    LINEUP.forEach(({ role, x, z }, index) => {
      const player = new Player(
        scene,
        role,
        team,
        index + 1,
        new Vector3(x, 1, team === 0 ? z : -z),
      );
      if (team === 0 && role === Role.FlyHalf) player.hasBall = true;
      players.push(player);
    });
  }

  return scene;
};

createScene().then((scene) => {
  engine.runRenderLoop(() => {
    const deltaSeconds =
      (Math.min(engine.getDeltaTime(), 100) / 1000) * SIMULATION_SPEED;
    for (const player of players) {
      player.chooseAction(deltaSeconds);
    }
    scene.render();
  });
});

window.addEventListener("resize", () => {
  engine.resize();
});
