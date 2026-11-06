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
    const zonePalette = isDark
      ? [
          { stroke: '#38BDF8', fill: '#0284C7' },
          { stroke: '#34D399', fill: '#059669' },
          { stroke: '#818CF8', fill: '#4F46E5' },
          { stroke: '#FBBF24', fill: '#D97706' },
        ]
      : [
          { stroke: '#0F4C81', fill: '#0EA5E9' },
          { stroke: '#047857', fill: '#10B981' },
          { stroke: '#4338CA', fill: '#6366F1' },
          { stroke: '#B45309', fill: '#F59E0B' },
        ];

    zones.forEach((zone, index) => {
      const feature: Feature = {
        type: 'Feature',
        properties: { name: zone.name, active: zone.active },
        geometry: zone.polygon,
      };
      const palette = zonePalette[index % zonePalette.length];

      const geoLayer = L.geoJSON(feature, {
        style: () => ({
          color: zone.active ? palette.stroke : '#64748B',
          weight: zone.active ? 2.5 : 1.75,
          opacity: zone.active ? 0.92 : 0.65,
          fillColor: zone.active ? palette.fill : '#64748B',
          fillOpacity: zone.active ? (isDark ? 0.18 : 0.14) : 0.08,
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
