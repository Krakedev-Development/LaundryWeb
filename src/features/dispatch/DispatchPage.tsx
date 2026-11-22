import { operationalStage } from '../../services/fulfillment';
import { storageService } from '../../services/storage';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseMap } from '../../components/maps/BaseMap';
import { useDriverCandidates } from '../../components/maps/useDriverCandidates';
import { routingService } from '../../services/geo';
import type { RouteSummary } from '../../services/geo/geo.types';
import {
  ArrowRight,
  ClipboardList,
  Info,
  LoaderCircle,
  MapPin,
  RotateCcw,
  UsersRound,
} from 'lucide-react';
import { DriverCandidateCard } from '../../components/common/DriverCandidateCard';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import {
  assignDriver as assignDriverApi,
  fetchFullOrders,
  getOrder,
  mapBackendOrderToOrder,
} from '../../services/api/ordersApi';
import { syncDrivers } from '../../services/api/driversApi';
import { ApiError } from '../../services/api/apiConfig';
import { deliveriesHref } from '../../services/operationsLinks';
import type { Driver, Order } from '../../types';

// Despacho asigna solo el chofer de recogida (estado del servidor: confirmada). La entrega se
// asigna en Entregas.
const DISPATCH_STATUSES = ['CONFIRMED'] as const;

const waitsForPickup = (o: Order) =>
  o.status === 'CONFIRMED' ||
  (!o.pickupNeedsScheduling && operationalStage(o) === 'PICKUP_PENDING');

