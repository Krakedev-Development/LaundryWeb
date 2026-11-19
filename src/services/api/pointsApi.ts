import { apiRequest } from './apiConfig';
import { session } from '../auth/session';
import type { RewardRedemption } from '../../types';

// Canjes de recompensas contra el servidor. El personal lista y aprueba/rechaza;
// no hay estado DELIVERED en el backend (solo PENDING → APPROVED | REJECTED).

export type ServerRedemptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ServerRedemption {
  id: string;
  customerId: string;
  rewardId: string;
  pointsCost: number;
  status: ServerRedemptionStatus;
  reviewedById?: string | null;
  reviewReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reward?: { title: string } | null;
  customer?: { user?: { name?: string | null } | null } | null;
}

const request = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, {
    method,
    token: session.getToken(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export async function listRedemptions(
  status?: ServerRedemptionStatus,
): Promise<ServerRedemption[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const rows = await request<ServerRedemption[] | { data?: ServerRedemption[] }>(
    `/redemptions${q}`,
    'GET',
  );
  return Array.isArray(rows) ? rows : (rows?.data ?? []);
}

export const reviewRedemption = (
  id: string,
  approve: boolean,
  reason?: string,
) =>
  request<ServerRedemption>(`/redemptions/${id}/review`, 'POST', {
    approve,
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  });

export function mapServerRedemption(raw: ServerRedemption): RewardRedemption {
  return {
    id: raw.id,
    customerId: raw.customerId,
    customerName:
      raw.customer?.user?.name ??
      `Cliente ${raw.customerId.slice(0, 8)}`,
    rewardId: raw.rewardId,
    rewardName: raw.reward?.title ?? 'Recompensa',
    pointsSpent: raw.pointsCost,
    date: new Date(raw.createdAt).toLocaleString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    status: raw.status,
    reviewedBy: raw.reviewedById ?? undefined,
    reviewedAt: raw.reviewedAt
      ? new Date(raw.reviewedAt).toLocaleString('es-EC')
      : undefined,
    notes: raw.reviewReason ?? undefined,
    pointsReserved: true,
  };
}
