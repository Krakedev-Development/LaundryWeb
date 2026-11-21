import { ApiError, apiRequest } from './apiConfig';
import { session } from '../auth/session';
import type { BackendOrderDetail } from './ordersApi';

// Custodia contra el servidor. La sede valida el código que muestra el chofer (llegada a planta)
// y, en la fase de entrega, el que muestra el chofer al salir a reparto o el cliente al retirar.

export type HandoffType =
  | 'CUSTOMER_TO_DRIVER'
  | 'DRIVER_TO_FACILITY'
  | 'FACILITY_TO_DRIVER'
  | 'DRIVER_TO_CUSTOMER'
  | 'FACILITY_TO_CUSTOMER';

export interface HandoffRecord {
  id: string;
  type: HandoffType;
  status: 'PENDING' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED' | 'LOCKED';
  generation: number;
  expiresAt: string | null;
  usedAt: string | null;
  declaredCount: number | null;
  receivedCount: number | null;
}

export type CustodyInput = { code: string } | { qrToken: string };

const request = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, {
    method,
    token: session.getToken(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export async function listHandoffs(orderId: string): Promise<HandoffRecord[]> {
  return (await request<HandoffRecord[]>(`/orders/${orderId}/handoffs`, 'GET')) ?? [];
}

export const verifyHandoff = (
  orderId: string,
  payload: {
    type: HandoffType;
    expectedVersion: number;
    receivedCount?: number;
    recipientName?: string;
    recipientRelationship?: string;
    notes?: string;
  } & CustodyInput,
) => request<BackendOrderDetail>(`/orders/${orderId}/handoffs/verify`, 'POST', payload);

/** Revoca un traspaso pendiente/activo (personal de sede). */
export const revokeHandoff = (handoffId: string, reason: string) =>
  request<unknown>(`/handoffs/${handoffId}/revoke`, 'POST', { reason });

/** Prendas que el chofer declaró al recoger (traspaso del cliente ya usado). */
export const declaredAtPickup = (rows: HandoffRecord[]) =>
  rows.find((h) => h.type === 'CUSTOMER_TO_DRIVER' && h.status === 'USED')?.declaredCount ?? null;

export const CODE_REQUIRED_MESSAGE = 'Escribe el código de 6 dígitos del chofer o escanea su QR.';

/**
 * Interpreta lo escrito, pegado o leído con cámara o lector USB. El QR de la app tiene el formato
 * LDH1:<solicitud>:<tipo>:<token> (LaundryDriver/src/features/driver/model/custody.ts).
 */
export function parseCustodyInput(
  raw: string,
  orderId: string,
  type: HandoffType,
  who: 'del chofer' | 'del cliente' = 'del chofer',
): CustodyInput {
  const value = raw.trim();
  if (/^\d{6}$/.test(value)) return { code: value };
  const qr = value.match(/^LDH1:([^:]+):([A-Z_]+):(.{16,128})$/);
  if (qr) {
    if (qr[1] !== orderId) throw Error('Este QR pertenece a otra solicitud.');
    if (qr[2] !== type) throw Error('Este QR no corresponde a esta etapa del servicio.');
    return { qrToken: qr[3] };
  }
  throw Error(CODE_REQUIRED_MESSAGE.replace('del chofer', who));
}

/** Valida las prendas recibidas frente a las declaradas; una diferencia exige explicación. */
export function validateReception(received: string, declared: number | null, notes: string) {
  const errors: { received?: string; notes?: string } = {};
  const n = Number(received);
  if (received.trim() === '' || !Number.isInteger(n) || n < 0)
    errors.received = 'Ingresa cuántas prendas recibes.';
  else if (declared !== null && n !== declared && !notes.trim())
    errors.notes = `Recibes ${n} y se declararon ${declared}: explica la diferencia.`;
  return errors;
}

const HANDOFF_TYPES: HandoffType[] = [
  'CUSTOMER_TO_DRIVER',
  'DRIVER_TO_FACILITY',
  'FACILITY_TO_DRIVER',
  'DRIVER_TO_CUSTOMER',
  'FACILITY_TO_CUSTOMER',
];

/** `?traspaso=` de la URL: solo se acepta un tipo conocido. */
export const parseHandoffType = (value: string | null): HandoffType | '' =>
  HANDOFF_TYPES.includes(value as HandoffType) ? (value as HandoffType) : '';

/**
 * Mensaje para un error al validar la custodia (contrato 4). El 423 significa que el traspaso
 * quedó bloqueado por intentos fallidos: hace falta un código nuevo, no reintentar el mismo.
 */
export function custodyErrorMessage(e: unknown, who: 'del chofer' | 'del cliente' = 'del chofer'): string {
  if (e instanceof ApiError) {
    if (e.status === 423)
      return `${e.message} Pide ${who === 'del cliente' ? 'al cliente' : 'al chofer'} que genere un código nuevo en su app.`;
    if (e.status === 0)
      return 'No se pudo conectar con el servidor. No se registró ningún cambio; intenta de nuevo.';
    if (e.status === 409)
      return 'La solicitud cambió mientras validabas. Ya se actualizó: revisa los datos y vuelve a confirmar.';
  }
  return e instanceof Error ? e.message : 'No se pudo completar la operación. Intenta de nuevo.';
}
