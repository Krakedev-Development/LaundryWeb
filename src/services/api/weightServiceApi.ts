import { apiRequest } from './apiConfig';
import { session } from '../auth/session';

// Servicio por peso: el cliente elige una bolsa y cada bolsa tiene su propio precio por libra.
// Las restricciones indican qué no se acepta en este servicio. Todo vive en el servidor.

export interface WeightTier {
  id: string;
  name: string;
  estimatedWeightLb: number;
  pricePerPound: number;
  sortOrder: number;
  active: boolean;
}

export interface WeightRestriction {
  id: string;
  text: string;
  sortOrder: number;
  active: boolean;
}

export interface WeightTierInput {
  name: string;
  estimatedWeightLb: number;
  pricePerPound: number;
  sortOrder: number;
}

export interface WeightRestrictionInput {
  text: string;
  sortOrder: number;
}

type Raw<T> = Omit<T, 'estimatedWeightLb' | 'pricePerPound'> & {
  estimatedWeightLb?: number | string;
  pricePerPound?: number | string;
};

const toTier = (raw: Raw<WeightTier>): WeightTier => ({
  ...raw,
  estimatedWeightLb: Number(raw.estimatedWeightLb) || 0,
  pricePerPound: Number(raw.pricePerPound) || 0,
});

const request = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, {
    method,
    token: session.getToken(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export async function listWeightTiers(): Promise<WeightTier[]> {
  const rows = await request<Raw<WeightTier>[]>('/catalog/weight-tiers', 'GET');
  return (rows ?? []).map(toTier);
}

export async function saveWeightTier(
  id: string | null,
  data: Partial<WeightTierInput> & { active?: boolean },
): Promise<WeightTier> {
  const row = id
    ? await request<Raw<WeightTier>>(`/catalog/weight-tiers/${id}`, 'PATCH', data)
    : await request<Raw<WeightTier>>('/catalog/weight-tiers', 'POST', data);
  return toTier(row);
}

export async function listWeightRestrictions(): Promise<WeightRestriction[]> {
  return (await request<WeightRestriction[]>('/catalog/weight-restrictions', 'GET')) ?? [];
}

export function saveWeightRestriction(
  id: string | null,
  data: Partial<WeightRestrictionInput> & { active?: boolean },
): Promise<WeightRestriction> {
  return id
    ? request<WeightRestriction>(`/catalog/weight-restrictions/${id}`, 'PATCH', data)
    : request<WeightRestriction>('/catalog/weight-restrictions', 'POST', data);
}

export const TIER_NAME_MAX = 40;
export const RESTRICTION_MAX = 200;

// Mismas reglas que el servidor, con mensajes para el formulario.
export function validateTier(form: {
  name: string;
  estimatedWeightLb: string;
  pricePerPound: string;
  sortOrder: string;
}) {
  const errors: Partial<Record<keyof typeof form, string>> = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Escribe el nombre de la bolsa.';
  else if (name.length > TIER_NAME_MAX)
    errors.name = `Máximo ${TIER_NAME_MAX} caracteres.`;
  const lb = Number(form.estimatedWeightLb);
  if (form.estimatedWeightLb.trim() === '' || !Number.isFinite(lb) || lb <= 0)
    errors.estimatedWeightLb = 'Ingresa las libras estimadas, mayores a cero.';
  else if (lb > 1000) errors.estimatedWeightLb = 'No puede superar 1000 libras.';
  else if (!/^\d+(\.\d{1,2})?$/.test(form.estimatedWeightLb.trim()))
    errors.estimatedWeightLb = 'Usa hasta 2 decimales.';
  const price = Number(form.pricePerPound);
  if (form.pricePerPound.trim() === '' || !Number.isFinite(price) || price <= 0)
    errors.pricePerPound = 'Ingresa el precio por libra, mayor a cero.';
  else if (!/^\d+(\.\d{1,4})?$/.test(form.pricePerPound.trim()))
    errors.pricePerPound = 'Usa hasta 4 decimales.';
  const order = Number(form.sortOrder);
  if (!Number.isInteger(order) || order < 0)
    errors.sortOrder = 'El orden debe ser un número entero desde 0.';
  return errors;
}

export function validateRestriction(form: { text: string; sortOrder: string }) {
  const errors: Partial<Record<keyof typeof form, string>> = {};
  const text = form.text.trim();
  if (!text) errors.text = 'Escribe la restricción.';
  else if (text.length > RESTRICTION_MAX)
    errors.text = `Máximo ${RESTRICTION_MAX} caracteres.`;
  const order = Number(form.sortOrder);
  if (!Number.isInteger(order) || order < 0)
    errors.sortOrder = 'El orden debe ser un número entero desde 0.';
  return errors;
}
