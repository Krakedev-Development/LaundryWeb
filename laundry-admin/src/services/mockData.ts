import type {
  ChatThread,
  CustomerProfile,
  Driver,
  FleetSnapshot,
  Incident,
  OperationalKpis,
  Order,
  ServiceZone,
} from '@/types'

/** Centro de mapa (Medellín, CO) — coordenadas mock coherentes */
const BASE = { lat: 6.2442, lng: -75.5812 }

function jitter(seed: number, scale = 0.02): { lat: number; lng: number } {
  const x = Math.sin(seed) * 10000
  const r1 = x - Math.floor(x)
  const y = Math.cos(seed * 1.7) * 10000
  const r2 = y - Math.floor(y)
  return {
    lat: BASE.lat + (r1 - 0.5) * scale,
    lng: BASE.lng + (r2 - 0.5) * scale,
  }
}

const zones: ServiceZone[] = [
  { id: 'z-norte', name: 'Zona Norte', centroid: jitter(1, 0.035) },
  { id: 'z-centro', name: 'Zona Centro', centroid: jitter(2, 0.028) },
  { id: 'z-sur', name: 'Zona Sur', centroid: jitter(3, 0.032) },
]

const drivers: Driver[] = [
  {
    id: 'd-1',
    userId: 'u-d1',
    displayName: 'Carlos Ruiz',
    phone: '+57 300 1112233',
    status: 'available',
    vehiclePlate: 'ABC123',
    location: jitter(10),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd-2',
    userId: 'u-d2',
    displayName: 'María Londoño',
    phone: '+57 300 4445566',
    status: 'on_route',
    vehiclePlate: 'XYZ789',
    location: jitter(11),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd-3',
    userId: 'u-d3',
    displayName: 'Andrés Zapata',
    phone: '+57 311 2223344',
    status: 'offline',
    vehiclePlate: 'LMN456',
    location: jitter(12),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd-4',
    userId: 'u-d4',
    displayName: 'Laura Gómez',
    phone: '+57 310 5556677',
    status: 'available',
    vehiclePlate: 'QWE321',
    location: jitter(13),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'd-5',
    userId: 'u-d5',
    displayName: 'Jorge Mejía',
    phone: '+57 304 8889900',
    status: 'on_route',
    vehiclePlate: 'RTY654',
    location: jitter(14),
    updatedAt: new Date().toISOString(),
  },
]

