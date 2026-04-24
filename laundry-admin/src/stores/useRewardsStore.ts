import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addManualPointsAdjustment,
  createPointsRule,
  createRewardCatalogItem,
  deletePointsRule,
  deleteRewardCatalogItem,
  fetchRewardsSnapshot,
  togglePointsRule,
  toggleRewardCatalogItem,
  updatePointsRule,
  updateRewardCatalogItem,
  updateRedemptionStatus,
} from '@/services/rewardsMockService'
import type { PointsRule, RewardCatalogItem, RewardRedemption, RewardRedemptionStatus } from '@/types'

type RewardsState = {
  loading: boolean
  catalog: RewardCatalogItem[]
  rules: PointsRule[]
  redemptions: RewardRedemption[]
  redemptionsCount: number
  pendingRedemptions: number
  pointsRedeemed: number
}

export function useRewardsStore() {
  const queryClient = useQueryClient()
  const rewardsQuery = useQuery({
    queryKey: ['rewards-snapshot'],
    queryFn: fetchRewardsSnapshot,
  })

  const snapshot = rewardsQuery.data

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['rewards-snapshot'] })
  }

  const createRewardMutation = useMutation({
    mutationFn: async (input: Omit<RewardCatalogItem, 'id' | 'displayOrder'>) => {
      await createRewardCatalogItem(input)
    },
    onSuccess: refresh,
  })

  const toggleRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      await toggleRewardCatalogItem(id)
    },
    onSuccess: refresh,
  })

  const addRuleMutation = useMutation({
    mutationFn: async (input: Omit<PointsRule, 'id'>) => {
      await createPointsRule(input)
    },
    onSuccess: refresh,
  })

  const updateRewardMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<Omit<RewardCatalogItem, 'id' | 'displayOrder'>> }) => {
      await updateRewardCatalogItem(id, input)
    },
    onSuccess: refresh,
  })

  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteRewardCatalogItem(id)
    },
    onSuccess: refresh,
  })

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<Omit<PointsRule, 'id'>> }) => {
      await updatePointsRule(id, input)
    },
    onSuccess: refresh,
  })

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await deletePointsRule(id)
    },
    onSuccess: refresh,
  })

  const toggleRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await togglePointsRule(id)
    },
    onSuccess: refresh,
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RewardRedemptionStatus }) => {
      await updateRedemptionStatus(id, status, 'adm-1')
    },
    onSuccess: refresh,
  })

  const adjustmentMutation = useMutation({
    mutationFn: async ({ userId, delta, note }: { userId: string; delta: number; note: string }) => {
      await addManualPointsAdjustment({ userId, delta, note, actorAdminId: 'adm-1' })
    },
    onSuccess: refresh,
  })

  async function createReward(input: Omit<RewardCatalogItem, 'id' | 'displayOrder'>) {
    await createRewardMutation.mutateAsync(input)
  }

  async function toggleReward(id: string) {
    await toggleRewardMutation.mutateAsync(id)
  }

  async function addRule(input: Omit<PointsRule, 'id'>) {
    await addRuleMutation.mutateAsync(input)
  }

  async function updateReward(id: string, input: Partial<Omit<RewardCatalogItem, 'id' | 'displayOrder'>>) {
    await updateRewardMutation.mutateAsync({ id, input })
  }

  async function deleteReward(id: string) {
    await deleteRewardMutation.mutateAsync(id)
  }

  async function updateRule(id: string, input: Partial<Omit<PointsRule, 'id'>>) {
    await updateRuleMutation.mutateAsync({ id, input })
  }

  async function deleteRule(id: string) {
    await deleteRuleMutation.mutateAsync(id)
  }

  async function toggleRule(id: string) {
    await toggleRuleMutation.mutateAsync(id)
  }

  async function setRedemptionStatus(id: string, status: RewardRedemptionStatus) {
    await statusMutation.mutateAsync({ id, status })
  }

  async function addManualAdjustment(userId: string, delta: number, note: string) {
    await adjustmentMutation.mutateAsync({ userId, delta, note })
  }

  const state: RewardsState = useMemo(
    () => ({
      loading: rewardsQuery.isLoading || rewardsQuery.isFetching,
      catalog: snapshot?.catalog ?? [],
      rules: snapshot?.rules ?? [],
      redemptions: snapshot?.redemptions ?? [],
      redemptionsCount: snapshot?.redemptions.length ?? 0,
      pendingRedemptions: snapshot?.redemptions.filter((item) => item.status === 'pending').length ?? 0,
      pointsRedeemed: snapshot?.redemptions.reduce((acc, item) => acc + item.pointsSpent, 0) ?? 0,
    }),
    [rewardsQuery.isFetching, rewardsQuery.isLoading, snapshot],
  )

  return {
    ...state,
    refresh,
    createReward,
    toggleReward,
    updateReward,
    deleteReward,
    addRule,
    toggleRule,
    updateRule,
    deleteRule,
    setRedemptionStatus,
    addManualAdjustment,
  }
}
