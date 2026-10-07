/** Portable local demo contract. Both apps use equivalent data, never runtime synchronization. */
export type FulfillmentMode = 'HOME_HOME' | 'HOME_STORE' | 'STORE_HOME' | 'STORE_STORE';
export const modeFor = (inbound: 'DRIVER' | 'CUSTOMER', outbound: 'DRIVER' | 'CUSTOMER'): FulfillmentMode =>
  `${inbound === 'DRIVER' ? 'HOME' : 'STORE'}_${outbound === 'DRIVER' ? 'HOME' : 'STORE'}` as FulfillmentMode;
export const handoffTypesFor = (mode: FulfillmentMode): HandoffType[] => [
  ...(mode.startsWith('HOME') ? ['CUSTOMER_TO_DRIVER', 'DRIVER_TO_FACILITY'] : ['CUSTOMER_TO_FACILITY']),
  ...(mode.endsWith('HOME') ? ['FACILITY_TO_DRIVER', 'DRIVER_TO_CUSTOMER'] : ['FACILITY_TO_CUSTOMER']),
] as HandoffType[];
export type BusinessStatus =
  | 'DRAFT'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'AWAITING_INTAKE'
  | 'AT_FACILITY'
  | 'WEIGHING'
  | 'INSPECTION'
  | 'PRICING_PENDING'
  | 'CUSTOMER_APPROVAL_PENDING'
  | 'IN_PROCESS'
  | 'QUALITY_CONTROL'
  | 'READY'
  | 'COMPLETED'
  | 'INCIDENT'
  | 'CANCELLED';
export type LegStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'AWAITING_HANDOFF'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type Milestone =
  | 'PENDING'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'COLLECTED'
  | 'TO_FACILITY'
  | 'ARRIVED_AT_FACILITY'
  | 'RELEASED'
  | 'DELIVERED';
export interface FulfillmentLeg {
  method: 'DRIVER' | 'CUSTOMER';
  facilityId: string;
  address?: unknown;
  date: string;
  timeSlot: string;
  timeSlotId?: string;
  driverAssignmentId?: string;
  driverId?: string;
  handoffIds: string[];
  status: LegStatus;
  milestone: Milestone;
  startedAt?: string;
  completedAt?: string;
}
export interface Fulfillment {
  mode: FulfillmentMode;
  inbound: FulfillmentLeg;
  outbound: FulfillmentLeg;
}
export type HandoffType =
  | 'CUSTOMER_TO_FACILITY'
  | 'CUSTOMER_TO_DRIVER'
  | 'DRIVER_TO_FACILITY'
  | 'FACILITY_TO_DRIVER'
  | 'DRIVER_TO_CUSTOMER'
  | 'FACILITY_TO_CUSTOMER';
export type HandoffStatus =
  'PENDING' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED' | 'LOCKED';
export type ActorRole = 'CLIENT' | 'DRIVER' | 'SUPERVISOR' | 'ADMIN' | 'SYSTEM';
export interface Actor {
  id: string;
  role: ActorRole;
  facilityId?: string;
  name: string;
}
export interface Handoff {
  id: string;
  orderId: string;
  type: HandoffType;
  facilityId: string;
  driverAssignmentId?: string;
  qrToken: string;
  fallbackCode: string;
  generation: number;
  status: HandoffStatus;
  attempts: number;
  maxAttempts: number;
  activatedAt?: string;
  expiresAt?: string;
  usedAt?: string;
  usedByUserId?: string;
  previousHandoffId?: string;
  createdAt: string;
  updatedAt: string;
  receipt?: {
    count?: number;
    declaredCount?: number;
    recipient?: string;
    relationship?: string;
    notes?: string;
    localValidation: true;
  };
}
export interface HandoffAudit {
  id: string;
  handoffId: string;
  orderId: string;
  action: string;
  actorId: string;
  actorRole: ActorRole;
  at: string;
  reason?: string;
  localValidation: true;
}
export interface IntakeHold {
  handoffId: string;
  declared: number;
  received: number;
  description: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}
