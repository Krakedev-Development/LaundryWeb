import { apiRequest } from './apiConfig';
import { session } from '../auth/session';
import type {
  Address,
  Customer,
  Driver,
  Facility,
  Order,
  OrderItem,
  OrderPriority,
  OrderStatus,
  OrderTimelineEvent,
  SLARisk,
} from '../../types';
import type { LegStatus, Milestone } from '../fulfillment';

export interface ListOrdersParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface BackendOrderSummary {
  id: string;
  number: number;
  status: string;
  mode: 'HOME_HOME' | 'HOME_STORE';
  facilityId: string;
  paymentStatus: string;
  pricingStatus: string;
  total: number | string;
  version: number;
  createdAt: string;
}

export interface ListOrdersResponse {
  page: number;
  pageSize: number;
  total: number;
  data: BackendOrderSummary[];
}

export interface BackendOrderItem {
  id: string;
  orderId: string;
  garmentId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number | string;
  notes?: string | null;
}

export interface BackendOrderExtra {
  id: string;
  orderId: string;
  extraId: string;
  price: number | string;
}

export interface BackendOrderLeg {
  id: string;
  orderId: string;
  kind: 'INBOUND' | 'OUTBOUND';
  method: 'DRIVER' | 'CUSTOMER';
  status: string;
  addressText: string;
  latitude: number | string;
  longitude: number | string;
  scheduledDate: string | null;
  slotId: string | null;
  slot?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    reservedCount: number;
  } | null;
  driverId: string | null;
  driver?: { userId: string } | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface BackendOrderEvent {
  id: string;
  orderId: string;
  status: string;
  title: string;
  description: string | null;
  actorId: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface BackendOrderDetail {
  id: string;
  number: number;
  customerId: string;
  facilityId: string;
  mode: 'HOME_HOME' | 'HOME_STORE';
  status: string;
  priority?: boolean;
  notes?: string | null;
  pricingModel: string;
  pricingStatus: string;
  paymentStatus: string;
  paymentMethodKind?: string | null;
  estimatedWeightLb?: number | null;
  pricePerPound?: number | string | null;
  itemsSubtotal: number | string;
  extrasTotal: number | string;
  discount: number | string;
  membershipDiscount: number | string;
  logisticsFee: number | string;
  tax: number | string;
  total: number | string;
  policyVersion: number;
  promotionId?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  items?: BackendOrderItem[];
  extras?: BackendOrderExtra[];
  legs?: BackendOrderLeg[];
  events?: BackendOrderEvent[];
}

export interface AssignDriverPayload {
  leg: 'INBOUND' | 'OUTBOUND';
  driverId: string;
  expectedVersion: number;
}

export interface TransitionOrderPayload {
  to: string;
  expectedVersion: number;
  note?: string;
}

export interface ConfirmPaymentPayload {
  expectedVersion: number;
  note?: string;
}

// ---------------------------------------------------------------- API Requests

export async function listOrders(
  params: ListOrdersParams = {},
): Promise<ListOrdersResponse> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.page != null) search.set('page', String(params.page));
  if (params.pageSize != null) search.set('pageSize', String(params.pageSize));

  const queryStr = search.toString();
  const path = `/orders${queryStr ? `?${queryStr}` : ''}`;

  const res = await apiRequest<
    ListOrdersResponse | BackendOrderSummary[] | { data?: BackendOrderSummary[] }
  >(path, {
    method: 'GET',
    token: session.getToken(),
  });

  if (Array.isArray(res)) {
    return { page: 1, pageSize: res.length, total: res.length, data: res };
  }
  if ('data' in res && Array.isArray(res.data)) {
    return {
      page: (res as ListOrdersResponse).page ?? 1,
      pageSize: (res as ListOrdersResponse).pageSize ?? res.data.length,
      total: (res as ListOrdersResponse).total ?? res.data.length,
      data: res.data,
    };
  }
  return { page: 1, pageSize: 0, total: 0, data: [] };
}

export async function getOrder(id: string): Promise<BackendOrderDetail> {
  return apiRequest<BackendOrderDetail>(`/orders/${id}`, {
    method: 'GET',
    token: session.getToken(),
  });
}

export async function assignDriver(
  orderId: string,
  payload: AssignDriverPayload,
): Promise<BackendOrderDetail> {
  return apiRequest<BackendOrderDetail>(`/orders/${orderId}/assign`, {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(payload),
  });
}

