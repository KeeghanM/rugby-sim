import {
  Color3,
  CreateBox,
  CreateCylinder,
  CreateGround,
  CreateSphere,
  DynamicTexture,
  StandardMaterial,
  Vector4,
} from '@babylonjs/core'
import type { Scene } from '@babylonjs/core/scene'
import type { GameState, Player } from '../simulation/domain.ts'
import { attackDirection, PITCH, ROLES } from '../simulation/domain.ts'

const hexToRgb = (hex: string): [number, number, number] => {
  const color = Color3.FromHexString(hex)
  return [color.r * 255, color.g * 255, color.b * 255]
}

const getLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex)
  // Weight RGB by human brightness sensitivity before choosing light or dark details.
  return (r * 299 + g * 587 + b * 114) / 1000
}

const colorDistance = (c1: string, c2: string): number => {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const rMean = (r1 + r2) / 2
  const deltaR = r1 - r2
  const deltaG = g1 - g2
  const deltaB = b1 - b2
  // Red-mean weighting approximates perceived RGB contrast without color-space conversion.
  return Math.sqrt(
    (2 + rMean / 256) * deltaR * deltaR + 4 * deltaG * deltaG + (2 + (255 - rMean) / 256) * deltaB * deltaB,
  )
}

const REF_PALETTE = ['#f43f5e', '#ec4899', '#facc15', '#06b6d4', '#f97316', '#a855f7', '#84cc16', '#0284c7']

const getContrastingRefColor = (color0: string, color1: string): string => {
  let bestColor = REF_PALETTE[0]
  let maxMinDistance = -1
  for (const candidate of REF_PALETTE) {
    const d0 = colorDistance(candidate, color0)
    const d1 = colorDistance(candidate, color1)
    const dPitch = colorDistance(candidate, '#3f9b0b')
    const score = Math.min(d0, d1, dPitch * 1.1)
    if (score > maxMinDistance) {
      maxMinDistance = score
      bestColor = candidate
    }
  }
  return bestColor
}
const SKIN_TONES = ['#fcd34d', '#fca5a5', '#d97706', '#b45309', '#78350f', '#fed7aa', '#fef08a', '#e2a76f']

const HAIR_COLORS = ['#18181b', '#3b2314', '#713f12', '#1c1917', '#451a03', '#854d0e', '#292524']

const createRugbyBallTexture = (scene: Scene) => {
  const dTex = new DynamicTexture('rugby-ball-tex', { width: 512, height: 256 }, scene, true)
  const ctx = dTex.getContext() as unknown as CanvasRenderingContext2D

  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, 512, 256)

  const panelW = 512 / 4
  for (let i = 0; i < 4; i++) {
    const px = i * panelW

    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 3
    ctx.strokeRect(px, 0, panelW, 256)

    ctx.fillStyle = i % 2 === 0 ? '#0284c7' : '#1e3a8a'
    ctx.beginPath()
    ctx.ellipse(px + panelW / 2, 128, panelW * 0.35, 45, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    for (let dy = 65; dy <= 185; dy += 24) {
      ctx.fillRect(px + panelW / 2 - 10, dy, 20, 3)
    }
  }

  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(panelW / 2, 128, 6, 0, Math.PI * 2)
  ctx.fill()

  dTex.update(true)
  return dTex
}

