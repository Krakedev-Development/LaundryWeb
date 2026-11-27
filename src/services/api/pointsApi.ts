import { apiRequest } from './apiConfig';
import { session } from '../auth/session';
import type { PointsLedgerEntry, RewardRedemption } from '../../types';

// Canjes y puntos contra el servidor.

export type ServerRedemptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ServerRedemption {
  id: string;
  customerId: string;
  rewardId: string;
  pointsCost: number;
  status: ServerRedemptionStatus;
  reviewedById?: string | null;
  reviewReason?: string | null;
  generatedPromoCode?: string | null;
  walletCreditAmount?: number | string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reward?: { title: string; fulfillmentType?: string | null } | null;
  customer?: { user?: { name?: string | null } | null } | null;
}

export interface ServerPointsLedgerEntry {
  id: string;
  customerId: string;
  orderId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  points: number;
  reason: string;
  note?: string | null;
  createdAt: string;
}

export interface CustomerPointsResponse {
  customerId: string;
  balance: number;
  entries: ServerPointsLedgerEntry[];
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

export function getCustomerPoints(
  customerId: string,
): Promise<CustomerPointsResponse> {
  return request<CustomerPointsResponse>(`/customers/${customerId}/points`, 'GET');
}

export function adjustCustomerPointsApi(payload: {
  customerId: string;
  points: number;
  reason: string;
}): Promise<{ entry: ServerPointsLedgerEntry; balance: number }> {
  return request<{ entry: ServerPointsLedgerEntry; balance: number }>(
    '/points/adjust',
    'POST',
    payload,
  );
}

export function mapServerLedgerEntry(
  raw: ServerPointsLedgerEntry,
): PointsLedgerEntry {
  const type: PointsLedgerEntry['type'] = raw.reason.startsWith('REDEMPTION')
    ? 'REDEMPTION'
    : raw.reason === 'ADMIN_ADJUSTMENT'
      ? 'ADMIN_ADJUSTMENT'
      : 'PURCHASE';
  return {
    id: raw.id,
    customerId: raw.customerId,
    orderId: raw.orderId ?? undefined,
    points: raw.points,
    type,
    reason: raw.note?.trim() || raw.reason,
    date: new Date(raw.createdAt).toLocaleString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    adminUser: raw.actorName ?? undefined,
  };
}

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
    generatedPromoCode: raw.generatedPromoCode ?? null,
    walletCreditAmount:
      raw.walletCreditAmount != null ? Number(raw.walletCreditAmount) : null,
    pointsReserved: true,
  };
}
