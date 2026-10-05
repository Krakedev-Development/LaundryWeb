import type {
  Customer,
  Driver,
  Facility,
  Order,
  SystemSettings,
} from '../../types';
import { DEMO_FACILITIES, SERVICE_AREAS, demoCoordinate } from './demo';
import { serviceAreaService } from './ServiceAreaService';
export function prepareWebDemoData(
  data: {
    orders: Order[];
    customers: Customer[];
    drivers: Driver[];
    facilities: Facility[];
    settings?: SystemSettings;
  },
  force = false,
) {
  const old = (p: { lat: number; lng: number }) =>
    force || (p.lat < -10 && p.lng < -70);
  data.facilities.forEach((f) => {
    const demo = DEMO_FACILITIES.find((v) => v.id === f.id);
    if (demo && old(f.coordinates)) {
      Object.assign(f, demo);
      f.city = 'Samborondón';
      f.zone = SERVICE_AREAS.find((a) => a.facilityId === f.id)!.name;
    }
  });
  data.customers.forEach((c, i) =>
    c.addresses.forEach((a, j) => {
      if (old(a.coordinates)) {
        a.coordinates = demoCoordinate(i + j, 'FAC-02');
        a.street = 'Av. Samborondón';
        a.city = 'Samborondón';
        a.neighborhood = 'Sector central';
      }
    }),
  );
  data.drivers.forEach((d, i) => {
    if (old(d.location)) {
      const coordinates = demoCoordinate(i, d.facilityId);
      Object.assign(d.location, coordinates, {
        address: 'Av. Samborondón',
        simulated: true,
      });
    }
    if (!Number.isFinite(Date.parse(d.location.lastUpdated)))
      d.location.lastUpdated = new Date(
        Date.now() - (d.status === 'OFFLINE' ? 600000 : 0),
      ).toISOString();
    const facility = data.facilities.find((f) => f.id === d.facilityId);
    if (facility) d.facilityName = facility.name;
    const area = serviceAreaService.findArea(d.location);
    if (area) {
      d.zoneId = area.id;
      d.zoneName = area.name;
    }
    d.authorizedZoneIds ??= SERVICE_AREAS.map((area) => area.id);
    const legacyStatus = d.status as string;
    if (legacyStatus === 'ON_DUTY') d.status = 'AVAILABLE';
    if (legacyStatus === 'BUSY') d.status = 'ON_SERVICE';
  });
  data.orders.forEach((o, i) => {
    const facility = data.facilities.find((f) => f.id === o.facilityId);
    if (facility) o.facilityName = facility.name;
    [o.customerAddress, o.deliveryAddress].forEach((a, j) => {
      if (old(a.coordinates)) {
        a.coordinates = demoCoordinate(i + j, o.facilityId);
        a.street = 'Av. Samborondón';
        a.city = 'Samborondón';
        a.neighborhood = facility?.zone ?? 'Samborondón';
      }
    });
    const area = serviceAreaService.findArea(o.customerAddress.coordinates);
    if (area) {
      o.zoneId = area.id;
      o.zoneName = area.name;
    }
  });
  if (data.settings)
    Object.assign(data.settings, {
      timezone: 'America/Guayaquil',
      locale: 'es-EC',
      defaultCity: 'Samborondón',
      phoneCountryCode: '+593',
    });
}
