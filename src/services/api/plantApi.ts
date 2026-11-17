import { apiRequest } from './apiConfig';
import { session } from '../auth/session';
import type { BackendOrderDetail } from './ordersApi';

// Proceso en planta contra el servidor: pesaje (solo servicio por peso), ajustes de precio,
// fijación del precio final y avance de lavado y control de calidad.

export const GRAMS_PER_POUND = 453.59237;

export type AdjustmentType = 'SERVICE_RECLASSIFICATION' | 'EXTRA_ITEM' | 'PRICE_ADJUSTMENT';

export const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string }[] = [
  { value: 'EXTRA_ITEM', label: 'Prenda o servicio extra' },
  { value: 'SERVICE_RECLASSIFICATION', label: 'Cambio de servicio' },
  { value: 'PRICE_ADJUSTMENT', label: 'Ajuste de precio' },
];

export interface StaffAdjustment {
  id: string;
  type: AdjustmentType | 'WEIGHT_ADJUSTMENT';
  internalReason?: string;
  customerMessage: string;
  amountDifference: string | number;
  requiresCustomerApproval: boolean;
  status: 'PENDING_CUSTOMER' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

/** Detalle de la solicitud tal como lo entrega el servidor, con lo pagado y el saldo. */
export type PlantOrder = BackendOrderDetail & {
  pricingModel?: 'FIXED' | 'PER_WEIGHT';
  pricingStatus?: string;
  estimatedWeightLb?: string | number | null;
  amountPaid?: string | number;
  amountDue?: string | number;
  paymentMethodKind?: 'WALLET' | 'CARD' | 'TRANSFER' | null;
};

const request = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, {
    method,
    token: session.getToken(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const getPlantOrder = (orderId: string) => request<PlantOrder>(`/orders/${orderId}`, 'GET');

export const advance = (orderId: string, to: string, expectedVersion: number, note?: string) =>
  request<PlantOrder>(`/orders/${orderId}/transitions`, 'POST', { to, expectedVersion, note });

export const recordWeight = (orderId: string, weightGrams: number, expectedVersion: number) =>
  request<PlantOrder>(`/orders/${orderId}/weight`, 'POST', { weightGrams, expectedVersion });

export async function listAdjustments(orderId: string): Promise<StaffAdjustment[]> {
  return (await request<StaffAdjustment[]>(`/orders/${orderId}/adjustments`, 'GET')) ?? [];
}

export const createAdjustment = (
  orderId: string,
  data: {
    type: AdjustmentType;
    internalReason: string;
    customerMessage: string;
    amountDifference: number;
    expectedVersion: number;
  },
) => request<StaffAdjustment>(`/orders/${orderId}/adjustments`, 'POST', data);

export const resolvePricing = (orderId: string, expectedVersion: number) =>
  request<PlantOrder>(`/orders/${orderId}/pricing/resolve`, 'POST', { expectedVersion });

// Cierra la solicitud entregada; el servidor exige que no quede saldo pendiente.
export const completeOrder = (orderId: string, expectedVersion: number) =>
  request<PlantOrder>(`/orders/${orderId}/complete`, 'POST', { expectedVersion });

export const confirmPayment = (orderId: string, expectedVersion: number, note?: string) =>
  request<PlantOrder>(`/orders/${orderId}/confirm-payment`, 'POST', { expectedVersion, note });

// ---------------------------------------------------------------- Validación

/** Libras escritas por la sede a gramos para el servidor. */
export function poundsToGrams(raw: string): number {
  const lb = Number(raw.replace(',', '.'));
  if (!raw.trim() || !Number.isFinite(lb) || lb <= 0) throw Error('Ingresa el peso en libras, mayor a cero.');
  if (!/^\d+([.,]\d{1,2})?$/.test(raw.trim())) throw Error('Usa hasta 2 decimales.');
  if (lb > 500) throw Error('El peso no puede superar 500 libras.');
  return Math.round(lb * GRAMS_PER_POUND);
}

export function validateAdjustment(form: {
  internalReason: string;
  customerMessage: string;
  amount: string;
}) {
  const errors: Partial<Record<keyof typeof form, string>> = {};
  if (!form.internalReason.trim()) errors.internalReason = 'Explica el motivo para la sede.';
  if (!form.customerMessage.trim()) errors.customerMessage = 'Escribe el mensaje que verá el cliente.';
  const n = Number(form.amount.replace(',', '.'));
  if (!form.amount.trim() || !Number.isFinite(n) || n === 0)
    errors.amount = 'Ingresa el monto: positivo cobra más, negativo descuenta.';
  else if (!/^-?\d+([.,]\d{1,2})?$/.test(form.amount.trim())) errors.amount = 'Usa hasta 2 decimales.';
  return errors;
}

// Pasos del proceso en planta, en el orden del servidor.
export const PLANT_STATUSES = [
  'AT_FACILITY',
  'WEIGHING',
  'INSPECTION',
  'PRICING_PENDING',
  'CUSTOMER_APPROVAL_PENDING',
  'IN_PROCESS',
  'QUALITY_CONTROL',
] as const;
