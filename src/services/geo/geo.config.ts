export const GUAYAQUIL_CENTER = { lat: -2.1894, lng: -79.8891 };

const parseCoord = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== undefined && value !== '' ? n : fallback;
};

export const geoConfig = {
  accessToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ?? '',
  country: import.meta.env.VITE_APP_COUNTRY ?? 'EC',
  language: import.meta.env.VITE_APP_MAP_LANGUAGE ?? 'es',
  center: {
    lat: parseCoord(
      import.meta.env.VITE_APP_DEFAULT_LATITUDE,
      GUAYAQUIL_CENTER.lat,
    ),
    lng: parseCoord(
      import.meta.env.VITE_APP_DEFAULT_LONGITUDE,
      GUAYAQUIL_CENTER.lng,
    ),
  },
  style:
    import.meta.env.VITE_MAPBOX_STYLE ?? 'mapbox://styles/mapbox/streets-v12',
  permanentGeocoding:
    import.meta.env.VITE_MAPBOX_PERMANENT_GEOCODING === 'true',
  useBackendGeo: import.meta.env.VITE_USE_BACKEND_GEO === 'true',
  backendUrl: import.meta.env.VITE_GEO_API_URL ?? '',
  staleSeconds: 120,
};
