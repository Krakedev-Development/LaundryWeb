import type { Order } from '../../types';
import { operationalStage } from '../../services/fulfillment';

// Fase de planta para mostrar (sin JSX: se prueba con las pruebas unitarias de Node).
export const PLANT_PHASES = [
  'Recepción',
  'Pesaje',
  'Inspección',
  'Precio y pago',
  'Lavado',
  'Calidad',
  'Listo',
] as const;
/** Fase de planta de cada etapa en planta (índice de PLANT_PHASES). */
const PHASE_OF: Record<string, number> = {
  ARRIVED_AT_FACILITY: 0,
  AT_FACILITY: 0,
  WEIGHING: 1,
  INSPECTION: 2,
  PRICING_PENDING: 3,
  CUSTOMER_APPROVAL_PENDING: 3,
  IN_PROCESS: 4,
  QUALITY_CONTROL: 5,
};

/** La ropa terminó en planta y espera salir: "Listo" es la fase actual. */
const READY_STAGES = ['READY', 'READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED', 'DELIVERY_ASSIGNED'];
/** La ropa ya salió de la planta: todas las fases están completas. */
const LEFT_PLANT = ['OUT_FOR_DELIVERY', 'ARRIVED_FOR_DELIVERY', 'DELIVERED', 'CLOSED', 'COMPLETED'];

/** Indica que la solicitud todavía no llegó a la planta. */
export const BEFORE_PLANT = -1;
/** Indica que la solicitud ya salió de la planta. */
export const AFTER_PLANT = PLANT_PHASES.length;

/**
 * Fase de planta para mostrar: 0-6 en planta, BEFORE_PLANT antes de llegar y AFTER_PLANT cuando
 * ya salió. Una solicitud retenida por incidencia conserva la fase en la que estaba
 * (`previousStatus`), así la barra no vuelve a "Recepción".
 */
export function plantPhase(order: Order): number {
  const stage = operationalStage(order);
  if (READY_STAGES.includes(stage)) return 6;
  if (LEFT_PLANT.includes(stage)) return AFTER_PLANT;
  if (stage === 'QUARANTINE' || stage === 'INCIDENT') {
    const previous = order.previousStatus ?? '';
    if (previous in PHASE_OF) return PHASE_OF[previous];
    if (READY_STAGES.includes(previous)) return 6;
    return BEFORE_PLANT;
  }
  return PHASE_OF[stage] ?? BEFORE_PLANT;
}
