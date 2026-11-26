import { io, type Socket } from 'socket.io-client';
import { apiUrl, renewToken } from '../api/apiConfig';
import { session } from '../auth/session';

function resolveSocketBaseUrl(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit && explicit.trim()) return explicit.trim().replace(/\/+$/, '');
  return apiUrl.replace(/\/api\/v1\/?$/i, '').replace(/\/+$/, '');
}

type Listener = (payload: any) => void;

/** Aviso local (no viene del servidor): el socket volvió a autenticarse tras un corte. */
export const SOCKET_RESYNC_EVENT = 'local:resync';

// Una sola conexión para toda la web. El token de acceso dura poco (15 min): cada intento de
// conexión lee el vigente y, si el servidor lo rechaza, se renueva y se vuelve a intentar. Así un
// corte (reinicio del backend, red, suspensión del equipo) no deja la web sin avisos hasta recargar.
class AdminSocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private authenticatedOnce = false;
  private renewing = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelayMs = 1500;
  private windowHooks = false;

  get connected(): boolean {
    return Boolean(this.socket?.connected);
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  ensureConnected(): Socket | null {
    if (!session.getToken()) return null;
    this.bindWindowHooks();

    if (this.socket) {
      if (!this.socket.connected && !this.renewing) this.socket.connect();
      return this.socket;
    }

    const socket = io(resolveSocketBaseUrl(), {
      // Función: se evalúa en cada conexión y reconexión, con el token vigente.
      auth: (cb) => cb({ token: session.getToken() ?? '' }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 15000,
    });

    for (const [event, handlers] of this.listeners.entries()) {
      for (const handler of handlers) socket.on(event, handler);
    }

    socket.on('authenticated', () => {
      this.retryDelayMs = 1500;
      if (this.authenticatedOnce) this.dispatchLocal(SOCKET_RESYNC_EVENT, undefined);
      this.authenticatedOnce = true;
    });
    // Token vencido o inválido: el servidor desconecta y Socket.IO no reintenta solo.
    socket.on('authentication_error', () => void this.renewAndReconnect());
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') void this.renewAndReconnect();
    });

    this.socket = socket;
    return socket;
  }

  private async renewAndReconnect(): Promise<void> {
    if (this.renewing || !this.socket) return;
    this.renewing = true;
    try {
      await renewToken();
    } finally {
      this.renewing = false;
    }
    // Sin sesión (se cerró al fallar la renovación) no se insiste.
    if (!session.getToken() || !this.socket) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const delay = this.retryDelayMs;
    this.retryDelayMs = Math.min(this.retryDelayMs * 2, 15000);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.socket && !this.socket.connected) this.socket.connect();
    }, delay);
  }

  // Al volver a la pestaña o recuperar la red se reconecta enseguida, sin esperar el backoff.
  private bindWindowHooks(): void {
    if (this.windowHooks || typeof window === 'undefined') return;
    this.windowHooks = true;
    const wake = () => {
      if (document.visibilityState === 'visible' && this.socket && !this.socket.connected)
        this.ensureConnected();
    };
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
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
    if (event !== SOCKET_RESYNC_EVENT) this.socket?.on(event, handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
      this.socket?.off(event, handler);
    };
  }

  private dispatchLocal(event: string, payload: unknown): void {
    for (const handler of this.listeners.get(event) ?? []) handler(payload);
  }

  disconnect(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.authenticatedOnce = false;
  }
}

export const adminSocketService = new AdminSocketService();

// Al cerrar sesión se corta la conexión: la siguiente cuenta abre la suya con su propio token.
session.subscribe(() => {
  if (session.getStatus() === 'signed-out') adminSocketService.disconnect();
});
