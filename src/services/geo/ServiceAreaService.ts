import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { SERVICE_AREAS } from './demo';
import {
  toLngLat,
  validCoordinates,
  type Coordinates,
  type ServiceArea,
} from './geo.types';

export class ServiceAreaService {
  constructor(public areas: ServiceArea[] = SERVICE_AREAS) {}
  findArea(coordinates: Coordinates) {
    if (!validCoordinates(coordinates)) return undefined;
    // Boundary belongs to the first active matching area, making overlaps deterministic.
    return this.areas.find(
      (area) =>
        area.active &&
        booleanPointInPolygon(toLngLat(coordinates), area.polygon, {
          ignoreBoundary: false,
        }),
    );
  }
  isCovered(coordinates: Coordinates) {
    return !!this.findArea(coordinates);
  }
  requireCoverage(coordinates: Coordinates) {
    const area = this.findArea(coordinates);
    if (!area)
      throw new Error(
        'Aún no llegamos a esta zona. Cambia la dirección para continuar.',
      );
    return area;
  }
}
export const serviceAreaService = new ServiceAreaService();
