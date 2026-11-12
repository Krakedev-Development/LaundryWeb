import type { Coordinates, GeoAddress, ServiceArea } from '../../../src/services/geo/geo.types';

export const SAMPLE_CENTER: Coordinates = { lat: -2.124, lng: -79.869 };
export const SAMPLE_FACILITIES = [
  {
    id: 'FAC-01',
    name: 'Laundry La Puntilla',
    address: 'Av. Samborondón · La Puntilla',
    coordinates: { lat: -2.139, lng: -79.871 },
  },
  {
    id: 'FAC-02',
    name: 'Laundry Samborondón Central',
    address: 'Av. Samborondón · Sector central',
    coordinates: { lat: -2.124, lng: -79.867 },
  },
  {
    id: 'FAC-03',
    name: 'Laundry Samborondón Norte',
    address: 'Av. Samborondón · Sector norte',
    coordinates: { lat: -2.105, lng: -79.863 },
  },
];
// Illustrative sample coverage only; these are not approved operational boundaries.
export const SERVICE_AREAS: ServiceArea[] = [
  ['ZONA-NORTE', 'La Puntilla', 'FAC-01', -2.15, -2.132],
  ['ZONA-SUR', 'Samborondón Central', 'FAC-02', -2.132, -2.114],
  ['ZONA-FINANCIERA', 'Samborondón Norte', 'FAC-03', -2.114, -2.085],
].map(([id, name, facilityId, south, north]) => ({
  id: String(id),
  name: String(name),
  facilityId: String(facilityId),
  active: true,
  polygon: {
    type: 'Polygon',
    coordinates: [
      [
        [-79.884, Number(south)],
        [-79.852, Number(south)],
        [-79.852, Number(north)],
        [-79.884, Number(north)],
        [-79.884, Number(south)],
      ],
    ],
  },
}));
export function sampleCoordinate(
  index: number,
  facilityId = 'FAC-02',
): Coordinates {
  const center =
    SAMPLE_FACILITIES.find((f) => f.id === facilityId)?.coordinates ??
    SAMPLE_CENTER;
  return {
    lat: center.lat + ((index % 5) - 2) * 0.001,
    lng: center.lng + ((index % 7) - 3) * 0.0008,
  };
}
export const SAMPLE_ADDRESSES: GeoAddress[] = SAMPLE_FACILITIES.flatMap((f, i) => [
  {
    id: f.id,
    label: f.name,
    formattedAddress: `${f.address}, Samborondón, Ecuador`,
    coordinates: f.coordinates,
    city: 'Samborondón',
    country: 'EC',
    persistence: 'sample' as const,
  },
  {
    id: `sample-home-${i}`,
    label: `Dirección de muestra ${i + 1}`,
    formattedAddress: `Av. Samborondón, sector ${i + 1}, Ecuador`,
    coordinates: sampleCoordinate(i + 2, f.id),
    city: 'Samborondón',
    country: 'EC',
    persistence: 'sample' as const,
  },
]);