export function DispatchPage() {
  const navigate = useNavigate();
  const { orders, drivers, customers, facilities, showToast } = useApp();
  // `?pedido=<id>` (enlace desde el detalle o la lista): se preselecciona al cargar la cola.
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get('pedido');
  const requestHandled = useRef(false);
  const [notWaiting, setNotWaiting] = useState('');
  const [orderId, setOrderId] = useState(''),
    [driverId, setDriverId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  // La cola sale del servidor: solo lo que de verdad espera chofer. Sin servidor no hay cola.
  const [serverOrders, setServerOrders] = useState<Order[]>([]);
  const [syncState, setSyncState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [syncError, setSyncError] = useState('');

  const syncData = async () => {
    setRefreshing(true);
    try {
      const [lists, remoteDrivers] = await Promise.all([
        Promise.all(
          DISPATCH_STATUSES.map((status) =>
            fetchFullOrders({ status, pageSize: 100 }, orders, customers, facilities, drivers),
          ),
        ),
        syncDrivers(facilities, drivers).catch(() => [] as Driver[]),
      ]);
      setServerOrders(lists.flat());
      setSyncState('ready');
      if (remoteDrivers.length > 0) storageService.saveDrivers(remoteDrivers);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
      setSyncState('error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void syncData();
  }, []);

  // Se aplica una sola vez, con la primera cola cargada del servidor. Si la solicitud no espera
  // recogida pero está lista para entrega, su asignación vive en Entregas: se redirige allí.
  useEffect(() => {
    if (!requestedId || requestHandled.current || syncState !== 'ready') return;
    requestHandled.current = true;
    const target = serverOrders.find((o) => o.id === requestedId);
    if (target && waitsForPickup(target)) {
      setOrderId(target.id);
      return;
    }
    getOrder(requestedId)
      .then((detail) => {
        if (detail.status === 'READY_FOR_DELIVERY')
          navigate(deliveriesHref(requestedId), { replace: true });
        else setNotWaiting(requestedId);
      })
      .catch(() => setNotWaiting(requestedId));
  }, [requestedId, syncState, serverOrders]);

  const queue = serverOrders.filter(waitsForPickup);
  const order = queue.find((o) => o.id === orderId) ?? queue[0];
  const { candidates, loading, error } = useDriverCandidates(order, 'pickup');
  const [route, setRoute] = useState<RouteSummary | null>(null),
    [routeError, setRouteError] = useState('');
  const destination = order?.customerAddress.coordinates;
  const driver = drivers.find((d) => d.id === driverId);
  useEffect(() => {
    setDriverId('');
    setRoute(null);
  }, [order?.id]);
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
  }, [driverId, order?.id]);

  const handleAssignDriver = async () => {
    if (!order || !driverId) return;
    setIsAssigning(true);
    const expectedVersion = order.version ?? order.workflowVersion ?? 1;

    try {
      const updated = await assignDriverApi(order.id, {
        leg: 'INBOUND',
        driverId,
        expectedVersion,
      });
      const mapped = mapBackendOrderToOrder(
        updated,
        order,
        customers,
        facilities,
        drivers,
      );
      storageService.saveOrders(
        orders.some((o) => o.id === mapped.id)
          ? orders.map((o) => (o.id === mapped.id ? mapped : o))
          : [...orders, mapped],
      );
      showToast({
        type: 'success',
        title: 'Chofer de recogida asignado',
        message: `La solicitud ${order.trackingNumber || order.id} ya tiene chofer.`,
      });
      setDriverId('');
      await syncData();
    } catch (err) {
      // Nunca se asigna solo en el navegador: sin servidor la asignación no existe.
      showToast({
        type: 'error',
        title: 'No se asignó el chofer',
        message:
          err instanceof ApiError && err.status === 0
            ? 'No se pudo conectar con el servidor. La solicitud sigue sin chofer; intenta de nuevo.'
            : err instanceof Error
              ? err.message
              : 'No se pudo asignar el chofer.',
      });
    } finally {
      setIsAssigning(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Despacho"
        subtitle="Asignación del chofer de recogida: selecciona una solicitud, compara choferes y confirma. La entrega se asigna en Entregas."
        actions={
          <button
            onClick={() => void syncData()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
            title="Refrescar estado táctico"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refrescar tablero</span>
          </button>
        }
      />
      {syncState === 'error' && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">No se pudo cargar la cola de despacho del servidor.</p>
          <p className="mt-1">{syncError} Sin conexión no se puede asignar chofer.</p>
          <button
            type="button"
            onClick={() => void syncData()}
            className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100"
          >
            Reintentar
          </button>
        </div>
      )}
      {notWaiting && (
        <div role="status" className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Esta solicitud ya no espera chofer. Puede que ya tenga uno asignado o que haya
              cambiado de estado.{' '}
              <Link className="font-semibold underline" to={`/operations/orders/${notWaiting}`}>
                Ver la solicitud
              </Link>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotWaiting('')}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100"
          >
            Entendido
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <span className="flex items-center gap-2 px-2 text-xs text-slate-500">
          <ClipboardList className="size-4 text-primary" aria-hidden="true" />
          <strong className="text-ink">{queue.length}</strong> recogidas pendientes
          de chofer
        </span>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4">
            <ClipboardList
              className="size-4 text-primary"
              aria-hidden="true"
            />
            <h2 className="text-sm font-bold text-ink">
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
                    ? 'border-primary bg-primary-soft ring-1 ring-primary/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300')
                }
                aria-pressed={o.id === order?.id}
                onClick={() => setOrderId(o.id)}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-mono text-xs text-primary">
                    {o.trackingNumber || o.id}
                  </strong>
                  <PriorityBadge priority={o.priority} />
                </span>
                <p className="mt-2 text-sm font-semibold text-ink">
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
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
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
                {order.trackingNumber || order.id}
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
                      label: 'Recogida',
                      kind: 'pickup' as const,
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
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <UsersRound
                className="size-4 text-primary"
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
          <div className="flex flex-wrap items-end justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              disabled={
                loading ||
                isAssigning ||
                !candidates.some((c) => c.driverId === driverId)
              }
              className="sidebar-focus flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              onClick={handleAssignDriver}
            >
              {isAssigning ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Asignando chofer…
                </>
              ) : (
                <>
                  Asignar chofer seleccionado
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
