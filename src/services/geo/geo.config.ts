import { DEMO_CENTER } from './demo';
export const geoConfig = {
  accessToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ?? '',
  country: import.meta.env.VITE_APP_COUNTRY ?? 'EC',
  language: import.meta.env.VITE_APP_MAP_LANGUAGE ?? 'es',
  center: {
    lat: Number(import.meta.env.VITE_APP_DEFAULT_LATITUDE ?? DEMO_CENTER.lat),
    lng: Number(import.meta.env.VITE_APP_DEFAULT_LONGITUDE ?? DEMO_CENTER.lng),
  },
  style:
    import.meta.env.VITE_MAPBOX_STYLE ?? 'mapbox://styles/mapbox/streets-v12',
  permanentGeocoding:
    import.meta.env.VITE_MAPBOX_PERMANENT_GEOCODING === 'true',
  useBackendGeo: import.meta.env.VITE_USE_BACKEND_GEO === 'true',
  backendUrl: import.meta.env.VITE_GEO_API_URL ?? '',
  mode:
    import.meta.env.VITE_GEO_MODE ??
    (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ? 'mapbox' : 'demo'),
  trackingMode: import.meta.env.VITE_TRACKING_MODE ?? 'mock',
  trackingIntervalMs: 3000,
  staleSeconds: 120,
};
