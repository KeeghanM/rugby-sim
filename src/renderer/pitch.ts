import {
  Color3,
  CreateCylinder,
  CreateDashedLines,
  CreateGround,
  CreateLines,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { PITCH } from "../domain.ts";

const createGoalPosts = (scene: Scene) => {
  const postMat = new StandardMaterial("goalPostMat", scene);
  postMat.diffuseColor = Color3.FromHexString("#ffffff");
  postMat.specularColor = Color3.FromHexString("#cbd5e1");

  const padMat = new StandardMaterial("postPadMat", scene);
  padMat.diffuseColor = Color3.FromHexString("#272626");

  const buildPostSet = (name: string, z: number) => {
    const leftUpright = CreateCylinder(
      `${name}-left`,
      { diameter: 0.18, height: 14 },
      scene,
    );
    leftUpright.position.set(-2.8, 7, z);
    leftUpright.material = postMat;

    const rightUpright = CreateCylinder(
      `${name}-right`,
      { diameter: 0.18, height: 14 },
      scene,
    );
    rightUpright.position.set(2.8, 7, z);
    rightUpright.material = postMat;

    const crossbar = CreateCylinder(
      `${name}-crossbar`,
      { diameter: 0.16, height: 5.6 },
      scene,
    );
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 3, z);
    crossbar.material = postMat;

    const leftPad = CreateCylinder(
      `${name}-left-pad`,
      { diameter: 0.55, height: 1.8 },
      scene,
    );
    leftPad.position.set(-2.8, 0.9, z);
    leftPad.material = padMat;

    const rightPad = CreateCylinder(
      `${name}-right-pad`,
      { diameter: 0.55, height: 1.8 },
      scene,
    );
    rightPad.position.set(2.8, 0.9, z);
    rightPad.material = padMat;
  };

  buildPostSet("south-posts", PITCH.tryLines.south);
  buildPostSet("north-posts", PITCH.tryLines.north);
};

export const createPitch = (scene: Scene) => {
  const ground = CreateGround(
    "ground",
    { width: PITCH.width, height: PITCH.totalLength },
    scene,
  );
  ground.position.y = 0.02;
  const groundMaterial = new StandardMaterial("ground-material", scene);
  groundMaterial.diffuseColor = Color3.FromHexString("#3f9b0b");
  groundMaterial.specularColor = Color3.Black();
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

  createGoalPosts(scene);
};
