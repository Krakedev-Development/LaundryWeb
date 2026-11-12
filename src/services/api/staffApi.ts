import { session } from '../auth/session';
import { apiRequest } from './apiConfig';

export type StaffRole = 'SUPERVISOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PASSWORD_CHANGE_REQUIRED';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  status: AccountStatus;
  facility: { id: string; name: string } | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface NewSupervisor {
  name: string;
  email: string;
  phone: string;
  facilityId: string;
  temporaryPassword: string;
}

// Mismas reglas que el servidor, para avisar antes de enviar.
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,12}$/;
export const PASSWORD_HINT = 'Entre 8 y 12 caracteres, con al menos una letra y un número.';
export const NAME_MAX = 50;
export const EMAIL_MAX = 50;
export const PASSWORD_MAX = 12;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RULE = /^0\d{9}$/;

export type SupervisorErrors = Partial<Record<keyof NewSupervisor, string>>;

export function passwordError(value: string): string | undefined {
  if (!value) return 'Escribe una contraseña temporal.';
  if (value.length < 8 || value.length > PASSWORD_MAX)
    return 'Debe tener entre 8 y 12 caracteres.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value))
    return 'Debe incluir al menos una letra y un número.';
  return undefined;
}

// Errores por campo del alta de supervisor; vacío si todo es válido.
export function validateSupervisor(d: NewSupervisor): SupervisorErrors {
  const errors: SupervisorErrors = {};
  const name = d.name.trim();
  const email = d.email.trim();
  if (!name) errors.name = 'Escribe el nombre completo.';
  else if (name.length > NAME_MAX) errors.name = `Máximo ${NAME_MAX} caracteres.`;
  if (!email) errors.email = 'Escribe el correo.';
  else if (email.length > EMAIL_MAX) errors.email = `Máximo ${EMAIL_MAX} caracteres.`;
  else if (!EMAIL_RULE.test(email)) errors.email = 'Ingresa un correo válido, por ejemplo nombre@dominio.com.';
  if (!PHONE_RULE.test(d.phone))
    errors.phone = 'Debe tener 10 dígitos y empezar por 0, por ejemplo 0991234567.';
  if (!d.facilityId) errors.facilityId = 'Selecciona la sede.';
  const password = passwordError(d.temporaryPassword);
  if (password) errors.temporaryPassword = password;
  return errors;
}

const auth = () => ({ token: session.getToken() });

export function listStaff(): Promise<StaffMember[]> {
  return apiRequest<StaffMember[]>('/users/staff', auth());
}

export function createSupervisor(data: NewSupervisor) {
  return apiRequest<{ id: string }>('/users/staff', {
    ...auth(),
    method: 'POST',
    body: JSON.stringify({ ...data, role: 'SUPERVISOR' }),
  });
}

export function setAccountStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string) {
  return apiRequest<{ status: AccountStatus }>(`/users/${id}/status`, {
    ...auth(),
    method: 'PATCH',
    body: JSON.stringify({ status, ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
  });
}

export function resetTemporaryPassword(id: string, temporaryPassword: string) {
  return apiRequest<{ status: AccountStatus }>(`/users/${id}/reset-password`, {
    ...auth(),
    method: 'POST',
    body: JSON.stringify({ temporaryPassword }),
  });
}
