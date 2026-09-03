import { attackDirection, PITCH, ROLES, type Player, type Position } from '../domain.ts'
import { DEFENCE_X, OPEN_ATTACK_FORMATIONS, OPEN_DEFENCE_VARIANTS } from './constants.ts'
import type { OpenAttackFormation, OpenDefenceFormation } from './types.ts'
import { clampX, clampZ, getSlotIndex } from './utils.ts'

export const getOpenPlayTarget = (
  player: Player,
  carrier: Player,
  defensiveLineZ?: number,
  attackFormation: OpenAttackFormation = 'balanced',
  defenceFormation: OpenDefenceFormation = 'connected',
  custom?: readonly Position[],
): Position => {
  const slotIdx = getSlotIndex(player)
  const ballDirection = attackDirection(carrier.team)
  const customPosition = custom?.[slotIdx]
  if (customPosition) {
    return player.team === carrier.team
      ? {
          x: clampX(customPosition.x + carrier.position.x * 0.2),
          z: clampZ(carrier.position.z + customPosition.z * attackDirection(player.team)),
        }
      : {
          x: clampX(customPosition.x + carrier.position.x * 0.15),
          z: clampZ((defensiveLineZ ?? carrier.position.z) + customPosition.z * attackDirection(player.team)),
        }
  }
  if (player.team === carrier.team) {
    const slot = OPEN_ATTACK_FORMATIONS[attackFormation][slotIdx]
    if (player.role === ROLES.FullBack) {
      // Attacking fullback trails as turnover and kick cover rather than joining front line.
      return {
        x: clampX(carrier.position.x * 0.35),
        z: clampZ(carrier.position.z - ballDirection * 18),
      }
    }
    if (player.role === ROLES.ScrumHalf) {
      // Scrum-half tracks close behind carrier to reach next breakdown first.
      return {
        x: clampX(carrier.position.x + (carrier.position.x >= 0 ? -3 : 3)),
        z: clampZ(carrier.position.z - ballDirection * 2.5),
      }
    }
    if (player.role === ROLES.FlyHalf) {
      return {
        x: clampX(carrier.position.x + (carrier.position.x >= 0 ? -8 : 8)),
        z: clampZ(carrier.position.z - ballDirection * 5),
      }
    }
    return {
      x: clampX(slot.x + carrier.position.x * 0.2),
      z: clampZ(carrier.position.z + slot.z * ballDirection),
    }
  }

  if (player.role === ROLES.FullBack) {
    const variant = OPEN_DEFENCE_VARIANTS[defenceFormation]
    const defTryLine = player.team === 0 ? PITCH.tryLines.south : PITCH.tryLines.north
    const maxDepth = Math.max(0, Math.abs(defTryLine - carrier.position.z) - 5)
    const depth = Math.min(variant.fullbackDepth, maxDepth)
    // Fullback remains goal-side but compresses before own try line to stay in field of play.
    return {
      x: clampX(carrier.position.x * 0.45),
      z: clampZ(carrier.position.z + ballDirection * depth),
    }
  }

  const slotX = DEFENCE_X[slotIdx] ?? 0
  // Front line shares offside depth while formation variant controls lateral width.
  return {
    x: clampX(slotX * OPEN_DEFENCE_VARIANTS[defenceFormation].width + carrier.position.x * 0.15),
    z: clampZ(defensiveLineZ ?? carrier.position.z + ballDirection * 0.5),
  }
}
