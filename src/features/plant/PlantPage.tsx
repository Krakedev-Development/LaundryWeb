import { useState } from 'react';
import { ArrowUpRight, ListFilter, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { SLABadge } from '../../components/common/PriorityBadge';
import { isPlantOrder, plantPhase, PlantProgress } from './plantProgress';
import { PlantOrderModal } from './PlantOrderModal';

export const PlantPage = () => {
  const { orders, facilities } = useApp();
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
      return `${order.id} ${order.customerName} ${order.trackingNumber} ${order.serviceType}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase());
    })
    .sort(
      (a, b) =>
        Number(['AT_RISK', 'OVERDUE'].includes(b.slaStatus)) -
          Number(['AT_RISK', 'OVERDUE'].includes(a.slaStatus)) ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const selected = orders.find((order) => order.id === selectedId);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Planta de lavado"
        subtitle="Consulta el avance de cada pedido y abre su proceso, historial y bitácora."
      />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{plantOrders.length}</strong>{' '}
            pedidos en planta ·{' '}
            <strong className="text-slate-900">
              {plantOrders.filter((order) => plantPhase(order) === 6).length}
            </strong>{' '}
            listos para salida
          </p>
          <span className="inline-flex items-center gap-2 text-xs text-slate-600">
            <ListFilter size={15} />
            Los pedidos en riesgo aparecen primero
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative w-full basis-full sm:min-w-60 sm:flex-1 sm:basis-auto">
            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar pedidos de planta"
              placeholder="Buscar pedido, cliente o servicio"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            aria-label="Filtrar sede de planta"
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
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
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
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
        {visible.length ? (
          <>
            <ul
              aria-label="Pedidos de planta"
              className="divide-y divide-slate-200 md:hidden"
            >
              {visible.map((order) => (
                <li key={order.id} className="px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      aria-label={`Abrir pedido ${order.id}`}
                      onClick={() => setSelectedId(order.id)}
                      className="text-left font-bold text-[#0F4C81] hover:underline"
                    >
                      {order.id}
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
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0F4C81]"
                  >
                    Ver proceso e historial
                    <ArrowUpRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Pedido y cliente</th>
                    <th className="px-5 py-3">Servicio</th>
                    <th className="min-w-64 px-5 py-3">Línea de proceso</th>
                    <th className="px-5 py-3">SLA</th>
                    <th className="px-5 py-3">
                      <span className="sr-only">Ver pedido</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer hover:bg-sky-50/50"
                      onClick={() => setSelectedId(order.id)}
                    >
                      <td className="px-5 py-5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(order.id);
                          }}
                          aria-label={`Abrir pedido ${order.id}`}
                          className="font-bold text-[#0F4C81] hover:underline"
                        >
                          {order.id}
                        </button>
                        <p className="mt-1 text-slate-800">
                          {order.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {order.facilityName}
                        </p>
                      </td>
                      <td className="px-5 py-5">
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
                          {order.nextAction ||
                            'Abrir para revisar el próximo paso'}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <SLABadge risk={order.slaStatus} />
                      </td>
                      <td className="px-5 py-5">
                        <button
                          aria-label={`Ver historial de ${order.id}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(order.id);
                          }}
                          className="inline-flex size-9 items-center justify-center rounded-lg text-[#0F4C81] hover:bg-sky-100"
                        >
                          <ArrowUpRight size={19} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              className="mt-4 text-sm font-semibold text-[#0F4C81] underline"
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
        />
      )}
    </div>
  );
};
