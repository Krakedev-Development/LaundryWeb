import { useEffect, useRef } from 'react';
import { adminSocketService, SOCKET_RESYNC_EVENT } from '../services/realtime/adminSocketService';

export interface OrderStatusChangedEvent {
  orderId: string;
  orderNumber?: number;
  status: string;
  activeLeg: 'INBOUND' | 'OUTBOUND' | null;
  facilityId?: string | null;
  updatedAt: string;
}

// Tras un aviso se espera un momento: un mismo cambio puede llegar más de una vez (sala del
// pedido y sala del personal) y varias solicitudes pueden cambiar juntas.
export const ORDER_REFRESH_DEBOUNCE_MS = 400;

/**
 * Recarga una vista de pedidos cuando el servidor avisa un cambio de estado, de asignación o de
 * agenda (cancelación del cliente, reprogramación, avance del chofer...). El servidor solo envía
 * los pedidos que el usuario puede ver: el supervisor recibe los de su sede.
 *
 * `onlyOrderId` limita los avisos a un pedido (vista de detalle).
 */
export function useOrderStatusRealtime(
  onChange: (event: OrderStatusChangedEvent) => void,
  options: { enabled?: boolean; onlyOrderId?: string | null } = {},
): void {
  const { enabled = true, onlyOrderId } = options;
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    adminSocketService.ensureConnected();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let last: OrderStatusChangedEvent | null = null;
    const unsubscribe = adminSocketService.on(
      'order:status:changed',
      (event: OrderStatusChangedEvent) => {
        if (!event?.orderId) return;
        if (onlyOrderId && event.orderId !== onlyOrderId) return;
        last = event;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          if (last) handler.current(last);
        }, ORDER_REFRESH_DEBOUNCE_MS);
      },
    );
    // Tras un corte se pudieron perder avisos: al reconectar se recarga una vez la vista.
    const unsubscribeResync = adminSocketService.on(SOCKET_RESYNC_EVENT, () => {
      if (timer) clearTimeout(timer);
      timer = null;
      handler.current({
        orderId: onlyOrderId ?? '',
        status: '',
        activeLeg: null,
        updatedAt: new Date().toISOString(),
      });
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      unsubscribeResync();
    };
  }, [enabled, onlyOrderId]);
}
