import { listOrders, getOrder, assignDriver, type BackendOrderDetail } from './ordersApi';
import { listDrivers, type BackendDriver } from './driversApi';
import { ApiError } from './apiConfig';
import { eligibilityReasons } from '../geo/DispatchService';

// Entregas a domicilio contra el servidor. La salida a ruta y la confirmación con el cliente
// pasan por custodia (handoffs), no por botones locales. El personal asigna chofer; la franja
// la programa el cliente (PUT /outbound es solo CLIENT).

export const DELIVERY_STATUSES = [
  'READY_FOR_DELIVERY',
  'DELIVERY_ASSIGNED',
  'OUT_FOR_DELIVERY',
  'ARRIVED_FOR_DELIVERY',
  'DELIVERED',
] as const;

export type DeliveryServerStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABEL: Record<DeliveryServerStatus, string> = {
  READY_FOR_DELIVERY: 'Lista para entrega',
  DELIVERY_ASSIGNED: 'Chofer asignado',
  OUT_FOR_DELIVERY: 'En ruta',
  ARRIVED_FOR_DELIVERY: 'En domicilio',
  DELIVERED: 'Entregada',
};

export interface DeliveryRow {
  id: string;
  number: number;
  status: DeliveryServerStatus;
  mode: 'HOME_HOME' | 'HOME_STORE';
  version: number;
  facilityId: string;
  customerName: string;
  customerPhone: string;
  addressText: string;
  scheduledDate: string | null;
  slotLabel: string;
  slotId: string | null;
  driverId: string | null;
  driverName: string | null;
  paymentStatus: string;
  trackingNumber: string;
}

const isDeliveryStatus = (s: string): s is DeliveryServerStatus =>
  (DELIVERY_STATUSES as readonly string[]).includes(s);

function slotLabel(leg: NonNullable<BackendOrderDetail['legs']>[number] | undefined): string {
  if (!leg?.slot) return 'Sin franja';
  return `${leg.slot.startTime} - ${leg.slot.endTime}`;
}

function customerNameOf(raw: BackendOrderDetail): string {
  return (
    (raw as { customer?: { user?: { name?: string | null } | null } | null }).customer?.user?.name ??
    `Cliente #${String(raw.number).padStart(4, '0')}`
  );
}

function customerPhoneOf(raw: BackendOrderDetail): string {
  return (
    (raw as { customer?: { user?: { phone?: string | null } | null } | null }).customer?.user?.phone ??
    ''
  );
}

export function mapOrderToDeliveryRow(
  raw: BackendOrderDetail,
  drivers: BackendDriver[] = [],
): DeliveryRow | null {
  if (!isDeliveryStatus(raw.status)) return null;
  const outbound = raw.legs?.find((l) => l.kind === 'OUTBOUND');
  // Esta pantalla es last-mile con chofer; el retiro en sede vive en Recepción y retiros.
  if (raw.mode !== 'HOME_HOME' || outbound?.method !== 'DRIVER') return null;

  const driverId = outbound?.driverId ?? null;
  const driver =
    drivers.find((d) => d.id === driverId) ??
    (outbound?.driver as { user?: { name?: string } } | null | undefined);

  return {
    id: raw.id,
    number: raw.number,
    status: raw.status,
    mode: raw.mode,
    version: raw.version,
    facilityId: raw.facilityId,
    customerName: customerNameOf(raw),
    customerPhone: customerPhoneOf(raw),
    addressText: outbound?.addressText ?? '',
    scheduledDate: outbound?.scheduledDate ?? outbound?.slot?.date ?? null,
    slotLabel: slotLabel(outbound),
    slotId: outbound?.slotId ?? null,
    driverId,
    driverName:
      (driver && 'name' in driver ? driver.name : null) ??
      (driver as { user?: { name?: string } } | null)?.user?.name ??
      null,
    paymentStatus: raw.paymentStatus,
    trackingNumber: `SOL-${String(raw.number).padStart(4, '0')}`,
  };
}

