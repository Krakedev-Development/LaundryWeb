import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { ZoneMapOptions } from './zoneMap.types';

export function useVertexMarkers(
  map: React.RefObject<L.Map | null>,
  ready: boolean,
  options: ZoneMapOptions,
) {
  const { vertices = [], onVertexMove, onClosePolygon } = options;
  const moveRef = useRef(onVertexMove);
  const closeRef = useRef(onClosePolygon);
  moveRef.current = onVertexMove;
  closeRef.current = onClosePolygon;

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;

    if (vertices.length) {
      instance.doubleClickZoom.disable();
    } else {
      instance.doubleClickZoom.enable();
    }

    const markers = vertices.map((point, index) => {
      const isFirst = index === 0;
      const title = isFirst ? 'Cerrar polígono' : `Vértice ${index + 1}`;
      const badgeTone = isFirst
        ? 'border-emerald-500 bg-emerald-600 text-white ring-emerald-400/40'
        : 'border-sky-600 bg-white text-sky-950 ring-sky-400/30';

      const icon = L.divIcon({
        className: 'bg-transparent border-0',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<button type="button" title="${title}" aria-label="${title}" class="flex size-7 items-center justify-center rounded-full border-2 font-mono text-xs font-extrabold shadow-lg ring-3 transition-transform duration-150 hover:scale-110 ${
          moveRef.current ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${badgeTone}">${index + 1}</button>`,
      });

      const marker = L.marker([point.lat, point.lng], {
        icon,
        draggable: Boolean(moveRef.current),
        zIndexOffset: isFirst ? 1000 : 900,
      }).addTo(instance);

      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        if (isFirst) {
          closeRef.current?.();
        }
      });

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        moveRef.current?.(index, {
          lat: Number(position.lat.toFixed(6)),
          lng: Number(position.lng.toFixed(6)),
        });
      });

      return marker;
    });

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [map, ready, vertices, Boolean(onVertexMove), Boolean(onClosePolygon)]);
}
