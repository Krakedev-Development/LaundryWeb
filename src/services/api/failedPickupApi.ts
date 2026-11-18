import { apiRequest } from './apiConfig';
import { session } from '../auth/session';
import type { BackendOrderDetail } from './ordersApi';

// Recogida fallida: el chofer no pudo recoger y la solicitud quedó retenida (INCIDENT). La sede
// decide si reprograma la recogida (nueva franja + resolver la incidencia) o cancela la solicitud.

export interface OrderIncident {
  id: string;
  orderId: string;
  type: string;
  severity: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
  description: string;
  resolution?: string | null;
  createdAt: string;
}

const request = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, {
    method,
    token: session.getToken(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export async function listOrderIncidents(orderId: string): Promise<OrderIncident[]> {
  const rows = await request<OrderIncident[] | { data?: OrderIncident[] }>(
    `/incidents?orderId=${encodeURIComponent(orderId)}`,
    'GET',
  );
  return Array.isArray(rows) ? rows : (rows?.data ?? []);
}

/** Incidencia abierta de recogida fallida, si la hay. */
export const openFailedPickup = (rows: OrderIncident[]) =>
  rows.find((i) => i.type === 'FAILED_PICKUP' && (i.status === 'OPEN' || i.status === 'IN_REVIEW'));

export const scheduleInbound = (orderId: string, expectedVersion: number, slotId: string) =>
  request<BackendOrderDetail>(`/orders/${orderId}/inbound`, 'PUT', { expectedVersion, slotId });

export const resolveIncident = (incidentId: string, resolution: string) =>
  request<OrderIncident>(`/incidents/${incidentId}/status`, 'POST', {
    status: 'RESOLVED',
    resolution,
  });

export const cancelOrder = (orderId: string, expectedVersion: number, reason: string) =>
  request<BackendOrderDetail>(`/orders/${orderId}/cancel`, 'POST', { expectedVersion, reason });