/** Carga las solicitudes de entrega a domicilio desde el servidor (sin localStorage). */
export async function fetchDeliveryRows(): Promise<DeliveryRow[]> {
  const [lists, drivers] = await Promise.all([
    Promise.all(DELIVERY_STATUSES.map((status) => listOrders({ status, pageSize: 100 }))),
    listDrivers().catch(() => [] as BackendDriver[]),
  ]);

  const seen = new Set<string>();
  const summaries = lists.flatMap((l) => l.data).filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  const details = await Promise.allSettled(summaries.map((s) => getOrder(s.id)));
  const rows: DeliveryRow[] = [];
  for (let i = 0; i < summaries.length; i++) {
    const settled = details[i];
    if (settled.status !== 'fulfilled') continue;
    const row = mapOrderToDeliveryRow(settled.value, drivers);
    if (row) rows.push(row);
  }

  rows.sort((a, b) => {
    const da = a.scheduledDate ?? '';
    const db = b.scheduledDate ?? '';
    if (da !== db) return da.localeCompare(db);
    return b.number - a.number;
  });
  return rows;
}

export async function fetchDeliveryDrivers(): Promise<BackendDriver[]> {
  return listDrivers();
}

/**
 * Asigna el chofer de entrega. Usa la lista de choferes que la pantalla ya cargó para armar la
 * fila (nombre del chofer): no la vuelve a pedir tras asignar (T-10).
 */
export async function assignDeliveryDriver(
  orderId: string,
  driverId: string,
  expectedVersion: number,
  drivers: BackendDriver[],
): Promise<DeliveryRow> {
  const updated = await assignDriver(orderId, {
    leg: 'OUTBOUND',
    driverId,
    expectedVersion,
  });
  const row = mapOrderToDeliveryRow(updated, drivers);
  if (!row) {
    throw new ApiError('La solicitud ya no está en una etapa de entrega a domicilio.', 409);
  }
  return row;
}

export function isScheduledToday(scheduledDate: string | null, now = new Date()): boolean {
  if (!scheduledDate) return false;
  const day = scheduledDate.slice(0, 10);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return day === `${y}-${m}-${d}`;
}

export function formatScheduleDate(scheduledDate: string | null, now = new Date()): string {
  if (!scheduledDate) return 'Sin fecha';
  const day = scheduledDate.slice(0, 10);
  if (isScheduledToday(scheduledDate, now)) return 'Hoy';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isScheduledToday(scheduledDate, tomorrow)) return 'Mañana';
  return new Date(`${day}T12:00:00`).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * Choferes que pueden recibir la entrega. Usa la misma regla que Despacho (`eligibilityReasons`:
 * estado, sede y capacidad) para que ninguna pantalla ofrezca un chofer que la otra excluye.
 * La ubicación no excluye: sin GPS reciente el chofer sigue siendo elegible.
 */
export function deliveryDriverOptions(
  drivers: BackendDriver[],
  facilityId: string | null | undefined,
  policy: { driverLimit?: number; enforceDriverLimit?: boolean } = {},
): { eligible: BackendDriver[]; excluded: { driver: BackendDriver; reasons: string[] }[] } {
  const eligible: BackendDriver[] = [];
  const excluded: { driver: BackendDriver; reasons: string[] }[] = [];
  for (const driver of drivers) {
    const reasons = eligibilityReasons(
      {
        id: driver.id,
        status: driver.status,
        coordinates: { lat: driver.latitude ?? NaN, lng: driver.longitude ?? NaN },
        updatedAt: driver.locationAt ?? '',
        facilityId: driver.facilityId,
        zoneId: '',
        activeOrders: driver.activeLegsCount ?? 0,
        maxOrders: policy.driverLimit ?? 8,
      },
      { id: '', coordinates: { lat: NaN, lng: NaN }, facilityId: facilityId ?? driver.facilityId, zoneId: '' },
      Date.now(),
      120,
      policy.enforceDriverLimit ?? false,
    );
    if (reasons.length) excluded.push({ driver, reasons });
    else eligible.push(driver);
  }
  return { eligible, excluded };
}
