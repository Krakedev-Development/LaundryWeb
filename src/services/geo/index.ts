import { geoConfig } from './geo.config';
import { MapboxGeoProvider } from './mapbox/MapboxGeoProvider';
import { LaundryGeoApiProvider } from './LaundryGeoApiProvider';
import { RoutingService } from './RoutingService';
import { DispatchService } from './DispatchService';
import { DemoGeoProvider } from './DemoGeoProvider';
export const createGeoProvider = () =>
  geoConfig.useBackendGeo
    ? new LaundryGeoApiProvider(geoConfig.backendUrl)
    : geoConfig.mode === 'demo'
      ? new DemoGeoProvider()
      : new MapboxGeoProvider(geoConfig);
export const geoProvider = createGeoProvider();
export const routingService = new RoutingService(geoProvider);
export const dispatchService = new DispatchService(
  geoProvider,
  10,
  geoConfig.staleSeconds,
);
