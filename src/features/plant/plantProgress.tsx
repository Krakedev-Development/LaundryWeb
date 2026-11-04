import type { Order } from '../../types';
import { operationalStage } from '../../services/fulfillment';

export const PLANT_PHASES = [
  'Recepción',
  'Pesaje',
  'Inspección',
  'Precio y pago',
  'Lavado',
  'Calidad',
  'Listo',
] as const;
export function plantPhase(order: Order) {
  const stage = operationalStage(order);
  if (
    [
      'READY',
      'READY_FOR_DELIVERY',
      'DELIVERY_SCHEDULED',
      'DELIVERY_ASSIGNED',
    ].includes(stage)
  )
    return 6;
  if (stage === 'QUALITY_CONTROL') return 5;
  if (stage === 'QUARANTINE') {
    const previous: Record<string, number> = { AT_FACILITY: 0, WEIGHING: 1, INSPECTION: 2, PRICING_PENDING: 3, CUSTOMER_APPROVAL_PENDING: 3, IN_PROCESS: 4, QUALITY_CONTROL: 5 };
    return previous[order.previousStatus ?? ''] ?? 0;
  }
  if (stage === 'INCIDENT') return 0;
  if (stage === 'IN_PROCESS') return 4;
  if (['PRICING_PENDING', 'CUSTOMER_APPROVAL_PENDING'].includes(stage))
    return 3;
  if (stage === 'INSPECTION') return 2;
  if (stage === 'WEIGHING') return 1;
  return 0;
}
export function isPlantOrder(order: Order) {
  const stage = operationalStage(order);
  if (
    [
      'AT_FACILITY',
      'WEIGHING',
      'INSPECTION',
      'PRICING_PENDING',
      'CUSTOMER_APPROVAL_PENDING',
      'IN_PROCESS',
      'QUALITY_CONTROL',
      'READY_FOR_DELIVERY',
      'DELIVERY_SCHEDULED',
      'DELIVERY_ASSIGNED',
      'QUARANTINE',
    ].includes(stage)
  )
    return !['RELEASED', 'EN_ROUTE', 'ARRIVED', 'DELIVERED'].includes(
      order.fulfillment?.outbound.milestone ?? '',
    );
  return (
    stage === 'INCIDENT' && order.fulfillment?.inbound.status === 'COMPLETED'
  );
}
export function PlantProgress({
  order,
  compact = false,
}: {
  order: Order;
  compact?: boolean;
}) {
  const phase = plantPhase(order);
  const held =
    !!order.quarantineReason ||
    !!(order.intakeHold && !order.intakeHold.resolvedAt) ||
    order.status === 'INCIDENT';
  return (
    <div
      aria-label={`Proceso: ${PLANT_PHASES[phase]}${held ? ', retenido' : ''}`}
    >
      <ol className={`flex ${compact ? 'gap-1' : 'gap-2'}`}>
        {PLANT_PHASES.map((label, index) => {
          const skipped =
            index === 1 && order.pricing.pricingModel !== 'PER_WEIGHT';
          return (
            <li
              key={label}
              aria-current={phase === index ? 'step' : undefined}
              className="relative min-w-0 flex-1"
            >
              <div
                className={`h-1.5 rounded-full ${skipped ? 'bg-slate-200' : index < phase ? 'bg-emerald-600' : index === phase ? (held ? 'bg-amber-600' : 'bg-[#0F4C81]') : 'bg-slate-200'}`}
              />
              {!compact && (
                <span
                  className={`mt-2 block text-xs ${index === phase ? 'font-semibold text-[#0F4C81]' : 'text-slate-600'}`}
                >
                  {label}
                  {skipped && (
                    <span className="block text-[10px]">No aplica</span>
                  )}
                </span>
              )}
              {compact && (
                <span className="sr-only">
                  {label}
                  {skipped
                    ? ': no aplica'
                    : index < phase
                      ? ': etapa anterior'
                      : index === phase
                        ? ': etapa actual'
                        : ': pendiente'}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {compact && (
        <p
          className={`mt-2 text-xs font-medium ${held ? 'text-amber-800' : 'text-[#0F4C81]'}`}
        >
          {held ? 'Retenido · ' : ''}
          {PLANT_PHASES[phase]}
        </p>
      )}
    </div>
  );
}
