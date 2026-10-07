import type {
  Fulfillment,
  IntakeHold,
  ActorRole,
} from '../services/fulfillment';
export type UserRole = 'ADMIN' | 'SUPERVISOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  facilityId?: string;
}

export type OrderPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export type OrderStatus =
  | 'DRAFT'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'AWAITING_INTAKE'
  | 'READY'
  | 'COMPLETED'
  | 'ARRIVED_AT_FACILITY'
  | 'CREATED'
  | 'PICKUP_PENDING'
  | 'PICKUP_ASSIGNED'
  | 'HEADING_TO_PICKUP'
  | 'ARRIVED_FOR_PICKUP'
  | 'HEADING_TO_FACILITY'
  | 'ARRIVED_FOR_DELIVERY'
  | 'PICKED_UP'
  | 'AT_FACILITY'
  | 'WEIGHING'
  | 'INSPECTION'
  | 'PRICING_PENDING'
  | 'CUSTOMER_APPROVAL_PENDING'
  | 'IN_PROCESS'
  | 'QUALITY_CONTROL'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERY_SCHEDULED'
  | 'DELIVERY_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CLOSED'
  | 'INCIDENT'
  | 'CANCELLED'
  | 'QUARANTINE';

export type SLARisk = 'ON_TIME' | 'ATTENTION' | 'AT_RISK' | 'OVERDUE';

export interface OrderItem {
  pricingModel?: 'FIXED' | 'PER_WEIGHT';
  restrictions?: string[];
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  category: 'PRENDAS' | 'HOGAR' | 'DELICADOS' | 'INDUSTRIAL';
  notes?: string;
}

export interface OrderExtra {
  id: string;
  name: string;
  price: number;
}

export interface OrderPricing {
  pricingModel?: 'FIXED' | 'PER_WEIGHT';
  pricingStatus?:
    | 'ESTIMATED'
    | 'PENDING_WEIGHT'
    | 'CALCULATED'
    | 'ADJUSTMENT_PENDING'
    | 'FINAL';
  pricePerWeightUnit?: number;
  weightUnit?: 'LB' | 'KG';
  measuredWeight?: number;
  taxRate?: number;
  taxAmount?: number;
  adjustmentsTotal?: number;
  amountPaid?: number;
  amountDue?: number;
  amountKnown?: boolean;
  subtotal: number;
  discount: number;
  extrasTotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  promoCodeApplied?: string;
  promotionSnapshot?: {
    id: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minOrderAmount: number;
  };
  paymentMethod: 'TARJETA' | 'TRANSFERENCIA' | 'BILLETERA' | 'EFECTIVO';
  paymentStatus:
    | 'PENDING_AMOUNT'
    | 'PAID'
    | 'PENDING'
    | 'FAILED'
    | 'REFUNDED'
    | 'PARTIALLY_REFUNDED';
}

export interface Address {
  label?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  reference?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface PickupSchedule {
  date: string;
  timeSlot: string;
  driverId?: string;
  driverName?: string;
  vehiclePlate?: string;
  notes?: string;
  completedAt?: string;
  actualDriverId?: string;
}

export interface DeliverySchedule {
  targetDate: string;
  timeSlot: string;
  driverId?: string;
  driverName?: string;
  vehiclePlate?: string;
  recipientName: string;
  recipientPhone: string;
  notes?: string;
  scheduledAt?: string;
  completedAt?: string;
}

export interface OrderTimelineEvent {
  id: string;
  status: OrderStatus;
  label: string;
  timestamp: string;
  userName: string;
  userRole: UserRole | ActorRole;
  notes?: string;
  isOverride?: boolean;
}

export interface Order {
  businessVersion?: number;
  catalogServiceId?: string;
  processingHours?: number;
  inspectionCompleted?: boolean;
  customerMessage?: string;
  nextAction?: string;
  policyReview?: string;
  fulfillment?: Fulfillment;
  workflowVersion?: number;
  intakeHold?: IntakeHold;
  id: string; // e.g. SOL-4587
  trackingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerPlan: string;
  customerAddress: Address;
  deliveryAddress: Address;
  facilityId: string;
  facilityName: string;
  zoneId: string;
  zoneName: string;
  priority: OrderPriority;
  status: OrderStatus;
  previousStatus?: OrderStatus;
  slaStatus: SLARisk;
  slaDeadline: string;
  slaProgressPercent: number; // 0 - 100
  items: OrderItem[];
  itemCount: number;
  serviceType: string;
  extras: OrderExtra[];
  pricing: OrderPricing;
  pickup: PickupSchedule;
  delivery: DeliverySchedule;
  quarantineReason?: string;
  quarantineNotes?: string;
  quarantineDate?: string;
  incidentsCount: number;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  documentType: 'DNI' | 'PASAPORTE' | 'RUT' | 'CEDULA';
  documentNumber: string;
  kycStatus: KycStatus;
  kycRejectionReason?: string;
  kycSubmittedAt?: string;
  kycReviewedAt?: string;
  kycReviewedBy?: string;
  kycDocumentUrl?: string;
  kycSelfieUrl?: string;
  addresses: Address[];
  membership: 'ESTANDAR' | 'PREMIUM_FRESH' | 'ECO_WASH' | 'CORPORATIVO';
  walletBalance: number;
  points: number;
  activePromotionsCount: number;
  totalOrders: number;
  completedOrders: number;
  createdAt: string;
  notes?: string;
}

export type DriverStatus = 'AVAILABLE' | 'ON_SERVICE' | 'BREAK' | 'OFFLINE';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  vehicleType: 'VAN' | 'MOTO' | 'CAMIONETA';
  vehiclePlate: string;
  facilityId: string;
  facilityName: string;
  zoneId: string;
  zoneName: string;
  authorizedZoneIds?: string[];
  status: DriverStatus;
  activeOrders: number;
  maxOrders: number;
  rating: number;
  completedTripsToday: number;
  location: {
    lat: number;
    lng: number;
    address: string;
    lastUpdated: string;
    simulated?: boolean;
  };
}

