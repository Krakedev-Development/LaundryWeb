import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { FeatureCollection, Polygon } from 'geojson';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE,
  USE_MAPBOX,
} from '../../config/mapbox';
import { configureMapboxMap } from '../../config/mapboxMapRuntime';
import type { Zone } from '../../entities/zone/model/zone.types';
import type { Coordinates } from '../../services/geo/geo.types';
import {
  getZonesCenter,
  ringToCoordinates,
  toLngLatRing,
  zoneToPolygonFeature,
} from './mapboxGeo';

const REF_ZONES_SOURCE = 'draw-ref-zones';

export interface MapboxZoneDrawMapProps {
  initialVertices: Coordinates[];
  referenceZones?: Zone[];
  height?: number;
  onVerticesChange: (vertices: Coordinates[]) => void;
}

/**
 * Editor de polígonos de zona con Mapbox GL JS + MapboxDraw (portado de AnubisRide
 * `ZoneDrawMapModal.tsx`), en modo claro `streets-v12`.
 */
export function MapboxZoneDrawMap({
  initialVertices,
  referenceZones = [],
  height = 380,
  onVerticesChange,
}: MapboxZoneDrawMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const onChangeRef = useRef(onVerticesChange);
  onChangeRef.current = onVerticesChange;

  useEffect(() => {
    if (!USE_MAPBOX || !hostRef.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const isEdit = initialVertices.length >= 3;
    const startCenter: [number, number] = isEdit
      ? [initialVertices[0].lng, initialVertices[0].lat]
      : referenceZones.length > 0
        ? getZonesCenter(referenceZones)
        : DEFAULT_MAP_CENTER;

    const map = new mapboxgl.Map({
      container: hostRef.current,
      style: MAPBOX_STYLE,
      center: startCenter,
      zoom: DEFAULT_MAP_ZOOM,
    });
    configureMapboxMap(map);
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: isEdit ? 'simple_select' : 'draw_polygon',
    });

    map.addControl(draw, 'top-right');
    mapRef.current = map;
    drawRef.current = draw;

    const syncFromDraw = () => {
      const all = draw.getAll();
      const poly = all.features.find(
        (f): f is GeoJSON.Feature<GeoJSON.Polygon> =>
          f.geometry.type === 'Polygon',
      );
      if (!poly) {
        onChangeRef.current([]);
        return;
      }
      const ring = poly.geometry.coordinates[0] ?? [];
      onChangeRef.current(ringToCoordinates(ring));
    };

    map.on('load', () => {
      map.resize();

      // Zonas existentes de referencia (para evitar solapamientos accidentales)
      const refFeatures = referenceZones
        .map((z) => zoneToPolygonFeature(z))
        .filter((f): f is NonNullable<typeof f> => f !== null);
      if (refFeatures.length > 0) {
        const fc: FeatureCollection<Polygon> = {
          type: 'FeatureCollection',
          features: refFeatures,
        };
        map.addSource(REF_ZONES_SOURCE, { type: 'geojson', data: fc });
        map.addLayer({
          id: 'draw-ref-zones-fill',
          type: 'fill',
          source: REF_ZONES_SOURCE,
          paint: { 'fill-color': '#94A3B8', 'fill-opacity': 0.12 },
        });
        map.addLayer({
          id: 'draw-ref-zones-line',
          type: 'line',
          source: REF_ZONES_SOURCE,
          paint: { 'line-color': '#64748B', 'line-width': 1.5, 'line-dasharray': [2, 2] },
        });
      }

      if (isEdit) {
        const ring = toLngLatRing(initialVertices);
        const ids = draw.add({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [ring] },
        });
        const firstId = ids[0];
        if (firstId) {
          requestAnimationFrame(() => {
            draw.changeMode('direct_select', { featureId: firstId });
          });
        }
        const bounds = new mapboxgl.LngLatBounds();
        for (const pt of ring) bounds.extend(pt);
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
      }
    });

    map.on('draw.create', () => {
      // Mantener un único polígono activo (igual que AnubisRide singlePolygon)
      const all = draw.getAll();
      if (all.features.length > 1) {
        const latest = all.features[all.features.length - 1];
        for (const f of all.features) {
          if (f.id && f.id !== latest.id) {
            draw.delete(String(f.id));
          }
        }
      }
      syncFromDraw();
    });
    map.on('draw.update', syncFromDraw);
    map.on('draw.delete', syncFromDraw);

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      style={{ height }}
    >
      <div
        ref={hostRef}
        aria-label="Editor de polígono de zona en Mapbox"
        className="h-full w-full"
      />
    </div>
  );
}
