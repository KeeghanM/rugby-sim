import {
  Color3,
  CreateCylinder,
  CreateDashedLines,
  CreateGround,
  CreateLines,
  CreateSphere,
  FreeCamera,
  HemisphericLight,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import type { GameState } from "./domain.ts";
import { PITCH } from "./domain.ts";
import { TEAMS } from "./teams.ts";

const createPitch = (scene: Scene) => {
  const ground = CreateGround(
    "ground",
    { width: PITCH.width, height: PITCH.totalLength },
    scene,
  );
  const groundMaterial = new StandardMaterial("ground-material", scene);
  groundMaterial.diffuseColor = Color3.FromHexString("#3f9b0b");
  ground.material = groundMaterial;

  const mark = (name: string, from: Vector3, to: Vector3, dashed = false) => {
    const line = dashed
      ? CreateDashedLines(name, { points: [from, to], dashSize: 1, gapSize: 1 }, scene)
      : CreateLines(name, { points: [from, to] }, scene);
    line.color = Color3.White();
  };
  const across = (name: string, z: number, dashed = false) =>
    mark(
      name,
      new Vector3(PITCH.touchLines.left, 0.02, z),
      new Vector3(PITCH.touchLines.right, 0.02, z),
      dashed,
    );
  const along = (name: string, x: number, dashed = false) =>
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
  across("south-dead-ball-line", PITCH.deadBallLines.south);
  across("north-dead-ball-line", PITCH.deadBallLines.north);
  across("south-try-line", PITCH.tryLines.south);
  across("north-try-line", PITCH.tryLines.north);
  across("south-five-metre-line", PITCH.fiveMetreLines.south, true);
  across("north-five-metre-line", PITCH.fiveMetreLines.north, true);
  across("south-22-metre-line", PITCH.twentyTwoMetreLines.south);
  across("north-22-metre-line", PITCH.twentyTwoMetreLines.north);
  across("south-10-metre-line", PITCH.tenMetreLines.south, true);
  across("halfway-line", PITCH.halfwayLine);
  across("north-10-metre-line", PITCH.tenMetreLines.north, true);
  along("left-five-metre-line", PITCH.fiveMetreLines.left, true);
  along("right-five-metre-line", PITCH.fiveMetreLines.right, true);
  along("left-fifteen-metre-line", PITCH.fifteenMetreLines.left, true);
  along("right-fifteen-metre-line", PITCH.fifteenMetreLines.right, true);
};

export const createRenderer = (
  engine: Engine,
  canvas: HTMLCanvasElement,
  state: GameState,
) => {
  const scene = new Scene(engine);
  const camera = new FreeCamera("camera", new Vector3(0, 85, -85), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(canvas, true);
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;
  createPitch(scene);

  const views = new Map(
    state.players.map((player) => {
      const mesh = CreateCylinder(
        player.id,
        { diameter: player.weight / 100, height: 2 },
        scene,
      );
      const material = new StandardMaterial(`${player.id}-material`, scene);
      material.diffuseColor = Color3.FromHexString(
        TEAMS[player.team].color,
      );
      mesh.material = material;
      return [player.id, { mesh, material }] as const;
    }),
  );
  const ball = CreateSphere("ball", { diameter: 0.45 }, scene);
  const ballMaterial = new StandardMaterial("ball-material", scene);
  ballMaterial.diffuseColor = Color3.FromHexString("#f5f5dc");
  ball.material = ballMaterial;
  const scoreboard = document.getElementById("scoreboard");

  return {
    scene,
    sync(game: GameState) {
      for (const player of game.players) {
        const view = views.get(player.id);
        if (!view) continue;
        view.mesh.position.set(player.position.x, 1, player.position.z);
        view.material.emissiveColor = player.id === game.ball.carrierId
          ? Color3.FromHexString("#facc15")
          : Color3.Black();
      }
      ball.position.set(
        game.ball.position.x,
        game.ball.position.y,
        game.ball.position.z,
      );
      if (scoreboard) {
        const phase =
          game.phase.kind === "openPlay"
            ? "Open play"
            : game.phase.kind === "ruck"
              ? `Ruck ${game.phase.stage} - ${game.phase.tempo} ${game.phase.play}${game.phase.counterRuck ? " - counter ruck" : ""}`
              : game.phase.kind === "lineout"
                ? `Lineout ${game.phase.stage}`
                : `${game.phase.reason === "try" ? "Try - " : ""}Kickoff ${game.phase.stage}`;
        scoreboard.textContent = `${TEAMS[0].name} ${game.scores[0]} - ${game.scores[1]} ${TEAMS[1].name} | ${phase}`;
      }
    },
  };
};
