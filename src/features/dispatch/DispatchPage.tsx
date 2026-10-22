import { operationalStage } from '../../services/fulfillment';
import { storageService } from '../../services/storage';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseMap } from '../../components/maps/BaseMap';
import { useDriverCandidates } from '../../components/maps/useDriverCandidates';
import { routingService } from '../../services/geo';
import { geoConfig } from '../../services/geo/geo.config';
import type { RouteSummary } from '../../services/geo/geo.types';
import {
  ArrowRight,
  ClipboardList,
  Info,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Plus,
  Truck,
  UsersRound,
} from 'lucide-react';
import { DriverCandidateCard } from '../../components/common/DriverCandidateCard';
import { PriorityBadge } from '../../components/common/PriorityBadge';
export function DispatchPage() {
  const navigate = useNavigate();
  const { orders, drivers, assignDriver } = useApp();
  const [type, setType] = useState<'pickup' | 'delivery'>('pickup'),
    [orderId, setOrderId] = useState(''),
    [driverId, setDriverId] = useState(''),
    [notes, setNotes] = useState('');
  const queue = orders.filter((o) =>
    type === 'pickup'
      ? !o.pickupNeedsScheduling && operationalStage(o) === 'PICKUP_PENDING'
      : o.fulfillment?.outbound.method === 'DRIVER' &&
        ['READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED'].includes(
          operationalStage(o),
        ),
  );
  const order = queue.find((o) => o.id === orderId) ?? queue[0];
  const { candidates, loading, error } = useDriverCandidates(order, type);
  const [route, setRoute] = useState<RouteSummary | null>(null),
    [routeError, setRouteError] = useState('');
  const destination =
    order &&
    (type === 'pickup'
      ? order.customerAddress.coordinates
      : order.deliveryAddress.coordinates);
  const driver = drivers.find((d) => d.id === driverId);
  useEffect(() => {
    setDriverId('');
    setRoute(null);
    setNotes('');
  }, [order?.id, type]);
  useEffect(() => {
    setRoute(null);
    setRouteError('');
    if (!driver || !destination) return;
    const controller = new AbortController();
    routingService
      .getRoute(driver.location, destination, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setRoute(value);
          if (!value)
            setRouteError('No pudimos calcular una ruta por carretera.');
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setRouteError(e.message);
      });
    return () => controller.abort();
  }, [driverId, order?.id, type]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Despacho"
        subtitle="Selecciona una solicitud, compara choferes y confirma la asignación."
        actions={
          <button
            className="sidebar-focus flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#0F4C81] shadow-xs hover:bg-slate-50"
            onClick={() => {
              const demo = storageService.createDemoOrder();
              navigate('/operations/orders/' + demo.id);
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            Abrir solicitud de demostración
          </button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(['pickup', 'delivery'] as const).map((value) => (
            <button
              key={value}
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={
                type === value
                  ? 'sidebar-focus flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold bg-[#0F4C81] text-white shadow-sm'
                  : 'sidebar-focus flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-white hover:text-[#0F4C81]'
              }
            >
              {value === 'pickup' ? (
                <Truck className="size-4" aria-hidden="true" />
              ) : (
                <PackageCheck className="size-4" aria-hidden="true" />
              )}
              {value === 'pickup' ? 'Recogidas' : 'Entregas'}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-2 px-2 text-xs text-slate-500">
          <ClipboardList className="size-4 text-[#0F4C81]" aria-hidden="true" />
          <strong className="text-[#102A43]">{queue.length}</strong> solicitudes
          pendientes
        </span>
      </div>
      {geoConfig.mode === 'demo' && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          Escenario local: tiempos y distancias simulados.
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4">
            <ClipboardList
              className="size-4 text-[#0F4C81]"
              aria-hidden="true"
            />
            <h2 className="text-sm font-bold text-[#102A43]">
              Solicitudes por asignar
            </h2>
          </div>
          <div className="max-h-[520px] space-y-2 overflow-y-auto p-3">
            {!queue.length && (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs leading-relaxed text-slate-500">
                No hay solicitudes pendientes de asignación.
              </p>
            )}
            {queue.map((o) => (
              <button
                key={o.id}
                className={
                  'sidebar-focus block text-left w-full p-4 rounded-xl border transition-colors ' +
                  (o.id === order?.id
                    ? 'border-[#0F4C81] bg-[#F0F6FC] ring-1 ring-[#0F4C81]/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300')
                }
                aria-pressed={o.id === order?.id}
                onClick={() => setOrderId(o.id)}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-mono text-xs text-[#0F4C81]">
                    {o.id}
                  </strong>
                  <PriorityBadge priority={o.priority} />
                </span>
                <p className="mt-2 text-sm font-semibold text-[#102A43]">
                  {o.customerName}
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  {o.zoneName}
                </p>
              </button>
            ))}
          </div>
        </section>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#102A43]">
                <MapPin className="size-4 text-[#0F4C81]" aria-hidden="true" />
                Ruta y ubicación
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {order
                  ? `${order.customerName} · ${order.zoneName}`
                  : 'Selecciona una solicitud para consultar su destino.'}
              </p>
            </div>
            {order && (
              <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-600">
                {order.id}
              </span>
            )}
          </div>
          <BaseMap
            center={destination}
            route={route}
            points={
              order && destination
                ? [
                    {
                      id: order.id,
                      coordinates: destination,
                      label: type === 'pickup' ? 'Recogida' : 'Entrega',
                      kind: type,
                    },
                    ...candidates.map((c) => {
                      const d = drivers.find((v) => v.id === c.driverId)!;
                      return {
                        id: d.id,
                        coordinates: d.location,
                        label: d.name,
                        kind: 'driver' as const,
                      };
                    }),
                  ]
                : []
            }
            onSelect={(id) => {
              if (candidates.some((c) => c.driverId === id)) setDriverId(id);
            }}
          />
        </section>
      </div>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#102A43]">
              <UsersRound
                className="size-4 text-[#0F4C81]"
                aria-hidden="true"
              />
              Choferes disponibles
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Compara disponibilidad, distancia y tiempo de llegada.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {candidates.length}
          </span>
        </div>
        {loading && (
          <p
            role="status"
            className="flex items-center gap-2 py-4 text-xs text-slate-500"
          >
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            Calculando mejores choferes…
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 p-4 text-xs text-rose-700"
          >
            {error}
          </p>
        )}
        {routeError && (
          <p
            role="alert"
            className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800"
          >
            {routeError}
          </p>
        )}
        {order && !loading && !error && !candidates.length && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-xs leading-relaxed text-slate-500">
            No hay choferes elegibles. Revisa disponibilidad, cobertura, sede,
            capacidad y antigüedad de ubicación.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate, i) => {
            const d = drivers.find((v) => v.id === candidate.driverId)!;
            return (
              <DriverCandidateCard
                key={d.id}
                driver={d}
                candidate={candidate}
                recommended={i === 0}
                selected={driverId === d.id}
                onSelect={() => setDriverId(d.id)}
              />
            );
          })}
        </div>
        {order && (
          <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4">
            <label className="min-w-[180px] flex-1 text-xs font-semibold text-slate-600">
              Notas de asignación{' '}
              <span className="font-normal text-slate-400">(opcional)</span>
              <input
                aria-label="Notas de asignación"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-normal outline-none focus:border-[#0F4C81] focus:bg-white focus:ring-2 focus:ring-[#0F4C81]/10"
                placeholder="Notas de asignación"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <button
              disabled={
                loading || !candidates.some((c) => c.driverId === driverId)
              }
              className="sidebar-focus flex items-center gap-2 rounded-xl bg-[#0F4C81] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0A3660] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              onClick={() => {
                if (assignDriver(order.id, driverId, type, notes))
                  setDriverId('');
              }}
            >
              Asignar chofer seleccionado
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
