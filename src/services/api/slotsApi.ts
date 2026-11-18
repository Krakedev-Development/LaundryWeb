import { apiRequest } from './apiConfig';
import { session } from '../auth/session';

// Franjas horarias con cupo. Viven en el servidor: la app del cliente reserva sobre estas
// mismas franjas y el servidor descuenta o libera los cupos con cada solicitud.

export type SlotContext = 'DRIVER_PICKUP' | 'DRIVER_DELIVERY' | 'FACILITY_PICKUP';

export const SLOT_CONTEXTS: { value: SlotContext; label: string }[] = [
  { value: 'DRIVER_PICKUP', label: 'Recogida a domicilio' },
  { value: 'DRIVER_DELIVERY', label: 'Entrega a domicilio' },
  { value: 'FACILITY_PICKUP', label: 'Retiro en sede' },
];

export const contextLabel = (c: SlotContext) =>
  SLOT_CONTEXTS.find((x) => x.value === c)?.label ?? c;

export interface Slot {
  id: string;
  facilityId: string;
  context: SlotContext;
  date: string; // AAAA-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  capacity: number;
  reservedCount: number;
  available: number;
  active: boolean;
}

export interface SlotQuery {
  facilityId: string;
  context: SlotContext;
  from?: string;
  to?: string;
}

