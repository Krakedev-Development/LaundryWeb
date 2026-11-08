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

// ---------------------------------------------------------------- Mappers

const GYE_LAT = -2.1894;
const GYE_LNG = -79.8891;

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

  const totalAmount = Number(raw.total ?? existing?.pricing?.total ?? 0);
  const itemsSubtotal = detail ? Number(detail.itemsSubtotal) : totalAmount;
  const discount = detail ? Number(detail.discount) : (existing?.pricing?.discount ?? 0);
  const extrasTotal = detail ? Number(detail.extrasTotal) : (existing?.pricing?.extrasTotal ?? 0);
  const deliveryFee = detail ? Number(detail.logisticsFee) : (existing?.pricing?.deliveryFee ?? 0);

  const priority: OrderPriority = detail?.priority ? 'HIGH' : existing?.priority ?? 'NORMAL';
  const slaStatus: SLARisk = existing?.slaStatus ?? 'ON_TIME';

  const orderNumberStr = String(raw.number ?? '').padStart(4, '0');
  const trackingNumber = existing?.trackingNumber || `SOL-${orderNumberStr || raw.id.slice(0, 6)}`;

  return {
    id: raw.id,
    trackingNumber,
    customerId: resolvedCustomerId,
    customerName: customer?.fullName || existing?.customerName || `Cliente SOL-${orderNumberStr || raw.id.slice(0, 4)}`,
    customerPhone: customer?.phone || existing?.customerPhone || '+593 99 999-9999',
    customerEmail: customer?.email || existing?.customerEmail || 'cliente@laundry.ec',
    customerPlan: customer?.membership || existing?.customerPlan || 'ESTANDAR',
    customerAddress,
    deliveryAddress,
    facilityId: resolvedFacilityId,
    facilityName: facility?.name || existing?.facilityName || 'Sede Operativa Guayaquil',
    zoneId: facility?.zoneId || existing?.zoneId || 'ZONA-GYE-CENTRO',
    zoneName: facility?.zone || existing?.zoneName || 'Guayaquil',
    priority,
    status: raw.status as OrderStatus,
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
      recipientPhone: customer?.phone || existing?.delivery?.recipientPhone || '+593 99 999-9999',
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
    workflowVersion: raw.version ?? existing?.workflowVersion ?? 1,
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
        status: (inboundLeg?.status as any) ?? 'SCHEDULED',
        milestone: inboundLeg?.driverId ? 'ASSIGNED' : 'PENDING',
      },
      outbound: {
        method: raw.mode === 'HOME_STORE' ? 'CUSTOMER' : 'DRIVER',
        facilityId: resolvedFacilityId,
        address: deliveryAddress,
        date: deliveryDate,
        timeSlot: deliverySlotText,
        driverId: deliveryDriverId,
        handoffIds: [],
        status: (outboundLeg?.status as any) ?? 'SCHEDULED',
        milestone: outboundLeg?.driverId ? 'ASSIGNED' : 'PENDING',
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
