import { MousePointer2 } from 'lucide-react';
import { useZoneDraft } from './useZoneDraft';
import { PolygonToolbar } from './PolygonToolbar';
import React from 'react';
import { BaseMap } from '../../../components/maps/BaseMap';
import { Dialog } from '../../../shared/ui/Dialog';
import type { Zone } from '../../../entities/zone/model/zone.types';

export function ZoneEditor({
  initial,
  zones,
  onSave,
  onClose,
}: {
  initial?: Zone;
  zones: Zone[];
  onSave(zone: Zone): void;
  onClose(): void;
}) {
  const {
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
  } = useZoneDraft(initial, zones, onSave, onClose);
  return (
    <Dialog title={initial ? 'Editar zona' : 'Crear zona'} onClose={onClose}>
      <form onSubmit={save} className="space-y-5">
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
          <label className="ops-label">
            Nombre de la zona
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="ops-field"
            />
          </label>
          <label className="ops-check-label rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              className="ops-check"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            Zona activa
          </label>
        </div>
        <p className="ops-note">
          <MousePointer2 aria-hidden="true" />
          {drawing
            ? 'Marca al menos tres puntos en el mapa. Cierra con el primer vértice o con «Cerrar polígono».'
            : 'Arrastra los vértices para ajustar el límite. Las sedes deben permanecer dentro de su zona.'}
        </p>
        <BaseMap
          fitZones
          zones={preview}
          vertices={vertices}
          height={380}
          onPick={
            drawing
              ? (point) => setVertices((current) => [...current, point])
              : undefined
          }
          onVertexMove={(index, point) =>
            setVertices((current) =>
              current.map((vertex, i) => (i === index ? point : vertex)),
            )
          }
          onClosePolygon={closePolygon}
        />
        <PolygonToolbar
          count={vertices.length}
          drawing={drawing}
          onClose={closePolygon}
          onUndo={() => {
            setVertices((current) => current.slice(0, -1));
            setDrawing(true);
          }}
          onReset={() => {
            setVertices([]);
            setDrawing(true);
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <footer className="ops-dialog-footer">
          <button type="button" onClick={onClose} className="ops-button">
            Cancelar
          </button>
          <button type="submit" className="ops-button ops-button-primary">
            Guardar zona
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
