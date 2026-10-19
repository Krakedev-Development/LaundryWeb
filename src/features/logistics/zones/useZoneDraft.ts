import { useState } from 'react';
import type { Zone } from '../../../entities/zone/model/zone.types';
import type { Coordinates } from '../../../services/geo/geo.types';
import { polygonFromVertices } from '../../../entities/zone/model/polygonGeometry';
import { validateZone } from '../../../entities/zone/model/zone.rules';
export function useZoneDraft(
  initial: Zone | undefined,
  zones: Zone[],
  onSave: (zone: Zone) => void,
  onClose: () => void,
) {
  const [name, setName] = useState(initial?.name ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const original =
    initial?.polygon.type === 'Polygon'
      ? initial.polygon.coordinates[0].slice(0, -1)
      : [];
  const [vertices, setVertices] = useState<Coordinates[]>(
    original.map(([lng, lat]) => ({ lng, lat })),
  );
  const [drawing, setDrawing] = useState(!initial);
  const [error, setError] = useState('');
  const closePolygon = () => {
    try {
      validateZone({
        id: 'draft',
        name: name.trim() || 'Zona',
        polygon: polygonFromVertices(vertices),
        active,
      });
      setDrawing(false);
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    }
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (drawing) throw Error('Cierra el polígono antes de guardar.');
      onSave({
        id: initial?.id ?? `ZONA-${crypto.randomUUID()}`,
        name,
        active,
        polygon: polygonFromVertices(vertices),
      });
      onClose();
    } catch (reason) {
      setError((reason as Error).message);
    }
  };
  const preview: Zone[] =
    !drawing && vertices.length >= 3
      ? [
          ...zones.filter((zone) => zone.id !== initial?.id),
          { id: 'draft', name, active, polygon: polygonFromVertices(vertices) },
        ]
      : zones.filter((zone) => zone.id !== initial?.id);

  return {
    name,
    setName,
    active,
    setActive,
    vertices,
    setVertices,
    drawing,
    setDrawing,
    error,
    closePolygon,
    save,
    preview,
  };
}
