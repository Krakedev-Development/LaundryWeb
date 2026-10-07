import type {
  Address,
  CatalogItem,
  Customer,
  Driver,
  Facility,
  Incident,
  Order,
  OrderItem,
  PointsLedgerEntry,
  Promotion,
} from '../types';
import {
  advanceOperational,
  handoffTypesFor,
  modeFor,
  type Actor,
  type FulfillmentLeg,
  type Handoff,
  type HandoffAudit,
} from './fulfillment';
import type { HandoffService } from './HandoffService';

export type SlotContext =
  'DRIVER_PICKUP' | 'DRIVER_DELIVERY' | 'FACILITY_DROPOFF' | 'FACILITY_PICKUP';
export interface TimeSlot {
  id: string;
  facilityId: string;
  zoneId?: string;
  context: SlotContext;
  date: string;
  start: string;
  end: string;
  capacity: number;
  reservedCount: number;
  active: boolean;
}
export interface SlotReservation {
  id: string;
  orderId: string;
  leg: 'inbound' | 'outbound';
  slotId: string;
  active: boolean;
}
export interface WeightMeasurement {
  id: string;
  orderId: string;
  weight: number;
  unit: 'LB' | 'KG';
  actorId: string;
  at: string;
}
export interface PriceAdjustment {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  customerMessage: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  decidedAt?: string;
}
export interface CustomerCharge {
  id: string;
  orderId: string;
  customerId: string;
  reason: 'LATE_CANCELLATION' | 'NO_SHOW' | 'FAILED_PICKUP';
  amount: number;
  status: 'PENDING' | 'PAID' | 'WAIVED';
  createdAt: string;
  waivedReason?: string;
}
export interface OrderChange {
  id: string;
  orderId: string;
  actorId: string;
  reason: string;
  before: unknown;
  after: unknown;
  at: string;
}
export interface BusinessNotification {
  id: string;
  customerId: string;
  orderId: string;
  type: string;
  message: string;
  at: string;
  read: boolean;
}
export interface PaymentTransaction {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  method: 'BILLETERA' | 'TARJETA' | 'TRANSFERENCIA' | 'EFECTIVO';
  at: string;
  localDemo: true;
}
export interface RouteStop {
  id: string;
  driverId: string;
  orderId: string;
  leg: 'inbound' | 'outbound';
  position: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'SKIPPED';
  type: 'PICKUP' | 'FACILITY_DROPOFF' | 'FACILITY_PICKUP' | 'DELIVERY';
  address: Address;
  slotId?: string;
  assignmentId: string;
}
export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  recipientId: string;
  channel: 'DRIVER' | 'OPERATIONS';
  text: string;
  at: string;
}
export interface BusinessAudit {
  id: string;
  actorId: string;
  actorRole: string;
  orderId?: string;
  action: string;
  reason?: string;
  at: string;
}
export interface BusinessPolicy {
  version: number;
  minimumOrderAmount?: number;
  review: string[];
  taxRate?: number;
  taxIncluded?: boolean;
  pickupFee?: number;
  deliveryFee?: number;
  cutoffMinutes?: number;
  lateCancellationFee?: number;
  noShowFee?: number;
  failedPickupFee?: number;
  blockNewOrdersOnCharges: boolean;
  enforceDriverLimit: boolean;
  driverLimit?: number;
  driverMayReorder: boolean;
  requireStorePickupSlot: boolean;
}
export const DEFAULT_POLICY: BusinessPolicy = {
  version: 1,
  review: [
    'IVA y tratamiento tributario',
    'Cargos por cancelación y ausencia',
    'Corte de reprogramación',
    'Consecuencia de ajustes rechazados y reembolsos',
    'Pago contractual',
    'Traslado entre sedes',
    'Capacidad de franjas',
    'Reserva obligatoria de retiro',
    'Libertad de reordenamiento de rutas',
    'Tarifas de logística',
  ],
  blockNewOrdersOnCharges: false,
  enforceDriverLimit: false,
  driverMayReorder: false,
  requireStorePickupSlot: false,
};
export interface BusinessState {
  orders: Order[];
  customers: Customer[];
  drivers: Driver[];
  incidents: Incident[];
  pointsLedger: PointsLedgerEntry[];
  handoffs: Handoff[];
  handoffAudits: HandoffAudit[];
  businessPolicy: BusinessPolicy;
  timeSlots: TimeSlot[];
  reservations: SlotReservation[];
  weights: WeightMeasurement[];
  adjustments: PriceAdjustment[];
  charges: CustomerCharge[];
  changes: OrderChange[];
  notifications: BusinessNotification[];
  payments: PaymentTransaction[];
  routeStops: RouteStop[];
  messages: ChatMessage[];
  businessAudits: BusinessAudit[];
  promotionUses: { orderId: string; promotionId: string }[];
}
export function ensureBusinessState(
  state: Partial<BusinessState>,
): BusinessState {
  state.businessPolicy ??= JSON.parse(JSON.stringify(DEFAULT_POLICY));
  for (const key of [
    'timeSlots',
    'reservations',
    'weights',
    'adjustments',
    'charges',
    'changes',
    'notifications',
    'payments',
    'routeStops',
    'messages',
    'businessAudits',
    'promotionUses',
  ] as const)
    state[key] ??= [];
  return state as BusinessState;
}
export interface BusinessRepository {
  read(): BusinessState;
  transaction<T>(work: (state: BusinessState) => T): T;
}
export interface BusinessPort extends BusinessRepository {
  actor(): Actor;
  facilities(): Facility[];
  catalog(): CatalogItem[];
  promotions?(): Promotion[];
  zoneFor?(address: Address, facilityId: string): string | undefined;
  covers(address: Address, facilityId: string): boolean;
  handoffs: HandoffService;
  now?(): Date;
  randomId?(): string;
}
export interface CreateOrderInput {
  id?: string;
  requestId: string;
  customerId: string;
  facilityId: string;
  inbound: 'DRIVER' | 'CUSTOMER';
  outbound: 'DRIVER' | 'CUSTOMER';
  inboundSlotId: string;
  outboundSlotId?: string;
  pickupAddress: Address;
  deliveryAddress: Address;
  items: OrderItem[];
  extras?: { id: string; name: string; price: number }[];
  pricingModel: 'FIXED' | 'PER_WEIGHT';
  catalogServiceId?: string;
  promoCode?: string;
}
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const terminal = (o: Order) => ['COMPLETED', 'CANCELLED'].includes(o.status);
export const MODE_LABELS = {
  HOME_HOME: 'Recogida y entrega a domicilio',
  HOME_STORE: 'Recogida a domicilio · retiro en sede',
  STORE_HOME: 'Ingreso en sede · entrega a domicilio',
  STORE_STORE: 'Ingreso y retiro en sede',
};
export function nextAction(order: Order, state: BusinessState): string {
  if (terminal(order))
    return order.status === 'CANCELLED'
      ? 'Solicitud cancelada'
      : 'Servicio completado';
  if (
    (order.intakeHold && !order.intakeHold.resolvedAt) ||
    order.status === 'INCIDENT'
  )
    return 'Resolver incidencia';
  if (
    state.adjustments.some(
      (a) => a.orderId === order.id && a.status === 'REJECTED',
    )
  )
    return 'Revisión de ajuste rechazado';
  if (
    state.adjustments.some(
      (a) => a.orderId === order.id && a.status === 'PENDING',
    )
  )
    return 'Cliente: revisar ajuste';
  if (order.pricing.pricingStatus === 'PENDING_WEIGHT')
    return order.fulfillment?.inbound.status === 'COMPLETED'
      ? 'Registrar peso en planta'
      : 'Recibir prendas y pesar en planta';
  if (
    !order.inspectionCompleted &&
    order.businessVersion === 3 &&
    order.fulfillment?.inbound.status === 'COMPLETED'
  )
    return 'Realizar inspección';
  if (order.pricing.paymentStatus !== 'PAID')
    return order.pricing.amountKnown === false
      ? 'Esperar cálculo del importe'
      : 'Cliente: pagar importe pendiente';
  if (order.status === 'READY')
    return order.fulfillment?.outbound.method === 'CUSTOMER'
      ? 'Cliente: retirar en sede'
      : 'Asignar o confirmar entrega';
  if (order.status === 'AT_FACILITY' || order.status === 'PRICING_PENDING')
    return 'Iniciar procesamiento';
  if (order.status === 'IN_PROCESS') return 'Pasar a control de calidad';
  if (order.status === 'QUALITY_CONTROL') return 'Marcar prendas listas';
  return order.fulfillment?.inbound.method === 'CUSTOMER'
    ? 'Cliente: presentar código de ingreso'
    : 'Asignar o confirmar recogida';
}
export function recordBusinessCustody(
  state: BusinessState,
  order: Order,
  handoff: Handoff,
) {
  if (order.businessVersion !== 3) return;
  if (
    order.status === 'AT_FACILITY' &&
    order.pricing.pricingModel === 'PER_WEIGHT'
  )
    order.status = 'WEIGHING';
  const types: Record<string, RouteStop['type']> = {
    CUSTOMER_TO_DRIVER: 'PICKUP',
    DRIVER_TO_FACILITY: 'FACILITY_DROPOFF',
    FACILITY_TO_DRIVER: 'FACILITY_PICKUP',
    DRIVER_TO_CUSTOMER: 'DELIVERY',
  };
  state.routeStops
    .filter(
      (s) =>
        s.orderId === order.id &&
        s.type === types[handoff.type] &&
        s.assignmentId === handoff.driverAssignmentId,
    )
    .forEach((s) => (s.status = 'COMPLETED'));
  state.notifications.push({
    id: `NTF-${handoff.id}`,
    orderId: order.id,
    customerId: order.customerId,
    type: 'HANDOFF',
    message: 'Transferencia física confirmada: ' + handoff.type,
    at: handoff.usedAt!,
    read: false,
  });
  order.nextAction = nextAction(order, state);
}

