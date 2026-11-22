import React from 'react';
import { Check, AlertTriangle, Clock } from 'lucide-react';
import type { Order } from '../../../types';
import { operationalStage } from '../../../services/fulfillment';

export interface MilestoneStep {
  id: string;
  label: string;
  description: string;
}

const MILESTONES: MilestoneStep[] = [
  { id: 'confirmed', label: 'Confirmado', description: 'Solicitud creada y confirmada' },
  { id: 'picked_up', label: 'Recogido', description: 'Prendas retiradas del domicilio' },
  { id: 'in_facility', label: 'En planta', description: 'Inspección, lavado y control' },
  { id: 'ready', label: 'Listo', description: 'Listo para despacho y entrega' },
  { id: 'delivered', label: 'Entregado', description: 'Entregado al cliente' },
];

function getMilestoneIndex(stage: string): number {
  if (['DELIVERED', 'CLOSED', 'COMPLETED'].includes(stage)) return 4;
  if (
    [
      'READY',
      'READY_FOR_DELIVERY',
      'DELIVERY_SCHEDULED',
      'DELIVERY_ASSIGNED',
      'OUT_FOR_DELIVERY',
      'ARRIVED_FOR_DELIVERY',
    ].includes(stage)
  )
    return 3;
  if (
    [
      'AT_FACILITY',
      'WEIGHING',
      'INSPECTION',
      'PRICING_PENDING',
      'CUSTOMER_APPROVAL_PENDING',
      'IN_PROCESS',
      'QUALITY_CONTROL',
    ].includes(stage)
  )
    return 2;
  if (['PICKED_UP', 'HEADING_TO_FACILITY', 'ARRIVED_AT_FACILITY'].includes(stage))
    return 1;
  return 0; // CONFIRMED, CREATED, PICKUP_PENDING, PICKUP_ASSIGNED, etc.
}

export const GlobalProgressStepper: React.FC<{ order: Order }> = ({ order }) => {
  const stage = operationalStage(order);
  const currentIndex = getMilestoneIndex(stage);
  const isHeld =
    stage === 'QUARANTINE' ||
    stage === 'INCIDENT' ||
    Boolean(order.quarantineReason) ||
    Boolean(order.intakeHold && !order.intakeHold.resolvedAt);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Progreso Global de la Solicitud
        </h3>
        {isHeld && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Atención requerida</span>
          </span>
        )}
      </div>

      <div role="region" aria-label="Progreso global" className="relative">
        <ol className="grid grid-cols-5 gap-2 sm:gap-4">
          {MILESTONES.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;

            return (
              <li
                key={step.id}
                className="relative flex flex-col items-center text-center group"
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Connecting Line between steps */}
                {index < MILESTONES.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors ${
                      index < currentIndex ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                    style={{ zIndex: 0 }}
                  />
                )}

                {/* Step Circle Indicator */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCurrent
                        ? isHeld
                          ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                          : 'bg-primary text-white ring-4 ring-sky-100'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : isCurrent ? (
                    isHeld ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Step Labels */}
                <div className="mt-2 w-full">
                  <span
                    className={`block text-xs truncate ${
                      isCurrent
                        ? isHeld
                          ? 'font-bold text-amber-900'
                          : 'font-bold text-primary'
                        : isCompleted
                          ? 'font-semibold text-slate-800'
                          : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="hidden md:block text-[10px] text-slate-500 truncate mt-0.5">
                    {step.description}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
