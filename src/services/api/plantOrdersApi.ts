import type { Customer, Driver, Facility, Order } from '../../types';
import { fetchFullOrders } from './ordersApi';
import { PLANT_STATUSES } from './plantApi';

// Lista de Planta desde el servidor: lo que está en proceso, lo que ya está listo para salir o
// retirarse y lo retenido por incidencia. No se lee del almacenamiento local.
export const PLANT_LIST_STATUSES = [
  ...PLANT_STATUSES,
  'READY_FOR_DELIVERY',
  'READY_FOR_PICKUP',
  'INCIDENT',
] as const;

export async function fetchPlantOrders(
  existing: Order[] = [],
  customers: Customer[] = [],
  facilities: Facility[] = [],
  drivers: Driver[] = [],
): Promise<Order[]> {
  // Si alguna consulta falla, falla la carga completa: una lista a medias engaña a la planta.
  const lists = await Promise.all(
    PLANT_LIST_STATUSES.map((status) =>
      fetchFullOrders({ status, pageSize: 100 }, existing, customers, facilities, drivers),
    ),
  );
  const seen = new Set<string>();
  return lists.flat().filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}
