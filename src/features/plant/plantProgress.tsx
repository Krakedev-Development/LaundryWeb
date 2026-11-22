import type { Order } from '../../types';
import { operationalStage } from '../../services/fulfillment';

import { AFTER_PLANT, BEFORE_PLANT, PLANT_PHASES, plantPhase } from './plantPhase';

export { AFTER_PLANT, BEFORE_PLANT, PLANT_PHASES, plantPhase };

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
      aria-label={`Proceso: ${
        phase === BEFORE_PLANT
          ? 'aún no llega a planta'
          : phase === AFTER_PLANT
            ? 'completo'
            : PLANT_PHASES[phase]
      }${held ? ', retenido' : ''}`}
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
                className={`h-2 rounded-full transition-all duration-300 ${skipped ? 'bg-slate-200' : index < phase ? 'bg-emerald-500 shadow-2xs' : index === phase ? (held ? 'bg-amber-500 animate-pulse' : 'bg-primary ring-2 ring-sky-500/20') : 'bg-slate-200'}`}
              />
              {!compact && (
                <span
                  className={`mt-2 block text-xs ${index === phase ? 'font-semibold text-primary' : 'text-slate-600'}`}
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
          className={`mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${held ? 'border-amber-200 bg-amber-50 text-amber-800' : phase === 6 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sky-200 bg-sky-50 text-primary'}`}
        >
          <span
            className={`size-1.5 rounded-full ${held ? 'bg-amber-500' : phase === 6 ? 'bg-emerald-500' : 'bg-primary'}`}
          />
          {held ? 'Retenido · ' : ''}
          {PLANT_PHASES[phase]}
        </p>
      )}
    </div>
  );
}
