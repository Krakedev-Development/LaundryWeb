import { useEffect, type RefObject } from 'react';

/**
 * Comportamiento accesible de un desplegable (menú de acciones, popover): mientras está abierto,
 * se cierra con Escape o con un clic fuera, y al cerrarse con Escape el foco vuelve al botón que
 * lo abrió. Al abrirse, el foco pasa al primer control del panel.
 */
export function useDismissable(
  open: boolean,
  close: () => void,
  container: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const first = container.current?.querySelector<HTMLElement>(
      '[role="group"] a[href], [role="group"] button:not([disabled])',
    );
    first?.focus();

    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      close();
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, container, trigger]);
}
