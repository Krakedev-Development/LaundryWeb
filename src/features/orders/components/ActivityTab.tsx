import React, { useState } from 'react';
import { Clock, AlertTriangle, Code2 } from 'lucide-react';
import type { Order } from '../../../types';
import {
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
  incidentTypeLabel,
  type ServerIncident,
} from '../../../services/api/incidentsApi';

export const STATUS_LABELS_HUMAN: Record<string, string> = {
  CREATED: 'Solicitud creada en el sistema',
  DRAFT: 'Borrador de solicitud',
  PAYMENT_PENDING: 'Pendiente de pago inicial',
  CONFIRMED: 'Solicitud confirmada por cliente',
  AWAITING_INTAKE: 'En espera de ingreso a planta',
  PICKUP_PENDING: 'Recogida programada (sin chofer)',
  PICKUP_ASSIGNED: 'Conductor asignado para recogida',
  HEADING_TO_PICKUP: 'Conductor en camino a recoger',
  ARRIVED_FOR_PICKUP: 'Conductor en domicilio del cliente',
  PICKED_UP: 'Prendas recogidas y en custodia',
  HEADING_TO_FACILITY: 'En traslado hacia la planta de lavado',
  ARRIVED_AT_FACILITY: 'Llegada a instalaciones de la planta',
  AT_FACILITY: 'Pedido recibido formalmente en planta',
  WEIGHING: 'Pesaje oficial de prendas',
  INSPECTION: 'Inspección técnica de prendas',
  PRICING_PENDING: 'Cálculo y revisión de precio',
  CUSTOMER_APPROVAL_PENDING: 'Esperando aprobación del cliente',
  IN_PROCESS: 'En ciclo de lavado y tratamiento',
  QUALITY_CONTROL: 'Control de calidad final',
  READY_FOR_DELIVERY: 'Listo para despacho y entrega',
  READY: 'Listo',
  DELIVERY_SCHEDULED: 'Entrega a domicilio programada',
  DELIVERY_ASSIGNED: 'Conductor asignado para entrega',
  OUT_FOR_DELIVERY: 'En reparto hacia el domicilio',
  ARRIVED_FOR_DELIVERY: 'Conductor en dirección de entrega',
  DELIVERED: 'Pedido entregado al cliente',
  CLOSED: 'Solicitud completada y cerrada',
  INCIDENT: 'Incidencia operacional activa',
  QUARANTINE: 'Lote en retención técnica especializada',
  CANCELLED: 'Solicitud cancelada',
};

interface ActivityTabProps {
  order: Order;
  orderIncidents: ServerIncident[];
  onOpenIncidentModal: () => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  order,
  orderIncidents,
  onOpenIncidentModal,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Operational Lifecycle Timeline */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Línea de Vida Operacional ({order.timeline.length} eventos)</span>
            </h2>

            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              title="Alternar vista técnica de códigos"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showTechnicalDetails ? 'Ocultar códigos' : 'Ver códigos técnicos'}</span>
            </button>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {order.timeline.map((event, idx) => {
              const isLatest = idx === order.timeline.length - 1;
              const humanLabel =
                STATUS_LABELS_HUMAN[event.status] || event.label || event.status;

              return (
                <div key={event.id || idx} className="relative group">
                  <span
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      isLatest
                        ? 'bg-primary ring-3 ring-sky-300'
                        : 'bg-slate-400'
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-bold ${
                        isLatest ? 'text-primary text-sm' : 'text-slate-800'
                      }`}
                    >
                      {humanLabel}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums whitespace-nowrap ml-2">
                      {event.timestamp}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Responsable:{' '}
                    <strong className="text-slate-700">{event.userName}</strong> ({event.userRole})
                  </p>

                  {event.notes && (
                    <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {event.notes}
                    </p>
                  )}

                  {showTechnicalDetails && (
                    <div className="mt-1 p-1.5 bg-slate-100 rounded text-[10px] font-mono text-slate-500">
                      ID: {event.id} · Estado técnico: {event.status}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Incidents only (T-03: sin formularios simulados) */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Incidencias y Evidencias ({orderIncidents.length})</span>
              </h3>
              <button
                onClick={onOpenIncidentModal}
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 hover:underline cursor-pointer"
              >
                + Registrar
              </button>
            </div>

            {orderIncidents.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                No hay incidencias registradas en esta solicitud.
              </div>
            ) : (
              <div className="space-y-3">
                {orderIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-2xl border border-rose-100 bg-rose-50/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800">{incidentTypeLabel(inc.type)}</span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        {INCIDENT_SEVERITY_LABEL[inc.severity] ?? inc.severity}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-700">
                      {INCIDENT_STATUS_LABEL[inc.status] ?? inc.status}
                      {inc.previousStatus && (inc.status === 'OPEN' || inc.status === 'IN_REVIEW')
                        ? ' · Solicitud retenida'
                        : ''}
                    </p>
                    <p className="whitespace-pre-line text-slate-600 text-[11px]">{inc.description}</p>
                    {inc.resolution && (
                      <p className="text-[11px] text-emerald-800">Resolución: {inc.resolution}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