function orderAt(
  id: string,
  customer: string,
  zone: ServiceZone,
  status: Order['status'],
  priority: Order['priority'],
  seed: number,
): Order {
  const loc = jitter(seed, 0.025)
  const now = new Date()
  return {
    id,
    customerId: `c-${seed}`,
    customerName: customer,
    driverId: status === 'pending' ? null : 'd-2',
    zoneId: zone.id,
    zoneName: zone.name,
    pickupAddress: `Calle ${seed} #${10 + seed}-20`,
    deliveryAddress: `Carrera ${20 + seed} #${30 + seed}-45`,
    status,
    priority,
    scheduledPickupAt: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    deliverByAt: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    pickupLocation: loc,
    createdAt: new Date(now.getTime() - seed * 15 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString(),
  }
}

const orders: Order[] = [
  orderAt('o-101', 'Cliente Andina', zones[0], 'pending', 'high', 21),
  orderAt('o-102', 'Cliente Roble', zones[0], 'pending', 'normal', 22),
  orderAt('o-103', 'Cliente Nogal', zones[0], 'pending', 'normal', 23),
  orderAt('o-104', 'Cliente Centro 1', zones[1], 'pending', 'urgent', 24),
  orderAt('o-105', 'Cliente Centro 2', zones[1], 'pending', 'low', 25),
  orderAt('o-106', 'Cliente Centro 3', zones[1], 'assigned', 'normal', 26),
  orderAt('o-107', 'Cliente Sur 1', zones[2], 'pending', 'normal', 27),
  orderAt('o-108', 'Cliente Sur 2', zones[2], 'pickup_en_route', 'high', 28),
  orderAt('o-109', 'Cliente Sur 3', zones[2], 'picked_up', 'normal', 29),
  orderAt('o-110', 'Cliente Mix', zones[1], 'out_for_delivery', 'normal', 30),
]

const customers: CustomerProfile[] = [
  {
    id: 'p-1',
    userId: 'u-c1',
    fullName: 'Paola Herrera',
    phone: '+57 300 0001122',
    email: 'paola@example.com',
    city: 'Medellín',
    neighborhood: 'Laureles',
    addressLine: 'Calle 33 #79-18',
    location: jitter(51, 0.018),
    kycStatus: 'pending',
    subscriptionPlan: 'premium',
    subscriptionStatus: 'active',
    walletBalance: 164000,
    promotionsEnabled: true,
    registeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cedulaPhotoUrl: 'https://placehold.co/400x250/143F73/E8EEF5?text=Cédula',
    selfiePhotoUrl: 'https://placehold.co/400x400/61BFC7/143F73?text=Selfie',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-2',
    userId: 'u-c2',
    fullName: 'Diego Vásquez',
    phone: '+57 311 3334455',
    email: 'diego@example.com',
    city: 'Medellín',
    neighborhood: 'Belén',
    addressLine: 'Carrera 71 #27-90',
    location: jitter(52, 0.018),
    kycStatus: 'pending',
    subscriptionPlan: 'basic',
    subscriptionStatus: 'past_due',
    walletBalance: 23000,
    promotionsEnabled: true,
    registeredAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    cedulaPhotoUrl: 'https://placehold.co/400x250/0F315A/E8EEF5?text=Cédula',
    selfiePhotoUrl: 'https://placehold.co/400x400/A5CD39/143F73?text=Selfie',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-3',
    userId: 'u-c3',
    fullName: 'Inés Ocampo',
    phone: '+57 320 1119988',
    email: 'ines@example.com',
    city: 'Envigado',
    neighborhood: 'El Portal',
    addressLine: 'Calle 37 Sur #43A-67',
    location: jitter(53, 0.018),
    kycStatus: 'approved',
    subscriptionPlan: 'business',
    subscriptionStatus: 'active',
    walletBalance: 412000,
    promotionsEnabled: false,
    registeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    cedulaPhotoUrl: 'https://placehold.co/400x250/143F73/E8EEF5?text=Cédula',
    selfiePhotoUrl: 'https://placehold.co/400x400/143F73/FFFFFF?text=Selfie',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-4',
    userId: 'u-c4',
    fullName: 'Carlos Mena',
    phone: '+57 322 4541122',
    email: 'carlos@example.com',
    city: 'Sabaneta',
    neighborhood: 'Restrepo Naranjo',
    addressLine: 'Calle 66 Sur #43A-21',
    location: jitter(54, 0.018),
    kycStatus: 'rejected',
    subscriptionPlan: 'basic',
    subscriptionStatus: 'cancelled',
    walletBalance: 0,
    promotionsEnabled: false,
    registeredAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    cedulaPhotoUrl: 'https://placehold.co/400x250/0F315A/E8EEF5?text=Cédula',
    selfiePhotoUrl: 'https://placehold.co/400x400/61BFC7/143F73?text=Selfie',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const pendingCustomers = customers.filter((c) => c.kycStatus === 'pending')

const incidents: Incident[] = [
  {
    id: 'i-1',
    orderId: 'o-108',
    title: 'Demora en recogida — tráfico',
    status: 'open',
    severity: 'medium',
    createdAt: new Date().toISOString(),
  },
]

const chatThreads: ChatThread[] = [
  {
    id: 'ch-1',
    orderId: 'o-108',
    customerId: 'c-28',
    customerName: 'Cliente Sur 2',
    driverId: 'd-2',
    driverName: 'María Londoño',
    lastMessagePreview: 'Estoy en la esquina, ¿me abre portería?',
    lastMessageAt: new Date().toISOString(),
    unreadForStaff: 1,
  },
]

const kpis: OperationalKpis = {
  ordersToday: orders.length + 12,
  activeDrivers: drivers.filter((d) => d.status !== 'offline').length,
  slaOnTimePercent: 94.2,
  openIncidents: incidents.filter((i) => i.status === 'open').length,
  asOf: new Date().toISOString(),
}

export const mockFleetSnapshot: FleetSnapshot = {
  kpis,
  drivers,
  orders,
  zones,
  customers,
  pendingCustomers,
  incidents,
  chatThreads,
}
