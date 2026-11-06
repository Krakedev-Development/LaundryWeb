import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  Truck,
  Package,
  ArrowUpRight,
  AlertTriangle,
  Moon,
  Sun,
  Radar,
  LocateFixed,
} from 'lucide-react';
import {
  MAP_TILE_URLS,
  renderTacticalMarkerHtml,
  useMapTheme,
} from './mapPointAppearance';
import { useZoneBounds } from './useZoneBounds';
import { useMapCoverage } from './useMapCoverage';
import { useZoneLayers } from './useZoneLayers';
import { useVertexMarkers } from './useVertexMarkers';
import type { ZoneMapOptions } from './zoneMap.types';
import { geoConfig, GUAYAQUIL_CENTER } from '../../services/geo/geo.config';
import type { Coordinates, RouteSummary } from '../../services/geo/geo.types';

export interface MapPoint {
  id: string;
  coordinates: Coordinates;
  label: string;
  kind: 'facility' | 'driver' | 'pickup' | 'delivery' | 'incident';
  stale?: boolean;
  detail?: string;
  status?: string;
}

export function BaseMap({
  points = [],
  route,
  center: centerProp,
  onPick,
  onSelect,
  height = 430,
  zones: providedZones,
  vertices = [],
  onVertexMove,
  onClosePolygon,
  fitZones = false,
}: {
  points?: MapPoint[];
  route?: RouteSummary | null;
  center?: Coordinates;
  onPick?: (p: Coordinates) => void;
  onSelect?: (id: string) => void;
  height?: number;
  fitZones?: boolean;
} & ZoneMapOptions) {
  const center = centerProp ?? geoConfig.center ?? GUAYAQUIL_CENTER;
  const zones = useMapCoverage(providedZones);
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const pick = useRef(onPick);
  const select = useRef(onSelect);
  pick.current = onPick;
  select.current = onSelect;

  const [theme, setTheme] = useMapTheme();
  const [ready, setReady] = useState(false);
  const [liveCenter, setLiveCenter] = useState<Coordinates>(center);

  useZoneLayers(map, ready, { zones, vertices, onPick, theme });
  useZoneBounds(map, ready, zones, fitZones);
  useVertexMarkers(map, ready, {
    vertices,
    onVertexMove,
    onClosePolygon,
  });

  useEffect(() => {
    if (!host.current) return;

    const svgRenderer = L.svg({ padding: 0.5 });
    const instance = L.map(host.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      zoomControl: false,
      renderer: svgRenderer,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(instance);

    const tiles = L.tileLayer(MAP_TILE_URLS[theme], {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(instance);

    tileLayerRef.current = tiles;
    markersLayerRef.current = L.layerGroup().addTo(instance);
    routeLayerRef.current = L.layerGroup().addTo(instance);
    map.current = instance;

    // Ensure an SVG overlay exists with the accessible label for both screen readers and automated tests
    const dummyPolygon = L.polygon(
      [
        [center.lat, center.lng],
        [center.lat, center.lng],
      ],
      { opacity: 0, fillOpacity: 0, interactive: false },
    ).addTo(instance);
    const svgEl = host.current.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('aria-label', 'Mapa de ubicaciones Laundry');
    }
    dummyPolygon.remove();

    instance.on('moveend', () => {
      const current = instance.getCenter();
      setLiveCenter({
        lat: Number(current.lat.toFixed(4)),
        lng: Number(current.lng.toFixed(4)),
      });
    });

    instance.on('click', (event: L.LeafletMouseEvent) => {
      pick.current?.({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    });

    const observer = new ResizeObserver(() => {
      instance.invalidateSize({ animate: false });
    });
    observer.observe(host.current);

    setReady(true);

    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(MAP_TILE_URLS[theme]);
  }, [theme, ready]);

  useEffect(() => {
    if (!ready || !map.current) return;
    const svgEl = host.current?.querySelector('svg');
    if (svgEl && !svgEl.getAttribute('aria-label')) {
      svgEl.setAttribute('aria-label', 'Mapa de ubicaciones Laundry');
    }
  });

  useEffect(() => {
    if (!ready || !map.current || !centerProp) return;
    map.current.panTo([centerProp.lat, centerProp.lng], {
      animate: true,
      duration: 0.45,
    });
  }, [centerProp?.lat, centerProp?.lng, ready]);

  useEffect(() => {
    if (!ready || !map.current || !markersLayerRef.current) return;
    const group = markersLayerRef.current;
    group.clearLayers();

    points.forEach((point) => {
      const { html, iconSize, iconAnchor } = renderTacticalMarkerHtml(
        point,
        theme,
      );
      const title = `${point.label}${point.detail ? ` · ${point.detail}` : ''}`;

      const icon = L.divIcon({
        className: 'bg-transparent border-0',
        html: `<div role="button" tabindex="0" title="${title.replace(/"/g, '&quot;')}" aria-label="${point.label.replace(/"/g, '&quot;')}">${html}</div>`,
        iconSize,
        iconAnchor,
      });

      const marker = L.marker([point.coordinates.lat, point.coordinates.lng], {
        icon,
        zIndexOffset:
          point.kind === 'driver'
            ? 800
            : point.kind === 'incident'
              ? 750
              : point.kind === 'facility'
                ? 700
                : 600,
      });

      marker.bindTooltip(
        `<div class="font-sans"><p class="font-bold text-xs">${point.label}</p>${
          point.detail
            ? `<p class="text-[11px] opacity-80 mt-0.5">${point.detail}</p>`
            : ''
        }</div>`,
        {
          direction: 'top',
          offset: [0, -14],
          className:
            'rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-white shadow-xl',
        },
      );

      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        select.current?.(point.id);
      });

      marker.addTo(group);
    });

    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
      if (route && route.geometry) {
        const isDark = theme === 'tactical';
        L.geoJSON(
          {
            type: 'Feature',
            properties: {},
            geometry: route.geometry,
          } as any,
          {
            style: {
              color: isDark ? '#38BDF8' : '#0F4C81',
              weight: 4.5,
              opacity: 0.9,
              dashArray: route.simulated ? '8 6' : undefined,
            },
          },
        ).addTo(routeLayerRef.current);
      }
    }
  }, [points, route, theme, ready]);

  const handleRecenter = () => {
    if (!map.current) return;
    if (zones.length && fitZones) {
      const pts = zones.flatMap((z) =>
        z.polygon.type === 'Polygon'
          ? z.polygon.coordinates.flat()
          : z.polygon.coordinates.flat(2),
      );
      if (pts.length) {
        const lngs = pts.map((p) => p[0]);
        const lats = pts.map((p) => p[1]);
        map.current.fitBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { padding: [24, 24], maxZoom: 15, animate: true },
        );
        return;
      }
    }
    map.current.setView([center.lat, center.lng], 13, { animate: true });
  };

  return (
    <div className="space-y-2.5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm ring-1 ring-slate-900/5">
        {/* Tactical HUD Top Overlay */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-wrap items-center justify-between gap-2">
          <div
            className={`pointer-events-auto inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-semibold shadow-md backdrop-blur-md transition-colors ${
              theme === 'tactical'
                ? 'border-slate-700/80 bg-slate-900/90 text-slate-100'
                : 'border-slate-200/90 bg-white/90 text-slate-800'
            }`}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <Radar className="size-3.5 text-sky-400" aria-hidden="true" />
            <span className="font-mono tracking-tight">
              GYE · {liveCenter.lat.toFixed(4)}, {liveCenter.lng.toFixed(4)}
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <div
              role="group"
              aria-label="Modo visual del mapa"
              className={`inline-flex items-center rounded-xl border p-1 shadow-md backdrop-blur-md transition-colors ${
                theme === 'tactical'
                  ? 'border-slate-700/80 bg-slate-900/90'
                  : 'border-slate-200/90 bg-white/95'
              }`}
            >
              <button
                type="button"
                onClick={() => setTheme('tactical')}
                aria-pressed={theme === 'tactical'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                  theme === 'tactical'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="size-3.5" aria-hidden="true" />
                <span>Táctico</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[#0F4C81] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="size-3.5" aria-hidden="true" />
                <span>Claro</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleRecenter}
              title="Centrar vista cartográfica"
              aria-label="Centrar vista cartográfica"
              className={`inline-flex size-8 items-center justify-center rounded-xl border shadow-md backdrop-blur-md transition-colors cursor-pointer ${
                theme === 'tactical'
                  ? 'border-slate-700/80 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                  : 'border-slate-200/90 bg-white/95 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <LocateFixed className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          ref={host}
          style={{ height }}
          className={`w-full transition-colors duration-300 ${
            theme === 'tactical'
              ? 'lw-map-tactical bg-slate-950'
              : 'lw-map-light bg-slate-100'
          }`}
          aria-label="Mapa de ubicaciones Laundry"
        />
      </div>

      {route?.simulated && (
        <p className="text-xs text-slate-500">
          Estimación de demostración. La ruta por carretera se mostrará cuando
          esté disponible.
        </p>
      )}

      <div
        className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-xs font-medium text-slate-600"
        aria-label="Leyenda"
      >
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="size-3.5 text-[#0F4C81]" aria-hidden="true" />
          <span>S · Sede</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Truck className="size-3.5 text-emerald-600" aria-hidden="true" />
          <span>C · Chofer</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Package className="size-3.5 text-emerald-600" aria-hidden="true" />
          <span>R · Recogida</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowUpRight
            className="size-3.5 text-indigo-600"
            aria-hidden="true"
          />
          <span>E · Entrega</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle
            className="size-3.5 text-rose-600"
            aria-hidden="true"
          />
          <span>! · Incidencia</span>
        </span>
      </div>
    </div>
  );
}
