import { useSyncExternalStore } from 'react';
import type { User, UserRole } from '../../types';
import { apiRequest, ApiError } from '../api/apiConfig';
import { storageService } from '../storage';

// Sesión contra la API. El token de acceso vive solo en memoria; el de renovación, en
// sessionStorage (se pierde al cerrar la pestaña).
const REFRESH_KEY = 'lw_refresh_token';
const WEB_ROLES: readonly string[] = ['ADMIN', 'SUPERVISOR'];

interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PASSWORD_CHANGE_REQUIRED';
  facilityId: string | null;
}
interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type SessionStatus =
  | 'checking'
  | 'signed-out'
  | 'password-change-required'
  | 'signed-in';

let accessToken: string | null = null;
let status: SessionStatus = 'checking';
const listeners = new Set<() => void>();
const setStatus = (next: SessionStatus) => {
  status = next;
  listeners.forEach((l) => l());
};

function toUser(u: ApiUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    avatar: '',
    facilityId: u.facilityId ?? undefined,
  };
}

function store(tokens: Tokens) {
  accessToken = tokens.accessToken;
  sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

function clear() {
  accessToken = null;
  sessionStorage.removeItem(REFRESH_KEY);
  storageService.clearSession();
}

// Aplica la cuenta a la aplicación o la rechaza si no es de la plataforma web.
function adopt(user: ApiUser) {
  if (!WEB_ROLES.includes(user.role)) {
    clear();
    setStatus('signed-out');
    throw new ApiError('Esta cuenta no tiene acceso a la plataforma web.', 403);
  }
  storageService.setCurrentUser(toUser(user));
  setStatus(
    user.status === 'PASSWORD_CHANGE_REQUIRED'
      ? 'password-change-required'
      : 'signed-in',
  );
}

export const session = {
  getStatus: () => status,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async login(email: string, password: string) {
    const res = await apiRequest<{ user: ApiUser; tokens: Tokens }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    store(res.tokens);
    adopt(res.user);
  },

  // La cuenta con contraseña temporal debe cambiarla antes de operar.
  async changePassword(currentPassword: string, newPassword: string) {
    const tokens = await apiRequest<Tokens>('/auth/change-password', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    store(tokens);
    adopt(await apiRequest<ApiUser>('/auth/me', { token: accessToken }));
  },

  // Al abrir la aplicación: recupera la sesión con el token de renovación guardado.
  async restore() {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      clear();
      setStatus('signed-out');
      return;
    }
    try {
      const tokens = await apiRequest<Tokens>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      store(tokens);
      adopt(await apiRequest<ApiUser>('/auth/me', { token: accessToken }));
    } catch {
      clear();
      setStatus('signed-out');
    }
  },

  async logout() {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    clear();
    setStatus('signed-out');
    if (refreshToken)
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
  },
};

export const useSessionStatus = () =>
  useSyncExternalStore(session.subscribe, session.getStatus);
