import {
  Color3,
  Color4,
  CreateBox,
  CreateCylinder,
  CreateGround,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";

export const createEnvironment = (scene: Scene) => {
  // Extended ground beyond pitch — large low-poly apron
  const extended = CreateGround(
    "extended-ground",
    { width: 520, height: 520 },
    scene,
  );
  extended.position.y = -0.18;
  const extMat = new StandardMaterial("ext-ground-mat", scene);
  extMat.diffuseColor = Color3.FromHexString("#2a5d12");
  extMat.specularColor = Color3.Black();
  extended.material = extMat;

  // Outer concrete / mud ring
  const outer = CreateGround(
    "outer-ground",
    { width: 700, height: 700 },
    scene,
  );
  outer.position.y = -0.35;
  const outerMat = new StandardMaterial("outer-ground-mat", scene);
  outerMat.diffuseColor = Color3.FromHexString("#3a3f3a");
  outerMat.specularColor = Color3.Black();
  outer.material = outerMat;

  // Skybox — large inverted box with solid sky color
  const skybox = CreateBox("skyBox", { size: 2000 }, scene);
  const skyMat = new StandardMaterial("skyBox-mat", scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.emissiveColor = Color3.FromHexString("#87ceeb");
  skyMat.diffuseColor = Color3.FromHexString("#87ceeb");
  skybox.material = skyMat;
  skybox.infiniteDistance = true;
  skybox.isPickable = false;

  scene.clearColor = new Color4(0.53, 0.81, 0.92, 1);
  scene.ambientColor = new Color3(0.9, 0.9, 0.95);

  // Low-poly stadium — four stands + floodlights
  const standMat = new StandardMaterial("stand-mat", scene);
  standMat.diffuseColor = Color3.FromHexString("#475569");
  standMat.specularColor = Color3.FromHexString("#1e293b");
  standMat.specularPower = 8;

  const standUpperMat = new StandardMaterial("stand-upper-mat", scene);
  standUpperMat.diffuseColor = Color3.FromHexString("#64748b");
  standUpperMat.specularColor = Color3.Black();

  const createStand = (
    name: string,
    width: number,
    height: number,
    depth: number,
    pos: Vector3,
    mat: StandardMaterial,
  ) => {
    const m = CreateBox(name, { width, height, depth }, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    return m;
  };

  // South / North stands (behind dead-ball lines)
  createStand("stand-south", 200, 18, 28, new Vector3(0, 9, -78), standMat);
  createStand("stand-north", 200, 18, 28, new Vector3(0, 9, 78), standMat);
  // West / East stands (along touch lines)
  createStand("stand-west", 28, 16, 170, new Vector3(-58, 8, 0), standMat);
  createStand("stand-east", 28, 16, 170, new Vector3(58, 8, 0), standMat);
  // Upper rim tiers — low-poly step
  createStand(
    "stand-south-upper",
    190,
    6,
    8,
    new Vector3(0, 18, -84),
    standUpperMat,
  );
  createStand(
    "stand-north-upper",
    190,
    6,
    8,
    new Vector3(0, 18, 84),
    standUpperMat,
  );
  createStand(
    "stand-west-upper",
    8,
    5,
    160,
    new Vector3(-64, 16, 0),
    standUpperMat,
  );
  createStand(
    "stand-east-upper",
    8,
    5,
    160,
    new Vector3(64, 16, 0),
    standUpperMat,
  );

  // Floodlight poles + heads at four corners
  const poleMat = new StandardMaterial("pole-mat", scene);
  poleMat.diffuseColor = Color3.FromHexString("#cbd5e1");
  poleMat.specularColor = Color3.Black();
  const lightMat = new StandardMaterial("light-mat", scene);
  lightMat.emissiveColor = Color3.FromHexString("#fef9c3");
  lightMat.diffuseColor = Color3.FromHexString("#fef9c3");
  lightMat.disableLighting = true;
  const polePositions = [
    new Vector3(-68, 0, -66),
    new Vector3(68, 0, -66),
    new Vector3(-68, 0, 66),
    new Vector3(68, 0, 66),
  ];
  for (let i = 0; i < polePositions.length; i++) {
    const base = polePositions[i];
    const pole = CreateCylinder(
      `pole-${i}`,
      { height: 38, diameter: 1.1 },
      scene,
    );
    pole.position.set(base.x, 19, base.z);
    pole.material = poleMat;
    const head = CreateBox(
      `light-${i}`,
      { width: 4.5, height: 1.4, depth: 3 },
      scene,
    );
    head.position.set(base.x, 38.5, base.z);
    head.material = lightMat;
  }

  // Low perimeter wall around outer ground
  const wallMat = new StandardMaterial("wall-mat", scene);
  wallMat.diffuseColor = Color3.FromHexString("#334155");
  wallMat.specularColor = Color3.Black();
  const wallY = 1.2;
  const wallH = 2.4;
  const wallT = 1.2;
  createStand(
    "wall-south",
    560,
    wallH,
    wallT,
    new Vector3(0, wallY, -260),
    wallMat,
  );
  createStand(
    "wall-north",
    560,
    wallH,
    wallT,
    new Vector3(0, wallY, 260),
    wallMat,
  );
  createStand(
    "wall-west",
    wallT,
    wallH,
    560,
    new Vector3(-260, wallY, 0),
    wallMat,
  );
  createStand(
    "wall-east",
    wallT,
    wallH,
    560,
    new Vector3(260, wallY, 0),
    wallMat,
  );
};
