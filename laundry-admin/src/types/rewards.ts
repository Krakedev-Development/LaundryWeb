export type RewardStatus = 'active' | 'inactive'

export interface RewardCatalogItem {
  id: string
  name: string
  description: string
  pointsCost: number
  requiredRuleIds: string[]
  status: RewardStatus
  stock: number | null
  validFrom: string | null
  validTo: string | null
  icon: string
  displayOrder: number
}

export interface PointsRule {
  id: string
  name: string
  description: string
  minPurchases: number
  minSpendUsd: number
  requiredPoints: number
  validFrom: string | null
  validTo: string | null
  active: boolean
}

export type PointsLedgerSourceType = 'rule_award' | 'admin_adjustment' | 'redemption'

export interface PointsLedgerEntry {
  id: string
  userId: string
  sourceType: PointsLedgerSourceType
  sourceId: string
  pointsDelta: number
  balanceAfter: number
  createdAt: string
  note?: string
}

export type RewardRedemptionStatus = 'pending' | 'approved' | 'delivered' | 'cancelled'

export interface RewardRedemption {
  id: string
  userId: string
  customerName: string
  rewardId: string
  rewardName: string
  pointsSpent: number
  status: RewardRedemptionStatus
  createdAt: string
  approvedByAdminId?: string
}

export interface RewardsSnapshot {
  catalog: RewardCatalogItem[]
  rules: PointsRule[]
  redemptions: RewardRedemption[]
  ledger: PointsLedgerEntry[]
}
