// Enlaces entre pantallas de Operaciones (contrato 1 de la auditoría). Cada acción tiene un solo
// lugar donde se ejecuta; el resto de pantallas solo navega hasta él con el pedido preseleccionado.

/** Despacho: asignación del chofer de recogida. */
export const dispatchHref = (orderId: string) =>
  `/operations/dispatch?pedido=${encodeURIComponent(orderId)}`;

/** Entregas: asignación del chofer de entrega a domicilio. */
export const deliveriesHref = (orderId: string) =>
  `/operations/deliveries?pedido=${encodeURIComponent(orderId)}`;

/** Planta: fases del proceso, ajustes y retención para revisión (abre el modal en esa sección). */
export const plantHref = (orderId: string, seccion: 'proceso' | 'historial' | 'resumen' = 'proceso') =>
  `/operations/plant?pedido=${encodeURIComponent(orderId)}&seccion=${seccion}`;

/** Incidencias: registro y gestión de incidencias de una solicitud preseleccionada. */
export const incidentsHref = (orderId: string) =>
  `/operations/incidents?pedido=${encodeURIComponent(orderId)}`;

/** Detalle de solicitud con pestaña contextual. */
export const orderDetailHref = (
  orderId: string,
  tab?: 'operation' | 'order' | 'logistics' | 'activity',
) => `/operations/orders/${encodeURIComponent(orderId)}${tab ? `?tab=${tab}` : ''}`;

/**
 * Etapas en las que la solicitud está en planta. En ellas el proceso y la retención se gestionan
 * solo en Planta; el detalle muestra la fase y enlaza hasta allí.
 */
export const PLANT_STAGES = [
  'ARRIVED_AT_FACILITY',
  'AT_FACILITY',
  'WEIGHING',
  'INSPECTION',
  'PRICING_PENDING',
  'CUSTOMER_APPROVAL_PENDING',
  'IN_PROCESS',
  'QUALITY_CONTROL',
];

export const isPlantStage = (stage: string) => PLANT_STAGES.includes(stage);
