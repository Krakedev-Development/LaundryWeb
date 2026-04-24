/** Rol del personal en el panel administrativo */
export type StaffRole = 'admin' | 'supervisor'

/** Estado de verificación KYC del cliente */
export type KycStatus = 'pending' | 'approved' | 'rejected'

/** Punto geográfico WGS84 */
export interface GeoPoint {
  lat: number
  lng: number
}

/** Cliente / perfil de usuario final con documentos KYC */
export interface CustomerProfile {
  id: string
  userId: string
  fullName: string
  phone: string
  email: string
  city: string
  neighborhood: string
  addressLine: string
  location: GeoPoint
  kycStatus: KycStatus
  subscriptionPlan: 'basic' | 'premium' | 'business'
  subscriptionStatus: 'active' | 'past_due' | 'cancelled'
  walletBalance: number
  promotionsEnabled: boolean
  registeredAt: string
  cedulaPhotoUrl: string
  selfiePhotoUrl: string
  createdAt: string
  updatedAt: string
}

/** Estado operativo del chofer en mapa y asignación */
export type DriverStatus = 'available' | 'in_transit' | 'offline'

export interface Driver {
  id: string
  userId: string
  displayName: string
  phone: string
  status: DriverStatus
  vehiclePlate: string
  location: GeoPoint
  updatedAt: string
}

/** Ciclo de vida de la orden de lavandería */
export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'heading_to_pickup'
  | 'picked_up'
  | 'at_facility'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'incident'

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Order {
  id: string
  customerId: string
  customerName: string
  driverId: string | null
  zoneId: string
  zoneName: string
  pickupAddress: string
  deliveryAddress: string
  status: OrderStatus
  priority: OrderPriority
  scheduledPickupAt: string
  deliverByAt: string
  pickupLocation: GeoPoint
  createdAt: string
  updatedAt: string
}

export type TimelineActorType =
  | 'system'
  | 'customer'
  | 'driver'
  | 'staff'

export interface OrderTimelineEntry {
  id: string
  orderId: string
  status: OrderStatus
  label: string
  occurredAt: string
  actorType?: TimelineActorType
  actorId?: string
  note?: string
}

export type IncidentSeverity = 'low' | 'medium' | 'high'

export interface Incident {
  id: string
  orderId: string
  title: string
  status: 'open' | 'in_progress' | 'resolved'
  severity: IncidentSeverity
  createdAt: string
}

export type ChatParticipantRole = 'customer' | 'driver'

export interface ChatThread {
  id: string
  orderId: string
  customerId: string
  customerName: string
  driverId: string
  driverName: string
  lastMessagePreview: string
  lastMessageAt: string
  unreadForStaff: number
}

export interface ChatMessage {
  id: string
  threadId: string
  senderRole: ChatParticipantRole
  senderId: string
  body: string
  sentAt: string
}

/** Zona de servicio para agrupación logística en mapa */
export interface ServiceZone {
  id: string
  name: string
  centroid: GeoPoint
}

/** KPIs del tablero operativo (control de mando) */
export interface OperationalKpis {
  ordersToday: number
  activeDrivers: number
  slaOnTimePercent: number
  openIncidents: number
  asOf: string
}

/** Snapshot que alimenta mapa + panel (simulación de API) */
export interface FleetSnapshot {
  kpis: OperationalKpis
  drivers: Driver[]
  orders: Order[]
  zones: ServiceZone[]
  customers: CustomerProfile[]
  pendingCustomers: CustomerProfile[]
  incidents: Incident[]
  chatThreads: ChatThread[]
}
