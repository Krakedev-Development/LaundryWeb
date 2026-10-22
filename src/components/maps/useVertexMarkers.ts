import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { ZoneMapOptions } from './zoneMap.types';

export function useVertexMarkers(
  map: React.RefObject<mapboxgl.Map | null>,
  runtime: React.RefObject<typeof mapboxgl | null>,
  ready: boolean,
  options: ZoneMapOptions,
) {
  const { vertices = [], onVertexMove, onClosePolygon } = options;
  useEffect(() => {
    if (!ready || !runtime.current || !map.current) return;
    if (vertices.length) map.current.doubleClickZoom.disable();
    else map.current.doubleClickZoom.enable();
    const markers = vertices.map((point, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(index + 1);
      button.title = index === 0 ? 'Cerrar polígono' : `Vértice ${index + 1}`;
      button.setAttribute('aria-label', button.title);
      button.className =
        'rounded-full bg-white border-2 border-sky-700 text-sky-900 w-7 h-7 font-bold';
      button.onclick = (event) => {
        event.stopPropagation();
        if (!index) onClosePolygon?.();
      };
      const marker = new runtime.current!.Marker({
        element: button,
        draggable: !!onVertexMove,
      })
        .setLngLat([point.lng, point.lat])
        .addTo(map.current!);
      marker.on('dragend', () => {
        const position = marker.getLngLat();
        onVertexMove?.(index, { lat: position.lat, lng: position.lng });
      });
      return marker;
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [map, runtime, ready, vertices, onVertexMove, onClosePolygon]);
}
