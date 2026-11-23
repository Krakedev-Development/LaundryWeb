import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FeatureCollection, Polygon } from 'geojson';
import { LocateFixed } from 'lucide-react';
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
import type { ZoneMetricsSummary } from '../../services/api/geoApi';
import { BaseMap, type MapPoint } from './BaseMap';
import { renderTacticalMarkerHtml } from './mapPointAppearance';
import {
  getZonesCenter,
  zoneRingLngLat,
  zoneToPolygonFeature,
} from './mapboxGeo';

const ZONES_SOURCE = 'laundry-zones-source';
const ZONES_FILL_LAYER = 'laundry-zones-fill';
const ZONES_LINE_LAYER = 'laundry-zones-line';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildZonePopupHtml(
  name: string,
  active: boolean,
  metrics?: ZoneMetricsSummary,
): string {
  const badge = active
    ? '<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#ECFDF5;color:#047857;font-weight:700;font-size:11px;">Activa</span>'
    : '<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#FEF3C7;color:#B45309;font-weight:700;font-size:11px;">Inactiva</span>';
  const metricsBlock = metrics
    ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #E2E8F0;font-size:12px;color:#334155;display:grid;gap:3px;">
        <div>Sedes activas: <strong>${metrics.activeFacilities}/${metrics.totalFacilities}</strong></div>
        <div>Choferes online: <strong>${metrics.onlineDrivers}</strong> (${metrics.availableDrivers} libres)</div>
        <div>Pedidos activos: <strong>${metrics.activeOrders}</strong> (${metrics.activePickups} rec. / ${metrics.activeDeliveries} ent.)</div>
      </div>`
    : '';
  return `<div style="font-family:system-ui,-apple-system,sans-serif;min-width:170px;color:#0F172A;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <strong style="font-size:13px;">${escapeHtml(name)}</strong>
      ${badge}
    </div>
    ${metricsBlock}
  </div>`;
}

function markerColorsFor(point: MapPoint): { bg: string; ring: string; tag: string } {
  if (point.kind === 'facility') {
    return { bg: '#0F4C81', ring: '#BAE6FD', tag: 'Sede' };
  }
  if (point.kind === 'driver') {
    if (point.stale || point.status === 'OFFLINE') {
      return { bg: '#64748B', ring: '#CBD5E1', tag: 'Chofer' };
    }
    if (point.status === 'ON_SERVICE') {
      return { bg: '#0284C7', ring: '#7DD3FC', tag: 'En servicio' };
    }
    if (point.status === 'BREAK') {
      return { bg: '#D97706', ring: '#FDE68A', tag: 'Descanso' };
    }
    return { bg: '#16A34A', ring: '#BBF7D0', tag: 'Disponible' };
  }
  if (point.kind === 'pickup') {
    return { bg: '#0EA5E9', ring: '#BAE6FD', tag: 'Recogida' };
  }
  if (point.kind === 'delivery') {
    return { bg: '#10B981', ring: '#A7F3D0', tag: 'Entrega' };
  }
  return { bg: '#DC2626', ring: '#FECACA', tag: 'Incidencia' };
}

function createMarkerElement(point: MapPoint): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cursor = 'pointer';
  el.innerHTML = renderTacticalMarkerHtml(point, 'light').html;
  return el;
}

export interface MapboxZoneMapProps {
  zones: Zone[];
  points?: MapPoint[];
  metrics?: ZoneMetricsSummary[];
  center?: Coordinates;
  fitZones?: boolean;
  height?: number;
  selectedZoneId?: string;
  onPick?: (point: Coordinates) => void;
  onSelect?: (id: string, kind: MapPoint['kind']) => void;
}

export function MapboxZoneMap({
  zones,
  points = [],
  metrics = [],
  center,
  fitZones = false,
  height = 460,
  selectedZoneId,
  onPick,
  onSelect,
}: MapboxZoneMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const onPickRef = useRef(onPick);
  const onSelectRef = useRef(onSelect);
  const metricsRef = useRef(metrics);
  onPickRef.current = onPick;
  onSelectRef.current = onSelect;
  metricsRef.current = metrics;

  const fitToZones = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;
    for (const z of zones) {
      for (const coord of zoneRingLngLat(z)) {
        bounds.extend(coord);
        hasCoords = true;
      }
    }
    if (!hasCoords) {
      for (const p of points) {
        if (Number.isFinite(p.coordinates.lat) && Number.isFinite(p.coordinates.lng)) {
          bounds.extend([p.coordinates.lng, p.coordinates.lat]);
          hasCoords = true;
        }
      }
    }
    if (hasCoords) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 500 });
    }
  };

  useEffect(() => {
    if (!USE_MAPBOX || !containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const initialCenter: [number, number] = center
      ? [center.lng, center.lat]
      : zones.length > 0
        ? getZonesCenter(zones)
        : DEFAULT_MAP_CENTER;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: initialCenter,
      zoom: DEFAULT_MAP_ZOOM,
    });

    configureMapboxMap(map);
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    const ensureZoneLayers = () => {
      if (!map.getSource(ZONES_SOURCE)) {
        const empty: FeatureCollection<Polygon> = {
          type: 'FeatureCollection',
          features: [],
        };
        map.addSource(ZONES_SOURCE, { type: 'geojson', data: empty });
      }
      if (!map.getLayer(ZONES_FILL_LAYER)) {
        map.addLayer({
          id: ZONES_FILL_LAYER,
          type: 'fill',
          source: ZONES_SOURCE,
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'selected'], true],
              '#0284C7',
              ['==', ['get', 'active'], true],
              '#0EA5E9',
              '#94A3B8',
            ],
            'fill-opacity': [
              'case',
              ['==', ['get', 'selected'], true],
              0.24,
              ['==', ['get', 'active'], true],
              0.15,
              0.1,
            ],
          },
        });
      }
      if (!map.getLayer(ZONES_LINE_LAYER)) {
        map.addLayer({
          id: ZONES_LINE_LAYER,
          type: 'line',
          source: ZONES_SOURCE,
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'selected'], true],
              '#0F4C81',
              ['==', ['get', 'active'], true],
              '#0284C7',
              '#64748B',
            ],
            'line-width': ['case', ['==', ['get', 'selected'], true], 3, 2],
          },
        });
      }
    };

    map.on('load', () => {
      ensureZoneLayers();
      map.resize();
    });
    map.on('style.load', ensureZoneLayers);

    map.on('click', (e) => {
      if (onPickRef.current) {
        onPickRef.current({
          lat: Number(e.lngLat.lat.toFixed(6)),
          lng: Number(e.lngLat.lng.toFixed(6)),
        });
        return;
      }
      if (!map.getLayer(ZONES_FILL_LAYER)) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: [ZONES_FILL_LAYER],
      });
      const feat = features[0];
      if (!feat?.properties) return;
      const id = String(feat.properties.id ?? '');
      const name = String(feat.properties.name ?? 'Zona');
      const active = feat.properties.active === true || feat.properties.active === 'true';
      const metric = metricsRef.current.find((m) => m.zoneId === id);
      popupRef.current?.remove();
      popupRef.current = new mapboxgl.Popup({ closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(buildZonePopupHtml(name, active, metric))
        .addTo(map);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      popupRef.current?.remove();
      for (const m of markersRef.current.values()) m.remove();
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sincronizar capas GeoJSON de zonas
  useEffect(() => {
    const map = mapRef.current;
    if (!USE_MAPBOX || !map) return;

    const applyData = () => {
      const source = map.getSource(ZONES_SOURCE) as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      const features = zones
        .map((z) =>
          zoneToPolygonFeature(z, {
            selected: selectedZoneId ? z.id === selectedZoneId : false,
          }),
        )
        .filter((f): f is NonNullable<typeof f> => f !== null);
      source.setData({ type: 'FeatureCollection', features });
      if (fitZones && features.length > 0 && !center) {
        fitToZones();
      }
    };

    if (map.isStyleLoaded() && map.getSource(ZONES_SOURCE)) {
      applyData();
    } else {
      map.once('load', applyData);
    }
  }, [zones, selectedZoneId, fitZones]);

  // Sincronizar marcadores de sedes, choferes, pedidos e incidencias
  useEffect(() => {
    const map = mapRef.current;
    if (!USE_MAPBOX || !map) return;

    const nextKeys = new Set<string>();
    for (const point of points) {
      if (
        !Number.isFinite(point.coordinates.lat) ||
        !Number.isFinite(point.coordinates.lng)
      ) {
        continue;
      }
      const key = `${point.kind}:${point.id}`;
      nextKeys.add(key);
      const existing = markersRef.current.get(key);
      if (existing) {
        existing.setLngLat([point.coordinates.lng, point.coordinates.lat]);
        continue;
      }
      const el = createMarkerElement(point);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onSelectRef.current?.(point.id, point.kind);
      });
      const { tag } = markerColorsFor(point);
      const popupHtml = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#0F172A;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748B;">${escapeHtml(tag)}</div>
        <strong style="font-size:13px;">${escapeHtml(point.label)}</strong>
        ${point.detail ? `<div style="color:#475569;margin-top:2px;">${escapeHtml(point.detail)}</div>` : ''}
      </div>`;
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([point.coordinates.lng, point.coordinates.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML(popupHtml))
        .addTo(map);
      markersRef.current.set(key, marker);
    }

    for (const [key, marker] of markersRef.current.entries()) {
      if (!nextKeys.has(key)) {
        marker.remove();
        markersRef.current.delete(key);
      }
    }
  }, [points]);

  // Seguimiento suave de cámara (p. ej. "Seguir chofer" o resultado de búsqueda)
  useEffect(() => {
    const map = mapRef.current;
    if (!USE_MAPBOX || !map || !center) return;
    if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return;
    map.easeTo({
      center: [center.lng, center.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 600,
    });
  }, [center?.lat, center?.lng]);

  if (!USE_MAPBOX) {
    return (
      <BaseMap
        fitZones={fitZones}
        zones={zones}
        points={points}
        center={center}
        height={height}
        onPick={onPick}
        onSelect={
          onSelect
            ? (id) => {
                const match = points.find((p) => p.id === id);
                onSelect(id, match?.kind ?? 'facility');
              }
            : undefined
        }
      />
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      style={{ height }}
    >
      <div
        ref={containerRef}
        aria-label="Mapa Mapbox de zonas y operación Laundry"
        className="h-full w-full"
      />
      <button
        type="button"
        onClick={fitToZones}
        title="Ajustar vista a las zonas"
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
      >
        <LocateFixed className="h-3.5 w-3.5 text-sky-600" />
        <span>Centrar</span>
      </button>
    </div>
  );
}