/** All mutations commit one envelope; a throwing transaction must never persist partial work. */
export class BusinessService {
  constructor(private port: BusinessPort) {}
  private now() {
    return (this.port.now?.() ?? new Date()).toISOString();
  }
  private id(prefix: string) {
    return `${prefix}-${this.port.randomId?.() ?? globalThis.crypto.randomUUID()}`;
  }
  private actor() {
    return this.port.actor();
  }
  private order(s: BusinessState, id: string) {
    const o = s.orders.find((o) => o.id === id);
    if (!o) throw Error('Pedido no encontrado.');
    return o;
  }
  private staff(o?: Order, admin = false) {
    const a = this.actor();
    if (
      !['ADMIN', 'SUPERVISOR'].includes(a.role) ||
      (admin && a.role !== 'ADMIN') ||
      (o && a.role === 'SUPERVISOR' && a.facilityId !== o.facilityId)
    )
      throw Error('Operación no autorizada para tu rol o sede.');
    return a;
  }
  private client(o: Order) {
    const a = this.actor();
    if (a.role !== 'CLIENT' || a.id !== o.customerId)
      throw Error('Solo el titular puede realizar esta acción.');
    return a;
  }
  private audit(
    s: BusinessState,
    action: string,
    orderId?: string,
    reason?: string,
  ) {
    const a = this.actor();
    s.businessAudits.push({
      id: this.id('AUD'),
      actorId: a.id,
      actorRole: a.role,
      orderId,
      action,
      reason,
      at: this.now(),
    });
  }
  private notify(s: BusinessState, o: Order, type: string, message: string) {
    s.notifications.push({
      id: this.id('NTF'),
      orderId: o.id,
      customerId: o.customerId,
      type,
      message,
      at: this.now(),
      read: false,
    });
  }
  private update(s: BusinessState, o: Order, label: string) {
    o.updatedAt = this.now();
    o.nextAction = nextAction(o, s);
    const a = this.actor();
    o.timeline.push({
      id: this.id('TL'),
      status: o.status,
      label,
      timestamp: this.now(),
      userName: a.name,
      userRole: a.role,
    });
    this.port.handoffs.refresh(s, o);
    this.audit(s, label, o.id);
  }
  private blocked(s: BusinessState, o: Order) {
    if (terminal(o)) throw Error('El pedido ya está cerrado.');
    if (
      (o.intakeHold && !o.intakeHold.resolvedAt) ||
      s.incidents.some((i) => i.orderId === o.id && i.status !== 'RESOLVED')
    )
      throw Error('Resuelve la incidencia antes de continuar.');
  }
  private context(
    leg: 'inbound' | 'outbound',
    method: 'CUSTOMER' | 'DRIVER',
  ): SlotContext {
    return leg === 'inbound'
      ? method === 'DRIVER'
        ? 'DRIVER_PICKUP'
        : 'FACILITY_DROPOFF'
      : method === 'DRIVER'
        ? 'DRIVER_DELIVERY'
        : 'FACILITY_PICKUP';
  }
  private withinHours(slot: TimeSlot) {
    const schedule = this.port
      .facilities()
      .find((f) => f.id === slot.facilityId)?.operatingSchedule;
    return (
      !schedule ||
      (schedule.days.includes(new Date(`${slot.date}T12:00:00`).getDay()) &&
        slot.start >= schedule.open &&
        slot.end <= schedule.close)
    );
  }
  private slot(
    s: BusinessState,
    id: string,
    facilityId: string,
    context: SlotContext,
  ) {
    const slot = s.timeSlots.find((x) => x.id === id);
    if (
      !slot ||
      !slot.active ||
      !this.withinHours(slot) ||
      slot.facilityId !== facilityId ||
      slot.context !== context
    )
      throw Error('La franja no corresponde a la sede o a la modalidad.');
    if (
      new Date(`${slot.date}T${slot.start}:00`) <=
      (this.port.now?.() ?? new Date())
    )
      throw Error('La franja ya pasó.');
    return slot;
  }
  private reserve(
    s: BusinessState,
    o: Order,
    leg: 'inbound' | 'outbound',
    id: string,
  ) {
    const f = o.fulfillment!;
    const slot = this.slot(
      s,
      id,
      o.facilityId,
      this.context(leg, f[leg].method),
    );
    const current = s.reservations.find(
      (r) => r.orderId === o.id && r.leg === leg && r.active,
    );
    if (current?.slotId === id) return;
    if (slot.reservedCount >= slot.capacity)
      throw Error('La franja está completa. Elige otra.');
    if (current) this.release(s, o.id, leg);
    slot.reservedCount++;
    s.reservations.push({
      id: this.id('RSV'),
      orderId: o.id,
      leg,
      slotId: id,
      active: true,
    });
    f[leg].timeSlotId = id;
    f[leg].date = slot.date;
    f[leg].timeSlot = `${slot.start}–${slot.end}`;
  }
  private release(s: BusinessState, id: string, leg?: 'inbound' | 'outbound') {
    s.reservations
      .filter((r) => r.orderId === id && r.active && (!leg || r.leg === leg))
      .forEach((r) => {
        const slot = s.timeSlots.find((x) => x.id === r.slotId);
        if (slot) slot.reservedCount = Math.max(0, slot.reservedCount - 1);
        r.active = false;
      });
  }
  private facility(
    id: string,
    inbound: 'DRIVER' | 'CUSTOMER',
    outbound: 'DRIVER' | 'CUSTOMER',
  ) {
    const f = this.port.facilities().find((f) => f.id === id);
    if (!f || f.status !== 'ACTIVE') throw Error('La sede no está disponible.');
    if (
      (inbound === 'CUSTOMER' && !f.acceptsCustomerDropoff) ||
      (outbound === 'CUSTOMER' && !f.allowsCustomerPickup)
    )
      throw Error('La sede no admite esta modalidad.');
    return f;
  }
  private recalculate(s: BusinessState, o: Order) {
    const p = o.pricing;
    if (p.amountKnown === false) return;
    if (p.promoCodeApplied) {
      const promo =
        p.promotionSnapshot ?? this.promotion(p.promoCodeApplied, s, o.id);
      if (p.subtotal + p.extrasTotal < promo.minOrderAmount)
        throw Error('No se cumple el mínimo de la promoción.');
      p.discount = money(
        promo.discountType === 'PERCENTAGE'
          ? ((p.subtotal + p.extrasTotal) * promo.discountValue) / 100
          : Math.min(p.subtotal + p.extrasTotal, promo.discountValue),
      );
      p.promotionSnapshot = {
        id: promo.id,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        minOrderAmount: promo.minOrderAmount,
      };
      if (!s.promotionUses.some((use) => use.orderId === o.id))
        s.promotionUses.push({ orderId: o.id, promotionId: promo.id });
    }
    const accepted = s.adjustments
      .filter((a) => a.orderId === o.id && a.status === 'ACCEPTED')
      .reduce((n, a) => n + a.amount, 0);
    const base = Math.max(
      s.businessPolicy.minimumOrderAmount ?? 0,
      p.subtotal + p.extrasTotal + accepted - p.discount + p.deliveryFee,
    );
    p.adjustmentsTotal = money(accepted);
    p.taxRate = s.businessPolicy.taxRate;
    p.taxAmount =
      s.businessPolicy.taxRate === undefined
        ? undefined
        : money(
            s.businessPolicy.taxIncluded
              ? base - base / (1 + s.businessPolicy.taxRate)
              : base * s.businessPolicy.taxRate,
          );
    p.total = money(
      base + (s.businessPolicy.taxIncluded ? 0 : (p.taxAmount ?? 0)),
    );
    p.amountDue = money(Math.max(0, p.total - (p.amountPaid ?? 0)));
    p.paymentStatus = p.amountDue === 0 ? 'PAID' : 'PENDING';
    p.pricingStatus = s.adjustments.some(
      (a) => a.orderId === o.id && a.status === 'PENDING',
    )
      ? 'ADJUSTMENT_PENDING'
      : 'FINAL';
    o.policyReview =
      s.businessPolicy.taxRate === undefined
        ? 'Tratamiento de IVA en revisión. Importes de demostración sin política tributaria definitiva.'
        : undefined;
  }
  private promotion(code: string, s: BusinessState, orderId?: string) {
    const promo = this.port
      .promotions?.()
      .find((p) => p.code.toUpperCase() === code.trim().toUpperCase());
    const day = this.now().slice(0, 10);
    if (
      !promo ||
      promo.status !== 'ACTIVE' ||
      day < promo.startDate ||
      day > promo.endDate ||
      promo.usageCount +
        s.promotionUses.filter(
          (u) => u.promotionId === promo.id && u.orderId !== orderId,
        ).length >=
        promo.usageLimit
    )
      throw Error('La promoción no está disponible.');
    return promo;
  }
  availableSlots(facilityId: string, context: SlotContext) {
    return this.port
      .read()
      .timeSlots.filter(
        (s) =>
          s.facilityId === facilityId &&
          s.context === context &&
          s.active &&
          this.withinHours(s) &&
          s.reservedCount < s.capacity &&
          new Date(`${s.date}T${s.start}:00`) >
            (this.port.now?.() ?? new Date()),
      );
  }
  /** Calculates the same validated quote without saving orders, reservations or coupon uses. */
  quote(input: CreateOrderInput) {
    const snapshot = JSON.parse(
      JSON.stringify(this.port.read()),
    ) as BusinessState;
    const preview = new BusinessService({
      ...this.port,
      read: () => snapshot,
      transaction: (work) => work(snapshot),
    });
    return preview.create({
      ...input,
      id: this.id('QUOTE'),
      requestId: this.id('QUOTE'),
    }).pricing;
  }
  create(input: CreateOrderInput): Order {
    const actor = this.actor();
    if (actor.role !== 'CLIENT' || actor.id !== input.customerId)
      throw Error('La solicitud pertenece al cliente autenticado.');
    return this.port.transaction((s) => {
      const duplicate = s.orders.find(
        (o) => o.trackingNumber === input.requestId,
      );
      if (duplicate) {
        this.client(duplicate);
        return duplicate;
      }
      const c = s.customers.find((c) => c.id === input.customerId);
      if (!c) throw Error('Cliente no encontrado.');
      if (c.kycStatus !== 'APPROVED')
        throw Error(
          'Tu verificación debe estar aprobada para solicitar un servicio.',
        );
      if (
        s.businessPolicy.blockNewOrdersOnCharges &&
        s.charges.some((x) => x.customerId === c.id && x.status === 'PENDING')
      )
        throw Error('Tienes un cargo pendiente.');
      const f = this.facility(input.facilityId, input.inbound, input.outbound);
      const facilityAddress: Address = {
        street: f.address,
        number: '',
        neighborhood: f.zone,
        city: f.city,
        coordinates: f.coordinates,
      };
      input = {
        ...input,
        pickupAddress:
          input.inbound === 'CUSTOMER' ? facilityAddress : input.pickupAddress,
        deliveryAddress:
          input.outbound === 'CUSTOMER'
            ? facilityAddress
            : input.deliveryAddress,
      };
      for (const [method, address] of [
        [input.inbound, input.pickupAddress],
        [input.outbound, input.deliveryAddress],
      ] as const)
        if (method === 'DRIVER' && !this.port.covers(address, f.id))
          throw Error('La dirección está fuera de cobertura de la sede.');
      if (
        !input.items.length ||
        input.items.some(
          (i) =>
            !Number.isInteger(i.quantity) ||
            i.quantity <= 0 ||
            !Number.isFinite(i.unitPrice) ||
            i.unitPrice < 0,
        )
      )
        throw Error('Revisa las prendas y cantidades.');
      for (const item of input.items) {
        const c = this.port.catalog().find((c) => c.id === item.id);
        if (!c || c.status !== 'ACTIVE' || c.customerSelectable === false)
          throw Error('Una prenda o servicio ya no está disponible.');
        if (
          input.pricingModel === 'FIXED' &&
          (c.pricingModel === 'PER_WEIGHT' || item.unitPrice !== c.price)
        )
          throw Error('El precio de una prenda cambió. Revisa tu selección.');
        if (
          input.pricingModel === 'PER_WEIGHT' &&
          (c.compatibleWithWeight === false || item.category !== 'PRENDAS')
        )
          throw Error(
            'El servicio por peso no admite esta prenda. Separa los servicios delicados o especiales.',
          );
      }
      for (const extra of input.extras ?? []) {
        const c = this.port
          .catalog()
          .find((c) => c.id === extra.id && c.category === 'EXTRAS');
        if (!c || c.status !== 'ACTIVE' || c.price !== extra.price)
          throw Error('Un extra ya no está disponible o cambió de precio.');
      }
      const service = input.catalogServiceId
        ? this.port.catalog().find((c) => c.id === input.catalogServiceId)
        : undefined;
      if (
        input.catalogServiceId &&
        (!service ||
          service.status !== 'ACTIVE' ||
          service.customerSelectable === false)
      )
        throw Error('Servicio no disponible.');
      if (
        input.pricingModel === 'PER_WEIGHT' &&
        (!service ||
          service.pricingModel !== 'PER_WEIGHT' ||
          !(service.pricePerWeightUnit! > 0))
      )
        throw Error('Selecciona un servicio por peso con tarifa configurada.');
      const at = this.now();
      const leg = (
        method: 'CUSTOMER' | 'DRIVER',
        address: Address,
      ): FulfillmentLeg => ({
        method,
        facilityId: f.id,
        address,
        date: '',
        timeSlot: '',
        handoffIds: [],
        status: 'SCHEDULED',
        milestone: 'PENDING',
      });
      const known = input.pricingModel === 'FIXED';
      const extras = input.extras ?? [];
      if (input.promoCode?.trim()) this.promotion(input.promoCode, s);
      const o: Order = {
        id: input.id ?? this.id('SOL'),
        trackingNumber: input.requestId,
        customerId: c.id,
        customerName: c.fullName,
        customerPhone: c.phone,
        customerEmail: c.email,
        customerPlan: c.membership,
        customerAddress: input.pickupAddress,
        deliveryAddress: input.deliveryAddress,
        facilityId: f.id,
        facilityName: f.name,
        zoneId: this.port.zoneFor?.(input.pickupAddress, f.id) ?? 'DEMO',
        zoneName: f.zone,
        priority: 'NORMAL',
        status: known ? 'PAYMENT_PENDING' : 'AWAITING_INTAKE',
        slaStatus: 'ON_TIME',
        slaDeadline: at,
        slaProgressPercent: 0,
        items: input.items,
        itemCount: input.items.reduce((n, i) => n + i.quantity, 0),
        serviceType: service?.name ?? 'Servicios por prenda',
        extras,
        pricing: {
          pricingModel: input.pricingModel,
          pricingStatus: known ? 'CALCULATED' : 'PENDING_WEIGHT',
          pricePerWeightUnit: service?.pricePerWeightUnit,
          weightUnit: service?.weightUnit ?? 'LB',
          subtotal: known
            ? money(
                input.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0),
              )
            : 0,
          extrasTotal: money(extras.reduce((n, i) => n + i.price, 0)),
          discount: 0,
          deliveryFee:
            (input.inbound === 'DRIVER'
              ? (s.businessPolicy.pickupFee ?? 0)
              : 0) +
            (input.outbound === 'DRIVER'
              ? (s.businessPolicy.deliveryFee ?? 0)
              : 0),
          total: 0,
          amountKnown: known,
          amountPaid: 0,
          amountDue: known ? 0 : undefined,
          currency: 'USD',
          promoCodeApplied: input.promoCode?.trim().toUpperCase() || undefined,
          paymentMethod: 'TARJETA',
          paymentStatus: known ? 'PENDING' : 'PENDING_AMOUNT',
        },
        pickup: { date: '', timeSlot: '' },
        delivery: {
          targetDate: '',
          timeSlot: '',
          recipientName: c.fullName,
          recipientPhone: c.phone,
        },
        incidentsCount: 0,
        timeline: [],
        createdAt: at,
        updatedAt: at,
        workflowVersion: 2,
        businessVersion: 3,
        catalogServiceId: input.catalogServiceId,
        processingHours:
          service?.estimatedHours ??
          Math.max(
            0,
            ...input.items.map(
              (i) =>
                this.port.catalog().find((c) => c.id === i.id)
                  ?.estimatedHours ?? 24,
            ),
          ),
        fulfillment: {
          mode: modeFor(input.inbound, input.outbound),
          inbound: leg(input.inbound, input.pickupAddress),
          outbound: leg(input.outbound, input.deliveryAddress),
        },
      };
      s.orders.unshift(o);
      this.reserve(s, o, 'inbound', input.inboundSlotId);
      if (input.outboundSlotId)
        this.reserve(s, o, 'outbound', input.outboundSlotId);
      else if (
        input.outbound === 'DRIVER' ||
        s.businessPolicy.requireStorePickupSlot
      )
        throw Error('Selecciona la franja de salida.');
      const fi = o.fulfillment!.inbound,
        fo = o.fulfillment!.outbound;
      o.pickup.date = fi.date;
      o.pickup.timeSlot = fi.timeSlot;
      o.delivery.targetDate = fo.date;
      o.delivery.timeSlot = fo.timeSlot || 'Al estar listo';
      const processHours = o.processingHours!;
      if (
        fo.date &&
        new Date(`${fo.date}T${fo.timeSlot.slice(0, 5)}:00`).getTime() <
          new Date(`${fi.date}T${fi.timeSlot.slice(0, 5)}:00`).getTime() +
            processHours * 3600000
      )
        throw Error(
          'La salida no respeta el tiempo de procesamiento del servicio.',
        );
      this.recalculate(s, o);
      this.port.handoffs.initialize(s, o, false, false);
      c.totalOrders++;
      this.update(s, o, 'Solicitud confirmada');
      this.notify(
        s,
        o,
        'CREATED',
        known
          ? 'Solicitud registrada. Completa el pago de demostración.'
          : 'Solicitud por peso registrada. El importe se calculará en planta.',
      );
      return o;
    });
  }
  pay(
    id: string,
    requestId: string,
    method: PaymentTransaction['method'] = 'TARJETA',
  ) {
    return this.port.transaction((s) => {
      const o = this.order(s, id);
      this.client(o);
      const existing = s.payments.find((p) => p.id === requestId);
      if (existing) {
        if (existing.orderId !== id)
          throw Error('Identificador de pago ya utilizado.');
        return o;
      }
      if (terminal(o)) throw Error('El pedido está cerrado.');
      if (o.pricing.amountKnown === false)
        throw Error('El importe está pendiente de pesaje.');
      if (s.adjustments.some((a) => a.orderId === id && a.status === 'PENDING'))
        throw Error('Revisa el ajuste antes de pagar.');
      const due =
        o.pricing.amountDue ??
        (o.pricing.paymentStatus === 'PAID' ? 0 : o.pricing.total);
      if (due <= 0) {
        if (o.status === 'PAYMENT_PENDING') {
          o.status = 'AWAITING_INTAKE';
          this.update(s, o, 'Confirmación sin saldo pendiente');
        }
        return o;
      }
      const c = s.customers.find((c) => c.id === o.customerId)!;
      if (method === 'BILLETERA') {
        if (c.walletBalance < due) throw Error('Saldo insuficiente.');
        c.walletBalance = money(c.walletBalance - due);
      }
      s.payments.push({
        id: requestId,
        orderId: id,
        customerId: c.id,
        amount: due,
        method,
        at: this.now(),
        localDemo: true,
      });
      o.pricing.amountPaid = money((o.pricing.amountPaid ?? 0) + due);
      o.pricing.amountDue = 0;
      o.pricing.paymentMethod = method;
      o.pricing.paymentStatus = 'PAID';
      if (o.status === 'PAYMENT_PENDING') o.status = 'AWAITING_INTAKE';
      this.update(s, o, 'Pago de demostración confirmado');
      this.notify(
        s,
        o,
        'PAYMENT',
        'Pago confirmado en esta instalación del MVP.',
      );
      return o;
    });
  }
  weigh(id: string, weight: number, unit: 'LB' | 'KG') {
    this.port.transaction((s) => {
      const o = this.order(s, id);
      this.staff(o);
      this.blocked(s, o);
      if (
        o.fulfillment?.inbound.status !== 'COMPLETED' ||
        !['AT_FACILITY', 'WEIGHING'].includes(o.status)
      )
        throw Error('Primero confirma el ingreso físico en sede.');
      if (
        o.pricing.pricingModel !== 'PER_WEIGHT' ||
        !Number.isFinite(weight) ||
        weight <= 0 ||
        unit !== o.pricing.weightUnit
      )
        throw Error('Peso o unidad inválidos para este servicio.');
      s.weights.push({
        id: this.id('WGT'),
        orderId: id,
        weight,
        unit,
        actorId: this.actor().id,
        at: this.now(),
      });
      o.pricing.measuredWeight = weight;
      o.pricing.subtotal = money(weight * o.pricing.pricePerWeightUnit!);
      o.pricing.amountKnown = true;
      o.status = 'INSPECTION';
      // A coupon can expire or miss its minimum while the weight is still unknown.
      // Keep the physical measurement and notify the client instead of blocking intake.
      try {
        this.recalculate(s, o);
      } catch (error) {
        if (!o.pricing.promoCodeApplied) throw error;
        o.pricing.promoCodeApplied = undefined;
        o.pricing.promotionSnapshot = undefined;
        o.pricing.discount = 0;
        this.recalculate(s, o);
        this.notify(
          s,
          o,
          'PROMOTION',
          'La promoción no cumple sus condiciones al pesar. El importe se calculó sin descuento.',
        );
        this.audit(
          s,
          'Promoción descartada al calcular peso',
          o.id,
          error instanceof Error ? error.message : undefined,
        );
      }
      this.update(s, o, 'Peso registrado');
      this.notify(
        s,
        o,
        'WEIGHT',
        `Peso recibido: ${weight} ${unit}. Importe calculado: $${o.pricing.total.toFixed(2)}.`,
      );
    });
  }
  inspect(id: string, customerMessage: string) {
    this.port.transaction((s) => {
      const o = this.order(s, id);
      this.staff(o);
      this.blocked(s, o);
      if (
        o.fulfillment?.inbound.status !== 'COMPLETED' ||
        o.pricing.amountKnown === false ||
        !['AT_FACILITY', 'INSPECTION', 'PRICING_PENDING'].includes(o.status)
      )
        throw Error('Confirma ingreso y pesaje antes de inspeccionar.');
      o.inspectionCompleted = true;
      o.customerMessage = customerMessage.trim();
      o.status = s.adjustments.some(
        (a) => a.orderId === id && a.status === 'PENDING',
      )
        ? 'CUSTOMER_APPROVAL_PENDING'
        : 'PRICING_PENDING';
      this.update(s, o, 'Inspección realizada');
      this.notify(
        s,
        o,
        'PRICE',
        customerMessage.trim() ||
          'Inspección completada. Revisa el importe de tu solicitud.',
      );
    });
  }
  proposeAdjustment(
    id: string,
    amount: number,
    reason: string,
    customerMessage: string,
  ) {
    this.port.transaction((s) => {
      const o = this.order(s, id);
      this.staff(o);
      this.blocked(s, o);
      if (
        ![
          'AT_FACILITY',
          'INSPECTION',
          'PRICING_PENDING',
          'CUSTOMER_APPROVAL_PENDING',
        ].includes(o.status) ||
        o.pricing.amountKnown === false
      )
        throw Error(
          'Los ajustes se proponen durante inspección, con un importe calculado.',
        );
      if (
        !Number.isFinite(amount) ||
        amount === 0 ||
        !reason.trim() ||
        !customerMessage.trim()
      )
        throw Error(
          'Incluye importe, motivo interno y mensaje para el cliente.',
        );
      s.adjustments.push({
        id: this.id('ADJ'),
        orderId: id,
        amount: money(amount),
        reason: reason.trim(),
        customerMessage: customerMessage.trim(),
        status: 'PENDING',
        createdAt: this.now(),
      });
      o.status = 'CUSTOMER_APPROVAL_PENDING';
      o.pricing.pricingStatus = 'ADJUSTMENT_PENDING';
      this.update(s, o, 'Ajuste propuesto');
      this.notify(s, o, 'ADJUSTMENT', customerMessage);
    });
  }
  decideAdjustment(id: string, accept: boolean) {
    this.port.transaction((s) => {
      const adjustment = s.adjustments.find((a) => a.id === id);
      if (!adjustment) throw Error('Ajuste no encontrado.');
      const o = this.order(s, adjustment.orderId);
      this.client(o);
      if (adjustment.status !== 'PENDING') return;
      adjustment.status = accept ? 'ACCEPTED' : 'REJECTED';
      adjustment.decidedAt = this.now();
      if (!accept) {
        o.status = 'CUSTOMER_APPROVAL_PENDING';
        o.policyReview =
          'Consecuencia del rechazo y reembolso en revisión. Operación bloqueada hasta resolución.';
      } else {
        this.recalculate(s, o);
        if (
          !s.adjustments.some(
            (a) => a.orderId === o.id && a.status === 'PENDING',
          )
        )
          o.status = 'PRICING_PENDING';
      }
      this.update(
        s,
        o,
        accept ? 'Cliente aceptó ajuste' : 'Cliente rechazó ajuste',
      );
      this.notify(
        s,
        o,
        'ADJUSTMENT',
        accept
          ? 'Ajuste aceptado. Revisa el saldo pendiente.'
          : 'Ajuste rechazado. Operaciones revisará tu solicitud.',
      );
    });
  }
  process(id: string, target: 'IN_PROCESS' | 'QUALITY_CONTROL' | 'READY') {
    this.port.transaction((s) => {
      const o = this.order(s, id);
      this.staff(o);
      this.blocked(s, o);
      if (
        o.businessVersion === 3 &&
        (!o.inspectionCompleted || o.pricing.amountKnown === false)
      )
        throw Error('Falta pesaje o inspección.');
      if (
        o.pricing.paymentStatus !== 'PAID' ||
        s.adjustments.some((a) => a.orderId === id && a.status !== 'ACCEPTED')
      )
        throw Error('Falta pago o resolución de un ajuste.');
      const previous =
        target === 'IN_PROCESS'
          ? ['AT_FACILITY', 'PRICING_PENDING']
          : target === 'QUALITY_CONTROL'
            ? ['IN_PROCESS']
            : ['QUALITY_CONTROL'];
      if (!previous.includes(o.status))
        throw Error('La etapa anterior no está completada.');
      o.status = target;
      this.update(s, o, 'Planta: ' + target);
      if (target === 'READY')
        this.notify(
          s,
          o,
          'READY',
          o.fulfillment?.outbound.method === 'CUSTOMER'
            ? 'Tus prendas están listas para retirar en sede.'
            : 'Tus prendas están listas para entrega.',
        );
    });
  }
  private mutable(s: BusinessState, o: Order, leg: 'inbound' | 'outbound') {
    this.blocked(s, o);
    const f = o.fulfillment![leg];
    if (
      f.startedAt ||
      ['IN_PROGRESS', 'AWAITING_HANDOFF', 'COMPLETED', 'CANCELLED'].includes(
        f.status,
      ) ||
      !['PENDING', 'ASSIGNED'].includes(f.milestone) ||
      s.handoffs.some(
        (h) =>
          h.orderId === o.id &&
          handoffTypesFor(o.fulfillment!.mode).includes(h.type) &&
          h.status === 'USED' &&
          (leg === 'inbound'
            ? [
                'CUSTOMER_TO_DRIVER',
                'DRIVER_TO_FACILITY',
                'CUSTOMER_TO_FACILITY',
              ]
            : [
                'FACILITY_TO_DRIVER',
                'DRIVER_TO_CUSTOMER',
                'FACILITY_TO_CUSTOMER',
              ]
          ).includes(h.type),
      )
    )
      throw Error('El tramo ya inició o tiene una transferencia confirmada.');
    const slot = s.timeSlots.find((x) => x.id === f.timeSlotId);
    if (
      slot &&
      s.businessPolicy.cutoffMinutes !== undefined &&
      new Date(`${slot.date}T${slot.start}:00`).getTime() -
        (this.port.now?.() ?? new Date()).getTime() <
        s.businessPolicy.cutoffMinutes * 60000
    )
      throw Error('El cambio está fuera del plazo configurado.');
    return f;
  }
  change(
    id: string,
    leg: 'inbound' | 'outbound',
    slotId: string,
    method: 'DRIVER' | 'CUSTOMER',
    address: Address,
    reason: string,
  ) {
    this.port.transaction((s) => {
      const o = this.order(s, id);
      this.client(o);
      const f = this.mutable(s, o, leg);
      if (!reason.trim()) throw Error('Indica el motivo del cambio.');
      const facility = this.facility(
        o.facilityId,
        leg === 'inbound' ? method : o.fulfillment!.inbound.method,
        leg === 'outbound' ? method : o.fulfillment!.outbound.method,
      );
      if (method === 'CUSTOMER')
        address = {
          street: facility.address,
          number: '',
          neighborhood: facility.zone,
          city: facility.city,
          coordinates: facility.coordinates,
        };
      if (method === 'DRIVER' && !this.port.covers(address, o.facilityId))
        throw Error('Dirección fuera de cobertura.');
      if (
        f.method === method &&
        f.timeSlotId === slotId &&
        JSON.stringify(f.address) === JSON.stringify(address)
      )
        return;
      const before = JSON.parse(JSON.stringify(f));
      if (f.driverId) {
        const d = s.drivers.find((d) => d.id === f.driverId);
        if (d) {
          d.activeOrders = Math.max(0, d.activeOrders - 1);
          d.status = d.activeOrders ? 'ON_SERVICE' : 'AVAILABLE';
        }
      }
      s.routeStops
        .filter(
          (stop) =>
            stop.orderId === id &&
            stop.leg === leg &&
            stop.status !== 'COMPLETED',
        )
        .forEach((stop) => (stop.status = 'SKIPPED'));
      f.method = method;
      f.address = address;
      f.driverId = undefined;
      f.driverAssignmentId = undefined;
      f.milestone = 'PENDING';
      f.status = 'SCHEDULED';
      this.reserve(s, o, leg, slotId);
      o.fulfillment!.mode = modeFor(
        o.fulfillment!.inbound.method,
        o.fulfillment!.outbound.method,
      );
      if (leg === 'inbound') {
        o.customerAddress = address;
        o.pickup = { date: f.date, timeSlot: f.timeSlot };
      } else {
        o.deliveryAddress = address;
        o.delivery = {
          targetDate: f.date,
          timeSlot: f.timeSlot,
          recipientName: o.customerName,
          recipientPhone: o.customerPhone,
        };
      }
      s.handoffs
        .filter(
          (h) =>
            h.orderId === id &&
            h.status !== 'USED' &&
            (leg === 'inbound'
              ? [
                  'CUSTOMER_TO_DRIVER',
                  'DRIVER_TO_FACILITY',
                  'CUSTOMER_TO_FACILITY',
                ]
              : [
                  'FACILITY_TO_DRIVER',
                  'DRIVER_TO_CUSTOMER',
                  'FACILITY_TO_CUSTOMER',
                ]
            ).includes(h.type),
        )
        .forEach((h) => {
          h.status = 'REVOKED';
          h.updatedAt = this.now();
          s.handoffAudits.push({
            id: this.id('HA'),
            handoffId: h.id,
            orderId: id,
            action: 'CHANGE_REVOKED',
            actorId: this.actor().id,
            actorRole: 'CLIENT',
            at: this.now(),
            reason,
            localValidation: true,
          });
        });
      o.fulfillment![leg].handoffIds = [];
      this.port.handoffs.initialize(s, o, false, false);
      const entry = s.timeSlots.find(
          (x) => x.id === o.fulfillment!.inbound.timeSlotId,
        ),
        exit = s.timeSlots.find(
          (x) => x.id === o.fulfillment!.outbound.timeSlotId,
        );
      if (
        entry &&
        exit &&
        new Date(`${exit.date}T${exit.start}:00`).getTime() <
          new Date(`${entry.date}T${entry.start}:00`).getTime() +
            (o.processingHours ?? 24) * 3600000
      )
        throw Error('La salida debe respetar el tiempo de procesamiento.');
      o.pricing.deliveryFee =
        (o.fulfillment!.inbound.method === 'DRIVER'
          ? (s.businessPolicy.pickupFee ?? 0)
          : 0) +
        (o.fulfillment!.outbound.method === 'DRIVER'
          ? (s.businessPolicy.deliveryFee ?? 0)
          : 0);
      this.recalculate(s, o);
      s.changes.push({
        id: this.id('CHG'),
        orderId: id,
        actorId: this.actor().id,
        reason,
        before,
        after: JSON.parse(JSON.stringify(f)),
        at: this.now(),
      });
      this.update(s, o, 'Modalidad o agenda actualizada');
      this.notify(
        s,
        o,
        'RESCHEDULE',
        'Agenda actualizada. Los códigos anteriores sin usar fueron revocados.',
      );
    });
  }
  cancel(id: string, reason: string) {
    this.port.transaction((s) => {
      const o = this.order(s, id);
      this.client(o);
      if (o.status === 'CANCELLED') return;
      if (!reason.trim()) throw Error('Indica el motivo de cancelación.');
      if (
        o.fulfillment!.inbound.startedAt ||
        !['PENDING', 'ASSIGNED'].includes(o.fulfillment!.inbound.milestone) ||
        o.fulfillment!.inbound.status === 'COMPLETED'
      )
        throw Error('La custodia ya inició. Contacta a operaciones.');
      const slot = s.timeSlots.find(
        (x) => x.id === o.fulfillment!.inbound.timeSlotId,
      );
      const late =
        slot &&
        s.businessPolicy.cutoffMinutes !== undefined &&
        new Date(`${slot.date}T${slot.start}:00`).getTime() -
          (this.port.now?.() ?? new Date()).getTime() <
          s.businessPolicy.cutoffMinutes * 60000;
      if (
        late &&
        s.businessPolicy.lateCancellationFee !== undefined &&
        s.businessPolicy.lateCancellationFee > 0
      )
        this.charge(
          s,
          o,
          'LATE_CANCELLATION',
          s.businessPolicy.lateCancellationFee,
        );
      this.release(s, id);
      for (const f of [o.fulfillment!.inbound, o.fulfillment!.outbound]) {
        if (f.driverId) {
          const d = s.drivers.find((d) => d.id === f.driverId);
          if (d) {
            d.activeOrders = Math.max(0, d.activeOrders - 1);
            d.status = d.activeOrders ? 'ON_SERVICE' : 'AVAILABLE';
          }
        }
        f.status = 'CANCELLED';
      }
      s.routeStops
        .filter((stop) => stop.orderId === id && stop.status !== 'COMPLETED')
        .forEach((stop) => (stop.status = 'SKIPPED'));
      s.handoffs
        .filter((h) => h.orderId === id && h.status !== 'USED')
        .forEach((h) => {
          h.status = 'REVOKED';
          s.handoffAudits.push({
            id: this.id('HA'),
            handoffId: h.id,
            orderId: id,
            action: 'REVOKED',
            actorId: this.actor().id,
            actorRole: 'CLIENT',
            at: this.now(),
            reason,
            localValidation: true,
          });
        });
      o.status = 'CANCELLED';
      o.policyReview = o.pricing.amountPaid
        ? 'Reembolso de pagos en revisión; no se realizó una devolución automática.'
        : undefined;
      this.update(s, o, 'Cancelación: ' + reason);
      this.notify(
        s,
        o,
        'CANCELLED',
        'Solicitud cancelada. Consulta los cargos o pagos pendientes en tu cuenta.',
      );
    });
  }
  private charge(
    s: BusinessState,
    o: Order,
    reason: CustomerCharge['reason'],
    amount: number,
  ) {
    if (s.charges.some((c) => c.orderId === o.id && c.reason === reason))
      return;
    s.charges.push({
      id: this.id('CHARGE'),
      orderId: o.id,
      customerId: o.customerId,
      reason,
      amount: money(amount),
      status: 'PENDING',
      createdAt: this.now(),
    });
    this.notify(
      s,
      o,
      'CHARGE',
      'Se registró un cargo según la configuración local de demostración.',
    );
  }
  recordFailure(
    id: string,
    reason: 'NO_SHOW' | 'FAILED_PICKUP',
    message: string,
  ) {
    this.port.transaction((s) => {
      const o = this.order(s, id);
      const a = this.actor();
      if (a.role === 'DRIVER') {
        if (
          o.fulfillment?.inbound.driverId !== a.id ||
          !['EN_ROUTE', 'ARRIVED'].includes(o.fulfillment.inbound.milestone)
        )
          throw Error('No tienes una recogida activa asignada.');
      } else this.staff(o);
      this.blocked(s, o);
      if (
        o.fulfillment?.inbound.status === 'COMPLETED' ||
        !['AWAITING_INTAKE', 'PAYMENT_PENDING'].includes(o.status)
      )
        throw Error('La recogida ya finalizó o no está disponible.');
      if (!message.trim()) throw Error('Indica el motivo.');
      const fee =
        reason === 'NO_SHOW'
          ? s.businessPolicy.noShowFee
          : s.businessPolicy.failedPickupFee;
      if (fee !== undefined && fee > 0) this.charge(s, o, reason, fee);
      else
        o.policyReview =
          'Cargo por ausencia o recogida fallida en revisión; no se aplicó un importe.';
      s.incidents.push({
        id: this.id('INC'),
        orderId: id,
        customerId: o.customerId,
        customerName: o.customerName,
        type: 'CLIENTE_AUSENTE',
        severity: 'MEDIA',
        status: 'OPEN',
        description: message,
        evidences: [],
        assignedTo: 'Operaciones',
        reportedBy: a.name,
        reportedRole: a.role,
        createdAt: this.now(),
        internalNotes: [],
      });
      s.routeStops
        .filter(
          (stop) =>
            stop.orderId === id &&
            stop.leg === 'inbound' &&
            stop.status === 'ACTIVE',
        )
        .forEach((stop) => (stop.status = 'SKIPPED'));
      o.previousStatus = o.status;
      o.status = 'INCIDENT';
      o.customerMessage =
        'No se pudo completar la recogida. Contacta a operaciones.';
      this.update(s, o, 'Recogida no completada');
    });
  }
  resolveFailedPickup(id: string, reason: string, customerMessage: string) {
    this.port.transaction((s) => {
      const order = this.order(s, id);
      this.staff(order);
      const leg = order.fulfillment!.inbound;
      const incidents = s.incidents.filter(
        (i) =>
          i.orderId === id &&
          i.type === 'CLIENTE_AUSENTE' &&
          i.status !== 'RESOLVED',
      );
      if (
        !incidents.length ||
        leg.status === 'COMPLETED' ||
        s.handoffs.some(
          (h) =>
            h.orderId === id &&
            ['CUSTOMER_TO_DRIVER', 'CUSTOMER_TO_FACILITY'].includes(h.type) &&
            h.status === 'USED',
        )
      )
        throw Error('Esta recogida no admite una nueva agenda.');
      if (!reason.trim() || !customerMessage.trim())
        throw Error('Incluye un motivo interno y un mensaje para el cliente.');
      incidents.forEach((i) => {
        i.status = 'RESOLVED';
        i.resolutionNotes = reason;
        i.resolvedAt = this.now();
      });
      if (leg.driverId) {
        const driver = s.drivers.find((d) => d.id === leg.driverId);
        if (driver) {
          driver.activeOrders = Math.max(0, driver.activeOrders - 1);
          driver.status = driver.activeOrders ? 'ON_SERVICE' : 'AVAILABLE';
        }
      }
      this.release(s, id, 'inbound');
      s.routeStops
        .filter(
          (stop) =>
            stop.orderId === id &&
            stop.leg === 'inbound' &&
            stop.status !== 'COMPLETED',
        )
        .forEach((stop) => (stop.status = 'SKIPPED'));
      s.handoffs
        .filter(
          (h) =>
            h.orderId === id &&
            [
              'CUSTOMER_TO_DRIVER',
              'DRIVER_TO_FACILITY',
              'CUSTOMER_TO_FACILITY',
            ].includes(h.type) &&
            h.status !== 'USED',
        )
        .forEach((h) => {
          h.status = 'REVOKED';
          s.handoffAudits.push({
            id: this.id('HA'),
            handoffId: h.id,
            orderId: id,
            action: 'FAILED_PICKUP_REVOKED',
            actorId: this.actor().id,
            actorRole: this.actor().role,
            at: this.now(),
            reason,
            localValidation: true,
          });
        });
      Object.assign(leg, {
        status: 'SCHEDULED',
        milestone: 'PENDING',
        startedAt: undefined,
        driverId: undefined,
        driverAssignmentId: undefined,
        timeSlotId: undefined,
        date: '',
        timeSlot: '',
        handoffIds: [],
      });
      order.pickup = { date: '', timeSlot: '' };
      order.status =
        order.pricing.amountKnown !== false &&
        order.pricing.paymentStatus !== 'PAID'
          ? 'PAYMENT_PENDING'
          : 'AWAITING_INTAKE';
      order.customerMessage = customerMessage;
      this.port.handoffs.initialize(s, order, false, false);
      this.update(
        s,
        order,
        'Recogida fallida resuelta; pendiente de nueva agenda',
      );
      this.audit(s, 'Resolución de recogida fallida', id, reason);
      this.notify(s, order, 'RESCHEDULE_REQUIRED', customerMessage);
    });
  }
  settleCharge(id: string, waive = false, reason = '') {
    this.port.transaction((s) => {
      const charge = s.charges.find((c) => c.id === id);
      if (!charge) throw Error('Cargo no encontrado.');
      if (waive) {
        this.staff(undefined, true);
        if (!reason.trim()) throw Error('Indica el motivo de exoneración.');
      } else this.client(this.order(s, charge.orderId));
      if (charge.status !== 'PENDING') return;
      charge.status = waive ? 'WAIVED' : 'PAID';
      charge.waivedReason = waive ? reason : undefined;
      this.audit(
        s,
        waive ? 'Cargo exonerado' : 'Cargo pagado en demo',
        charge.orderId,
        reason,
      );
    });
  }
  assign(id: string, driverId: string, leg: 'inbound' | 'outbound') {
    this.port.transaction((s) => {
      const o = this.order(s, id);
      this.staff(o);
      this.blocked(s, o);
      const f = o.fulfillment![leg];
      if (
        f.method !== 'DRIVER' ||
        f.driverId ||
        f.milestone !== 'PENDING' ||
        (leg === 'inbound' && o.status !== 'AWAITING_INTAKE') ||
        (leg === 'outbound' && o.status !== 'READY')
      )
        throw Error('El tramo no está disponible para asignación.');
      if (leg === 'outbound' && o.pricing.paymentStatus !== 'PAID')
        throw Error('Falta el pago del servicio.');
      const d = s.drivers.find((d) => d.id === driverId);
      if (
        !d ||
        !['AVAILABLE', 'ON_SERVICE'].includes(d.status) ||
        d.facilityId !== o.facilityId
      )
        throw Error('Chofer no autorizado para esta sede.');
      const address = (f.address ??
        (leg === 'inbound' ? o.customerAddress : o.deliveryAddress)) as Address;
      if (!this.port.covers(address, o.facilityId))
        throw Error('Dirección fuera de cobertura.');
      const zone = this.port.zoneFor?.(address, o.facilityId);
      if (zone && zone !== d.zoneId && !d.authorizedZoneIds?.includes(zone))
        throw Error('Chofer no autorizado para esta zona.');
      if (
        s.businessPolicy.enforceDriverLimit &&
        d.activeOrders >= (s.businessPolicy.driverLimit ?? d.maxOrders)
      )
        throw Error('Chofer en el límite configurado.');
      f.driverId = d.id;
      f.driverAssignmentId = this.id('ASN');
      f.milestone = 'ASSIGNED';
      d.activeOrders++;
      d.status = 'ON_SERVICE';
      const schedule = leg === 'inbound' ? o.pickup : o.delivery;
      schedule.driverId = d.id;
      schedule.driverName = d.name;
      schedule.vehiclePlate = d.vehiclePlate;
      const facility = this.port
        .facilities()
        .find((fac) => fac.id === o.facilityId)!;
      const facilityAddress = {
        street: facility.address,
        number: '',
        city: facility.city,
        neighborhood: facility.zone,
        coordinates: facility.coordinates,
      };
      const offset =
        Math.max(
          -1,
          ...s.routeStops
            .filter((x) => x.driverId === d.id)
            .map((x) => x.position),
        ) + 1;
      for (const [index, type] of (leg === 'inbound'
        ? ['PICKUP', 'FACILITY_DROPOFF']
        : ['FACILITY_PICKUP', 'DELIVERY']
      ).entries())
        s.routeStops.push({
          id: this.id('STOP'),
          driverId: d.id,
          orderId: id,
          leg,
          position: offset + index,
          status: 'PENDING',
          type: type as RouteStop['type'],
          address:
            type === 'FACILITY_DROPOFF' || type === 'FACILITY_PICKUP'
              ? facilityAddress
              : address,
          slotId:
            type === 'PICKUP' || type === 'DELIVERY' ? f.timeSlotId : undefined,
          assignmentId: f.driverAssignmentId,
        });
      this.update(s, o, 'Chofer asignado');
    });
  }
  driverAdvance(
    id: string,
    leg: 'inbound' | 'outbound',
    target: 'EN_ROUTE' | 'ARRIVED' | 'TO_FACILITY' | 'ARRIVED_AT_FACILITY',
  ) {
    this.port.transaction((s) => {
      const o = this.order(s, id);
      this.blocked(s, o);
      const a = this.actor();
      const f = o.fulfillment![leg];
      if (a.role !== 'DRIVER' || f.driverId !== a.id || !f.driverAssignmentId)
        throw Error('No tienes este tramo asignado.');
      const allowed: Record<string, string> = {
        EN_ROUTE: leg === 'outbound' ? 'RELEASED' : 'ASSIGNED',
        ARRIVED: 'EN_ROUTE',
        TO_FACILITY: 'COLLECTED',
        ARRIVED_AT_FACILITY: 'TO_FACILITY',
      };
      if (f.milestone !== allowed[target])
        throw Error('La etapa anterior no está confirmada.');
      if (
        leg === 'outbound' &&
        s.handoffs.find(
          (h) =>
            h.orderId === id &&
            h.type === 'FACILITY_TO_DRIVER' &&
            h.status === 'USED',
        ) === undefined
      )
        throw Error('Confirma la salida física desde planta primero.');
      if (
        leg === 'outbound' &&
        ['TO_FACILITY', 'ARRIVED_AT_FACILITY'].includes(target)
      )
        throw Error('Etapa inválida.');
      f.startedAt ??= this.now();
      f.milestone = target;
      f.status = ['ARRIVED', 'ARRIVED_AT_FACILITY'].includes(target)
        ? 'AWAITING_HANDOFF'
        : 'IN_PROGRESS';
      const stopType =
        leg === 'outbound'
          ? 'DELIVERY'
          : ['TO_FACILITY', 'ARRIVED_AT_FACILITY'].includes(target)
            ? 'FACILITY_DROPOFF'
            : 'PICKUP';
      const stop = s.routeStops.find(
        (x) =>
          x.orderId === id &&
          x.type === stopType &&
          x.assignmentId === f.driverAssignmentId,
      );
      if (
        s.routeStops.some(
          (x) =>
            x.driverId === a.id && x.status === 'ACTIVE' && x.id !== stop?.id,
        )
      )
        throw Error('Completa la parada activa antes de iniciar otra.');
      if (stop) stop.status = 'ACTIVE';
      this.update(s, o, 'Chofer: ' + target);
    });
  }
  reorder(driverId: string, ids: string[]) {
    this.port.transaction((s) => {
      const a = this.actor();
      if (a.role === 'DRIVER') {
        if (a.id !== driverId || !s.businessPolicy.driverMayReorder)
          throw Error('Reordenamiento del chofer pendiente de aprobación.');
      } else this.staff();
      const stops = s.routeStops.filter(
        (x) => x.driverId === driverId && x.status === 'PENDING',
      );
      if (
        ids.length !== stops.length ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !stops.some((x) => x.id === id))
      )
        throw Error('Solo se pueden ordenar las paradas pendientes.');
      const positions = stops
        .map((stop) => stop.position)
        .sort((a, b) => a - b);
      for (const stop of stops.filter((x) =>
        ['FACILITY_DROPOFF', 'DELIVERY'].includes(x.type),
      )) {
        const prerequisite = stops.find(
          (x) =>
            x.orderId === stop.orderId &&
            x.type ===
              (stop.type === 'DELIVERY' ? 'FACILITY_PICKUP' : 'PICKUP'),
        );
        if (prerequisite && ids.indexOf(prerequisite.id) > ids.indexOf(stop.id))
          throw Error(
            'Primero debe completarse la transferencia previa de este pedido.',
          );
      }
      let previous = '';
      ids.forEach((id, index) => {
        const stop = stops.find((x) => x.id === id)!;
        const slot = s.timeSlots.find((x) => x.id === stop.slotId);
        const when = slot ? `${slot.date} ${slot.start}` : '';
        if (when && previous && when < previous)
          throw Error('El orden propuesto contradice las ventanas reservadas.');
        previous = when || previous;
        stop.position = positions[index];
      });
      this.audit(s, 'Ruta reordenada', undefined, driverId);
    });
  }
  savePolicy(policy: BusinessPolicy) {
    this.staff(undefined, true);
    this.port.transaction((s) => {
      for (const key of [
        'minimumOrderAmount',
        'taxRate',
        'pickupFee',
        'deliveryFee',
        'cutoffMinutes',
        'lateCancellationFee',
        'noShowFee',
        'failedPickupFee',
        'driverLimit',
      ] as const) {
        const value = policy[key];
        if (value !== undefined && (!Number.isFinite(value) || value < 0))
          throw Error('La configuración contiene un valor inválido.');
      }
      if (policy.taxRate !== undefined && policy.taxRate > 1)
        throw Error('El IVA debe expresarse entre 0 y 1.');
      if (policy.enforceDriverLimit && !(policy.driverLimit! > 0))
        throw Error('Configura un límite positivo.');
      s.businessPolicy = JSON.parse(JSON.stringify(policy));
      this.audit(s, 'Configuración del negocio actualizada');
    });
  }
  saveSlot(slot: TimeSlot) {
    this.staff(undefined, true);
    this.port.transaction((s) => {
      if (
        !this.port.facilities().some((f) => f.id === slot.facilityId) ||
        !this.withinHours(slot) ||
        !Number.isInteger(slot.capacity) ||
        slot.capacity < 1 ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) ||
        slot.start >= slot.end ||
        !/^\d{4}-\d{2}-\d{2}$/.test(slot.date) ||
        !Number.isFinite(Date.parse(slot.date)) ||
        new Date(slot.date).toISOString().slice(0, 10) !== slot.date
      )
        throw Error('Revisa sede, fecha, horario y capacidad.');
      const current = s.timeSlots.find((x) => x.id === slot.id);
      if (current && slot.capacity < current.reservedCount)
        throw Error('La capacidad no puede ser inferior a las reservas.');
      if (
        current &&
        current.reservedCount > 0 &&
        (current.date !== slot.date ||
          current.start !== slot.start ||
          current.end !== slot.end ||
          current.facilityId !== slot.facilityId ||
          current.context !== slot.context)
      )
        throw Error(
          'No cambies el horario de una franja ya reservada; crea otra.',
        );
      if (current)
        Object.assign(current, {
          ...slot,
          reservedCount: current.reservedCount,
        });
      else s.timeSlots.push({ ...slot, reservedCount: 0 });
      this.audit(s, 'Franja actualizada');
    });
  }
  sendMessage(id: string, channel: 'DRIVER' | 'OPERATIONS', text: string) {
    this.port.transaction((s) => {
      const o = this.order(s, id),
        a = this.actor();
      if (!text.trim()) throw Error('Escribe un mensaje.');
      let recipient = 'OPERATIONS';
      if (a.role === 'CLIENT') {
        this.client(o);
        if (channel === 'DRIVER') {
          const leg =
            o.status === 'READY'
              ? o.fulfillment!.outbound
              : o.fulfillment!.inbound;
          if (!leg.driverId || leg.status === 'COMPLETED' || terminal(o))
            throw Error('No hay un chofer activo para este pedido.');
          recipient = leg.driverId;
        }
      } else if (a.role === 'DRIVER') {
        const leg =
          o.status === 'READY'
            ? o.fulfillment!.outbound
            : o.fulfillment!.inbound;
        if (
          channel !== 'DRIVER' ||
          leg.driverId !== a.id ||
          leg.status === 'COMPLETED' ||
          terminal(o)
        )
          throw Error('No tienes una asignación activa para este chat.');
        recipient = o.customerId;
      } else {
        this.staff(o);
        if (channel !== 'OPERATIONS') throw Error('Canal no autorizado.');
        recipient = o.customerId;
      }
      s.messages.push({
        id: this.id('MSG'),
        orderId: id,
        senderId: a.id,
        recipientId: recipient,
        channel,
        text: text.trim(),
        at: this.now(),
      });
    });
  }
  markNotificationsRead() {
    this.port.transaction((s) => {
      const a = this.actor();
      if (a.role !== 'CLIENT')
        throw Error('Solo el cliente puede leer sus notificaciones.');
      s.notifications
        .filter((n) => n.customerId === a.id)
        .forEach((n) => (n.read = true));
    });
  }
  customerView(id: string) {
    const s = this.port.read(),
      o = this.order(s, id);
    this.client(o);
    const {
      quarantineNotes: _,
      quarantineReason: __,
      intakeHold: ___,
      ...safe
    } = o;
    return {
      order: {
        ...safe,
        timeline: safe.timeline
          .filter((t) => !t.isOverride)
          .map(({ notes: _, ...t }) => t),
      },
      adjustments: s.adjustments
        .filter((a) => a.orderId === id)
        .map(({ reason: _, ...a }) => a),
      charges: s.charges.filter((c) => c.orderId === id),
      notifications: s.notifications.filter((n) => n.orderId === id),
      payments: s.payments.filter((p) => p.orderId === id),
      messages: s.messages.filter(
        (m) =>
          m.orderId === id &&
          (m.senderId === this.actor().id || m.recipientId === this.actor().id),
      ),
    };
  }
}