// Atlas maps back to x=0..180, front to 180..360, sides to 360..450, and top/bottom to 450..512.
const createPlayerTexture = (scene: Scene, player: Player, teamColorHex: string) => {
  const dTex = new DynamicTexture(`player-tex-${player.id}`, { width: 512, height: 512 }, scene, false)
  const ctx = dTex.getContext() as unknown as CanvasRenderingContext2D

  const isLightJersey = getLuminance(teamColorHex) > 135
  const numColor = isLightJersey ? '#0f172a' : '#ffffff'
  const numOutline = isLightJersey ? '#ffffff' : '#000000'
  const shortsColor = isLightJersey ? '#1e293b' : '#f8fafc'
  const collarColor = isLightJersey ? '#0f172a' : '#ffffff'

  const seed = (player.number * 7 + player.slotIndex * 13) % 100
  const hairColor = HAIR_COLORS[seed % HAIR_COLORS.length]
  const skinTone = SKIN_TONES[(seed * 3) % SKIN_TONES.length]

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, 512, 512)

  ctx.fillStyle = hairColor
  ctx.fillRect(0, 0, 180, 20)
  ctx.fillStyle = skinTone
  ctx.fillRect(35, 20, 110, 18)

  ctx.fillStyle = teamColorHex
  ctx.fillRect(0, 38, 180, 322)

  ctx.fillStyle = collarColor
  ctx.fillRect(25, 38, 130, 20)

  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(25, 40)
  ctx.lineTo(35, 360)
  ctx.moveTo(155, 40)
  ctx.lineTo(145, 360)
  ctx.stroke()

  const numStr = String(player.number)
  ctx.font = "900 150px 'Arial Black', Impact, 'Segoe UI Black', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 14
  ctx.strokeStyle = numOutline
  ctx.strokeText(numStr, 90, 195)
  ctx.fillStyle = numColor
  ctx.fillText(numStr, 90, 195)

  ctx.fillStyle = shortsColor
  ctx.fillRect(0, 360, 180, 152)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 360, 180, 12)

  ctx.fillStyle = skinTone
  ctx.fillRect(180, 0, 180, 48)

  ctx.fillStyle = hairColor
  ctx.fillRect(180, 0, 180, 14)

  ctx.fillStyle = teamColorHex
  ctx.fillRect(180, 48, 180, 312)

  ctx.fillStyle = collarColor
  ctx.beginPath()
  ctx.moveTo(235, 48)
  ctx.lineTo(270, 85)
  ctx.lineTo(305, 48)
  ctx.fill()

  ctx.fillStyle = isLightJersey ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.24)'
  ctx.fillRect(180, 120, 180, 36)

  ctx.font = "bold 38px 'Arial Black', sans-serif"
  ctx.fillStyle = numColor
  ctx.strokeStyle = numOutline
  ctx.lineWidth = 4
  ctx.strokeText(numStr, 315, 138)
  ctx.fillText(numStr, 315, 138)

  ctx.fillStyle = shortsColor
  ctx.fillRect(180, 360, 180, 152)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(180, 360, 180, 12)

  ctx.fillStyle = hairColor
  ctx.fillRect(360, 0, 90, 20)
  ctx.fillStyle = skinTone
  ctx.fillRect(360, 20, 90, 24)

  ctx.fillStyle = teamColorHex
  ctx.fillRect(360, 44, 90, 160)
  ctx.fillStyle = collarColor
  ctx.fillRect(360, 192, 90, 12)

  ctx.fillStyle = skinTone
  ctx.fillRect(360, 204, 90, 156)

  ctx.fillStyle = shortsColor
  ctx.fillRect(360, 360, 90, 152)
  ctx.fillStyle = teamColorHex
  ctx.fillRect(398, 360, 14, 152)

  ctx.fillStyle = hairColor
  ctx.fillRect(450, 0, 62, 256)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(455, 30, 52, 10)
  ctx.fillRect(458, 80, 46, 12)
  ctx.fillRect(455, 140, 52, 10)

  ctx.fillStyle = teamColorHex
  ctx.fillRect(450, 256, 62, 120)
  ctx.fillStyle = '#090d16'
  ctx.fillRect(450, 376, 62, 136)

  dTex.update(true)
  return dTex
}

