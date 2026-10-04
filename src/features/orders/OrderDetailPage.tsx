import { OrderRouteMap } from '../../components/maps/OrderRouteMap';
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge, SLABadge } from '../../components/common/PriorityBadge';
import { AssignDriverModal } from '../../components/common/AssignDriverModal';
import { OverrideModal } from '../../components/common/OverrideModal';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Receipt,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Camera,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { OrderStatus, IncidentType, IncidentSeverity } from '../../types';

const demoLifecycleSteps: Partial<Record<OrderStatus, [OrderStatus, string]>> =
  {
    HEADING_TO_PICKUP: ['ARRIVED_FOR_PICKUP', 'Marcar llegada'],
    ARRIVED_FOR_PICKUP: ['PICKED_UP', 'Confirmar recogida'],
    HEADING_TO_FACILITY: ['AT_FACILITY', 'Registrar recepción en planta'],
    ARRIVED_FOR_DELIVERY: ['DELIVERED', 'Confirmar entrega'],
  };
export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    orders,
    currentUser,
    updateOrderStatus,
    moveToQuarantine,
    releaseFromQuarantine,
    createIncident,
    incidents,
  } = useApp();
  const navigate = useNavigate();

  const order = orders.find((o) => o.id === id);

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignType, setAssignType] = useState<'pickup' | 'delivery'>('pickup');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isQuarantineModalOpen, setIsQuarantineModalOpen] = useState(false);

  // Quarantine input state
  const [quarantineReason, setQuarantineReason] = useState(
    'Mancha química persistente en tejido delicado',
  );
  const [quarantineNotes, setQuarantineNotes] = useState('');

  // New incident form state
  const [incType, setIncType] = useState<IncidentType>('MANCHA_PERSISTENTE');
  const [incSeverity, setIncSeverity] = useState<IncidentSeverity>('MEDIA');
  const [incDesc, setIncDesc] = useState('');

  if (!order) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-md mx-auto my-12">
        <h2 className="text-base font-bold text-slate-900">
          Solicitud no encontrada
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          El código {id} no corresponde a ninguna orden registrada.
        </p>
        <button
          onClick={() => navigate('/operations/orders')}
          className="mt-5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl transition-colors cursor-pointer"
        >
          Volver a Solicitudes
        </button>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const orderIncidents = incidents.filter((i) => i.orderId === order.id);
  const hasActiveIncidents = orderIncidents.some(
    (i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS',
  );

  // Handle standard lifecycle transitions
  const handleAdvanceStatus = (nextStatus: OrderStatus, noteText?: string) => {
    updateOrderStatus(order.id, nextStatus, noteText);
  };

  const handleOpenAssign = (type: 'pickup' | 'delivery') => {
    setAssignType(type);
    setIsAssignModalOpen(true);
  };

  const handleCreateIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incDesc.trim()) return;
    createIncident({
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      type: incType,
      severity: incSeverity,
      description: incDesc,
      assignedTo: currentUser.name,
      reportedBy: currentUser.name,
      reportedRole: currentUser.role,
      evidences: [
        {
          id: 'EVD-' + Date.now(),
          url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=500&auto=format&fit=crop&q=80',
          caption: 'Evidencia fotográfica adjunta en recepción/procesamiento',
          uploadedAt:
            'Hoy ' +
            new Date().toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            }),
        },
      ],
    });
    setIncDesc('');
    setIsIncidentModalOpen(false);
  };

  const handleQuarantineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    moveToQuarantine(order.id, quarantineReason, quarantineNotes);
    setIsQuarantineModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <PageHeader
        title={`Solicitud ${order.id}`}
        subtitle={`Tracking: ${order.trackingNumber} · Creada el ${order.createdAt}`}
        breadcrumbs={[
          { label: 'Operaciones', path: '/operations/orders' },
          { label: 'Solicitudes', path: '/operations/orders' },
          { label: order.id },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} showIcon />
          </div>
        }
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Contextual lifecycle action button */}
            {order.status === 'PICKUP_PENDING' && (
              <button
                onClick={() => handleOpenAssign('pickup')}
                className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Asignar chofer de recogida</span>
              </button>
            )}

            {order.status === 'PICKUP_ASSIGNED' && (
              <button
                onClick={() =>
                  handleAdvanceStatus(
                    'HEADING_TO_PICKUP',
                    'Recorrido de recogida simulado',
                  )
                }
                className="px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Iniciar recogida</span>
              </button>
            )}

            {order.status === 'PICKED_UP' && (
              <button
                onClick={() =>
                  handleAdvanceStatus(
                    'HEADING_TO_FACILITY',
                    'Traslado simulado a planta',
                  )
                }
                className="px-4 py-2.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Ir a planta</span>
              </button>
            )}

            {order.status === 'AT_FACILITY' && (
              <button
                onClick={() =>
                  handleAdvanceStatus(
                    'IN_PROCESS',
                    'Ingresado al ciclo de lavado',
                  )
                }
                className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Iniciar procesamiento</span>
              </button>
            )}

            {order.status === 'IN_PROCESS' && (
              <>
                <button
                  onClick={() => setIsQuarantineModalOpen(true)}
                  className="px-3.5 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Enviar a Cuarentena</span>
                </button>
                <button
                  onClick={() =>
                    handleAdvanceStatus(
                      'QUALITY_CONTROL',
                      'Lavado completado, pasando a control de calidad',
                    )
                  }
                  className="px-4 py-2.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Control de calidad</span>
                </button>
              </>
            )}

            {order.status === 'QUARANTINE' && (
              <button
                onClick={() =>
                  releaseFromQuarantine(
                    order.id,
                    'QUALITY_CONTROL',
                    'Tratamiento técnico especializado completado',
                  )
                }
                className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Liberar de Cuarentena</span>
              </button>
            )}

            {order.status === 'QUALITY_CONTROL' && (
              <button
                onClick={() =>
                  handleAdvanceStatus(
                    'READY_FOR_DELIVERY',
                    'Control de calidad aprobado sin observaciones',
                  )
                }
                className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Marcar Lista para entrega</span>
              </button>
            )}

            {order.status === 'READY_FOR_DELIVERY' && (
              <button
                onClick={() => handleOpenAssign('delivery')}
                className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Asignar chofer de entrega</span>
              </button>
            )}

            {order.status === 'DELIVERY_ASSIGNED' && (
              <button
                onClick={() =>
                  handleAdvanceStatus(
                    'OUT_FOR_DELIVERY',
                    `Chofer en camino a destino`,
                  )
                }
                className="px-4 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Marcar En entrega</span>
              </button>
            )}

            {order.status === 'OUT_FOR_DELIVERY' && (
              <button
                onClick={() =>
                  handleAdvanceStatus(
                    'ARRIVED_FOR_DELIVERY',
                    'Llegada a dirección de entrega',
                  )
                }
                className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Marcar llegada</span>
              </button>
            )}

            {order.status === 'DELIVERED' && (
              <button
                disabled={hasActiveIncidents}
                onClick={() =>
                  handleAdvanceStatus(
                    'CLOSED',
                    'Solicitud cerrada con satisfacción',
                  )
                }
                className="px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                title={
                  hasActiveIncidents
                    ? 'No puede cerrarse con incidencias abiertas'
                    : 'Finalizar solicitud'
                }
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cerrar Solicitud
              </button>
            )}

            {demoLifecycleSteps[order.status] && (
              <button
                className="px-4 py-2 rounded-lg bg-[#143F73] text-white"
                onClick={() => {
                  const step = demoLifecycleSteps[order.status]!;
                  handleAdvanceStatus(step[0], step[1]);
                }}
              >
                {demoLifecycleSteps[order.status]![1]}
              </button>
            )}
            {/* Registrar Incidencia */}
            <button
              onClick={() => setIsIncidentModalOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Registrar incidencia
            </button>

            {/* Admin Override */}
            {isAdmin && (
              <button
                onClick={() => setIsOverrideModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5"
                title="Override excepcional de estado para administradores"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                Override Admin
              </button>
            )}
          </div>
        }
      />

      {/* Quarantine Alert Warning if active */}
      {order.status === 'QUARANTINE' && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">
              Lote en Cuarentena Operacional ({order.quarantineDate || 'Hoy'})
            </h3>
            <p className="text-xs text-red-800 font-semibold mt-0.5">
              Motivo: {order.quarantineReason}
            </p>
            {order.quarantineNotes && (
              <p className="text-xs text-red-700 mt-1">
                {order.quarantineNotes}
              </p>
            )}
          </div>
          <button
            onClick={() =>
              releaseFromQuarantine(
                order.id,
                'QUALITY_CONTROL',
                'Liberación aprobada',
              )
            }
            className="px-3 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-xs transition-colors shrink-0"
          >
            Liberar orden
          </button>
        </div>
      )}

      {/* Incident Warning if active */}
      {hasActiveIncidents && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Regla operacional #21:</strong> Esta orden cuenta con{' '}
              {orderIncidents.length} incidencia(s) activa(s). No podrá ser
              cerrada hasta que sean resueltas.
            </span>
          </div>
          <button
            onClick={() => navigate('/operations/incidents')}
            className="font-bold underline hover:text-amber-950 shrink-0 ml-2"
          >
            Ver incidencias →
          </button>
        </div>
      )}

      {/* Main 360° Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Vertical Timeline & Incidents (1 col) */}
        <div className="space-y-6">
          {/* Vertical Timeline per spec #29 */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#143F73]" />
                Línea de Vida Operacional
              </h2>
              <SLABadge risk={order.slaStatus} deadline={order.slaDeadline} />
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {order.timeline.map((event, idx) => {
                const isLatest = idx === order.timeline.length - 1;
                return (
                  <div key={event.id} className="relative group">
                    <span
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isLatest
                          ? 'bg-[#143F73] ring-3 ring-[#61BFC7]/30'
                          : 'bg-slate-400'
                      }`}
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-bold ${isLatest ? 'text-[#143F73]' : 'text-slate-800'}`}
                      >
                        {event.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {event.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Por:{' '}
                      <strong className="text-slate-700">
                        {event.userName}
                      </strong>{' '}
                      ({event.userRole})
                    </p>
                    {event.notes && (
                      <p className="mt-1 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {event.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incidencias & Evidencias */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Incidencias y Evidencias ({orderIncidents.length})
              </h2>
              <button
                onClick={() => setIsIncidentModalOpen(true)}
                className="text-xs text-rose-700 font-semibold hover:underline"
              >
                + Registrar
              </button>
            </div>

            {orderIncidents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Sin incidencias registradas en esta solicitud.
              </p>
            ) : (
              <div className="space-y-3">
                {orderIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-xl border border-rose-100 bg-rose-50/40"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-900 font-mono">
                        {inc.id}
                      </span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                        {inc.severity}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1">
                      {inc.type}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {inc.description}
                    </p>

                    {/* Evidences list */}
                    {inc.evidences.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {inc.evidences.map((ev) => (
                          <div
                            key={ev.id}
                            className="relative group cursor-pointer"
                          >
                            <img
                              src={ev.url}
                              alt={ev.caption}
                              className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Camera className="w-4 h-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer, Service, Pickup, Delivery, Route Map (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Operational Info Card */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-[#102A43] mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#143F73]" />
              Información del Cliente y Sede
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Cliente
                  </span>
                  <span className="font-bold text-sm text-slate-900">
                    {order.customerName}
                  </span>
                  <span className="ml-2 text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Plan {order.customerPlan}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{order.customerPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{order.customerEmail}</span>
                </div>
              </div>

              <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-4">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Sede de procesamiento
                  </span>
                  <span className="font-bold text-slate-900">
                    {order.facilityName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Zona Logística
                  </span>
                  <span className="font-medium text-slate-700">
                    {order.zoneName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Método y Estado de Pago
                  </span>
                  <span className="font-semibold text-slate-800">
                    {order.pricing.paymentMethod} ·{' '}
                    {order.pricing.paymentStatus === 'PAID'
                      ? 'PAGADO'
                      : 'PENDIENTE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Service & Items Breakdown */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-[#102A43] mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#143F73]" />
              Detalle del Servicio y Prendas ({order.itemCount} prendas)
            </h2>

            <div className="border border-slate-100 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F9FC] text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Prenda / Ítem</th>
                    <th className="py-2.5 px-3 text-center">Cant.</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3 text-right">Unitario</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800">
                          {item.name}
                        </span>
                        {item.notes && (
                          <span className="block text-[10px] text-slate-500">
                            {item.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.category}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Extras & Total calculation */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-slate-700">
                  Servicios adicionales y extras:
                </p>
                {order.extras.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">
                    Sin extras seleccionados.
                  </p>
                ) : (
                  order.extras.map((ext) => (
                    <p
                      key={ext.id}
                      className="text-slate-600 flex items-center justify-between gap-4"
                    >
                      <span>• {ext.name}</span>
                      <span className="font-mono tabular-nums">
                        +${ext.price.toFixed(2)}
                      </span>
                    </p>
                  ))
                )}
                {order.pricing.promoCodeApplied && (
                  <p className="text-emerald-700 font-semibold pt-1">
                    Cupón aplicado: {order.pricing.promoCodeApplied} (-$
                    {order.pricing.discount.toFixed(2)})
                  </p>
                )}
              </div>

              <div className="w-full sm:w-56 p-3 bg-[#F7F9FC] rounded-xl border border-[#E5EAF0] space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>${order.pricing.subtotal.toFixed(2)}</span>
                </div>
                {order.pricing.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Descuento:</span>
                    <span>-${order.pricing.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Extras:</span>
                  <span>+${order.pricing.extrasTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Envío:</span>
                  <span>${order.pricing.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#143F73] pt-1 border-t border-slate-200">
                  <span>Total:</span>
                  <span>${order.pricing.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recogida y Entrega Side-by-Side Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recogida */}
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-2xs space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="font-bold text-[#143F73] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" /> Logística de
                  Recogida
                </span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">
                  {order.pickup.completedAt ? 'Completada' : 'Pendiente'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  Fecha y Horario
                </span>
                <span className="font-bold text-slate-800">
                  {order.pickup.date} · {order.pickup.timeSlot}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  Dirección de recogida
                </span>
                <span className="font-medium text-slate-700">
                  {order.customerAddress.street} #{order.customerAddress.number}
                  , {order.customerAddress.neighborhood}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  Conductor asignado
                </span>
                <span className="font-semibold text-slate-900">
                  {order.pickup.driverName
                    ? `${order.pickup.driverName} (${order.pickup.vehiclePlate})`
                    : 'Sin asignar aún'}
                </span>
              </div>
              {order.pickup.notes && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                  Nota: {order.pickup.notes}
                </p>
              )}
            </div>

            {/* Entrega */}
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-2xs space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="font-bold text-[#143F73] uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-orange-600" /> Logística de
                  Entrega
                </span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">
                  {order.delivery.completedAt ? 'Entregada' : 'En proceso'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  Fecha objetivo y Horario
                </span>
                <span className="font-bold text-slate-800">
                  {order.delivery.targetDate} · {order.delivery.timeSlot}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  Destinatario
                </span>
                <span className="font-medium text-slate-700">
                  {order.delivery.recipientName} (
                  {order.delivery.recipientPhone})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">
                  Conductor de entrega
                </span>
                <span className="font-semibold text-slate-900">
                  {order.delivery.driverName
                    ? `${order.delivery.driverName} (${order.delivery.vehiclePlate})`
                    : 'Pendiente de asignación de entrega'}
                </span>
              </div>
              {order.delivery.notes && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                  Nota: {order.delivery.notes}
                </p>
              )}
            </div>
          </div>

          <OrderRouteMap order={order} />
        </div>
      </div>

      {/* Assign Driver Modal */}
      {isAssignModalOpen && (
        <AssignDriverModal
          order={order}
          type={assignType}
          isOpen={true}
          onClose={() => setIsAssignModalOpen(false)}
        />
      )}

      {/* Override Modal */}
      {isOverrideModalOpen && (
        <OverrideModal
          order={order}
          isOpen={true}
          onClose={() => setIsOverrideModalOpen(false)}
        />
      )}

      {/* Quarantine Modal */}
      {isQuarantineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 mb-4 text-red-700">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-base font-bold text-slate-900">
                Enviar lote a Cuarentena
              </h2>
            </div>
            <form
              onSubmit={handleQuarantineSubmit}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo de cuarentena *
                </label>
                <select
                  value={quarantineReason}
                  onChange={(e) => setQuarantineReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Mancha química persistente en tejido delicado">
                    Mancha química persistente en tejido delicado
                  </option>
                  <option value="Daño o descosido previo a lavado">
                    Daño o descosido previo a lavado
                  </option>
                  <option value="Riesgo de desteñido / transferencia de color">
                    Riesgo de desteñido / transferencia de color
                  </option>
                  <option value="Contaminación por agente externo">
                    Contaminación por agente externo
                  </option>
                  <option value="Falta de etiqueta de composición textil">
                    Falta de etiqueta de composición textil
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Instrucciones técnicas de revisión
                </label>
                <textarea
                  value={quarantineNotes}
                  onChange={(e) => setQuarantineNotes(e.target.value)}
                  rows={3}
                  placeholder="Detallar condiciones encontradas y acciones preventivas..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuarantineModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg"
                >
                  Confirmar Cuarentena
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incident Modal */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 mb-4 text-rose-700">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-base font-bold text-slate-900">
                Registrar Incidencia Operacional
              </h2>
            </div>
            <form
              onSubmit={handleCreateIncidentSubmit}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tipo de incidencia *
                </label>
                <select
                  value={incType}
                  onChange={(e) => setIncType(e.target.value as IncidentType)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="MANCHA_PERSISTENTE">
                    Mancha persistente / rebelde
                  </option>
                  <option value="PRENDA_DANADA">
                    Prenda dañada previa o en proceso
                  </option>
                  <option value="PERDIDA_PARCIAL">
                    Pérdida o extravío parcial
                  </option>
                  <option value="DIRECCION_ERRONEA">
                    Dirección errónea o inaccesible
                  </option>
                  <option value="CLIENTE_AUSENTE">
                    Cliente ausente en domicilio
                  </option>
                  <option value="RETRASO_OPERACIONAL">
                    Retraso operacional grave
                  </option>
                  <option value="OTRO">Otro motivo operacional</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Severidad *
                </label>
                <select
                  value={incSeverity}
                  onChange={(e) =>
                    setIncSeverity(e.target.value as IncidentSeverity)
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica (Bloqueante)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descripción detallada del caso *
                </label>
                <textarea
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  required
                  rows={3}
                  placeholder="Explicar qué sucedió, en qué etapa y qué medidas iniciales se tomaron..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIncidentModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg"
                >
                  Abrir Incidencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
