import type { Map as MapboxMap, ErrorEvent } from 'mapbox-gl';
import { MAPBOX_STYLE_FALLBACK } from './mapbox';

const STRIP_SOURCE_FRAGMENTS = [
  'mapbox-traffic',
  'mapbox-traffic-v1',
  'mapbox.mapbox-traffic-v1',
];

function shouldStripSource(id: string, url?: string): boolean {
  // Nunca eliminar la fuente `composite` ni fuentes de calles base (`streets-v12`
  // incluye `mapbox-streets-v8` y `mapbox-bathymetry-v2` dentro de `composite`).
  const lowerId = id.toLowerCase();
  const lowerUrl = (url ?? '').toLowerCase();
  if (lowerId === 'composite' || lowerUrl.includes('mapbox-streets')) {
    return false;
  }
  const hay = `${lowerId} ${lowerUrl}`;
  return STRIP_SOURCE_FRAGMENTS.some((frag) => hay.includes(frag));
}

/**
 * Limpia fuentes/capas opcionales que pueden generar tiles 404 en el panel web
 * (portado de AnubisRide `uber-web/src/config/mapboxMapRuntime.ts`) y aplica
 * fallback a `streets-v12` si el estilo inicial falla.
 */
export function configureMapboxMap(map: MapboxMap): void {
  let fellBack = false;

  const stripNoisyLayers = () => {
    try {
      const style = map.getStyle();
      if (!style) return;
      const sources = style.sources ?? {};
      const badSourceIds = new Set<string>();
      for (const [id, src] of Object.entries(sources)) {
        const url = (src as { url?: string }).url;
        if (shouldStripSource(id, url)) {
          badSourceIds.add(id);
        }
      }
      if (badSourceIds.size === 0) return;
      for (const layer of style.layers ?? []) {
        const src = (layer as { source?: string }).source;
        if (src && badSourceIds.has(src) && map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      }
      for (const srcId of badSourceIds) {
        if (map.getSource(srcId)) {
          map.removeSource(srcId);
        }
      }
    } catch {
      // No-op si el estilo aún está en transición.
    }
  };

  map.on('style.load', stripNoisyLayers);

  map.on('error', (event: ErrorEvent) => {
    const status = (event.error as { status?: number } | undefined)?.status;
    if (!fellBack && (status === 404 || status === 401)) {
      const msg = String(event.error?.message ?? '').toLowerCase();
      if (msg.includes('style') && !msg.includes('streets-v12')) {
        fellBack = true;
        map.setStyle(MAPBOX_STYLE_FALLBACK);
      }
    }
  });
}
