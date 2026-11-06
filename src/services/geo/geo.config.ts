// Configuración geográfica tomada del entorno. No hay coordenadas ni modos de demostración
// en el código: el centro del mapa y el token se definen en cada instalación.
const requiredNumber = (name: string, value: string | undefined) => {
  const n = Number(value);
  if (value === undefined || value === '' || !Number.isFinite(n))
    throw new Error(`Falta configurar ${name} en el entorno.`);
  return n;
};

export const geoConfig = {
  accessToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ?? '',
  country: import.meta.env.VITE_APP_COUNTRY ?? '',
  language: import.meta.env.VITE_APP_MAP_LANGUAGE ?? 'es',
  center: {
    lat: requiredNumber(
      'VITE_APP_DEFAULT_LATITUDE',
      import.meta.env.VITE_APP_DEFAULT_LATITUDE,
    ),
    lng: requiredNumber(
      'VITE_APP_DEFAULT_LONGITUDE',
      import.meta.env.VITE_APP_DEFAULT_LONGITUDE,
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