export async function transitionOrder(
  orderId: string,
  payload: TransitionOrderPayload,
): Promise<BackendOrderDetail> {
  return apiRequest<BackendOrderDetail>(`/orders/${orderId}/transitions`, {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(payload),
  });
}

export async function confirmOrderPayment(
  orderId: string,
  expectedVersion: number,
  note?: string,
): Promise<BackendOrderDetail> {
  const body: ConfirmPaymentPayload = { expectedVersion };
  if (note !== undefined && note.trim() !== '') {
    body.note = note.trim();
  }
  return apiRequest<BackendOrderDetail>(`/orders/${orderId}/confirm-payment`, {
    method: 'POST',
    token: session.getToken(),
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------- Mappers

const GYE_LAT = -2.1894;
const GYE_LNG = -79.8891;

type LegView = { status: LegStatus; milestone: Milestone };
const PLANT = ['AT_FACILITY', 'WEIGHING', 'INSPECTION', 'PRICING_PENDING', 'CUSTOMER_APPROVAL_PENDING', 'IN_PROCESS', 'QUALITY_CONTROL'];
const INBOUND: Record<string, Milestone> = {
  PICKUP_ASSIGNED: 'ASSIGNED',
  HEADING_TO_PICKUP: 'EN_ROUTE',
  ARRIVED_FOR_PICKUP: 'ARRIVED',
  PICKED_UP: 'COLLECTED',
  HEADING_TO_FACILITY: 'TO_FACILITY',
};
const OUTBOUND: Record<string, Milestone> = {
  READY_FOR_DELIVERY: 'PENDING',
  READY_FOR_PICKUP: 'PENDING',
  DELIVERY_ASSIGNED: 'ASSIGNED',
  OUT_FOR_DELIVERY: 'EN_ROUTE',
  ARRIVED_FOR_DELIVERY: 'ARRIVED',
  DELIVERED: 'DELIVERED',
};

/**
 * Traduce el estado del servidor al modelo local de la Web (estado + hitos de cada tramo), que
 * agrupa la logística de entrada en AWAITING_INTAKE y la de salida en READY. Así el detalle, las
 * barras de progreso y la lista muestran la etapa real, también en estados que solo existen en el
 * servidor (READY_FOR_PICKUP, DELIVERED pendiente de cierre).
 */
export function localStateFromServer(
  status: string,
  hasInboundDriver: boolean,
  hasOutboundDriver: boolean,
  previous?: string | null,
): { status: OrderStatus; inbound: LegView; outbound: LegView } {
  const pending = (driver: boolean): LegView => ({ status: 'SCHEDULED', milestone: driver ? 'ASSIGNED' : 'PENDING' });
  const done: LegView = { status: 'COMPLETED', milestone: 'DELIVERED' };
  if (status === 'COMPLETED') return { status: 'COMPLETED', inbound: done, outbound: done };
  if (status in OUTBOUND) {
    const milestone = OUTBOUND[status];
    return {
      status: 'READY',
      inbound: done,
      outbound: {
        status: milestone === 'DELIVERED' ? 'COMPLETED' : milestone === 'PENDING' ? 'SCHEDULED' : 'IN_PROGRESS',
        milestone,
      },
    };
  }
  if (PLANT.includes(status)) return { status: status as OrderStatus, inbound: done, outbound: pending(hasOutboundDriver) };
  if (status in INBOUND)
    return { status: 'AWAITING_INTAKE', inbound: { status: 'IN_PROGRESS', milestone: INBOUND[status] }, outbound: pending(hasOutboundDriver) };
  if (status === 'INCIDENT' || status === 'CANCELLED') {
    // Se conserva hasta dónde llegó la solicitud antes de la incidencia o la cancelación.
    const before = previous ? localStateFromServer(previous, hasInboundDriver, hasOutboundDriver) : null;
    return {
      status: status as OrderStatus,
      inbound: before?.inbound ?? pending(hasInboundDriver),
      outbound: before?.outbound ?? pending(hasOutboundDriver),
    };
  }
  // PAYMENT_PENDING, CONFIRMED.
  return { status: status as OrderStatus, inbound: pending(hasInboundDriver), outbound: pending(hasOutboundDriver) };
}

export function mapBackendOrderToOrder(
  raw: BackendOrderDetail | BackendOrderSummary,
  existing?: Order,
  customers: Customer[] = [],
  facilities: Facility[] = [],
  drivers: Driver[] = [],
): Order {
  const isDetail = 'legs' in raw || 'items' in raw;
  const detail = isDetail ? (raw as BackendOrderDetail) : null;

  const resolvedCustomerId = detail?.customerId ?? existing?.customerId ?? '';
  const customer = customers.find((c) => c.id === resolvedCustomerId);

  const resolvedFacilityId = raw.facilityId ?? existing?.facilityId ?? '';
  const facility = facilities.find((f) => f.id === resolvedFacilityId);

  const inboundLeg = detail?.legs?.find((l) => l.kind === 'INBOUND');
  const outboundLeg = detail?.legs?.find((l) => l.kind === 'OUTBOUND');
  const openIncident = ((detail as any)?.incidents as { status?: string; previousStatus?: string | null }[] | undefined)
    ?.find((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const local = localStateFromServer(
    raw.status,
    Boolean(inboundLeg?.driverId),
    Boolean(outboundLeg?.driverId),
    openIncident?.previousStatus,
  );

  const inboundLat = Number(inboundLeg?.latitude) || existing?.customerAddress?.coordinates?.lat || GYE_LAT;
  const inboundLng = Number(inboundLeg?.longitude) || existing?.customerAddress?.coordinates?.lng || GYE_LNG;

  const outboundLat = Number(outboundLeg?.latitude) || existing?.deliveryAddress?.coordinates?.lat || GYE_LAT;
  const outboundLng = Number(outboundLeg?.longitude) || existing?.deliveryAddress?.coordinates?.lng || GYE_LNG;

  const customerAddress: Address = {
    street: inboundLeg?.addressText || existing?.customerAddress?.street || 'Guayaquil',
    number: existing?.customerAddress?.number || '',
    neighborhood: existing?.customerAddress?.neighborhood || facility?.zone || 'Guayaquil',
    city: existing?.customerAddress?.city || 'Guayaquil',
    reference: existing?.customerAddress?.reference,
    coordinates: {
      lat: inboundLat,
      lng: inboundLng,
    },
  };

  const deliveryAddress: Address = {
    street: outboundLeg?.addressText || existing?.deliveryAddress?.street || 'Guayaquil',
    number: existing?.deliveryAddress?.number || '',
    neighborhood: existing?.deliveryAddress?.neighborhood || facility?.zone || 'Guayaquil',
    city: existing?.deliveryAddress?.city || 'Guayaquil',
    reference: existing?.deliveryAddress?.reference,
    coordinates: {
      lat: outboundLat,
      lng: outboundLng,
    },
  };

  const pickupDriverId = inboundLeg?.driverId ?? existing?.pickup?.driverId;
  const pickupDriver = drivers.find((d) => d.id === pickupDriverId);

  const deliveryDriverId = outboundLeg?.driverId ?? existing?.delivery?.driverId;
  const deliveryDriver = drivers.find((d) => d.id === deliveryDriverId);

  const pickupDate = inboundLeg?.slot?.date
    ? String(inboundLeg.slot.date).slice(0, 10)
    : inboundLeg?.scheduledDate
      ? String(inboundLeg.scheduledDate).slice(0, 10)
      : existing?.pickup?.date || 'Hoy';

  const pickupSlotText = inboundLeg?.slot
    ? `${inboundLeg.slot.startTime} - ${inboundLeg.slot.endTime}`
    : existing?.pickup?.timeSlot || '08:00 - 10:00';

  const deliveryDate = outboundLeg?.slot?.date
    ? String(outboundLeg.slot.date).slice(0, 10)
    : outboundLeg?.scheduledDate
      ? String(outboundLeg.scheduledDate).slice(0, 10)
      : existing?.delivery?.targetDate || 'Pendiente';

  const deliverySlotText = outboundLeg?.slot
    ? `${outboundLeg.slot.startTime} - ${outboundLeg.slot.endTime}`
    : existing?.delivery?.timeSlot || 'Pendiente';

  const items: OrderItem[] = detail?.items?.length
    ? detail.items.map((it) => ({
        id: it.id,
        name: it.notes || 'Prenda de servicio',
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        category: 'PRENDAS',
        notes: it.notes ?? undefined,
      }))
    : existing?.items ?? [
        {
          id: `ITEM-${raw.id.slice(0, 4)}`,
          name: 'Carga estándar',
          quantity: detail?.estimatedWeightLb ? Math.round(Number(detail.estimatedWeightLb)) : 1,
          unitPrice: Number(raw.total) || 15,
          category: 'PRENDAS',
        },
      ];

  const extras = detail?.extras?.length
    ? detail.extras.map((ex) => ({
        id: ex.id,
        name: 'Servicio extra',
        price: Number(ex.price),
      }))
    : existing?.extras ?? [];

  const timeline: OrderTimelineEvent[] = detail?.events?.length
    ? detail.events.map((ev) => ({
        id: ev.id,
        status: ev.status as OrderStatus,
        label: ev.title + (ev.description ? `: ${ev.description}` : ''),
        timestamp: ev.createdAt
          ? new Date(ev.createdAt).toLocaleTimeString('es-EC', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Hoy',
        userName: ev.actorRole ?? 'Personal',
        userRole: (ev.actorRole as any) ?? 'SUPERVISOR',
      }))
    : existing?.timeline ?? [
        {
          id: `TL-${raw.id.slice(0, 4)}`,
          status: raw.status as OrderStatus,
          label: 'Orden sincronizada con backend',
          timestamp: 'Reciente',
          userName: 'Sistema',
          userRole: 'ADMIN',
        },
      ];

  const totalAmount = Number(raw.total ?? existing?.pricing?.total ?? 0) || 0;
  // Un monto ausente no puede quedar en NaN: guardado pasa a null y rompe la vista al recargar.
  const itemsSubtotal = detail ? Number(detail.itemsSubtotal) || 0 : totalAmount;
  const discount = detail ? Number(detail.discount) || 0 : (existing?.pricing?.discount ?? 0);
  const extrasTotal = detail ? Number(detail.extrasTotal) || 0 : (existing?.pricing?.extrasTotal ?? 0);
  const deliveryFee = detail ? Number(detail.logisticsFee) || 0 : (existing?.pricing?.deliveryFee ?? 0);

  const priority: OrderPriority = detail?.priority ? 'HIGH' : existing?.priority ?? 'NORMAL';
  const slaStatus: SLARisk = existing?.slaStatus ?? 'ON_TIME';

  const orderNumberStr = raw.number ? String(raw.number).padStart(4, '0') : '';
  const trackingNumber =
    (raw as any).trackingNumber ||
    (orderNumberStr ? `SOL-${orderNumberStr}` : existing?.trackingNumber || `SOL-${raw.id.slice(0, 6)}`);

  const customerName =
    (raw as any).customer?.user?.name ||
    (raw as any).customerName ||
    (detail as any)?.customerName ||
    customer?.fullName ||
    existing?.customerName ||
    `Cliente #${orderNumberStr || raw.id.slice(0, 4)}`;

  const customerEmail =
    (raw as any).customer?.user?.email ||
    (raw as any).customerEmail ||
    (detail as any)?.customerEmail ||
    customer?.email ||
    existing?.customerEmail ||
    '';

  const customerPhone =
    (raw as any).customer?.user?.phone ||
    (raw as any).customerPhone ||
    customer?.phone ||
    existing?.customerPhone ||
    '';

  const customerPlan =
    (raw as any).customer?.membershipPlan?.name ||
    customer?.membership ||
    existing?.customerPlan ||
    '';

  return {
    id: raw.id,
    trackingNumber,
    customerId: resolvedCustomerId,
    customerName,
    customerPhone,
    customerEmail,
    customerPlan,
    customerAddress,
    deliveryAddress,
    facilityId: resolvedFacilityId,
    facilityName: facility?.name || existing?.facilityName || 'Sede Operativa Guayaquil',
    zoneId: facility?.zoneId || existing?.zoneId || 'ZONA-GYE-CENTRO',
    zoneName: facility?.zone || existing?.zoneName || 'Guayaquil',
    priority,
    status: local.status,
    previousStatus: existing?.previousStatus,
    slaStatus,
    slaDeadline: existing?.slaDeadline || '24h',
    slaProgressPercent: existing?.slaProgressPercent ?? 20,
    items,
    itemCount: items.reduce((acc, it) => acc + it.quantity, 0),
    serviceType: existing?.serviceType || 'Lavado Regular',
    extras,
    pricing: {
      subtotal: itemsSubtotal,
      discount,
      extrasTotal,
      deliveryFee,
      total: totalAmount,
      currency: 'USD',
      paymentMethod: 'TARJETA',
      paymentStatus: (raw.paymentStatus as any) ?? 'PAID',
      pricingModel: ((detail?.pricingModel || existing?.pricing?.pricingModel) as any) ?? 'FIXED',
      pricingStatus: (raw.pricingStatus as any) ?? 'CALCULATED',
      amountKnown: raw.pricingStatus !== 'PENDING_WEIGHT',
    },
    pickup: {
      date: pickupDate,
      timeSlot: pickupSlotText,
      driverId: pickupDriverId,
      driverName: pickupDriver?.name ?? existing?.pickup?.driverName,
      vehiclePlate: pickupDriver?.vehiclePlate ?? existing?.pickup?.vehiclePlate,
      notes: inboundLeg?.addressText,
    },
    delivery: {
      targetDate: deliveryDate,
      timeSlot: deliverySlotText,
      driverId: deliveryDriverId,
      driverName: deliveryDriver?.name ?? existing?.delivery?.driverName,
      vehiclePlate: deliveryDriver?.vehiclePlate ?? existing?.delivery?.vehiclePlate,
      recipientName: customer?.fullName || existing?.delivery?.recipientName || 'Cliente',
      recipientPhone: customer?.phone || existing?.delivery?.recipientPhone || '',
      notes: outboundLeg?.addressText,
    },
    incidentsCount: existing?.incidentsCount ?? 0,
    timeline,
    createdAt: raw.createdAt
      ? new Date(raw.createdAt).toLocaleDateString('es-EC')
      : existing?.createdAt || 'Hoy',
    updatedAt: detail?.updatedAt
      ? new Date(detail.updatedAt).toLocaleDateString('es-EC')
      : existing?.updatedAt || 'Hoy',
    version: raw.version ?? existing?.version ?? 1,
    // La inspección quedó hecha si el servidor ya pasó de esa etapa.
    inspectionCompleted:
      ['PRICING_PENDING', 'CUSTOMER_APPROVAL_PENDING', 'IN_PROCESS', 'QUALITY_CONTROL', 'COMPLETED'].includes(raw.status) ||
      raw.status in OUTBOUND ||
      Boolean(existing?.inspectionCompleted),
    // Versión del modelo local (2), no la del servidor: con otro valor la Web volvería a
    // "migrar" la solicitud como si fuera un registro antiguo y perdería su etapa real.
    workflowVersion: 2,
    businessVersion: 3,
    fulfillment: {
      mode: raw.mode ?? 'HOME_HOME',
      inbound: {
        method: 'DRIVER',
        facilityId: resolvedFacilityId,
        address: customerAddress,
        date: pickupDate,
        timeSlot: pickupSlotText,
        driverId: pickupDriverId,
        handoffIds: [],
        status: local.inbound.status,
        milestone: local.inbound.milestone,
      },
      outbound: {
        method: raw.mode === 'HOME_STORE' ? 'CUSTOMER' : 'DRIVER',
        facilityId: resolvedFacilityId,
        address: deliveryAddress,
        date: deliveryDate,
        timeSlot: deliverySlotText,
        driverId: deliveryDriverId,
        handoffIds: [],
        status: local.outbound.status,
        milestone: local.outbound.milestone,
      },
    },
  };
}

export async function fetchFullOrders(
  params?: ListOrdersParams,
  existingOrders: Order[] = [],
  customers: Customer[] = [],
  facilities: Facility[] = [],
  drivers: Driver[] = [],
): Promise<Order[]> {
  const res = await listOrders(params);
  const summaries = res.data ?? [];

  const detailsSettled = await Promise.allSettled(
    summaries.map((s) => getOrder(s.id)),
  );

  return summaries.map((summary, idx) => {
    const detailRes = detailsSettled[idx];
    const rawData = detailRes.status === 'fulfilled' ? detailRes.value : summary;
    const existing = existingOrders.find((o) => o.id === summary.id);
    return mapBackendOrderToOrder(rawData, existing, customers, facilities, drivers);
  });
}