export interface WorkflowOrder {
  id: string;
  customerId: string;
  facilityId: string;
  status: string;
  fulfillment?: Fulfillment;
  intakeHold?: IntakeHold;
  workflowVersion?: number;
  updatedAt: string;
  pickup?: {
    date: string;
    timeSlot: string;
    driverId?: string;
    driverAssignmentId?: string;
    address?: unknown;
  };
  delivery?: {
    date?: string;
    targetDate?: string;
    timeSlot: string;
    driverId?: string;
    driverAssignmentId?: string;
    address?: unknown;
  };
  customerAddress?: unknown;
  deliveryAddress?: unknown;
  quarantineReason?: string;
}

const inboundStages: Record<string, Milestone> = {
  PICKUP_ASSIGNED: 'ASSIGNED',
  HEADING_TO_PICKUP: 'EN_ROUTE',
  ARRIVED_FOR_PICKUP: 'ARRIVED',
  PICKED_UP: 'COLLECTED',
  HEADING_TO_FACILITY: 'TO_FACILITY',
  ARRIVED_AT_FACILITY: 'ARRIVED_AT_FACILITY',
};
const outboundStages: Record<string, Milestone> = {
  DELIVERY_ASSIGNED: 'ASSIGNED',
  OUT_FOR_DELIVERY: 'EN_ROUTE',
  ARRIVED_FOR_DELIVERY: 'ARRIVED',
  DELIVERED: 'DELIVERED',
  CLOSED: 'DELIVERED',
};

/** Read old rows once without inventing custody evidence or deleting existing history. */
export function migrateOrder(
  order: WorkflowOrder,
  mode: FulfillmentMode = 'HOME_HOME',
): void {
  if (order.workflowVersion === 2 && order.fulfillment) return;
  const original = order.status;
  if (original === 'QUARANTINE')
    order.quarantineReason ??= 'Revisión técnica pendiente (registro anterior)';
  const completed = ['DELIVERED', 'CLOSED', 'COMPLETED'].includes(original);
  const intakeComplete =
    completed ||
    [
      'AT_FACILITY',
      'IN_PROCESS',
      'QUALITY_CONTROL',
      'READY_FOR_DELIVERY',
      'DELIVERY_SCHEDULED',
      'DELIVERY_ASSIGNED',
      'OUT_FOR_DELIVERY',
      'ARRIVED_FOR_DELIVERY',
      'READY',
      'QUARANTINE',
    ].includes(original);
  const leg = (out: boolean): FulfillmentLeg => ({
    method: (out ? mode.endsWith('STORE') : mode.startsWith('STORE')) ? 'CUSTOMER' : 'DRIVER',
    facilityId: order.facilityId,
    address: out
      ? (order.delivery?.address ?? order.deliveryAddress)
      : (order.pickup?.address ?? order.customerAddress),
    date: out
      ? (order.delivery?.date ?? order.delivery?.targetDate ?? '')
      : (order.pickup?.date ?? ''),
    timeSlot: (out ? order.delivery : order.pickup)?.timeSlot ?? '',
    driverAssignmentId: (out ? order.delivery : order.pickup)
      ?.driverAssignmentId,
    driverId: (out ? order.delivery : order.pickup)?.driverId,
    handoffIds: [],
    status: (out ? completed : intakeComplete) ? 'COMPLETED' : 'SCHEDULED',
    milestone: out
      ? (outboundStages[original] ?? 'PENDING')
      : intakeComplete
        ? 'DELIVERED'
        : (inboundStages[original] ?? 'PENDING'),
  });
  order.fulfillment = { mode, inbound: leg(false), outbound: leg(true) };
  order.status = completed
    ? 'COMPLETED'
    : original === 'QUARANTINE'
      ? 'INCIDENT'
      : [
            'READY_FOR_DELIVERY',
            'DELIVERY_SCHEDULED',
            'DELIVERY_ASSIGNED',
            'OUT_FOR_DELIVERY',
            'ARRIVED_FOR_DELIVERY',
          ].includes(original)
        ? 'READY'
        : ['CREATED', 'PICKUP_PENDING', ...Object.keys(inboundStages)].includes(
              original,
            )
          ? 'AWAITING_INTAKE'
          : original;
  order.workflowVersion = 2;
}

/** Existing map/dispatch views consume a derived logistics stage, never a second order status. */
export function operationalStage<
  T extends {
    status: string;
    fulfillment?: Fulfillment;
    quarantineReason?: string;
    intakeHold?: IntakeHold;
  },
