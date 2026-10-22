import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { SERVICE_AREAS } from './demo';
import { readCoverageAreas } from '../zones/zoneStorage';
import {
  toLngLat,
  validCoordinates,
  type Coordinates,
  type ServiceArea,
} from './geo.types';

export class ServiceAreaService {
  constructor(
    private source: ServiceArea[] | (() => ServiceArea[]) = SERVICE_AREAS,
  ) {}
  get areas() {
    return typeof this.source === 'function' ? this.source() : this.source;
  }
  set areas(areas: ServiceArea[]) {
    this.source = areas;
  }
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
export const serviceAreaService = new ServiceAreaService(readCoverageAreas);
