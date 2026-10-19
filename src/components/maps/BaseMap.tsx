import { mapSymbols, pointColor } from './mapPointAppearance';
import { useZoneBounds } from './useZoneBounds';
import React, { useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';
import { useMapCoverage } from './useMapCoverage';
import { CoordinateMap } from './CoordinateMap';
import { useZoneLayers } from './useZoneLayers';
import { useVertexMarkers } from './useVertexMarkers';
import type { ZoneMapOptions } from './zoneMap.types';
import 'mapbox-gl/dist/mapbox-gl.css';
import { geoConfig } from '../../services/geo/geo.config';
import {
  toLngLat,
  type Coordinates,
  type RouteSummary,
} from '../../services/geo/geo.types';
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
  center = geoConfig.center,
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
  const zones = useMapCoverage(providedZones);
  const host = useRef<HTMLDivElement>(null),
    map = useRef<mapboxgl.Map | null>(null);
  const runtime = useRef<typeof import('mapbox-gl').default | null>(null);
  const pick = useRef(onPick),
    select = useRef(onSelect);
  pick.current = onPick;
  select.current = onSelect;
  const [error, setError] = useState(''),
    [ready, setReady] = useState(false);
  useZoneLayers(map, ready, { zones, vertices });
  useZoneBounds(map, ready, zones, fitZones);
  useVertexMarkers(map, runtime, ready, {
    vertices,
    onVertexMove,
    onClosePolygon,
  });
  useEffect(() => {
    if (!host.current || !geoConfig.accessToken) return;
    let instance: mapboxgl.Map | undefined,
      observer: ResizeObserver | undefined;
    let cancelled = false;
    import('mapbox-gl')
      .then(({ default: Mapbox }) => {
        if (cancelled || !host.current) return;
        runtime.current = Mapbox;
        instance = new Mapbox.Map({
          container: host.current,
          accessToken: geoConfig.accessToken,
          style: geoConfig.style,
          center: toLngLat(center),
          zoom: 13,
        });
        map.current = instance;
        instance.addControl(new Mapbox.NavigationControl(), 'top-right');
        instance.addControl(
          new Mapbox.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false,
          }),
          'top-right',
        );
        instance.on('load', () => {
          if (cancelled || !instance) return;
          instance.addSource('coverage', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });
          instance.addLayer({
            id: 'coverage',
            type: 'fill',
            source: 'coverage',
            paint: { 'fill-color': '#61BFC7', 'fill-opacity': 0.12 },
          });
          setReady(true);
        });
        instance.on('error', () =>
          setError(
            'Mapa temporalmente no disponible. Puedes consultar las direcciones.',
          ),
        );
        instance.on('click', (event) =>
          pick.current?.({ lat: event.lngLat.lat, lng: event.lngLat.lng }),
        );
        observer = new ResizeObserver(() => instance?.resize());
        observer.observe(host.current);
      })
      .catch(() => {
        if (!cancelled)
          setError('No pudimos mostrar el mapa en este dispositivo.');
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      instance?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (ready) map.current?.easeTo({ center: toLngLat(center), duration: 500 });
  }, [center.lat, center.lng, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current;
    const Mapbox = runtime.current;
    if (!Mapbox) return;
    const markers = points.map((point) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = mapSymbols[point.kind];
      button.title = `${point.label}${point.detail ? ` · ${point.detail}` : ''}`;
      button.setAttribute('aria-label', button.title);
      const background = pointColor(point);
      Object.assign(button.style, {
        background,
        color: 'white',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '2px solid white',
        fontWeight: 'bold',
        opacity: point.stale ? '.45' : '1',
        cursor: 'pointer',
      });
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        select.current?.(point.id);
      });
      return new Mapbox.Marker({ element: button })
        .setLngLat(toLngLat(point.coordinates))
        .addTo(instance);
    });
    if (instance.getLayer('laundry-route'))
      instance.removeLayer('laundry-route');
    if (instance.getSource('laundry-route'))
      instance.removeSource('laundry-route');
    if (route && !route.simulated) {
      instance.addSource('laundry-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: route.geometry },
      });
      instance.addLayer({
        id: 'laundry-route',
        type: 'line',
        source: 'laundry-route',
        paint: { 'line-color': '#143F73', 'line-width': 5 },
      });
    }
    return () => markers.forEach((marker) => marker.remove());
  }, [points, route, ready]);
  return (
    <div className="space-y-2">
      {geoConfig.accessToken && !error ? (
        <div
          ref={host}
          style={{ height }}
          className="rounded-xl overflow-hidden border border-slate-200"
          aria-label="Mapa de ubicaciones Laundry"
        />
      ) : (
        <CoordinateMap
          followCenter={center !== geoConfig.center}
          zones={zones}
          vertices={vertices}
          points={points}
          center={center}
          height={height}
          onPick={onPick}
          onSelect={onSelect}
          onVertexMove={onVertexMove}
          onClosePolygon={onClosePolygon}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-amber-800">
          {error}
        </p>
      )}
      {route?.simulated && (
        <p className="text-xs text-slate-500">
          Estimación de demostración. La ruta por carretera se mostrará cuando
          esté disponible.
        </p>
      )}
      <div
        className="flex flex-wrap gap-3 text-xs text-slate-600"
        aria-label="Leyenda"
      >
        <span>S · Sede</span>
        <span>C · Chofer</span>
        <span>R · Recogida</span>
        <span>E · Entrega</span>
        <span>! · Incidencia</span>
      </div>
    </div>
  );
}
