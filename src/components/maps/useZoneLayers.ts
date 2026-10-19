import { useEffect } from 'react';
import type { Map, GeoJSONSource } from 'mapbox-gl';
import type { FeatureCollection } from 'geojson';
import type { ZoneMapOptions } from './zoneMap.types';

export function useZoneLayers(
  map: React.RefObject<Map | null>,
  ready: boolean,
  { zones = [], vertices = [] }: ZoneMapOptions,
) {
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const coverage: FeatureCollection = {
      type: 'FeatureCollection',
      features: zones.map((zone) => ({
        type: 'Feature',
        properties: { name: zone.name, active: zone.active },
        geometry: zone.polygon,
      })),
    };
    (instance.getSource('coverage') as GeoJSONSource)?.setData(coverage);
    instance.setPaintProperty('coverage', 'fill-color', [
      'case',
      ['get', 'active'],
      '#0284C7',
      '#64748B',
    ]);
    if (!instance.getLayer('coverage-outline'))
      instance.addLayer({
        id: 'coverage-outline',
        type: 'line',
        source: 'coverage',
        paint: {
          'line-color': '#0F4C81',
          'line-width': 2,
          'line-dasharray': [3, 1],
        },
      });
    const coordinates = vertices.map((point) => [point.lng, point.lat]);
    const draft: FeatureCollection = {
      type: 'FeatureCollection',
      features:
        coordinates.length > 1
          ? [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates },
              },
            ]
          : [],
    };
    if (!instance.getSource('zone-draft')) {
      instance.addSource('zone-draft', { type: 'geojson', data: draft });
      instance.addLayer({
        id: 'zone-draft',
        type: 'line',
        source: 'zone-draft',
        paint: { 'line-color': '#0284C7', 'line-width': 3 },
      });
    } else (instance.getSource('zone-draft') as GeoJSONSource).setData(draft);
  }, [ready, zones, vertices, map]);
}
