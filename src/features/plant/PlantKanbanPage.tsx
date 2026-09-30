import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { PriorityBadge, SLABadge } from '../../components/common/PriorityBadge';
import { Order, OrderStatus } from '../../types';
import {
  Boxes,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Filter,
} from 'lucide-react';

export const PlantKanbanPage: React.FC = () => {
  const { orders, facilities, updateOrderStatus, releaseFromQuarantine, moveToQuarantine } = useApp();
  const navigate = useNavigate();

  // Filters
  const [selectedFacility, setSelectedFacility] = useState('ALL');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Quarantine quick modal state
  const [quarantineTargetOrder, setQuarantineTargetOrder] = useState<Order | null>(null);
  const [quarantineReason, setQuarantineReason] = useState('Mancha química persistente detectada en túnel');

  // Filtered orders relevant for Plant
  const plantOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedFacility !== 'ALL' && o.facilityId !== selectedFacility) return false;
      if (onlyOverdue && o.slaStatus !== 'OVERDUE' && o.slaStatus !== 'AT_RISK') return false;
      return true;
    });
  }, [orders, selectedFacility, onlyOverdue]);

  // Kanban Columns
  const columns: {
    id: OrderStatus;
    title: string;
    subtitle: string;
    statusList: OrderStatus[];
    isQuarantine?: boolean;
  }[] = [
    {
      id: 'AT_FACILITY',
      title: 'Recibidas en Planta',
      subtitle: 'Clasificación y pesaje',
      statusList: ['AT_FACILITY'],
    },
    {
      id: 'IN_PROCESS',
      title: 'En Procesamiento',
      subtitle: 'Lavado, desinfección, secado',
      statusList: ['IN_PROCESS'],
    },
    {
      id: 'QUALITY_CONTROL',
      title: 'Control de Calidad',
      subtitle: 'Inspección de manchas y planchado',
      statusList: ['QUALITY_CONTROL'],
    },
    {
      id: 'READY_FOR_DELIVERY',
      title: 'Listas para Entrega',
      subtitle: 'Empaque y despacho final',
      statusList: ['READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED'],
    },
    {
      id: 'QUARANTINE',
      title: 'Cuarentena Técnica',
      subtitle: 'Retención por mancha o daño',
      statusList: ['QUARANTINE'],
      isQuarantine: true,
    },
  ];

  // Plant KPIs
  const recibidasCount = orders.filter((o) => o.status === 'AT_FACILITY').length;
  const enProcesoCount = orders.filter((o) => o.status === 'IN_PROCESS').length;
  const listasCount = orders.filter((o) => o.status === 'READY_FOR_DELIVERY').length;
  const cuarentenaCount = orders.filter((o) => o.status === 'QUARANTINE').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Planta de lavado"
        subtitle="Controla el procesamiento de prendas y su preparación para entrega en formato Kanban."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Recibidas en Planta"
          value={recibidasCount}
          subtitle="En espera de clasificación"
          icon={<Boxes className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="En Procesamiento"
          value={enProcesoCount}
          subtitle="Túneles de lavado y secado"
          variant="aqua"
          icon={<Sparkles className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Listas para Entrega"
          value={listasCount}
          subtitle="Prendas empaquetadas"
          variant="success"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="En Cuarentena"
          value={cuarentenaCount}
          subtitle="Retenidas para revisión"
          variant={cuarentenaCount > 0 ? 'urgent' : 'default'}
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Building2 className="w-4 h-4 text-sky-700" />
            <span>Sede operativa:</span>
          </div>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-sky-500 font-medium"
          >
            <option value="ALL">Todas las sedes</option>
            {facilities.map((fac) => (
              <option key={fac.id} value={fac.id}>{fac.name} ({fac.zone})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(e) => setOnlyOverdue(e.target.checked)}
              className="rounded text-sky-600 w-4 h-4 focus:ring-sky-500"
            />
            <span className="font-medium">Solo órdenes en riesgo o vencidas</span>
          </label>
        </div>
      </div>

      {/* Kanban Board Container with relaxed layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 items-start">
        {columns.map((col) => {
          const colOrders = plantOrders.filter((o) => col.statusList.includes(o.status));
          return (
            <div
              key={col.id}
              className={`rounded-2xl border transition-all flex flex-col min-h-[580px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                col.isQuarantine
                  ? 'bg-rose-50/30 border-rose-200/80'
                  : 'bg-slate-50/60 border-slate-200/80'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-200/70 bg-white/80 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {col.title}
                  </h3>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full tabular-nums ${
                      col.isQuarantine
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {colOrders.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{col.subtitle}</p>
              </div>

              {/* Column Cards List */}
              <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto max-h-[660px]">
                {colOrders.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 italic">
                    Sin órdenes en esta etapa.
                  </div>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => navigate(`/operations/orders/${ord.id}`)}
                      className={`bg-white rounded-xl p-4 border transition-all hover:shadow-xs cursor-pointer ${
                        col.isQuarantine
                          ? 'border-rose-200 hover:border-rose-300'
                          : 'border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-sky-800 font-mono">
                          {ord.id}
                        </span>
                        <PriorityBadge priority={ord.priority} />
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {ord.customerName}
                      </h4>

                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {ord.serviceType}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2.5 font-mono">
                        <span className="font-semibold tabular-nums">{ord.itemCount} prendas</span>
                        <span className="text-slate-400">{ord.facilityName.split(' ')[1]}</span>
                      </div>

                      {/* Quarantine Reason Callout */}
                      {ord.status === 'QUARANTINE' && (
                        <div className="mt-2.5 p-2 rounded-lg bg-rose-50 text-[11px] text-rose-800 border border-rose-200/80">
                          <p className="font-bold">Motivo: {ord.quarantineReason || 'Inspección técnica'}</p>
                          {ord.quarantineNotes && <p className="truncate mt-0.5 text-rose-700">{ord.quarantineNotes}</p>}
                        </div>
                      )}

                      {/* Progress bar for IN_PROCESS */}
                      {ord.status === 'IN_PROCESS' && (
                        <div className="mt-2.5">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>Ciclo de lavado</span>
                            <span className="font-mono font-bold text-sky-700">65%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-600 rounded-full w-[65%]" />
                          </div>
                        </div>
                      )}

                      {/* SLA Tag */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <SLABadge risk={ord.slaStatus} deadline={ord.slaDeadline} />
                      </div>

                      {/* Action buttons inside card */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {(ord.status === 'IN_PROCESS' || ord.status === 'QUALITY_CONTROL') && (
                          <button
                            onClick={() => setQuarantineTargetOrder(ord)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                            title="Enviar a cuarentena"
                          >
                            Cuarentena
                          </button>
                        )}

                        {ord.status === 'AT_FACILITY' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'IN_PROCESS', 'Iniciado lavado en planta')}
                            className="w-full py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Lavar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {ord.status === 'IN_PROCESS' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'QUALITY_CONTROL', 'Avanza a inspección de calidad')}
                            className="flex-1 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Control Calidad</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {ord.status === 'QUALITY_CONTROL' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'READY_FOR_DELIVERY', 'Prendas aprobadas en calidad')}
                            className="flex-1 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Listo Entrega</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {ord.status === 'QUARANTINE' && (
                          <button
                            onClick={() => releaseFromQuarantine(ord.id, 'QUALITY_CONTROL', 'Liberado de cuarentena tras re-procesamiento')}
                            className="w-full py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Liberar orden</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Quarantine Modal */}
      {quarantineTargetOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Enviar a Cuarentena</h3>
                <p className="text-xs text-slate-500">Orden {quarantineTargetOrder.id} ({quarantineTargetOrder.customerName})</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo de Retención</label>
                <select
                  value={quarantineReason}
                  onChange={(e) => setQuarantineReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Mancha química persistente detectada en túnel">Mancha química persistente detectada en túnel</option>
                  <option value="Desgaste de fibra previo detectado">Desgaste de fibra previo detectado</option>
                  <option value="Falta de botón o costura descosida">Falta de botón o costura descosida</option>
                  <option value="Discrepancia en conteo de prendas">Discrepancia en conteo de prendas</option>
                  <option value="Solicitud de revisión técnica">Solicitud de revisión técnica</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setQuarantineTargetOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  moveToQuarantine(quarantineTargetOrder.id, quarantineReason, 'Retenido desde el tablero Kanban');
                  setQuarantineTargetOrder(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                Confirmar Cuarentena
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
