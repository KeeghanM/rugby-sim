import {
  Color3,
  Color4,
  CreateBox,
  CreateCylinder,
  CreateGround,
  CreatePlane,
  DynamicTexture,
  StandardMaterial,
  Vector3,
  Vector4,
} from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import type { GameState } from "../domain.ts";

export const createEnvironment = (scene: Scene) => {
  // Extended green pitch runoff apron
  const grassApron = CreateGround(
    "grass-apron",
    { width: 84, height: 136 },
    scene,
  );
  grassApron.position.y = 0.012;
  const grassApronMat = new StandardMaterial("grass-apron-mat", scene);
  grassApronMat.diffuseColor = Color3.FromHexString("#2e7d14");
  grassApronMat.specularColor = Color3.Black();
  grassApron.material = grassApronMat;

  // Concrete concourse ground around pitch
  const concreteApron = CreateGround(
    "concrete-apron",
    { width: 220, height: 260 },
    scene,
  );
  concreteApron.position.y = -0.05;
  const concreteMat = new StandardMaterial("concrete-apron-mat", scene);
  concreteMat.diffuseColor = Color3.FromHexString("#334155");
  concreteMat.specularColor = Color3.FromHexString("#1e293b");
  concreteApron.material = concreteMat;

  // Outer landscape ground
  const outerGround = CreateGround(
    "outer-ground",
    { width: 700, height: 700 },
    scene,
  );
  outerGround.position.y = -0.3;
  const outerGroundMat = new StandardMaterial("outer-ground-mat", scene);
  outerGroundMat.diffuseColor = Color3.FromHexString("#1e293b");
  outerGroundMat.specularColor = Color3.Black();
  outerGround.material = outerGroundMat;

  // Skybox
  const skybox = CreateBox("skyBox", { size: 1800 }, scene);
  const skyMat = new StandardMaterial("skyBox-mat", scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.emissiveColor = Color3.FromHexString("#60a5fa");
  skyMat.diffuseColor = Color3.FromHexString("#60a5fa");
  skybox.material = skyMat;
  skybox.infiniteDistance = true;
  skybox.isPickable = false;

  scene.clearColor = new Color4(0.38, 0.65, 0.98, 1);
  scene.ambientColor = new Color3(0.92, 0.94, 0.98);

  // --- PROCEDURAL STADIUM SEAT TEXTURES ---
  const createSeatTexture = (
    name: string,
    primaryColor: string,
    accentColor: string,
    goldColor = "#fbbf24",
  ) => {
    const tex = new DynamicTexture(
      name,
      { width: 1024, height: 1024 },
      scene,
      true,
    );
    const ctx = tex.getContext();

    // Base tier concrete
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 1024, 1024);

    const rows = 20;
    const cols = 40;
    const rowH = 1024 / rows;
    const colW = 1024 / cols;

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;

      // Concrete row tread surface
      ctx.fillStyle = r % 2 === 0 ? "#334155" : "#243044";
      ctx.fillRect(0, y, 1024, rowH);

      // Tread step shadow
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, y + rowH - 3, 1024, 3);

      // Riser highlight edge
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, y, 1024, 2);

      for (let c = 0; c < cols; c++) {
        // Vertical concrete aisle stairs every 10 columns
        if (c % 10 === 0) {
          ctx.fillStyle = "#64748b";
          ctx.fillRect(c * colW, y + 1, colW, rowH - 2);
          // Yellow safety tread step edge
          ctx.fillStyle = "#facc15";
          ctx.fillRect(c * colW + 1, y + rowH - 3, colW - 2, 2);
          continue;
        }

        const seatX = c * colW + 3;
        const seatY = y + 4;
        const seatW = colW - 6;
        const seatH = rowH - 8;

        // Seat color with section pattern
        let color = primaryColor;
        if (r % 7 === 0 || (r + c) % 19 === 0) color = accentColor;
        else if (r > 6 && r < 14 && c > 14 && c < 26) color = goldColor;

        // Seat drop shadow
        ctx.fillStyle = "#090d16";
        ctx.fillRect(seatX - 1, seatY - 1, seatW + 2, seatH + 2);

        // Seat back
        ctx.fillStyle = color;
        ctx.fillRect(seatX, seatY, seatW, seatH * 0.58);

        // Seat folding bottom pan
        ctx.fillStyle = color === primaryColor ? "#172554" : "#1e40af";
        ctx.fillRect(seatX + 1, seatY + seatH * 0.52, seatW - 2, seatH * 0.44);

        // Top seat rim highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.fillRect(seatX + 1, seatY + 1, seatW - 2, 2);
      }
    }

    tex.update(true);
    return tex;
  };

  const seatTexLower = createSeatTexture(
    "seat-tex-lower",
    "#1d4ed8",
    "#3b82f6",
    "#fbbf24",
  );
  const seatTexUpper = createSeatTexture(
    "seat-tex-upper",
    "#1e3a8a",
    "#2563eb",
    "#f59e0b",
  );

  const seatMatLower = new StandardMaterial("seat-mat-lower", scene);
  seatMatLower.diffuseTexture = seatTexLower;
  seatMatLower.specularColor = new Color3(0.12, 0.12, 0.12);
  seatMatLower.specularPower = 16;

  const seatMatUpper = new StandardMaterial("seat-mat-upper", scene);
  seatMatUpper.diffuseTexture = seatTexUpper;
  seatMatUpper.specularColor = new Color3(0.12, 0.12, 0.12);
  seatMatUpper.specularPower = 16;

  // --- SHARED STADIUM MATERIALS ---
  const concreteStandMat = new StandardMaterial("concrete-stand-mat", scene);
  concreteStandMat.diffuseColor = Color3.FromHexString("#475569");
  concreteStandMat.specularColor = Color3.FromHexString("#1e293b");

  const facadeMat = new StandardMaterial("facade-mat", scene);
  facadeMat.diffuseColor = Color3.FromHexString("#334155");
  facadeMat.specularColor = Color3.FromHexString("#0f172a");

  const hospitalityGlassMat = new StandardMaterial("vip-glass-mat", scene);
  hospitalityGlassMat.diffuseColor = Color3.FromHexString("#0f172a");
  hospitalityGlassMat.emissiveColor = Color3.FromHexString("#1e3a5f");
  hospitalityGlassMat.specularColor = Color3.FromHexString("#94a3b8");
  hospitalityGlassMat.specularPower = 32;

  const roofMat = new StandardMaterial("roof-mat", scene);
  roofMat.diffuseColor = Color3.FromHexString("#e2e8f0");
  roofMat.specularColor = Color3.FromHexString("#cbd5e1");
  roofMat.specularPower = 24;

  const roofUnderMat = new StandardMaterial("roof-under-mat", scene);
  roofUnderMat.diffuseColor = Color3.FromHexString("#1e293b");
  roofUnderMat.specularColor = Color3.Black();

  const steelTrussMat = new StandardMaterial("steel-truss-mat", scene);
  steelTrussMat.diffuseColor = Color3.FromHexString("#94a3b8");
  steelTrussMat.specularColor = Color3.FromHexString("#475569");

  const floodlightMat = new StandardMaterial("floodlight-mat", scene);
  floodlightMat.diffuseColor = Color3.FromHexString("#fef08a");
  floodlightMat.emissiveColor = Color3.FromHexString("#fef9c3");
  floodlightMat.disableLighting = true;

  // --- LED ADVERTISING HOARDINGS ---
  const createAdTexture = () => {
    const tex = new DynamicTexture(
      "ad-banner-tex",
      { width: 1024, height: 128 },
      scene,
      true,
    );
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, 1024, 128);

    // Sponsor blocks
    const ads = [
      { text: "🏉 WORLD RUGBY CHAMPIONSHIP", bg: "#1e3a8a", fg: "#ffffff" },
      { text: "⚡ FAST • POWER • PRECISION", bg: "#b91c1c", fg: "#fef08a" },
      { text: "GLOBAL RUGBY SIM", bg: "#047857", fg: "#ffffff" },
      { text: "🏆 PREMIER MATCHDAY", bg: "#6d28d9", fg: "#fde047" },
    ];

    const blockW = 1024 / ads.length;
    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      const bx = i * blockW;
      ctx.fillStyle = ad.bg;
      ctx.fillRect(bx + 4, 8, blockW - 8, 112);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 6, 10, blockW - 12, 108);

      ctx.fillStyle = ad.fg;
      ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ad.text, bx + blockW / 2, 64);
    }

    tex.update(true);
    return tex;
  };

  const adMat = new StandardMaterial("ad-banner-mat", scene);
  adMat.diffuseTexture = createAdTexture();
  adMat.emissiveColor = Color3.FromHexString("#ffffff").scale(0.35);

  const createAdBoard = (
    name: string,
    w: number,
    d: number,
    pos: Vector3,
    rotY = 0,
  ) => {
    const board = CreateBox(name, { width: w, height: 1.1, depth: d }, scene);
    board.position.copyFrom(pos);
    board.rotation.y = rotY;
    board.material = adMat;
    return board;
  };

  // Touchline & dead-ball ad hoardings (placed behind touch judge running lane)
  createAdBoard("ad-west", 0.35, 124, new Vector3(-38.5, 0.55, 0));
  createAdBoard("ad-east", 0.35, 124, new Vector3(38.5, 0.55, 0));
  createAdBoard("ad-south", 76.6, 0.35, new Vector3(0, 0.55, -64.2));
  createAdBoard("ad-north", 76.6, 0.35, new Vector3(0, 0.55, 64.2));

  // --- GRANDSTAND BUILDER HELPER ---
  // Sideline stands: length in Z = 118m
  // End stands: width in X = 74m

  const createSidelineStand = (side: 1 | -1, name: string) => {
    const sideX = side * 1;

    // Pitchside concrete barrier
    const barrier = CreateBox(
      `${name}-barrier`,
      { width: 0.6, height: 1.2, depth: 118 },
      scene,
    );
    barrier.position.set(side * 40.8, 0.6, 0);
    barrier.material = concreteStandMat;

    // Lower Tier (Raked Seating Deck)
    const lowerTier = CreateBox(
      `${name}-tier-lower`,
      { width: 17, height: 0.9, depth: 118 },
      scene,
    );
    lowerTier.position.set(side * 48.0, 5.1, 0);
    lowerTier.rotation.z = side * 0.48; // raked upwards away from pitch
    lowerTier.material = seatMatLower;

    // Lower Tier Concrete Under-Wedge / Side Walls
    const lowerUnder = CreateBox(
      `${name}-tier-lower-under`,
      { width: 15, height: 4.5, depth: 118 },
      scene,
    );
    lowerUnder.position.set(side * 48.0, 2.25, 0);
    lowerUnder.material = concreteStandMat;

    // Mid-Tier VIP Hospitality Box Fascia & Balcony
    const vipBoxes = CreateBox(
      `${name}-vip-boxes`,
      { width: 1.8, height: 3.2, depth: 118 },
      scene,
    );
    vipBoxes.position.set(side * 55.8, 10.5, 0);
    vipBoxes.material = hospitalityGlassMat;

    // Upper Tier (Steeper Raked Seating Deck)
    const upperTier = CreateBox(
      `${name}-tier-upper`,
      { width: 22.5, height: 1.0, depth: 118 },
      scene,
    );
    upperTier.position.set(side * 65.0, 18.5, 0);
    upperTier.rotation.z = side * 0.62;
    upperTier.material = seatMatUpper;

    // Upper Tier Support Concrete Structure
    const upperUnder = CreateBox(
      `${name}-tier-upper-under`,
      { width: 18, height: 10, depth: 118 },
      scene,
    );
    upperUnder.position.set(side * 65.0, 11.5, 0);
    upperUnder.material = concreteStandMat;

    // Rear Facade Architectural Wall
    const rearWall = CreateBox(
      `${name}-rear-wall`,
      { width: 1.6, height: 28, depth: 120 },
      scene,
    );
    rearWall.position.set(side * 74.8, 14.0, 0);
    rearWall.material = facadeMat;

    // Rear Structural Columns
    for (let z = -50; z <= 50; z += 25) {
      const col = CreateBox(
        `${name}-col-${z}`,
        { width: 2.2, height: 28.5, depth: 2.5 },
        scene,
      );
      col.position.set(side * 75.8, 14.25, z);
      col.material = concreteStandMat;
    }

    // Cantilevered Modern Roof Canopy
    const roof = CreateBox(
      `${name}-roof`,
      { width: 37, height: 0.8, depth: 122 },
      scene,
    );
    roof.position.set(side * 56.5, 27.2, 0);
    roof.rotation.z = -side * 0.06;
    roof.material = roofMat;

    // Roof Truss Girders Underneath
    for (let z = -45; z <= 45; z += 30) {
      const truss = CreateBox(
        `${name}-truss-${z}`,
        { width: 35, height: 1.2, depth: 0.8 },
        scene,
      );
      truss.position.set(side * 56.5, 26.2, z);
      truss.material = steelTrussMat;
    }

    // Roof Lip Floodlight Array
    const floodlightStrip = CreateBox(
      `${name}-floodlight-strip`,
      { width: 1.2, height: 0.5, depth: 116 },
      scene,
    );
    floodlightStrip.position.set(side * 38.5, 26.0, 0);
    floodlightStrip.material = floodlightMat;
  };

  const createEndStand = (side: 1 | -1, name: string) => {
    // Pitchside concrete barrier
    const barrier = CreateBox(
      `${name}-barrier`,
      { width: 74, height: 1.2, depth: 0.6 },
      scene,
    );
    barrier.position.set(0, 0.6, side * 65.8);
    barrier.material = concreteStandMat;

    // Lower Tier (Raked Seating Deck)
    const lowerTier = CreateBox(
      `${name}-tier-lower`,
      { width: 74, height: 0.9, depth: 16.5 },
      scene,
    );
    lowerTier.position.set(0, 5.1, side * 73.5);
    lowerTier.rotation.x = -side * 0.48;
    lowerTier.material = seatMatLower;

    // Lower Under Structure
    const lowerUnder = CreateBox(
      `${name}-tier-lower-under`,
      { width: 74, height: 4.5, depth: 15 },
      scene,
    );
    lowerUnder.position.set(0, 2.25, side * 73.5);
    lowerUnder.material = concreteStandMat;

    // VIP Hospitality Band
    const vipBoxes = CreateBox(
      `${name}-vip-boxes`,
      { width: 74, height: 3.2, depth: 1.8 },
      scene,
    );
    vipBoxes.position.set(0, 10.5, side * 81.2);
    vipBoxes.material = hospitalityGlassMat;

    // Upper Tier (Steeper Raked Deck)
    const upperTier = CreateBox(
      `${name}-tier-upper`,
      { width: 74, height: 1.0, depth: 22.0 },
      scene,
    );
    upperTier.position.set(0, 18.5, side * 90.0);
    upperTier.rotation.x = -side * 0.62;
    upperTier.material = seatMatUpper;

    // Upper Under Structure
    const upperUnder = CreateBox(
      `${name}-tier-upper-under`,
      { width: 74, height: 10, depth: 18 },
      scene,
    );
    upperUnder.position.set(0, 11.5, side * 90.0);
    upperUnder.material = concreteStandMat;

    // Rear Facade Wall
    const rearWall = CreateBox(
      `${name}-rear-wall`,
      { width: 76, height: 28, depth: 1.6 },
      scene,
    );
    rearWall.position.set(0, 14.0, side * 99.8);
    rearWall.material = facadeMat;

    // Rear Structural Columns
    for (let x = -25; x <= 25; x += 25) {
      const col = CreateBox(
        `${name}-col-${x}`,
        { width: 2.5, height: 28.5, depth: 2.2 },
        scene,
      );
      col.position.set(x, 14.25, side * 100.8);
      col.material = concreteStandMat;
    }

    // Cantilevered Roof Canopy
    const roof = CreateBox(
      `${name}-roof`,
      { width: 76, height: 0.8, depth: 36 },
      scene,
    );
    roof.position.set(0, 27.2, side * 82.5);
    roof.rotation.x = side * 0.06;
    roof.material = roofMat;

    // Roof Truss Girders
    for (let x = -25; x <= 25; x += 25) {
      const truss = CreateBox(
        `${name}-truss-${x}`,
        { width: 0.8, height: 1.2, depth: 34 },
        scene,
      );
      truss.position.set(x, 26.2, side * 82.5);
      truss.material = steelTrussMat;
    }

    // Roof Lip Floodlight Array
    const floodlightStrip = CreateBox(
      `${name}-floodlight-strip`,
      { width: 70, height: 0.5, depth: 1.2 },
      scene,
    );
    floodlightStrip.position.set(0, 26.0, side * 65.0);
    floodlightStrip.material = floodlightMat;
  };

  // Build 4 Main Stands
  createSidelineStand(-1, "stand-west"); // West Main Stand
  createSidelineStand(1, "stand-east"); // East Stand
  createEndStand(-1, "stand-south"); // South Stand
  createEndStand(1, "stand-north"); // North Stand

  // --- 4 CORNER BOWL STANDS ---
  const createCornerStand = (name: string, posX: number, posZ: number) => {
    const rotY = Math.atan2(-posX, -posZ);

    // Corner Lower Tier
    const cornerLower = CreateBox(
      `${name}-tier-lower`,
      { width: 22, height: 0.9, depth: 18 },
      scene,
    );
    cornerLower.position.set(posX, 5.1, posZ);
    cornerLower.rotation.set(0.48, rotY, 0);
    cornerLower.material = seatMatLower;

    // Corner Upper Tier
    const cornerUpper = CreateBox(
      `${name}-tier-upper`,
      { width: 28, height: 1.0, depth: 24 },
      scene,
    );
    cornerUpper.position.set(posX * 1.22, 18.5, posZ * 1.15);
    cornerUpper.rotation.set(0.62, rotY, 0);
    cornerUpper.material = seatMatUpper;

    // Corner Outer Wall
    const cornerWall = CreateBox(
      `${name}-wall`,
      { width: 30, height: 28, depth: 1.8 },
      scene,
    );
    cornerWall.position.set(posX * 1.34, 14.0, posZ * 1.26);
    cornerWall.rotation.set(0, rotY, 0);
    cornerWall.material = facadeMat;

    // Corner Roof Canopy
    const cornerRoof = CreateBox(
      `${name}-roof`,
      { width: 34, height: 0.8, depth: 32 },
      scene,
    );
    cornerRoof.position.set(posX * 1.15, 27.2, posZ * 1.1);
    cornerRoof.rotation.set(-0.06, rotY, 0);
    cornerRoof.material = roofMat;
  };

  createCornerStand("corner-sw", -52, -73);
  createCornerStand("corner-se", 52, -73);
  createCornerStand("corner-nw", -52, 73);
  createCornerStand("corner-ne", 52, 73);

  // --- SCOREBOARD / JUMBOTRON VIDEO SCREENS ---
  const scoreboardTextures: DynamicTexture[] = [];
  let lastScoreKey = "";

  const drawScoreboard = (tex: DynamicTexture, game?: GameState) => {
    const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 1008, 496);

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(16, 16, 992, 70);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("RUGBY SIMULATOR", 512, 51);

    if (!game) {
      tex.update(true);
      return;
    }

    const mins = Math.floor(game.matchClockSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(game.matchClockSeconds % 60)
      .toString()
      .padStart(2, "0");
    const halfStr =
      game.half === "fullTime"
        ? "FULL TIME"
        : game.half === 2
          ? "2ND HALF"
          : "1ST HALF";

    // Team 0 (Left)
    ctx.fillStyle = game.teams[0].color;
    ctx.fillRect(40, 105, 420, 245);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(40, 105, 420, 52);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px 'Segoe UI Black', Impact, sans-serif";
    ctx.fillText(game.teams[0].name.toUpperCase(), 250, 131);
    ctx.font = "900 135px 'Arial Black', Impact, sans-serif";
    ctx.fillText(String(game.scores[0]), 250, 255);

    // Center divider
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(470, 105, 84, 245);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 24px 'Segoe UI', sans-serif";
    ctx.fillText("VS", 512, 227);

    // Team 1 (Right)
    ctx.fillStyle = game.teams[1].color;
    ctx.fillRect(564, 105, 420, 245);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(564, 105, 420, 52);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px 'Segoe UI Black', Impact, sans-serif";
    ctx.fillText(game.teams[1].name.toUpperCase(), 774, 131);
    ctx.font = "900 135px 'Arial Black', Impact, sans-serif";
    ctx.fillText(String(game.scores[1]), 774, 255);

    // Bottom Match Info Bar
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(40, 365, 944, 115);

    // Live clock
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 44px 'Courier New', monospace";
    ctx.fillText(`${mins}:${secs}`, 240, 422);

    // Match phase / state
    const p: any = game.phase;
    let statusText = p.kind.toUpperCase();
    if (p.kind === "openPlay") statusText = "OPEN PLAY";
    else if (p.kind === "ruck") statusText = `RUCK (PHASE ${game.phaseCount})`;
    else if (p.kind === "maul") statusText = "MAUL";
    else if (p.kind === "scrum") statusText = "SCRUM";
    else if (p.kind === "lineout") statusText = "LINEOUT";
    else if (p.kind === "conversion") statusText = "CONVERSION";
    else if (p.kind === "kickoff")
      statusText = p.reason === "goalLineDropout" ? "DROPOUT" : "KICKOFF";

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(`${halfStr} · ${statusText}`, 640, 422);

    tex.update(true);
  };

  const createScoreboardTexture = (title: string) => {
    const tex = new DynamicTexture(
      `scoreboard-tex-${title}`,
      { width: 1024, height: 512 },
      scene,
      true,
    );
    drawScoreboard(tex);
    scoreboardTextures.push(tex);
    return tex;
  };

  const createJumbotron = (name: string, pos: Vector3, rotY = 0) => {
    const frame = CreateBox(
      `${name}-frame`,
      { width: 22, height: 11, depth: 1.2 },
      scene,
    );
    frame.position.copyFrom(pos);
    frame.rotation.y = rotY;
    frame.material = concreteStandMat;

    const screen = CreatePlane(
      `${name}-screen`,
      { width: 20.8, height: 10, sideOrientation: 2 },
      scene,
    );
    const pitchOffset = pos.z < 0 ? 0.65 : -0.65;
    screen.position.set(pos.x, pos.y, pos.z + pitchOffset);
    screen.rotation.y = rotY;

    const screenMat = new StandardMaterial(`${name}-mat`, scene);
    screenMat.backFaceCulling = false;
    screenMat.diffuseTexture = createScoreboardTexture(name);
    screenMat.emissiveColor = Color3.FromHexString("#ffffff").scale(0.55);
    screen.material = screenMat;
  };

  // Mount Jumbotrons facing into the pitch (lowered for realistic sightlines)
  createJumbotron("jumbotron-south", new Vector3(0, 19.8, -67.5), Math.PI);
  createJumbotron("jumbotron-north", new Vector3(0, 19.8, 67.5), 0);

  // --- TEAM DUGOUTS / BENCHES (West Sideline) ---
  const dugoutMat = new StandardMaterial("dugout-glass-mat", scene);
  dugoutMat.diffuseColor = Color3.FromHexString("#0284c7");
  dugoutMat.alpha = 0.65;
  dugoutMat.specularColor = Color3.White();

  const createDugout = (name: string, z: number) => {
    // Canopy roof set back behind touchline & ad board
    const shelter = CreateBox(
      `${name}-shelter`,
      { width: 2.6, height: 2.2, depth: 8.5 },
      scene,
    );
    shelter.position.set(-41.5, 1.1, z);
    shelter.material = dugoutMat;

    // Bench seating
    const bench = CreateBox(
      `${name}-bench`,
      { width: 1.2, height: 0.5, depth: 7.8 },
      scene,
    );
    bench.position.set(-41.8, 0.45, z);
    bench.material = seatMatLower;
  };

  createDugout("dugout-home", -12);
  createDugout("dugout-away", 12);

  // --- PLAYERS' TUNNEL (West Stand Halfway Line) ---
  const tunnelArch = CreateBox(
    "players-tunnel",
    { width: 4.5, height: 2.6, depth: 6.0 },
    scene,
  );
  tunnelArch.position.set(-43.5, 1.3, 0);
  const tunnelMat = new StandardMaterial("tunnel-mat", scene);
  tunnelMat.diffuseColor = Color3.FromHexString("#1e293b");
  tunnelMat.emissiveColor = Color3.FromHexString("#0f172a");
  tunnelArch.material = tunnelMat;

  // Red carpet walkway from tunnel to touchline
  const carpet = CreateGround(
    "tunnel-carpet",
    { width: 3.5, height: 4.5 },
    scene,
  );
  carpet.position.set(-40.0, 0.025, 0);
  const carpetMat = new StandardMaterial("carpet-mat", scene);
  carpetMat.diffuseColor = Color3.FromHexString("#dc2626");
  carpetMat.specularColor = Color3.Black();
  carpet.material = carpetMat;

  // --- 4 CORNER FLOODLIGHT TOWERS ---
  const poleMat = new StandardMaterial("pole-mat", scene);
  poleMat.diffuseColor = Color3.FromHexString("#cbd5e1");
  poleMat.specularColor = Color3.FromHexString("#475569");

  const cornerPylons = [
    new Vector3(-74, 0, -96),
    new Vector3(74, 0, -96),
    new Vector3(-74, 0, 96),
    new Vector3(74, 0, 96),
  ];

  for (let i = 0; i < cornerPylons.length; i++) {
    const base = cornerPylons[i];

    // Main steel pylon column
    const pole = CreateCylinder(
      `pylon-${i}`,
      { height: 42, diameterTop: 1.4, diameterBottom: 2.4, tessellation: 8 },
      scene,
    );
    pole.position.set(base.x, 21, base.z);
    pole.material = poleMat;

    // Floodlight lamp head bank
    const head = CreateBox(
      `pylon-head-${i}`,
      { width: 7.0, height: 3.2, depth: 3.0 },
      scene,
    );
    head.position.set(base.x * 0.96, 42.5, base.z * 0.96);
    head.rotation.y = Math.atan2(-base.x, -base.z);
    head.material = floodlightMat;
  }

  return {
    updateScoreboards: (game: GameState) => {
      const key = `${game.scores[0]}-${game.scores[1]}-${Math.floor(game.matchClockSeconds)}-${game.half}-${game.phase.kind}-${game.phaseCount}`;
      if (key !== lastScoreKey) {
        lastScoreKey = key;
        for (const tex of scoreboardTextures) {
          drawScoreboard(tex, game);
        }
      }
    },
  };
};
