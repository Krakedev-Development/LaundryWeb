import { apiRequest } from './apiConfig';
import { session } from '../auth/session';

export type ChatSenderRole = 'CLIENT' | 'DRIVER' | 'SUPERVISOR' | 'ADMIN';

export interface BackendChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: ChatSenderRole;
  text: string;
  createdAt: string;
}

export function mergeChatMessages(
  existing: BackendChatMessage[],
  incoming: BackendChatMessage[],
): BackendChatMessage[] {
  const map = new Map<string, BackendChatMessage>();
  for (const m of existing) {
    if (m?.id) map.set(m.id, m);
  }
  for (const m of incoming) {
    if (m?.id) map.set(m.id, m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function listOrderMessages(
  orderId: string,
  opts?: { after?: string; limit?: number },
): Promise<BackendChatMessage[]> {
  const params = new URLSearchParams();
  if (opts?.after) params.set('after', opts.after);
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const rows = await apiRequest<BackendChatMessage[]>(
    `/orders/${encodeURIComponent(orderId)}/messages${qs ? `?${qs}` : ''}`,
    {
      method: 'GET',
      token: session.getToken(),
    },
  );
  return Array.isArray(rows) ? rows : [];
}

export function sendOrderMessage(
  orderId: string,
  text: string,
): Promise<BackendChatMessage> {
  return apiRequest<BackendChatMessage>(
    `/orders/${encodeURIComponent(orderId)}/messages`,
    {
      method: 'POST',
      token: session.getToken(),
      body: JSON.stringify({ text: text.trim() }),
    },
  );
}
