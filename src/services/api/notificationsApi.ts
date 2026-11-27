import { apiRequest } from './apiConfig';
import { session } from '../auth/session';

export interface ServerNotification {
  id: string;
  userId?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  category: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface ServerNotificationsResponse {
  page: number;
  pageSize: number;
  total: number;
  unread: number;
  data: ServerNotification[];
}

export async function listNotifications(opts?: {
  unread?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ServerNotificationsResponse> {
  const params = new URLSearchParams();
  if (opts?.unread !== undefined) params.set('unread', String(opts.unread));
  if (opts?.page !== undefined) params.set('page', String(opts.page));
  if (opts?.pageSize !== undefined) params.set('pageSize', String(opts.pageSize));
  const qs = params.toString();
  return apiRequest<ServerNotificationsResponse>(
    `/notifications${qs ? `?${qs}` : ''}`,
    {
      method: 'GET',
      token: session.getToken(),
    },
  );
}

export function markNotificationRead(
  id: string,
): Promise<{ id: string; read: boolean }> {
  return apiRequest<{ id: string; read: boolean }>(
    `/notifications/${encodeURIComponent(id)}/read`,
    {
      method: 'POST',
      token: session.getToken(),
    },
  );
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiRequest<{ updated: number }>('/notifications/read-all', {
    method: 'POST',
    token: session.getToken(),
  });
}
