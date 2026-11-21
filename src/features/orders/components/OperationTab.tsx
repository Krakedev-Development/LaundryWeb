import React from 'react';
import { Link } from 'react-router-dom';
import {
  deliveriesHref,
  dispatchHref,
  isPlantStage,
  plantHref,
} from '../../../services/operationsLinks';
import {
  Sparkles,
  Truck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { Order } from '../../../types';
import { operationalStage } from '../../../services/fulfillment';
import { PlantProgress } from '../../plant/plantProgress';
import { FacilityReceptionPanel } from '../FacilityReceptionPanel';
import type { HandoffType } from '../../../services/api/handoffsApi';
import { DispatchCustodyPanel } from '../DispatchCustodyPanel';
import { FailedPickupPanel } from '../FailedPickupPanel';

interface OperationTabProps {
  order: Order;
  onOpenIncident: () => void;
  onSwitchTab: (tab: 'operation' | 'order' | 'logistics' | 'activity') => void;
  refreshFromServer: (updated?: any) => Promise<void>;
  confirmingPayment: boolean;
  onConfirmPayment: () => Promise<void>;
  hasActiveIncidents: boolean;
  activeIncidentsCount: number;
  /** Código o QR leído en "Recepción y retiros" para validar en el panel que corresponda. */
  custodyCode?: string;
  /** Traspaso de la columna donde se eligió la solicitud: el código solo va a ese panel. */
  custodyType?: HandoffType | '';
}

export const OperationTab: React.FC<OperationTabProps> = ({
  order,
  onSwitchTab,
  refreshFromServer,
  confirmingPayment,
  onConfirmPayment,
  hasActiveIncidents,
  activeIncidentsCount,
  custodyCode = '',
  custodyType = '',
}) => {
  const stage = operationalStage(order);
  // En planta, el proceso (pesaje, inspección, ajustes, precio, lavado, calidad) y la retención se
  // gestionan solo en Planta. Aquí se muestra la fase y los totales, con un enlace hasta allí.
  const inPlant = isPlantStage(stage);
  const manageInPlant = (
    <Link
      to={plantHref(order.id, 'proceso')}
      className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2"
    >
      <Sparkles className="w-4 h-4" />
      <span>Gestionar en Planta</span>
    </Link>
  );
  // Cada paso en otro panel cambia la versión: los paneles vuelven a consultar el servidor para
  // mostrar el paso siguiente sin recargar la página.
  const versionKey = `${order.version ?? order.workflowVersion ?? 0}:${order.status}`;
  const isPerWeight = order.pricing?.pricingModel === 'PER_WEIGHT';
  const latestEvent = order.timeline[order.timeline.length - 1];

  // Determine stage title, description, and primary CTA
  let stageTitle = 'Proceso operacional en planta';
  let stageDescription = 'Gestión del ciclo de vida y estado actual de la solicitud.';
  let primaryCTA: React.ReactNode = null;

  // Aquí solo quedan las acciones que el personal hace contra el servidor sin evidencia extra
  // (asignar chofer, retener). Lo que confirma el chofer ocurre en su app; la custodia, el
  // proceso en planta y el cierre tienen su panel propio debajo. Nada se avanza en local.
  const byDriver = 'Lo registra el chofer desde su app; aquí se actualiza solo.';
  switch (stage) {
    case 'CONFIRMED':
    case 'PICKUP_PENDING':
      stageTitle = 'Recogida pendiente de asignación';
      stageDescription =
        'La solicitud está confirmada y requiere asignar un conductor para el retiro a domicilio.';
      // La recogida se asigna solo en Despacho; aquí solo se navega hasta allí.
      if (order.fulfillment?.inbound.method === 'DRIVER' && !order.pickupNeedsScheduling)
        primaryCTA = (
        <Link
          to={dispatchHref(order.id)}
          className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2"
        >
          <Truck className="w-4 h-4" />
          <span>Asignar en Despacho</span>
        </Link>
      );
      break;

    case 'PICKUP_ASSIGNED':
      stageTitle = 'Chofer asignado para recogida';
      stageDescription = `Conductor ${order.pickup.driverName || 'asignado'} programado para la recogida. ${byDriver}`;
      break;

    case 'HEADING_TO_PICKUP':
      stageTitle = 'Conductor en camino a recoger';
      stageDescription = `El conductor va hacia la dirección del cliente. ${byDriver}`;
      break;

    case 'ARRIVED_FOR_PICKUP':
      stageTitle = 'Conductor en domicilio';
      stageDescription = `El conductor recibe las prendas validando el código del cliente. ${byDriver}`;
      break;

    case 'PICKED_UP':
      stageTitle = 'Prendas recogidas por el chofer';
      stageDescription = `Prendas bajo custodia del chofer, listas para su traslado a la planta. ${byDriver}`;
      break;

    case 'HEADING_TO_FACILITY':
      stageTitle = 'En traslado hacia la planta';
      stageDescription =
        'El vehículo va hacia la sede. Al llegar, la sede valida el código del chofer para registrar el ingreso.';
      break;

    case 'ARRIVED_AT_FACILITY':
    case 'AT_FACILITY':
    case 'WEIGHING':
    case 'INSPECTION':
    case 'PRICING_PENDING':
    case 'CUSTOMER_APPROVAL_PENDING':
      stageTitle = 'Pedido en planta';
      stageDescription =
        'El pesaje, la inspección, los ajustes y el precio se gestionan en Planta.';
      primaryCTA = manageInPlant;
      break;

    case 'IN_PROCESS':
    case 'QUALITY_CONTROL':
      stageTitle = stage === 'IN_PROCESS' ? 'En ciclo de lavado y cuidado' : 'Control de calidad final';
      stageDescription =
        'El avance y la retención para revisión técnica se gestionan en Planta.';
      primaryCTA = manageInPlant;
      break;

    case 'READY_FOR_DELIVERY':
    case 'DELIVERY_SCHEDULED':
      if (order.fulfillment?.outbound.method === 'DRIVER') {
        stageTitle = 'Lista para despacho y entrega';
        stageDescription = 'Prendas listas y empaquetadas. El chofer de entrega se asigna en Entregas.';
        // La entrega se asigna solo en Entregas; aquí solo se navega hasta allí.
        primaryCTA = (
        <Link
          to={deliveriesHref(order.id)}
          className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2"
        >
          <Truck className="w-4 h-4" />
          <span>Asignar en Entregas</span>
        </Link>
      );
      } else {
        stageTitle = 'Lista para retiro en sede';
        stageDescription = 'El cliente retira en la sede mostrando su código: valídalo en el panel de retiro.';
      }
      break;

    case 'DELIVERY_ASSIGNED':
      stageTitle = 'Chofer asignado para reparto';
      stageDescription = `Conductor ${order.delivery.driverName || 'asignado'} asignado. La salida se registra validando su código en la sede.`;
      break;

    case 'OUT_FOR_DELIVERY':
      stageTitle = 'En reparto a domicilio';
      stageDescription = `El conductor va hacia la dirección de entrega. ${byDriver}`;
      break;

    case 'ARRIVED_FOR_DELIVERY':
      stageTitle = 'Conductor en dirección de entrega';
      stageDescription = `El conductor entrega validando el código del cliente. ${byDriver}`;
      break;

    case 'DELIVERED':
      stageTitle = 'Pedido entregado';
      stageDescription = hasActiveIncidents
        ? 'Prendas entregadas. Resuelve las incidencias abiertas antes de cerrar la solicitud.'
        : 'Prendas entregadas. Ciérrala en el panel de cierre cuando no haya saldo pendiente.';
      break;

    case 'CLOSED':
      stageTitle = 'Solicitud completada y cerrada';
      stageDescription = 'El ciclo de servicio concluyó con éxito y sin pendientes.';
      break;

    case 'INCIDENT':
      stageTitle = 'Retenida por incidencia';
      stageDescription = 'La solicitud no avanza hasta resolver su incidencia; luego vuelve a la etapa en que estaba.';
      break;

    default:
      break;
  }

  // Check if payment verification alert is legitimately needed (Fixing Finding H-04)
  const isTransferPending =
    order.pricing?.paymentMethod === 'TRANSFERENCIA' && order.pricing?.paymentStatus !== 'PAID';

  return (
    <div className="space-y-6">
      {/* Legitimate Transfer Validation Alert (Only if method is transfer and payment pending) */}
      {isTransferPending && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Validación requerida:</strong> El cliente seleccionó pago por transferencia y
              su pago está pendiente de confirmación.
            </span>
          </div>
          <button
            onClick={() => void onConfirmPayment()}
            disabled={confirmingPayment}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {confirmingPayment ? 'Confirmando...' : 'Confirmar transferencia'}
          </button>
        </div>
      )}

      {/* Active Incidents Alert Banner */}
      {hasActiveIncidents && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Esta solicitud cuenta con <strong>{activeIncidentsCount} incidencia(s) activa(s)</strong>.
              Deberán resolverse para autorizar el cierre del pedido.
            </span>
          </div>
          <button
            onClick={() => onSwitchTab('activity')}
            className="font-bold underline hover:text-rose-950 inline-flex items-center gap-1 cursor-pointer ml-3 shrink-0"
          >
            <span>Ver incidencias</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 2-column layout for Operation view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Current Plant Stage & Action (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Plant Process Main Card */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-sky-100 text-[#0F4C81]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{stageTitle}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{stageDescription}</p>
                </div>
              </div>

              {/* Tariff Pill */}
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {isPerWeight ? 'Tarifa por peso' : 'Tarifa por prenda'}
              </span>
            </div>

            {/* Sub-stages Progress Bar in Plant */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Fases del proceso en planta
              </span>
              <PlantProgress order={order} />
              <p className="text-[11px] text-slate-400 mt-1">
                {isPerWeight
                  ? 'Servicio por peso: pesaje obligatorio previo a la inspección.'
                  : 'Servicio por prenda: no requiere pesaje inicial, ingresa directo a inspección.'}
              </p>
            </div>

            {/* Resumen de solo lectura mientras la solicitud está en planta. */}
            {inPlant && (
              <dl aria-label="Resumen en planta" className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <dt className="text-slate-500">Importe</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {order.pricing?.amountKnown === false
                      ? 'Pendiente de pesaje'
                      : `${order.pricing?.currency ?? 'USD'} ${(order.pricing?.total ?? 0).toFixed(2)}`}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <dt className="text-slate-500">Pago</dt>
                  <dd className="mt-0.5 font-bold text-slate-900">
                    {order.pricing?.paymentStatus === 'PAID' ? 'Pagado' : 'Pendiente'}
                  </dd>
                </div>
              </dl>
            )}

            {/* Single Primary Contextual CTA */}
            {primaryCTA && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Siguiente acción autorizada:</span>
                </div>
                {primaryCTA}
              </div>
            )}
          </section>

          {/* Contextual Facility Reception Panel if heading to facility */}
          {stage === 'HEADING_TO_FACILITY' && (
            <FacilityReceptionPanel
              orderId={order.id}
              initialCode={
                !custodyType || custodyType === 'DRIVER_TO_FACILITY' ? custodyCode : ''
              }
              onChanged={(updated) => void refreshFromServer(updated)}
            />
          )}

          {/* Contextual Failed Pickup Panel if order is in incident status */}
          {order.status === 'INCIDENT' && (
            <FailedPickupPanel
              orderId={order.id}
              version={order.version ?? order.workflowVersion ?? 1}
              facilityId={order.facilityId}
              onChanged={(updated) => void refreshFromServer(updated)}
            />
          )}

          {/* Salida a reparto, retiro en sede y cierre. Se monta siempre: el panel consulta el
              estado real en el servidor y decide qué mostrar (el estado local agrupa etapas). */}
          <DispatchCustodyPanel
            orderId={order.id}
            refreshKey={versionKey}
            initialCode={custodyType === 'DRIVER_TO_FACILITY' ? '' : custodyCode}
            initialType={custodyType}
            onChanged={(updated) => void refreshFromServer(updated)}
          />
        </div>

        {/* Right: Compact Request Summary & Last Event (1 col) */}
        <div className="space-y-6">
          {/* Compact Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-[#0F4C81]" />
              <span>Resumen de la solicitud</span>
            </h3>

            <div className="space-y-3 text-xs divide-y divide-slate-100">
              <div className="flex justify-between items-center pt-2 first:pt-0">
                <span className="text-slate-500">Cantidad total:</span>
                <span className="font-bold text-slate-900">{order.itemCount} prendas</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Total a pagar:</span>
                <span className="font-bold text-slate-900 font-mono">
                  ${(order.pricing?.total ?? 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Estado de pago:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    order.pricing?.paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.pricing?.paymentMethod} ·{' '}
                  {order.pricing?.paymentStatus === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Entrega programada:</span>
                <span className="font-semibold text-slate-800 text-right">
                  {order.delivery.targetDate}
                  <span className="block text-[10px] text-slate-400">
                    {order.delivery.timeSlot}
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500">Sede de lavado:</span>
                <span className="font-semibold text-slate-800">{order.facilityName}</span>
              </div>
            </div>

            <button
              onClick={() => onSwitchTab('order')}
              className="w-full mt-2 py-2 text-xs font-semibold text-[#0F4C81] bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Ver detalle comercial y prendas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Last Relevant Event Snippet */}
          {latestEvent && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0F4C81]" />
                  <span>Último evento registrado</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {latestEvent.timestamp}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <p className="font-bold text-slate-900">{latestEvent.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Registrado por: <strong>{latestEvent.userName}</strong> ({latestEvent.userRole})
                </p>
                {latestEvent.notes && (
                  <p className="text-xs text-slate-600 mt-1 italic">
                    "{latestEvent.notes}"
                  </p>
                )}
              </div>

              <button
                onClick={() => onSwitchTab('activity')}
                className="w-full py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Ver historial completo en Actividad</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
