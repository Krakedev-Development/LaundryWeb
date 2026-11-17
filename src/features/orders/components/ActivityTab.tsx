import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  MessageSquare,
  Send,
  Camera,
  Code2,
  ChevronDown,
  ChevronUp,
  User,
  ShieldAlert,
  Info,
} from 'lucide-react';
import type { Order, Incident } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { IconPlaceholder } from '../../../components/common/IconPlaceholder';

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
  orderIncidents: Incident[];
  onOpenIncidentModal: () => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  order,
  orderIncidents,
  onOpenIncidentModal,
}) => {
  const { currentUser, showToast } = useApp();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [commType, setCommType] = useState<'INTERNAL' | 'CUSTOMER'>('INTERNAL');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [customerMsgText, setCustomerMsgText] = useState('');
  const [internalNotesList, setInternalNotesList] = useState<
    { id: string; author: string; role: string; text: string; time: string }[]
  >([
    {
      id: 'N-1',
      author: 'Supervisor Planta',
      role: 'SUPERVISOR',
      text: 'Recepción en planta sin novedad en bultos iniciales.',
      time: order.createdAt || '16/11/2026',
    },
  ]);

  const handleAddInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;

    const newNote = {
      id: 'NOTE-' + Date.now(),
      author: currentUser.name,
      role: currentUser.role,
      text: internalNoteText.trim(),
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };
    setInternalNotesList((prev) => [newNote, ...prev]);
    setInternalNoteText('');
    showToast({
      type: 'success',
      title: 'Nota interna agregada',
      message: 'La nota fue registrada en el expediente de la solicitud.',
    });
  };

  const handleSendCustomerMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerMsgText.trim()) return;

    showToast({
      type: 'success',
      title: 'Mensaje enviado al cliente',
      message: `Mensaje transmitido a ${order.customerName}.`,
    });
    setCustomerMsgText('');
  };

  return (
    <div className="space-y-6">
      {/* 2-column layout: Timeline on left (7 cols) + Incidents and Communications on right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Operational Lifecycle Timeline (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#143F73]" />
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

          {/* Vertical Timeline (Solving Finding H-07, H-12, H-18) */}
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
                        ? 'bg-[#143F73] ring-3 ring-sky-300'
                        : 'bg-slate-400'
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-bold ${
                        isLatest ? 'text-[#143F73] text-sm' : 'text-slate-800'
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

        {/* Right Column: Incidents & Communications (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Incidents & Evidences Section */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
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
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-900">{inc.id}</span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        {inc.severity}
                      </span>
                    </div>

                    <p className="font-bold text-slate-800">{inc.type}</p>
                    <p className="text-slate-600 text-[11px]">{inc.description}</p>

                    {/* Evidences list without external stock images */}
                    {(inc.evidences || []).length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {inc.evidences.map((ev) => (
                          <div key={ev.id} className="relative group cursor-pointer">
                            <IconPlaceholder
                              kind="evidence"
                              label={ev.caption || 'Evidencia fotográfica'}
                              className="size-14 rounded-xl border border-rose-200"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Communications Section (Solving Finding H-08: Distinct internal vs customer) */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#143F73]" />
                <span>Centro de Comunicaciones</span>
              </h3>
            </div>

            {/* Audience Tab Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setCommType('INTERNAL')}
                className={`py-1.5 text-center font-semibold rounded-lg transition-all cursor-pointer ${
                  commType === 'INTERNAL'
                    ? 'bg-white text-[#0F4C81] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Notas internas
              </button>
              <button
                type="button"
                onClick={() => setCommType('CUSTOMER')}
                className={`py-1.5 text-center font-semibold rounded-lg transition-all cursor-pointer ${
                  commType === 'CUSTOMER'
                    ? 'bg-white text-[#0F4C81] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mensaje al cliente
              </button>
            </div>

            {/* Audience 1: Internal Notes */}
            {commType === 'INTERNAL' && (
              <div className="space-y-3 text-xs">
                <span className="text-[11px] text-slate-400 block">
                  Visibilidad: Personal interno de operaciones, supervisores y choferes.
                </span>

                <form onSubmit={handleAddInternalNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={internalNoteText}
                    onChange={(e) => setInternalNoteText(e.target.value)}
                    placeholder="Agregar nota interna para el equipo..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!internalNoteText.trim()}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Guardar nota</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {internalNotesList.map((note) => (
                    <div key={note.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-bold text-slate-700">
                          {note.author} ({note.role})
                        </span>
                        <span>{note.time}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audience 2: Customer Message */}
            {commType === 'CUSTOMER' && (
              <div className="space-y-3 text-xs">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    El mensaje será transmitido a <strong>{order.customerName}</strong>. No se envía
                    implícitamente con otras operaciones.
                  </span>
                </div>

                <form onSubmit={handleSendCustomerMessage} className="space-y-2">
                  <textarea
                    rows={3}
                    value={customerMsgText}
                    onChange={(e) => setCustomerMsgText(e.target.value)}
                    placeholder="Escribir mensaje formal para el cliente..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!customerMsgText.trim()}
                      className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      <span>Enviar mensaje</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
