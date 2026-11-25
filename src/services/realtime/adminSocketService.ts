import { io, type Socket } from 'socket.io-client';
import { apiUrl } from '../api/apiConfig';
import { session } from '../auth/session';

function resolveSocketBaseUrl(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit && explicit.trim()) return explicit.trim().replace(/\/+$/, '');
  return apiUrl.replace(/\/api\/v1\/?$/i, '').replace(/\/+$/, '');
}

type Listener = (payload: any) => void;

class AdminSocketService {
  private socket: Socket | null = null;
  private activeToken: string | null = null;
  private listeners = new Map<string, Set<Listener>>();

  get connected(): boolean {
    return Boolean(this.socket?.connected);
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  ensureConnected(explicitToken?: string | null): Socket | null {
    const token = (explicitToken ?? session.getToken() ?? '').trim();
    if (!token) return null;

    if (this.socket && this.activeToken === token) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.activeToken = token;
    const url = resolveSocketBaseUrl();
    const socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 15000,
    });

    for (const [event, handlers] of this.listeners.entries()) {
      for (const handler of handlers) {
        socket.on(event, handler);
      }
    }

    this.socket = socket;
    return socket;
  }

  emit(event: string, payload?: unknown): void {
    if (!this.socket?.connected) return;
    if (payload === undefined) {
      this.socket.emit(event);
    } else {
      this.socket.emit(event, payload);
    }
  }

  on(event: string, handler: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    this.socket?.on(event, handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
      this.socket?.off(event, handler);
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.activeToken = null;
  }
}

export const adminSocketService = new AdminSocketService();
