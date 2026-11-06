import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Feature } from 'geojson';
import type { ZoneMapOptions } from './zoneMap.types';
import type { Coordinates } from '../../services/geo/geo.types';
import type { MapTheme } from './mapPointAppearance';

export function useZoneLayers(
  map: React.RefObject<L.Map | null>,
  ready: boolean,
  {
    zones = [],
    vertices = [],
    onPick,
    theme = 'tactical',
  }: ZoneMapOptions & {
    onPick?: (point: Coordinates) => void;
    theme?: MapTheme;
  },
) {
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;

    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(instance);
    }
    const group = layerGroupRef.current;
    group.clearLayers();

    const isDark = theme === 'tactical';

    zones.forEach((zone) => {
      const feature: Feature = {
        type: 'Feature',
        properties: { name: zone.name, active: zone.active },
        geometry: zone.polygon,
      };

      const geoLayer = L.geoJSON(feature, {
        style: () => ({
          color: zone.active
            ? isDark
              ? '#38BDF8'
              : '#0F4C81'
            : '#64748B',
          weight: zone.active ? 2.25 : 1.75,
          opacity: zone.active ? 0.9 : 0.65,
          fillColor: zone.active
            ? isDark
              ? '#0284C7'
              : '#0EA5E9'
            : '#64748B',
          fillOpacity: zone.active ? (isDark ? 0.16 : 0.12) : 0.08,
          dashArray: zone.active ? undefined : '6 6',
        }),
      });

      geoLayer.bindTooltip(zone.name, {
        sticky: true,
        direction: 'top',
        className:
          'rounded-lg border border-slate-700 bg-slate-900/95 px-2.5 py-1 text-xs font-bold text-white shadow-lg',
      });

      geoLayer.on('click', (event: L.LeafletMouseEvent) => {
        if (pickRef.current) {
          L.DomEvent.stopPropagation(event);
          pickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
        }
      });

      geoLayer.addTo(group);
    });

    if (vertices.length > 1) {
      const latLngs: L.LatLngExpression[] = vertices.map((point) => [
        point.lat,
        point.lng,
      ]);

      if (vertices.length >= 3) {
        L.polygon(latLngs, {
          color: isDark ? '#38BDF8' : '#0284C7',
          weight: 2.5,
          dashArray: '6 4',
          fillColor: '#0EA5E9',
          fillOpacity: isDark ? 0.18 : 0.14,
          interactive: false,
        }).addTo(group);
      } else {
        L.polyline(latLngs, {
          color: isDark ? '#38BDF8' : '#0284C7',
          weight: 3,
          dashArray: '6 4',
          interactive: false,
        }).addTo(group);
      }
    }

    return () => {
      group.clearLayers();
    };
  }, [ready, zones, vertices, theme, map]);
}
