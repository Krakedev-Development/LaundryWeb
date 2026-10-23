import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, History, Package, Workflow } from 'lucide-react';
import type { Order } from '../../types';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import { operationalStage } from '../../services/fulfillment';
import { Modal } from '../../shared/ui/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OrderBusinessPanel } from '../orders/OrderBusinessPanel';
import { OrderHistory, displayDate } from './OrderHistory';
import { PlantProgress } from './plantProgress';

export function PlantOrderModal({
  order,
  onClose,
}: {
  order: Order;
  onClose(): void;
}) {
  const {
    auditLogs,
    incidents,
    updateOrderStatus,
    moveToQuarantine,
    releaseFromQuarantine,
  } = useApp();
  const [tab, setTab] = useState('summary');
  const [reason, setReason] = useState('');
  const state = storageService.getWorkflow();
  const stage = operationalStage(order);
  const money = (value: number) =>
    `${order.pricing.currency} ${value.toFixed(2)}`;
  return (
    <Modal
      wide
      title={`Pedido ${order.id}`}
      description={`${order.customerName} · ${order.facilityName}`}
      onClose={onClose}
    >
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={stage} />
          <Link
            to={`/operations/orders/${order.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F4C81] hover:underline"
          >
            Abrir ficha del pedido
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[480px]">
            <PlantProgress order={order} />
          </div>
        </div>
        {order.quarantineReason && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Retención: {order.quarantineReason}
          </p>
        )}
        {order.intakeHold && !order.intakeHold.resolvedAt && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Diferencia de prendas: {order.intakeHold.description}
          </p>
        )}
      </div>
      <div
        className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4"
        aria-label="Secciones del pedido"
      >
        {[
          { id: 'summary', label: 'Resumen y prendas', Icon: Package },
          { id: 'process', label: 'Gestionar proceso', Icon: Workflow },
          { id: 'history', label: 'Historial y bitácora', Icon: History },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold ${tab === id ? 'border-[#0F4C81] text-[#0F4C81]' : 'border-transparent text-slate-600 hover:text-[#0F4C81]'}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-6">
        {tab === 'summary' && (
          <div className="space-y-6">
            <dl className="grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-600">Servicio</dt>
                <dd className="mt-1 font-semibold">{order.serviceType}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Modalidad</dt>
                <dd className="mt-1 font-semibold">
                  {order.fulfillment?.outbound.method === 'CUSTOMER'
                    ? 'Recogida a domicilio y retiro en sede'
                    : 'Recogida y entrega a domicilio'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Peso registrado</dt>
                <dd className="mt-1 font-semibold">
                  {order.pricing.measuredWeight !== undefined
                    ? `${order.pricing.measuredWeight} ${order.pricing.weightUnit}`
                    : 'Sin pesaje registrado'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Importe y pago</dt>
                <dd className="mt-1 font-semibold">
                  {order.pricing.amountKnown === false
                    ? 'Pendiente de pesaje'
                    : money(order.pricing.total)}{' '}
                  ·{' '}
                  {order.pricing.paymentStatus === 'PAID'
                    ? 'Pagado'
                    : 'Pendiente'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Creación</dt>
                <dd className="mt-1">{displayDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Última actualización</dt>
                <dd className="mt-1">{displayDate(order.updatedAt)}</dd>
              </div>
            </dl>
            {order.customerMessage && (
              <p className="border-l-2 border-sky-700 pl-4 text-sm text-slate-700">
                {order.customerMessage}
              </p>
            )}
            <section>
              <h3 className="mb-3 font-semibold">Prendas del pedido</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th className="px-3 py-3">Prenda</th>
                      <th className="px-3 py-3">Cantidad</th>
                      <th className="px-3 py-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3 font-medium">{item.name}</td>
                        <td className="px-3 py-3 tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {item.notes || 'Sin observaciones'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h3 className="mb-3 font-semibold">Incidencias vinculadas</h3>
              {incidents
                .filter((incident) => incident.orderId === order.id)
                .map((incident) => (
                  <p
                    key={incident.id}
                    className="mb-2 border-l-2 border-amber-500 pl-3 text-sm"
                  >
                    <span className="font-semibold">
                      {incident.id} ·{' '}
                      {incident.status === 'RESOLVED'
                        ? 'Resuelta'
                        : 'Pendiente'}
                    </span>
                    <span className="mt-1 block text-slate-600">
                      {incident.description}
                    </span>
                  </p>
                ))}
              {!incidents.some((incident) => incident.orderId === order.id) && (
                <p className="text-sm text-slate-600">
                  Sin incidencias registradas.
                </p>
              )}
            </section>
          </div>
        )}
        {tab === 'process' && (
          <div className="space-y-5">
            {order.businessVersion === 3 ? (
              <OrderBusinessPanel order={order} />
            ) : (
              <div className="flex flex-wrap gap-3">
                {stage === 'AT_FACILITY' && (
                  <button
                    className="rounded-lg bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white"
                    onClick={() =>
                      updateOrderStatus(
                        order.id,
                        'IN_PROCESS',
                        'Procesamiento iniciado desde planta',
                      )
                    }
                  >
                    Iniciar procesamiento
                  </button>
                )}
                {stage === 'IN_PROCESS' && (
                  <button
                    className="rounded-lg bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white"
                    onClick={() =>
                      updateOrderStatus(
                        order.id,
                        'QUALITY_CONTROL',
                        'Lavado terminado',
                      )
                    }
                  >
                    Pasar a control de calidad
                  </button>
                )}
                {stage === 'QUALITY_CONTROL' && (
                  <button
                    className="rounded-lg bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white"
                    onClick={() =>
                      updateOrderStatus(
                        order.id,
                        'READY_FOR_DELIVERY',
                        'Calidad aprobada desde planta',
                      )
                    }
                  >
                    Marcar listo
                  </button>
                )}
              </div>
            )}
            {['IN_PROCESS', 'QUALITY_CONTROL'].includes(stage) && (
              <section className="border-t border-slate-200 pt-5">
                <h3 className="font-semibold">Retener para revisión</h3>
                <label className="mt-3 block text-sm text-slate-600">
                  Motivo de la retención
                  <textarea
                    className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Describe el problema que requiere revisión"
                  />
                </label>
                <button
                  disabled={reason.trim().length < 5}
                  onClick={() => moveToQuarantine(order.id, reason.trim())}
                  className="mt-3 rounded-lg border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Retener pedido
                </button>
              </section>
            )}
            {stage === 'QUARANTINE' && (
              <section>
                <label className="block text-sm text-slate-600">
                  Resolución de la retención
                  <textarea
                    className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <button
                  disabled={reason.trim().length < 5}
                  className="mt-3 rounded-lg bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={() =>
                    releaseFromQuarantine(
                      order.id,
                      'QUALITY_CONTROL',
                      reason.trim(),
                    )
                  }
                >
                  Liberar a control de calidad
                </button>
              </section>
            )}
            <Link
              className="inline-block text-sm font-semibold text-[#0F4C81] underline"
              to="/operations/handoffs"
            >
              Abrir recepción y retiros para validar custodia
            </Link>
          </div>
        )}
        {tab === 'history' && (
          <OrderHistory
            order={order}
            state={state}
            audits={auditLogs}
            incidents={incidents}
          />
        )}
      </div>
    </Modal>
  );
}
