import { Check, RotateCcw, Undo2 } from 'lucide-react';
import React from 'react';
export function PolygonToolbar({
  count,
  drawing,
  onClose,
  onUndo,
  onReset,
}: {
  count: number;
  drawing: boolean;
  onClose(): void;
  onUndo(): void;
  onReset(): void;
}) {
  return (
    <div className="ops-drawing-toolbar">
      <span className="ops-badge mr-auto">{count} vértices</span>
      {drawing && (
        <button
          type="button"
          onClick={onClose}
          className="ops-button ops-button-primary ops-button-compact"
        >
          <Check aria-hidden="true" />
          Cerrar polígono
        </button>
      )}
      <button
        type="button"
        disabled={!count}
        onClick={onUndo}
        className="ops-button ops-button-compact"
      >
        <Undo2 aria-hidden="true" />
        Deshacer punto
      </button>
      <button
        type="button"
        onClick={onReset}
        className="ops-button ops-button-ghost ops-button-compact"
      >
        <RotateCcw aria-hidden="true" />
        Redibujar
      </button>
    </div>
  );
}