export interface NewSlot {
  facilityId: string;
  context: SlotContext;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

const request = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, {
    method,
    token: session.getToken(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// El personal recibe todas las franjas (también llenas o inactivas) con capacidad y reservas.
export async function listSlots(q: SlotQuery): Promise<Slot[]> {
  const params = new URLSearchParams({
    facilityId: q.facilityId,
    context: q.context,
    onlyAvailable: 'false',
  });
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  return (await request<Slot[]>(`/slots?${params}`, 'GET')) ?? [];
}

export const createSlot = (data: NewSlot) => request<Slot>('/slots', 'POST', data);

export const updateSlot = (id: string, data: { capacity?: number; active?: boolean }) =>
  request<Slot>(`/slots/${id}`, 'PATCH', data);

// ---------------------------------------------------------------- Plantilla semanal

// El servidor mantiene creadas, a partir de la plantilla, las franjas de los próximos días.
export const TEMPLATE_HORIZON_DAYS = 28;

export const WEEKDAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
];
export const weekdayLabel = (d: number) => WEEKDAYS.find((w) => w.value === d)?.label ?? String(d);

export interface SlotTemplate {
  id: string;
  facilityId: string;
  context: SlotContext;
  weekday: number;
  startTime: string;
  endTime: string;
  capacity: number;
  active: boolean;
}

export interface GenerationResult {
  created: number;
  existing: number;
  conflicts: number;
  horizonDays: number;
  until: string | null;
  skippedReason?: string;
}

export async function listSlotTemplates(facilityId: string, context: SlotContext) {
  const params = new URLSearchParams({ facilityId, context });
  return (await request<SlotTemplate[]>(`/slot-templates?${params}`, 'GET')) ?? [];
}

export const createSlotTemplate = (data: Omit<SlotTemplate, 'id' | 'active'>) =>
  request<SlotTemplate & { generated: GenerationResult }>('/slot-templates', 'POST', data);

export const updateSlotTemplate = (id: string, data: { capacity?: number; active?: boolean }) =>
  request<SlotTemplate & { generated: GenerationResult | null }>(`/slot-templates/${id}`, 'PATCH', data);

export const generateSlots = (facilityId: string) =>
  request<GenerationResult>('/slot-templates/generate', 'POST', { facilityId });

export function describeGeneration(r: GenerationResult): string {
  if (r.skippedReason) return r.skippedReason;
  const parts = [
    r.created === 1 ? '1 franja creada' : `${r.created} franjas creadas`,
  ];
  if (r.conflicts)
    parts.push(
      r.conflicts === 1
        ? '1 omitida por solaparse con otra existente'
        : `${r.conflicts} omitidas por solaparse con otras existentes`,
    );
  return parts.join(' · ');
}

export interface TemplateForm {
  weekdays: number[];
  startTime: string;
  endTime: string;
  capacity: string;
}

export function validateTemplateForm(form: TemplateForm) {
  const errors: Partial<Record<keyof TemplateForm, string>> = {};
  if (!form.weekdays.length) errors.weekdays = 'Elige al menos un día.';
  if (!TIME.test(form.startTime)) errors.startTime = 'Indica la hora de inicio.';
  if (!TIME.test(form.endTime)) errors.endTime = 'Indica la hora de fin.';
  else if (TIME.test(form.startTime) && form.startTime >= form.endTime)
    errors.endTime = 'Debe ser posterior a la hora de inicio.';
  const capacity = Number(form.capacity);
  if (form.capacity.trim() === '' || !Number.isInteger(capacity) || capacity < 1)
    errors.capacity = 'Los cupos deben ser un número entero mayor a cero.';
  return errors;
}

// ---------------------------------------------------------------- Fechas

export const AGENDA_TIMEZONE = 'America/Guayaquil';
export const MAX_REPEAT_DAYS = 31;

// Día calendario actual en la zona horaria de la operación (AAAA-MM-DD).
export function todayInAgenda(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AGENDA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Fechas desde `from` hasta `until` (incluidas), o solo `from` si no hay repetición.
export function datesBetween(from: string, until?: string): string[] {
  if (!until || until <= from) return [from];
  const out: string[] = [];
  for (let d = from; d <= until && out.length < MAX_REPEAT_DAYS; d = addDays(d, 1)) out.push(d);
  return out;
}

const DAY_ABBR = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export function formatSlotDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  const [y, m, day] = ymd.split('-');
  return `${DAY_ABBR[d.getUTCDay()]} ${day}/${m}/${y}`;
}

// ---------------------------------------------------------------- Validación

export interface SlotForm {
  facilityId: string;
  context: SlotContext;
  date: string;
  until: string;
  startTime: string;
  endTime: string;
  capacity: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Mismas reglas que el servidor, con mensajes para el formulario.
export function validateSlotForm(form: SlotForm, today = todayInAgenda()) {
  const errors: Partial<Record<keyof SlotForm, string>> = {};
  if (!form.facilityId) errors.facilityId = 'Elige la sede.';
  if (!DATE.test(form.date)) errors.date = 'Elige la fecha.';
  else if (form.date < today) errors.date = 'No se pueden crear franjas en el pasado.';
  if (form.until) {
    if (!DATE.test(form.until)) errors.until = 'La fecha final no es válida.';
    else if (DATE.test(form.date) && form.until < form.date)
      errors.until = 'Debe ser igual o posterior a la fecha de inicio.';
    else if (DATE.test(form.date) && form.until > addDays(form.date, MAX_REPEAT_DAYS - 1))
      errors.until = `Puedes repetir hasta ${MAX_REPEAT_DAYS} días de una vez.`;
  }
  if (!TIME.test(form.startTime)) errors.startTime = 'Indica la hora de inicio.';
  if (!TIME.test(form.endTime)) errors.endTime = 'Indica la hora de fin.';
  else if (TIME.test(form.startTime) && form.startTime >= form.endTime)
    errors.endTime = 'Debe ser posterior a la hora de inicio.';
  const capacity = Number(form.capacity);
  if (form.capacity.trim() === '' || !Number.isInteger(capacity) || capacity < 1)
    errors.capacity = 'Los cupos deben ser un número entero mayor a cero.';
  return errors;
}

export function validateCapacity(value: string, reservedCount: number) {
  const capacity = Number(value);
  if (value.trim() === '' || !Number.isInteger(capacity) || capacity < 1)
    return 'Los cupos deben ser un número entero mayor a cero.';
  if (capacity < reservedCount)
    return `No puede ser menor que los cupos ya reservados (${reservedCount}).`;
  return undefined;
}