const createRefereeTexture = (scene: Scene, refColorHex: string, label = 'REF') => {
  const dTex = new DynamicTexture(`ref-tex-${label}`, { width: 512, height: 512 }, scene, false)
  const ctx = dTex.getContext() as unknown as CanvasRenderingContext2D

  const isLight = getLuminance(refColorHex) > 135
  const textColor = isLight ? '#0f172a' : '#ffffff'
  const textOutline = isLight ? '#ffffff' : '#000000'

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, 512, 512)

  ctx.fillStyle = '#18181b'
  ctx.fillRect(0, 0, 180, 20)
  ctx.fillStyle = '#fed7aa'
  ctx.fillRect(35, 20, 110, 18)

  ctx.fillStyle = refColorHex
  ctx.fillRect(0, 38, 180, 322)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(25, 38, 130, 20)

  ctx.font = "900 110px 'Arial Black', Impact, sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 12
  ctx.strokeStyle = textOutline
  ctx.strokeText(label, 90, 195)
  ctx.fillStyle = textColor
  ctx.fillText(label, 90, 195)

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 360, 180, 152)

  ctx.fillStyle = '#fed7aa'
  ctx.fillRect(180, 0, 180, 48)
  ctx.fillStyle = '#18181b'
  ctx.fillRect(180, 0, 180, 14)

  ctx.fillStyle = refColorHex
  ctx.fillRect(180, 48, 180, 312)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(205, 48, 130, 20)

  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.fillRect(200, 110, 50, 50)
  ctx.fillRect(290, 110, 50, 50)

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(180, 360, 180, 152)

  ctx.fillStyle = '#18181b'
  ctx.fillRect(360, 0, 90, 20)
  ctx.fillStyle = '#fed7aa'
  ctx.fillRect(360, 20, 90, 24)

  ctx.fillStyle = refColorHex
  ctx.fillRect(360, 44, 90, 160)
  ctx.fillStyle = '#fed7aa'
  ctx.fillRect(360, 204, 90, 156)

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(360, 360, 90, 152)

  ctx.fillStyle = '#18181b'
  ctx.fillRect(450, 0, 62, 256)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(450, 256, 62, 256)

  dTex.update(true)
  return dTex
}

export const createPlayerViews = (scene: Scene, state: GameState) => {
  // Reversed UV ranges keep atlas artwork upright on Babylon box faces.
  const playerFaceUV = [
    new Vector4(0.7, 1.0, 0.35, 0.0),
    new Vector4(0.0, 0.0, 0.35, 1.0),
    new Vector4(0.7, 1.0, 0.88, 0.0),
    new Vector4(0.88, 1.0, 0.7, 0.0),
    new Vector4(0.88, 0.5, 1.0, 1.0),
    new Vector4(0.88, 0.0, 1.0, 0.5),
  ]
  const views = new Map(
    state.players.map((player) => {
      const width = Math.min(1.1, Math.max(0.8, 0.78 + (player.weight - 80) * 0.005))
      const depth = 0.48
      const height = 1.92

      const mesh = CreateBox(player.id, { width, depth, height, faceUV: playerFaceUV }, scene)

      const teamColor = state.teams[player.team].color
      const texture = createPlayerTexture(scene, player, teamColor)

      const material = new StandardMaterial(`${player.id}-material`, scene)
      material.diffuseTexture = texture
      material.specularColor = new Color3(0.08, 0.08, 0.08)
      material.specularPower = 16
      mesh.material = material

      mesh.rotation.y = player.team === 0 ? 0 : Math.PI

      return [player.id, { mesh, material }] as const
    }),
  )

  const refColorHex = getContrastingRefColor(state.teams[0].color, state.teams[1].color)

  const refMesh = CreateBox('referee', { width: 0.82, depth: 0.44, height: 1.9, faceUV: playerFaceUV }, scene)
  const refMat = new StandardMaterial('referee-material', scene)
  refMat.diffuseTexture = createRefereeTexture(scene, refColorHex, 'REF')
  refMat.specularColor = new Color3(0.08, 0.08, 0.08)
  refMesh.material = refMat

  const arMat = new StandardMaterial('ar-material', scene)
  arMat.diffuseTexture = createRefereeTexture(scene, refColorHex, 'AR')
  arMat.specularColor = new Color3(0.08, 0.08, 0.08)

  const ar1Mesh = CreateBox('assistant-ref-1', { width: 0.8, depth: 0.44, height: 1.88, faceUV: playerFaceUV }, scene)
  ar1Mesh.material = arMat

  const ar2Mesh = CreateBox('assistant-ref-2', { width: 0.8, depth: 0.44, height: 1.88, faceUV: playerFaceUV }, scene)
  ar2Mesh.material = arMat

  const carrierMarker = CreateCylinder(
    'carrierMarker',
    { diameterTop: 0.5, diameterBottom: 0, height: 0.45, tessellation: 6 },
    scene,
  )
  const carrierMarkerMat = new StandardMaterial('carrierMarkerMat', scene)
  carrierMarkerMat.diffuseColor = Color3.FromHexString('#facc15')
  carrierMarkerMat.emissiveColor = Color3.FromHexString('#fbbf24')
  carrierMarker.material = carrierMarkerMat
  carrierMarker.setEnabled(false)

  const gainLinePlane = CreateGround('gainLinePlane', { width: PITCH.width, height: 0.7 }, scene)
  gainLinePlane.position.y = 0.035
  const gainLineMat = new StandardMaterial('gainLineMat', scene)
  gainLineMat.diffuseColor = Color3.FromHexString('#f59e0b')
  gainLineMat.emissiveColor = Color3.FromHexString('#d97706')
  gainLineMat.alpha = 0.45
  gainLinePlane.material = gainLineMat

  const ball = CreateSphere('ball', { diameter: 0.44, segments: 16 }, scene)
  ball.scaling.set(0.72, 0.72, 1.28)
  const ballMaterial = new StandardMaterial('ball-material', scene)
  ballMaterial.diffuseTexture = createRugbyBallTexture(scene)
  ballMaterial.specularColor = new Color3(0.18, 0.18, 0.18)
  ballMaterial.specularPower = 32
  ball.material = ballMaterial

  return {
    views,
    refMesh,
    ar1Mesh,
    ar2Mesh,
    carrierMarker,
    gainLinePlane,
    ball,
  }
}

