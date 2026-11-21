// Enlaces entre pantallas de Operaciones (contrato 1 de la auditoría). Cada acción tiene un solo
// lugar donde se ejecuta; el resto de pantallas solo navega hasta él con el pedido preseleccionado.

/** Despacho: asignación del chofer de recogida. */
export const dispatchHref = (orderId: string) =>
  `/operations/dispatch?pedido=${encodeURIComponent(orderId)}`;
