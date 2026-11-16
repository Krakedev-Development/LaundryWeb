import { ApiError, apiRequest } from './apiConfig';
import { session } from '../auth/session';

// Política de negocio: vive en el servidor y se versiona. Cada cambio publica una versión nueva
// y las solicitudes ya creadas conservan la versión con la que se crearon.

export const NUMBER_FIELDS = [
  'minimumOrderAmount',
  'taxRate',
  'pickupFee',
  'deliveryFee',
  'pricePerPound',
  'cutoffMinutes',
  'lateCancellationFee',
  'noShowFee',
  'failedPickupFee',
  'driverLimit',
  'kycMaxResubmissions',
  'handoffMaxAttempts',
  'handoffTtlMinutes',
  'pointsPerCurrencyUnit',
  'walletTopUpMin',
  'walletTopUpMax',
] as const;
export type NumberField = (typeof NUMBER_FIELDS)[number];

export const FLAG_FIELDS = [
  'taxIncluded',
  'blockNewOrdersOnCharges',
  'enforceDriverLimit',
  'driverMayReorder',
  'requireStorePickupSlot',
] as const;
export type FlagField = (typeof FLAG_FIELDS)[number];

export type Policy = {
  id: string;
  version: number;
  active: boolean;
  timezone: string;
  reason: string | null;
  createdAt: string;
} & Record<NumberField, number | null> &
  Record<FlagField, boolean | null>;

type RawPolicy = Omit<Policy, NumberField> & Record<NumberField, number | string | null>;

const toPolicy = (raw: RawPolicy): Policy => {
  const out = { ...raw } as unknown as Policy;
  for (const k of NUMBER_FIELDS) {
    const v = raw[k];
    out[k] = v === null || v === undefined || v === '' ? null : Number(v);
  }
  return out;
};

const request = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, {
    method,
    token: session.getToken(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// Devuelve null si todavía no hay ninguna política publicada.
export async function getActivePolicy(): Promise<Policy | null> {
  try {
    return toPolicy(await request<RawPolicy>('/policy', 'GET'));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getPolicyHistory(): Promise<Policy[]> {
  return ((await request<RawPolicy[]>('/policy/history', 'GET')) ?? []).map(toPolicy);
}

export type PolicyInput = {
  timezone: string;
  reason: string;
} & Partial<Record<NumberField, number>> &
  Record<FlagField, boolean>;

export async function publishPolicy(input: PolicyInput): Promise<Policy> {
  return toPolicy(await request<RawPolicy>('/policy', 'POST', input));
}

// ---------------------------------------------------------------- Formulario

// El IVA se edita en porcentaje (15) y viaja como fracción (0.15).
export type PolicyForm = {
  timezone: string;
  reason: string;
} & Record<NumberField, string> &
  Record<FlagField, boolean>;

export function formFromPolicy(p: Policy | null): PolicyForm {
  const form = {
    timezone: p?.timezone ?? 'America/Guayaquil',
    reason: '',
  } as PolicyForm;
  for (const k of NUMBER_FIELDS) {
    const v = p?.[k];
    form[k] =
      v === null || v === undefined
        ? ''
        : k === 'taxRate'
          ? String(Math.round(v * 10000) / 100)
          : String(v);
  }
  for (const k of FLAG_FIELDS) form[k] = Boolean(p?.[k]);
  return form;
}

// Decimales que acepta el servidor para cada número; los enteros no admiten decimales.
const DECIMALS: Record<NumberField, number> = {
  minimumOrderAmount: 2,
  taxRate: 2, // en porcentaje: 15.25 % -> 0.1525
  pickupFee: 2,
  deliveryFee: 2,
  pricePerPound: 4,
  cutoffMinutes: 0,
  lateCancellationFee: 2,
  noShowFee: 2,
  failedPickupFee: 2,
  driverLimit: 0,
  kycMaxResubmissions: 0,
  handoffMaxAttempts: 0,
  handoffTtlMinutes: 0,
  pointsPerCurrencyUnit: 2,
  walletTopUpMin: 2,
  walletTopUpMax: 2,
};
const MIN_ONE: NumberField[] = ['driverLimit', 'handoffMaxAttempts', 'handoffTtlMinutes'];

export function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Mismas reglas que el servidor, con mensajes para el formulario.
export function validatePolicyForm(form: PolicyForm) {
  const errors: Partial<Record<keyof PolicyForm, string>> = {};
  if (!form.timezone.trim()) errors.timezone = 'Indica la zona horaria.';
  else if (!isValidTimezone(form.timezone.trim()))
    errors.timezone = 'Zona horaria inválida. Ej: America/Guayaquil.';
  if (!form.reason.trim()) errors.reason = 'Explica el motivo del cambio.';
  else if (form.reason.trim().length > 500) errors.reason = 'Máximo 500 caracteres.';
  for (const k of NUMBER_FIELDS) {
    const raw = form[k].trim();
    if (raw === '') continue;
    const n = Number(raw);
    const decimals = DECIMALS[k];
    if (!Number.isFinite(n) || n < 0) errors[k] = 'Debe ser un número mayor o igual a cero.';
    else if (decimals === 0 && !Number.isInteger(n)) errors[k] = 'Debe ser un número entero.';
    else if (decimals > 0 && !new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(raw))
      errors[k] = `Usa hasta ${decimals} decimales.`;
    else if (MIN_ONE.includes(k) && n < 1) errors[k] = 'Debe ser al menos 1.';
    else if (k === 'taxRate' && n > 100) errors[k] = 'El IVA no puede superar el 100 %.';
    else if (k === 'kycMaxResubmissions' && n > 10) errors[k] = 'Máximo 10 reenvíos.';
  }
  if (form.enforceDriverLimit && form.driverLimit.trim() === '' && !errors.driverLimit)
    errors.driverLimit = 'Define el límite para poder exigirlo.';
  const min = Number(form.walletTopUpMin);
  const max = Number(form.walletTopUpMax);
  if (
    form.walletTopUpMin.trim() !== '' &&
    form.walletTopUpMax.trim() !== '' &&
    !errors.walletTopUpMin &&
    !errors.walletTopUpMax &&
    min > max
  )
    errors.walletTopUpMax = 'La recarga máxima no puede ser menor que la mínima.';
  return errors;
}

export function inputFromForm(form: PolicyForm): PolicyInput {
  const input = { timezone: form.timezone.trim(), reason: form.reason.trim() } as PolicyInput;
  for (const k of NUMBER_FIELDS) {
    const raw = form[k].trim();
    if (raw === '') continue;
    input[k] = k === 'taxRate' ? Math.round(Number(raw) * 100) / 10000 : Number(raw);
  }
  for (const k of FLAG_FIELDS) input[k] = form[k];
  return input;
}

// Parámetros sin los cuales el servidor no puede crear solicitudes.
export const REQUIRED_FOR_ORDERS: { key: NumberField | FlagField; label: string }[] = [
  { key: 'taxRate', label: 'IVA' },
  { key: 'pickupFee', label: 'Cargo de recogida' },
  { key: 'deliveryFee', label: 'Cargo de entrega' },
];
