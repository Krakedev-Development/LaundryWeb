import type {
  PointsLedgerEntry,
  PointsRule,
  RewardCatalogItem,
  RewardRedemption,
  RewardRedemptionStatus,
  RewardsSnapshot,
} from '@/types'

type CreateRewardInput = Omit<RewardCatalogItem, 'id' | 'displayOrder'>
type UpdateRewardInput = Partial<Omit<RewardCatalogItem, 'id' | 'displayOrder'>>
type CreateRuleInput = Omit<PointsRule, 'id'>
type UpdateRuleInput = Partial<Omit<PointsRule, 'id'>>
type ManualAdjustmentInput = { userId: string; delta: number; note: string; actorAdminId: string }

let rewardCatalog: RewardCatalogItem[] = [
  {
    id: 'rw-1',
    name: 'Descuento $10.000',
    description: 'Aplicable en una orden mayor a $35.000.',
    pointsCost: 5000,
    requiredRuleIds: ['pr-1'],
    status: 'active',
    stock: null,
    validFrom: '2026-04-01',
    validTo: '2026-12-31',
    icon: 'Gift',
    displayOrder: 1,
  },
  {
    id: 'rw-2',
    name: 'Domicilio gratis',
    description: 'Una entrega sin costo en tu siguiente pedido.',
    pointsCost: 3500,
    requiredRuleIds: ['pr-1'],
    status: 'active',
    stock: null,
    validFrom: '2026-05-01',
    validTo: '2026-09-30',
    icon: 'Truck',
    displayOrder: 2,
  },
]

let pointsRules: PointsRule[] = [
  {
    id: 'pr-1',
    name: 'Cliente frecuente',
    description: 'Debe tener al menos 5 compras en la vigencia.',
    minPurchases: 5,
    minSpendUsd: 0,
    requiredPoints: 100,
    validFrom: '2026-04-01',
    validTo: '2026-12-31',
    active: true,
  },
]

let redemptions: RewardRedemption[] = [
  {
    id: 'rd-1',
    userId: 'u-c1',
    customerName: 'Paola Herrera',
    rewardId: 'rw-1',
    rewardName: 'Descuento $10.000',
    pointsSpent: 5000,
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rd-2',
    userId: 'u-c3',
    customerName: 'Inés Ocampo',
    rewardId: 'rw-2',
    rewardName: 'Domicilio gratis',
    pointsSpent: 3500,
    status: 'approved',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    approvedByAdminId: 'adm-1',
  },
]

let ledger: PointsLedgerEntry[] = [
  {
    id: 'lg-1',
    userId: 'u-c1',
    sourceType: 'rule_award',
    sourceId: 'pr-1',
    pointsDelta: 6200,
    balanceAfter: 6200,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Acumulación por compras',
  },
  {
    id: 'lg-2',
    userId: 'u-c1',
    sourceType: 'redemption',
    sourceId: 'rd-1',
    pointsDelta: -5000,
    balanceAfter: 1200,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Canje descuento',
  },
]

function sortCatalog(items: RewardCatalogItem[]) {
  return [...items].sort((a, b) => a.displayOrder - b.displayOrder)
}

function nextBalanceForUser(userId: string): number {
  const userEntries = ledger.filter((entry) => entry.userId === userId)
  const last = userEntries[userEntries.length - 1]
  return last?.balanceAfter ?? 0
}

function currentIso() {
  return new Date().toISOString()
}

export async function fetchRewardsSnapshot(): Promise<RewardsSnapshot> {
  return {
    catalog: sortCatalog(rewardCatalog),
    rules: [...pointsRules],
    redemptions: [...redemptions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    ledger: [...ledger].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  }
}

export async function createRewardCatalogItem(input: CreateRewardInput): Promise<RewardCatalogItem> {
  const created: RewardCatalogItem = {
    ...input,
    id: `rw-${Date.now()}`,
    displayOrder: rewardCatalog.length + 1,
  }
  rewardCatalog = [...rewardCatalog, created]
  return created
}

export async function updateRewardCatalogItem(id: string, input: UpdateRewardInput): Promise<void> {
  rewardCatalog = rewardCatalog.map((item) => (item.id === id ? { ...item, ...input } : item))
}

export async function deleteRewardCatalogItem(id: string): Promise<void> {
  rewardCatalog = rewardCatalog.filter((item) => item.id !== id)
}

export async function toggleRewardCatalogItem(id: string): Promise<void> {
  rewardCatalog = rewardCatalog.map((item) =>
    item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item,
  )
}

export async function createPointsRule(input: CreateRuleInput): Promise<PointsRule> {
  const created: PointsRule = { ...input, id: `pr-${Date.now()}` }
  pointsRules = [created, ...pointsRules]
  return created
}

export async function updatePointsRule(id: string, input: UpdateRuleInput): Promise<void> {
  pointsRules = pointsRules.map((item) => (item.id === id ? { ...item, ...input } : item))
}

export async function deletePointsRule(id: string): Promise<void> {
  pointsRules = pointsRules.filter((item) => item.id !== id)
  rewardCatalog = rewardCatalog.map((reward) => ({
    ...reward,
    requiredRuleIds: reward.requiredRuleIds.filter((ruleId) => ruleId !== id),
  }))
}

export async function togglePointsRule(id: string): Promise<void> {
  pointsRules = pointsRules.map((rule) => (rule.id === id ? { ...rule, active: !rule.active } : rule))
}

export async function updateRedemptionStatus(id: string, status: RewardRedemptionStatus, adminId: string): Promise<void> {
  redemptions = redemptions.map((item) =>
    item.id === id
      ? {
          ...item,
          status,
          approvedByAdminId: status === 'approved' || status === 'delivered' ? adminId : item.approvedByAdminId,
        }
      : item,
  )
}

export async function addManualPointsAdjustment(input: ManualAdjustmentInput): Promise<PointsLedgerEntry> {
  const newBalance = nextBalanceForUser(input.userId) + input.delta
  const entry: PointsLedgerEntry = {
    id: `lg-${Date.now()}`,
    userId: input.userId,
    sourceType: 'admin_adjustment',
    sourceId: input.actorAdminId,
    pointsDelta: input.delta,
    balanceAfter: newBalance,
    createdAt: currentIso(),
    note: input.note,
  }
  ledger = [entry, ...ledger]
  return entry
}
