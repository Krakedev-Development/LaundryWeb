import { geoConfig, GUAYAQUIL_CENTER } from '../services/geo/geo.config';

export const MAPBOX_ACCESS_TOKEN: string = geoConfig.accessToken;
export const USE_MAPBOX: boolean = Boolean(MAPBOX_ACCESS_TOKEN);
export const MAPBOX_STYLE: string =
  geoConfig.style || 'mapbox://styles/mapbox/streets-v12';
export const MAPBOX_STYLE_FALLBACK = 'mapbox://styles/mapbox/streets-v12';

export const DEFAULT_MAP_CENTER: [number, number] = [
  geoConfig.center.lng ?? GUAYAQUIL_CENTER.lng,
  geoConfig.center.lat ?? GUAYAQUIL_CENTER.lat,
];
export const DEFAULT_MAP_ZOOM = 12.5;