export interface Facility {
  operatingSchedule?: { days: number[]; open: string; close: string };
  acceptsCustomerDropoff?: boolean;
  allowsCustomerPickup?: boolean;
  serviceAreaIds?: string[];
  openingHours?: string;
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  zone: string;
  capacityMaxKgDay: number;
  currentLoadKgDay: number;
  activeOrders: number;
  assignedDriversCount: number;
  status: 'ACTIVE' | 'MAINTENANCE';
  phone: string;
  managerName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export type IncidentType =
  | 'MANCHA_PERSISTENTE'
  | 'PRENDA_DANADA'
  | 'PERDIDA_PARCIAL'
  | 'DIRECCION_ERRONEA'
  | 'CLIENTE_AUSENTE'
  | 'RETRASO_OPERACIONAL'
  | 'OTRO';

export type IncidentSeverity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type IncidentStatus =
  'OPEN' | 'IN_PROGRESS' | 'PENDING_CLOSURE' | 'RESOLVED';

export interface IncidentEvidence {
  id: string;
  url: string;
  caption: string;
  uploadedAt: string;
}

export interface Incident {
  id: string; // e.g. INC-0187
  orderId: string;
  customerId: string;
  customerName: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  evidences: IncidentEvidence[];
  assignedTo: string;
  reportedBy: string;
  reportedRole: UserRole | ActorRole;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  internalNotes: {
    id: string;
    author: string;
    text: string;
    createdAt: string;
  }[];
}

export interface CatalogItem {
  compatibleWithWeight?:boolean;
  pricingModel?: 'FIXED' | 'PER_WEIGHT';
  pricePerWeightUnit?: number;
  weightUnit?: 'LB' | 'KG';
  restrictions?: string[];
  customerSelectable?: boolean;
  id: string;
  name: string;
  category: 'PRENDAS' | 'SERVICIOS' | 'EXTRAS';
  type: string;
  description: string;
  price: number;
  estimatedHours: number;
  minHours: number;
  maxHours: number;
  status: 'ACTIVE' | 'INACTIVE';
  icon?: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Promotion {
  imageUrl?: string;
  id: string;
  name: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  usageLimit: number;
  usageCount: number;
  applicableServices: string[];
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'PAUSED';
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  minPurchases: number;
  minSpend: number;
  validityDays: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export type RedemptionStatus =
  'PENDING' | 'APPROVED' | 'DELIVERED' | 'REJECTED';

export interface RewardRedemption {
  id: string;
  customerId: string;
  customerName: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  date: string;
  status: RedemptionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  pointsReserved?: boolean; // New requests reserve points; legacy requests were already debited.
  notes?: string;
}

export interface PointsLedgerEntry {
  orderId?: string;
  id: string;
  customerId: string;
  points: number; // positive or negative
  type: 'PURCHASE' | 'REDEMPTION' | 'ADMIN_ADJUSTMENT';
  reason: string;
  date: string;
  adminUser?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole | ActorRole;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  notes?: string;
}

export interface SystemSettings {
  maxOrdersPerDriver: number;
  slaPickupMinutes: number;
  slaDeliveryHours: number;
  defaultFacilityId: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  locale: string;
  defaultCity: string;
  phoneCountryCode: string;
  quarantineNotifySupervisor: boolean;
  autoSuggestDrivers: boolean;
}
