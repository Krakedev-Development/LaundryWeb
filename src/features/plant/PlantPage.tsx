import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, ListFilter, RefreshCw, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Order } from '../../types';
import { fetchPlantOrders } from '../../services/api/plantOrdersApi';
import { PageHeader } from '../../components/common/PageHeader';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { SLABadge } from '../../components/common/PriorityBadge';
import { isPlantOrder, plantPhase, PlantProgress } from './plantProgress';
import { PlantOrderModal } from './PlantOrderModal';
import { getOrderNextAction } from '../orders/model/getOrderNextAction';

export const PlantPage = () => {
  const { orders: known, customers, facilities, drivers } = useApp();
  // La lista sale del servidor; lo local solo aporta nombres ya conocidos para mostrar.
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      setOrders(await fetchPlantOrders(known, customers, facilities, drivers));
      setLoadState('ready');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
      setLoadState('error');
    }
    // Se consulta al abrir y al pedirlo; no en cada cambio de los datos locales.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const [selectedFacility, setSelectedFacility] = useState('ALL');
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('ALL');
  const [onlyRisk, setOnlyRisk] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const plantOrders = orders.filter(isPlantOrder);
  const visible = plantOrders
    .filter((order) => {
      if (selectedFacility !== 'ALL' && selectedFacility !== order.facilityId)
        return false;
      if (onlyRisk && !['AT_RISK', 'OVERDUE'].includes(order.slaStatus))
        return false;
      const held = order.status === 'INCIDENT' || !!order.quarantineReason;
      if (phase === 'HELD' && !held) return false;
      if (
        phase !== 'ALL' &&
        phase !== 'HELD' &&
        (held || String(plantPhase(order)) !== phase)
      )
        return false;
      return `${order.trackingNumber} ${order.customerName} ${order.serviceType}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase());
    })
    .sort(
      (a, b) =>
        Number(['AT_RISK', 'OVERDUE'].includes(b.slaStatus)) -
          Number(['AT_RISK', 'OVERDUE'].includes(a.slaStatus)) ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const pagination = usePagination(
    visible,
    `${selectedFacility}|${phase}|${onlyRisk}|${query.trim()}`,
  );
  const selected = orders.find((order) => order.id === selectedId);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Planta de lavado"
        subtitle="Consulta el avance de cada pedido y abre su proceso, historial y bitácora."
      />
      <section className="fintech-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
          <p className="text-sm text-slate-600">
            <strong className="font-bold text-ink tabular-nums">{plantOrders.length}</strong>{' '}
            pedidos en planta ·{' '}
            <strong className="font-bold text-ink tabular-nums">
              {plantOrders.filter((order) => plantPhase(order) === 6).length}
            </strong>{' '}
            listos para salida
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-600">
              <ListFilter size={14} />
              Los pedidos en riesgo aparecen primero
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loadState === 'loading'}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadState === 'loading' ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/80 bg-slate-50/40 p-4">
          <div className="relative w-full basis-full sm:min-w-60 sm:flex-1 sm:basis-auto">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar pedidos de planta"
              placeholder="Buscar pedido, cliente o servicio"
              className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-slate-400 transition-all hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <select
            aria-label="Filtrar sede de planta"
            className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-ink transition-all hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            value={selectedFacility}
            onChange={(event) => setSelectedFacility(event.target.value)}
          >
            <option value="ALL">Todas las sedes</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar etapa de planta"
            className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-ink transition-all hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            value={phase}
            onChange={(event) => setPhase(event.target.value)}
          >
            <option value="ALL">Todas las etapas</option>
            {[
              'Recepción',
              'Pesaje',
              'Inspección',
              'Precio y pago',
              'Lavado',
              'Calidad',
              'Listo',
            ].map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
            <option value="HELD">Retenidos</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={onlyRisk}
              onChange={(event) => setOnlyRisk(event.target.checked)}
            />
            Solo riesgo SLA
          </label>
        </div>
        {loadState === 'error' && (
          <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">No se pudieron cargar los pedidos de planta del servidor.</p>
            <p className="mt-1">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100"
            >
              Reintentar
            </button>
          </div>
        )}
        {loadState === 'loading' && orders.length === 0 ? (
          <p role="status" className="px-5 py-16 text-center text-sm text-slate-600">
            Cargando pedidos de planta...
          </p>
        ) : loadState === 'error' && orders.length === 0 ? null : visible.length ? (
          <>
            <ul
              aria-label="Pedidos de planta"
              className="divide-y divide-slate-200 md:hidden"
            >
              {pagination.rows.map((order) => (
                <li key={order.id} className="px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      aria-label={`Abrir pedido ${order.trackingNumber || order.id}`}
                      onClick={() => setSelectedId(order.id)}
                      className="text-left font-bold text-primary hover:underline"
                    >
                      {order.trackingNumber || order.id}
                    </button>
                    <SLABadge risk={order.slaStatus} />
                  </div>
                  <p className="mt-1 text-sm font-medium">
                    {order.customerName}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {order.facilityName}
                  </p>
                  <p className="mb-4 mt-3 text-sm text-slate-700">
                    {order.serviceType}
                  </p>
                  <PlantProgress compact order={order} />
                  <button
                    onClick={() => setSelectedId(order.id)}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                  >
                    Ver proceso e historial
                    <ArrowUpRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Pedido y cliente</th>
                    <th className="hidden px-5 py-3 xl:table-cell">Servicio</th>
                    <th className="min-w-64 px-5 py-3">Línea de proceso</th>
                    <th className="px-5 py-3">SLA</th>
                    <th className="px-5 py-3">
                      <span className="sr-only">Ver pedido</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.rows.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer transition-colors hover:bg-primary-soft/40"
                      onClick={() => setSelectedId(order.id)}
                    >
                      <td className="px-5 py-5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(order.id);
                          }}
                          aria-label={`Abrir pedido ${order.trackingNumber || order.id}`}
                          className="font-bold text-primary hover:underline"
                        >
                          {order.trackingNumber || order.id}
                        </button>
                        <p className="mt-1 text-slate-800">
                          {order.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {order.facilityName}
                        </p>
                      </td>
                      {/* El servicio solo desde 1280 px: en tablet la línea de proceso necesita el espacio. */}
                      <td className="hidden px-5 py-5 xl:table-cell">
                        <p className="font-medium">{order.serviceType}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {order.items.reduce(
                            (sum, item) => sum + item.quantity,
                            0,
                          )}{' '}
                          prendas
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <PlantProgress compact order={order} />
                        <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-600">
                          {order.nextAction || getOrderNextAction(order)}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <SLABadge risk={order.slaStatus} />
                      </td>
                      <td className="px-5 py-5">
                        <button
                          aria-label={`Ver historial de ${order.trackingNumber || order.id}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(order.id);
                          }}
                          className="inline-flex size-9 items-center justify-center rounded-lg text-primary hover:bg-sky-100"
                        >
                          <ArrowUpRight size={19} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination pagination={pagination} label="pedidos de planta" />
          </>
        ) : (
          <div className="px-5 py-16 text-center">
            <h2 className="text-lg font-semibold">
              No hay pedidos para esta vista
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Prueba con otra búsqueda, sede o etapa. Aquí aparecen los pedidos
              recibidos y pendientes de salida.
            </p>
            <button
              className="mt-4 text-sm font-semibold text-primary underline"
              onClick={() => {
                setQuery('');
                setPhase('ALL');
                setSelectedFacility('ALL');
                setOnlyRisk(false);
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
        <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-600">
          {visible.length} de {plantOrders.length} pedidos · Selecciona un
          pedido para consultar el detalle.
        </p>
      </section>
      {selected && (
        <PlantOrderModal
          key={selected.id}
          order={selected}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
};
