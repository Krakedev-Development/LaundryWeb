import type { Driver, Order } from '@/types'
import type { Feature, FeatureCollection, Point } from 'geojson'

function point(lng: number, lat: number, props: Record<string, unknown>): Feature<Point> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: props,
  }
}

export function driversToGeoJSON(drivers: Driver[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: drivers.map((d) =>
      point(d.location.lng, d.location.lat, {
        id: d.id,
        displayName: d.displayName,
        status: d.status,
        vehiclePlate: d.vehiclePlate,
      }),
    ),
  }
}

export function pendingOrdersToGeoJSON(orders: Order[]): FeatureCollection<Point> {
  const pending = orders.filter((o) => o.status === 'pending')
  return {
    type: 'FeatureCollection',
    features: pending.map((o) =>
      point(o.pickupLocation.lng, o.pickupLocation.lat, {
        id: o.id,
        zoneName: o.zoneName,
        priority: o.priority,
        customerName: o.customerName,
      }),
    ),
  }
}
