import React, { useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';
import { SERVICE_AREAS } from '../../services/geo/demo';
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
const symbols = {
  facility: 'S',
  driver: 'C',
  pickup: 'R',
  delivery: 'E',
  incident: '!',
};
const colors = {
  facility: '#143F73',
  driver: '#087E8B',
  pickup: '#668B16',
  delivery: '#143F73',
  incident: '#B45309',
};
export function BaseMap({
  points = [],
  route,
  center = geoConfig.center,
  onPick,
  onSelect,
  height = 430,
}: {
  points?: MapPoint[];
  route?: RouteSummary | null;
  center?: Coordinates;
  onPick?: (p: Coordinates) => void;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<mapboxgl.Map | null>(null);
  const runtime = useRef<typeof import('mapbox-gl').default | null>(null);
  const pick = useRef(onPick),
    select = useRef(onSelect);
  pick.current = onPick;
  select.current = onSelect;
  const [error, setError] = useState(''),
    [ready, setReady] = useState(false);
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
              features: SERVICE_AREAS.filter((area) => area.active).map(
                (area) => ({
                  type: 'Feature',
                  properties: { name: area.name },
                  geometry: area.polygon,
                }),
              ),
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
      button.textContent = symbols[point.kind];
      button.title = `${point.label}${point.detail ? ` · ${point.detail}` : ''}`;
      button.setAttribute('aria-label', button.title);
      const background =
        point.kind === 'driver'
          ? ({
              AVAILABLE: '#087E8B',
              ON_SERVICE: '#143F73',
              BREAK: '#B45309',
              OFFLINE: '#64748B',
            }[point.status ?? ''] ?? colors.driver)
          : colors[point.kind];
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
      {geoConfig.accessToken ? (
        <div
          ref={host}
          style={{ height }}
          className="rounded-xl overflow-hidden border border-slate-200"
          aria-label="Mapa de ubicaciones Laundry"
        />
      ) : (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 p-6"
          role="status"
        >
          <p className="font-semibold">Mapa pendiente de configuración</p>
          <p className="text-sm text-slate-600">
            Las direcciones y la demostración local siguen disponibles.
          </p>
        </div>
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