export const syncPlayers = (
  game: GameState,
  views: ReturnType<typeof createPlayerViews>['views'],
  refMesh: ReturnType<typeof createPlayerViews>['refMesh'],
  ar1Mesh: ReturnType<typeof createPlayerViews>['ar1Mesh'],
  ar2Mesh: ReturnType<typeof createPlayerViews>['ar2Mesh'],
  carrierMarker: ReturnType<typeof createPlayerViews>['carrierMarker'],
  gainLinePlane: ReturnType<typeof createPlayerViews>['gainLinePlane'],
  ball: ReturnType<typeof createPlayerViews>['ball'],
  isRefCam = false,
) => {
  const ruckPhase = game.phase.kind === 'ruck' ? game.phase : null
  const maulPhase = game.phase.kind === 'maul' ? game.phase : null

  for (const player of game.players) {
    const view = views.get(player.id)
    if (!view) continue

    const isTackled = ruckPhase !== null && player.id === ruckPhase.tackledPlayerId
    const isRuckCleaner =
      ruckPhase !== null &&
      !isTackled &&
      (ruckPhase.joinedAttackers.includes(player.id) || ruckPhase.joinedDefenders.includes(player.id)) &&
      Math.hypot(player.position.x - ruckPhase.position.x, player.position.z - ruckPhase.position.z) <= 2.2
    const isMaulBound =
      maulPhase !== null && (maulPhase.attackers.includes(player.id) || maulPhase.defenders.includes(player.id))

    const lineoutPhase = game.phase.kind === 'lineout' ? game.phase : null

    const speed = Math.hypot(player.velocity.x, player.velocity.z)
    let targetYaw = player.team === 0 ? 0 : Math.PI

    if (maulPhase && isMaulBound) {
      // Bound maul players face into opposing packs rather than movement direction.
      targetYaw =
        player.team === maulPhase.attackingTeam
          ? attackDirection(maulPhase.attackingTeam) === 1
            ? 0
            : Math.PI
          : attackDirection(maulPhase.attackingTeam) === 1
            ? Math.PI
            : 0
    } else if (ruckPhase && isRuckCleaner) {
      // Ruck cleaners face across the gate rather than following residual velocity.
      targetYaw =
        player.team === ruckPhase.attackingTeam
          ? attackDirection(ruckPhase.attackingTeam) === 1
            ? 0
            : Math.PI
          : attackDirection(ruckPhase.attackingTeam) === 1
            ? Math.PI
            : 0
    } else if (lineoutPhase && player.team === lineoutPhase.throwingTeam && player.role === ROLES.Hooker) {
      // Throwing hooker faces across the touchline into the pitch.
      targetYaw = player.position.x < 0 ? Math.PI / 2 : -Math.PI / 2
    } else if (lineoutPhase && player.team !== lineoutPhase.throwingTeam && player.role === ROLES.Hooker) {
      // Defending hooker faces the thrower across the touchline.
      targetYaw = player.position.x < 0 ? -Math.PI / 2 : Math.PI / 2
    } else if (speed > 0.2) {
      targetYaw = Math.atan2(player.velocity.x, player.velocity.z)
    }

    let diff = targetYaw - view.mesh.rotation.y
    while (diff < -Math.PI) diff += Math.PI * 2
    while (diff > Math.PI) diff -= Math.PI * 2
    view.mesh.rotation.y += diff * 0.28

    if (isTackled) {
      view.mesh.rotation.x = Math.PI / 2
      view.mesh.position.set(player.position.x, 0.25, player.position.z)
    } else if (isRuckCleaner || isMaulBound) {
      // Positive local pitch leans both teams into the contest despite opposite yaw.
      view.mesh.rotation.x = 0.38
      view.mesh.position.set(player.position.x, 0.85, player.position.z)
    } else if (player.ruckRecoverySeconds > 0) {
      if (player.ruckRecoverySeconds > 1.8) {
        view.mesh.rotation.x = Math.PI / 2
        view.mesh.position.set(player.position.x, 0.25, player.position.z)
      } else {
        const progress = player.ruckRecoverySeconds / 1.8
        view.mesh.rotation.x = 0.38 * progress
        view.mesh.position.set(player.position.x, 0.96 - 0.25 * progress, player.position.z)
      }
    } else {
      view.mesh.rotation.x = 0
      view.mesh.position.set(player.position.x, 0.96, player.position.z)
    }

    view.material.emissiveColor = player.id === game.ball.carrierId ? new Color3(0.25, 0.25, 0.08) : Color3.Black()
  }

  const carrier = game.players.find((p) => p.id === game.ball.carrierId)
  if (carrier) {
    const carrierView = views.get(carrier.id)
    if (carrierView) {
      carrierMarker.setEnabled(true)
      carrierMarker.position.set(carrier.position.x, carrierView.mesh.position.y + 1.45, carrier.position.z)
      carrierMarker.rotation.y += 0.04
    } else {
      carrierMarker.setEnabled(false)
    }
  } else {
    carrierMarker.setEnabled(false)
  }

  ball.position.set(game.ball.position.x, game.ball.position.y, game.ball.position.z)

  const hSpeed = Math.hypot(game.ball.velocity.x, game.ball.velocity.z)
  const vSpeed = game.ball.velocity.y
  const _ballSpeed = Math.hypot(hSpeed, vSpeed)

  if (game.ball.carrierId) {
    const carrier = game.players.find((p) => p.id === game.ball.carrierId)
    if (carrier) {
      ball.rotation.y = carrier.team === 0 ? 0.3 : Math.PI - 0.3
      ball.rotation.x = 0.35
      ball.rotation.z = 0.15
    }
  } else if (game.ball.flight === 'pass' || game.ball.flight === 'lineout') {
    const flightYaw = Math.atan2(game.ball.velocity.x, game.ball.velocity.z)
    const flightPitch = -Math.atan2(vSpeed, Math.max(0.1, hSpeed))
    ball.rotation.y = flightYaw
    ball.rotation.x = flightPitch
    ball.rotation.z += 0.32
  } else if (game.ball.flight === 'kick' || game.ball.flight === 'kickoff' || game.ball.flight === 'dropGoal') {
    const flightYaw = Math.atan2(game.ball.velocity.x, game.ball.velocity.z)
    ball.rotation.y = flightYaw
    ball.rotation.x += 0.22
  } else if (game.ball.flight === 'grubber' || game.ball.flight === 'rolling') {
    if (hSpeed > 0.1) {
      const rollYaw = Math.atan2(game.ball.velocity.x, game.ball.velocity.z)
      ball.rotation.y = rollYaw
      ball.rotation.x += hSpeed * 0.18
    }
  }

  // Hide referee mesh so first-person camera does not intersect it.
  refMesh.setEnabled(!isRefCam)
  refMesh.position.set(game.referee.position.x, 0.95, game.referee.position.z)
  const refSpeed = Math.hypot(game.referee.velocity.x, game.referee.velocity.z)

  let refTargetYaw = refMesh.rotation.y
  if (refSpeed > 0.2) {
    refTargetYaw = Math.atan2(game.referee.velocity.x, game.referee.velocity.z)
  } else if (game.phase.kind === 'lineout') {
    // At lineouts, referee faces down the throwing tunnel.
    const touchSide = game.phase.position.x < 0 ? -1 : 1
    refTargetYaw = touchSide < 0 ? -Math.PI / 2 : Math.PI / 2
  } else if (game.phase.kind === 'scrum') {
    // At scrums, referee faces across the tunnel from the nearest side.
    refTargetYaw = game.referee.position.x > game.phase.position.x ? -Math.PI / 2 : Math.PI / 2
  }

  let rDiff = refTargetYaw - refMesh.rotation.y
  while (rDiff < -Math.PI) rDiff += Math.PI * 2
  while (rDiff > Math.PI) rDiff -= Math.PI * 2
  refMesh.rotation.y += rDiff * 0.25

  if (game.referee.assistants && ar1Mesh && ar2Mesh) {
    const ar1 = game.referee.assistants[0]
    const ar2 = game.referee.assistants[1]
    ar1Mesh.position.set(ar1.position.x, 0.95, ar1.position.z)
    ar2Mesh.position.set(ar2.position.x, 0.95, ar2.position.z)

    const ar1Speed = Math.hypot(ar1.velocity.x, ar1.velocity.z)
    let ar1TargetYaw = Math.PI / 2
    if (ar1Speed > 0.2) ar1TargetYaw = Math.atan2(ar1.velocity.x, ar1.velocity.z)
    let rDiff1 = ar1TargetYaw - ar1Mesh.rotation.y
    while (rDiff1 < -Math.PI) rDiff1 += Math.PI * 2
    while (rDiff1 > Math.PI) rDiff1 -= Math.PI * 2
    ar1Mesh.rotation.y += rDiff1 * 0.25

    const ar2Speed = Math.hypot(ar2.velocity.x, ar2.velocity.z)
    let ar2TargetYaw = -Math.PI / 2
    if (ar2Speed > 0.2) ar2TargetYaw = Math.atan2(ar2.velocity.x, ar2.velocity.z)
    let rDiff2 = ar2TargetYaw - ar2Mesh.rotation.y
    while (rDiff2 < -Math.PI) rDiff2 += Math.PI * 2
    while (rDiff2 > Math.PI) rDiff2 -= Math.PI * 2
    ar2Mesh.rotation.y += rDiff2 * 0.25
  }

  const showGainLine = game.phase.kind === 'openPlay' || game.phase.kind === 'ruck' || game.phase.kind === 'maul'
  gainLinePlane.setEnabled(showGainLine)
  if (showGainLine) {
    gainLinePlane.position.z = game.gainLineZ
  }
}