>(order: T): T['status'] {
  const f = order.fulfillment;
  if (!f) return order.status;
  if (order.status === 'INCIDENT' && order.quarantineReason)
    return 'QUARANTINE' as T['status'];
  if ((order.status === 'AWAITING_INTAKE' && f.inbound.method === 'CUSTOMER') || (order.status === 'READY' && f.outbound.method === 'CUSTOMER') || order.status === 'COMPLETED')
    return (
      order.status === 'READY'
        ? 'READY_FOR_DELIVERY'
        : order.status === 'COMPLETED'
          ? 'CLOSED'
          : order.status
    ) as T['status'];
  if (order.status === 'AWAITING_INTAKE')
    return {
      PENDING: 'PICKUP_PENDING',
      ASSIGNED: 'PICKUP_ASSIGNED',
      EN_ROUTE: 'HEADING_TO_PICKUP',
      ARRIVED: 'ARRIVED_FOR_PICKUP',
      COLLECTED: 'PICKED_UP',
      TO_FACILITY: 'HEADING_TO_FACILITY',
      ARRIVED_AT_FACILITY: 'ARRIVED_AT_FACILITY',
      RELEASED: 'PICKED_UP',
      DELIVERED: 'AT_FACILITY',
    }[f.inbound.milestone] as T['status'];
  if (order.status === 'READY')
    return {
      PENDING: 'DELIVERY_SCHEDULED',
      ASSIGNED: 'DELIVERY_ASSIGNED',
      EN_ROUTE: 'OUT_FOR_DELIVERY',
      ARRIVED: 'ARRIVED_FOR_DELIVERY',
      RELEASED: 'DELIVERY_ASSIGNED',
      DELIVERED: 'DELIVERED',
      COLLECTED: 'DELIVERY_ASSIGNED',
      TO_FACILITY: 'DELIVERY_ASSIGNED',
      ARRIVED_AT_FACILITY: 'DELIVERY_ASSIGNED',
    }[f.outbound.milestone] as T['status'];
  return (
    order.status === 'COMPLETED' ? 'CLOSED' : order.status
  ) as T['status'];
}

export function advanceOperational(order: WorkflowOrder, target: string): void {
  migrateOrder(order);
  const f = order.fulfillment!;
  if (
    target in inboundStages ||
    target === 'PICKUP_PENDING' ||
    target === 'CREATED'
  ) {
    order.status = 'AWAITING_INTAKE';
    f.inbound.milestone = inboundStages[target] ?? 'PENDING';
    f.inbound.status = ['ARRIVED', 'ARRIVED_AT_FACILITY'].includes(
      f.inbound.milestone,
    )
      ? 'AWAITING_HANDOFF'
      : f.inbound.milestone === 'ASSIGNED'
        ? 'SCHEDULED'
        : f.inbound.milestone === 'PENDING'
          ? 'PENDING'
          : 'IN_PROGRESS';
  } else if (target in outboundStages) {
    order.status = ['DELIVERED', 'CLOSED'].includes(target)
      ? 'COMPLETED'
      : 'READY';
    f.outbound.milestone = outboundStages[target];
    f.outbound.status =
      order.status === 'COMPLETED'
        ? 'COMPLETED'
        : f.outbound.milestone === 'ARRIVED'
          ? 'AWAITING_HANDOFF'
          : f.outbound.milestone === 'ASSIGNED'
            ? 'SCHEDULED'
            : 'IN_PROGRESS';
  } else if (['READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED'].includes(target))
    order.status = 'READY';
  else if (target === 'QUARANTINE') order.status = 'INCIDENT';
  else {
    order.status = target;
    if (target === 'AT_FACILITY') {
      f.inbound.status = 'COMPLETED';
      f.inbound.milestone = 'DELIVERED';
      f.inbound.completedAt = new Date().toISOString();
    }
  }
  order.updatedAt = new Date().toISOString();
}

export const HANDOFF_LABELS: Record<HandoffType, string> = {
  CUSTOMER_TO_FACILITY: 'Ingreso del cliente en sede',
  CUSTOMER_TO_DRIVER: 'Recogida a domicilio',
  DRIVER_TO_FACILITY: 'Ingreso del chofer en planta',
  FACILITY_TO_DRIVER: 'Salida de planta con chofer',
  DRIVER_TO_CUSTOMER: 'Entrega a domicilio',
  FACILITY_TO_CUSTOMER: 'Retiro del cliente en sede',
};
