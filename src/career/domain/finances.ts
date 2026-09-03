import {
  FACILITY_NAMES,
  FACILITY_UPGRADE_COSTS,
  STAFF_NAMES,
  STAFF_UPGRADE_COSTS,
  type FacilityType,
  type StaffRole,
} from './constants.ts'
import type { Career, Club, LedgerEntry } from './types.ts'

export function upgradeFacility(career: Career, clubId: string, facilityType: FacilityType): Career {
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club
        const currentLevel = club.facilities[facilityType]
        if (currentLevel >= 5) return club

        const nextLevel = currentLevel + 1
        const cost = FACILITY_UPGRADE_COSTS[nextLevel]
        if (!cost || club.balance < cost) return club

        const entry: LedgerEntry = {
          id: `tx-fac-${facilityType}-${nextLevel}-${career.currentRound}-${Date.now()}`,
          round: career.currentRound,
          date: career.currentDate,
          category: 'facilityUpgrade',
          description: `Upgraded ${FACILITY_NAMES[facilityType]} to Tier ${nextLevel}`,
          amount: -cost,
        }

        return {
          ...club,
          balance: club.balance - cost,
          facilityLevel: Math.round(
            (club.facilities.gym + club.facilities.trainingGround + club.facilities.medicalRoom + 1) / 3,
          ),
          facilities: {
            ...club.facilities,
            [facilityType]: nextLevel,
          },
          ledger: [entry, ...club.ledger],
        }
      }),
    },
  }
}

export function upgradeStaff(career: Career, clubId: string, staffRole: StaffRole): Career {
  return {
    ...career,
    season: {
      ...career.season,
      clubs: career.season.clubs.map((club) => {
        if (club.id !== clubId) return club
        const member = club.staff.find((s) => s.role === staffRole)
        if (!member || member.level >= 5) return club

        const nextLevel = member.level + 1
        const cost = STAFF_UPGRADE_COSTS[nextLevel]
        if (!cost || club.balance < cost) return club

        const newWage = Math.round(1200 + nextLevel * 750)
        const entry: LedgerEntry = {
          id: `tx-staff-${staffRole}-${nextLevel}-${career.currentRound}-${Date.now()}`,
          round: career.currentRound,
          date: career.currentDate,
          category: 'staffRecruitment',
          description: `Recruited Tier ${nextLevel} ${STAFF_NAMES[staffRole]}`,
          amount: -cost,
        }

        const updatedStaff = club.staff.map((s) =>
          s.role === staffRole ? { ...s, level: nextLevel, wage: newWage } : s,
        )

        return {
          ...club,
          balance: club.balance - cost,
          staffLevel: Math.round(updatedStaff.reduce((sum, s) => sum + s.level, 0) / updatedStaff.length),
          staff: updatedStaff,
          ledger: [entry, ...club.ledger],
        }
      }),
    },
  }
}

export function processMatchFinancesAndWages(
  club: Club,
  round: number,
  date: string,
  isHome: boolean,
  opponentReputation: number,
): Club {
  const newEntries: LedgerEntry[] = []
  let balanceDelta = 0

  // 1. Home match gate receipts & ticket income
  if (isHome) {
    const attendance = Math.round(3200 + club.reputation * 55 + opponentReputation * 45)
    const ticketPrice = 18
    const matchIncome = Math.round(attendance * ticketPrice * 0.72)
    balanceDelta += matchIncome
    newEntries.push({
      id: `tx-gate-rd${round}-${club.id}`,
      round,
      date,
      category: 'matchIncome',
      description: `Home Matchday Gate & Concessions (${attendance.toLocaleString()} attendance)`,
      amount: matchIncome,
    })
  }

  // 2. Player squad weekly wages
  const playerWagesTotal = club.squad.reduce((sum, p) => sum + p.wage, 0)
  balanceDelta -= playerWagesTotal
  newEntries.push({
    id: `tx-pwage-rd${round}-${club.id}`,
    round,
    date,
    category: 'playerWages',
    description: `Squad Weekly Wages (${club.squad.length} registered players)`,
    amount: -playerWagesTotal,
  })

  // 3. Staff weekly wages
  const staffWagesTotal = club.staff.reduce((sum, s) => sum + s.wage, 0)
  balanceDelta -= staffWagesTotal
  newEntries.push({
    id: `tx-swage-rd${round}-${club.id}`,
    round,
    date,
    category: 'staffWages',
    description: `Coaching & Medical Staff Weekly Wages (${club.staff.length} staff members)`,
    amount: -staffWagesTotal,
  })

  return {
    ...club,
    balance: club.balance + balanceDelta,
    ledger: [...newEntries, ...club.ledger],
  }
}
