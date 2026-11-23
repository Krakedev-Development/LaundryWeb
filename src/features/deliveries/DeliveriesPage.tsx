import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  Send,
  Truck,
  User,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { ApiError } from '../../services/api/apiConfig';
import type { BackendDriver } from '../../services/api/driversApi';
import {
  assignDeliveryDriver,
  deliveryDriverOptions,
  DELIVERY_STATUS_LABEL,
  fetchDeliveryDrivers,
  fetchDeliveryRows,
  formatScheduleDate,
  isScheduledToday,
  type DeliveryRow,
  type DeliveryServerStatus,
} from '../../services/api/deliveriesApi';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import { btnPrimary, btnSecondarySm, focusRing } from '../../shared/ui/controls';
import { TONE_STYLE } from '../../shared/ui/statusTone';

// Escala compartida: lista para entrega espera que la sede asigne chofer (ámbar).
const STATUS_STYLE: Record<DeliveryServerStatus, string> = {
  READY_FOR_DELIVERY: TONE_STYLE.action.badge,
  DELIVERY_ASSIGNED: TONE_STYLE.progress.badge,
  OUT_FOR_DELIVERY: TONE_STYLE.progress.badge,
  ARRIVED_FOR_DELIVERY: TONE_STYLE.progress.badge,
  DELIVERED: TONE_STYLE.done.badge,
};


function StatusPill({ status }: { status: DeliveryServerStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {DELIVERY_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Last mile a domicilio. Lista y asigna chofer contra el servidor.
 * "Despachar" / "Entregada" no viven aquí: salen por custodia en el detalle o la app del chofer.
 */
export const DeliveriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DeliveryServerStatus>('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [assignDriverId, setAssignDriverId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  // `?pedido=<id>` (enlace desde el detalle o Despacho): se preselecciona en la primera carga.
  const [searchParams] = useSearchParams();
  const requestedId = useRef(searchParams.get('pedido'));
  const [notListed, setNotListed] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setLoadError('');
    try {
      const [deliveryRows, driverRows] = await Promise.all([
        fetchDeliveryRows(),
        fetchDeliveryDrivers(),
      ]);
      setRows(deliveryRows);
      setDrivers(driverRows);
      setState('ready');
      const requested = requestedId.current;
      requestedId.current = null;
      if (requested && !deliveryRows.some((r) => r.id === requested)) setNotListed(requested);
      setSelectedOrderId((prev) => {
        const wanted = requested ?? prev;
        return deliveryRows.some((r) => r.id === wanted) ? wanted : (deliveryRows[0]?.id ?? '');
      });
    } catch (e) {
      setLoadError(
        e instanceof ApiError && e.status === 0
          ? 'Sin conexión con el servidor.'
          : e instanceof Error
            ? e.message
            : 'No se pudieron cargar las entregas.',
      );
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (driverFilter !== 'ALL' && r.driverId !== driverFilter) return false;
      return true;
    });
  }, [rows, statusFilter, driverFilter]);

  const pagination = usePagination(filtered, `${statusFilter}|${driverFilter}`);
  const selected = rows.find((r) => r.id === selectedOrderId) ?? filtered[0];

  useEffect(() => {
    setAssignDriverId(selected?.driverId ?? '');
    setAssignError('');
  }, [selected?.id, selected?.driverId]);

  const toDeliverToday = rows.filter((r) => isScheduledToday(r.scheduledDate)).length;
  const onRoute = rows.filter(
    (r) => r.status === 'OUT_FOR_DELIVERY' || r.status === 'ARRIVED_FOR_DELIVERY',
  ).length;
  const deliveredToday = rows.filter(
    (r) => r.status === 'DELIVERED' && isScheduledToday(r.scheduledDate),
  ).length;

  // Misma regla de elegibilidad que Despacho: no se ofrecen choferes no disponibles, de otra sede
  // o sin capacidad.
  const options = useMemo(
    () =>
      selected
        ? deliveryDriverOptions(drivers, selected.facilityId, storageService.getWorkflow().businessPolicy)
        : { eligible: [], excluded: [] },
    [drivers, selected?.id, selected?.facilityId],
  );

  const canAssign =
    selected?.status === 'READY_FOR_DELIVERY' &&
    Boolean(selected.slotId) &&
    !assigning &&
    options.eligible.some((d) => d.id === assignDriverId);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !assignDriverId) return;
    setAssigning(true);
    setAssignError('');
    try {
      const updated = await assignDeliveryDriver(
        selected.id,
        assignDriverId,
        selected.version,
        drivers,
      );
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast({
        type: 'success',
        title: 'Chofer de entrega asignado',
        message: 'La asignación quedó registrada en el servidor.',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo asignar el chofer.';
      setAssignError(message);
      showToast({ type: 'error', title: 'No se pudo asignar', message });
    } finally {
      setAssigning(false);
    }
  };

  const openDetail = (id: string) => navigate(`/operations/orders/${id}`);
  const openHandoffs = () => navigate('/operations/handoffs');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Entregas"
        subtitle="Seguimiento y asignación de las entregas a domicilio. La salida a ruta y la entrega se confirman con custodia, no desde esta lista."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="A entregar hoy"
          value={state === 'ready' ? toDeliverToday : '—'}
          subtitle="Con franja de hoy"
          icon={<Calendar className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="En ruta"
          value={state === 'ready' ? onRoute : '—'}
          subtitle="En camino o en domicilio"
          variant="aqua"
          icon={<Truck className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Entregadas (franja hoy)"
          value={state === 'ready' ? deliveredToday : '—'}
          subtitle="Confirmadas en servidor"
          variant="success"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="En cola"
          value={state === 'ready' ? rows.length : '—'}
          subtitle="Solicitudes de entrega a domicilio"
          icon={<Clock className="w-5 h-5 text-sky-600" />}
        />
      </div>

      {notListed && (
        <div
          role="status"
          className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>
            Esta solicitud no está en las entregas a domicilio. Puede que aún no esté lista o que
            el cliente retire en sede.{' '}
            <button
              type="button"
              className="font-semibold underline cursor-pointer"
              onClick={() => openDetail(notListed)}
            >
              Ver la solicitud
            </button>
          </p>
          <button type="button" className={btnSecondarySm} onClick={() => setNotListed('')}>
            Entendido
          </button>
        </div>
      )}

      {state === 'error' && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p className="font-semibold">No se pudieron cargar las entregas.</p>
          <p className="mt-1">{loadError}</p>
          <button type="button" className={`${btnPrimary} mt-3`} onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lw-surface lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Listado de entregas ({state === 'ready' ? filtered.length : '…'})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Datos del servidor. Selecciona una solicitud para asignar chofer o abrir su detalle.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                aria-label="Filtrar por estado"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'ALL' | DeliveryServerStatus)
                }
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-2 focus:-outline-offset-1 focus:outline-primary"
              >
                <option value="ALL">Todos los estados</option>
                {(Object.keys(DELIVERY_STATUS_LABEL) as DeliveryServerStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {DELIVERY_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar por chofer"
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-2 focus:-outline-offset-1 focus:outline-primary"
              >
                <option value="ALL">Todos los choferes</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button type="button" className={btnSecondarySm} onClick={() => void load()}>
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Actualizar
              </button>
            </div>
          </div>

          {state === 'loading' && (
            <p role="status" className="py-10 text-center text-sm text-slate-500">
              Cargando entregas del servidor…
            </p>
          )}

          {state === 'ready' && filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              No hay entregas a domicilio en estas etapas.
            </p>
          )}

          {state === 'ready' && filtered.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="lw-table w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4">Solicitud y cliente</th>
                      <th className="py-3 px-4">Horario</th>
                      <th className="py-3 px-4">Chofer</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagination.rows.map((ord) => {
                      const isSelected = selected?.id === ord.id;
                      return (
                        <tr
                          key={ord.id}
                          onClick={() => setSelectedOrderId(ord.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            {/* Con teclado se elige la fila con este botón (el clic en la fila es un atajo de ratón). */}
                            <button
                              type="button"
                              aria-pressed={isSelected}
                              aria-label={`Seleccionar entrega ${ord.trackingNumber}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedOrderId(ord.id);
                              }}
                              className={`font-bold text-primary font-mono text-[13px] hover:underline rounded ${focusRing}`}
                            >
                              {ord.trackingNumber}
                            </button>
                            <span className="block font-semibold text-slate-900 truncate max-w-[160px] mt-0.5">
                              {ord.customerName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-medium text-slate-800">
                              {formatScheduleDate(ord.scheduledDate)}
                            </span>
                            <span className="block text-[11px] text-slate-500 font-mono mt-0.5">
                              {ord.slotLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {ord.driverName ? (
                              <span className="font-semibold text-emerald-700">
                                {ord.driverName}
                              </span>
                            ) : (
                              <span className="text-amber-700 italic">Por asignar</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusPill status={ord.status} />
                          </td>
                          <td
                            className="py-3.5 px-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {ord.status === 'DELIVERY_ASSIGNED' ? (
                              <button
                                type="button"
                                className={btnSecondarySm}
                                onClick={openHandoffs}
                              >
                                Validar salida
                              </button>
                            ) : ord.status === 'OUT_FOR_DELIVERY' ||
                              ord.status === 'ARRIVED_FOR_DELIVERY' ? (
                              <button
                                type="button"
                                className={btnSecondarySm}
                                onClick={() => openDetail(ord.id)}
                              >
                                Ver en detalle
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={btnSecondarySm}
                                onClick={() => openDetail(ord.id)}
                              >
                                Abrir
                                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TablePagination pagination={pagination} label="entregas" />
            </>
          )}
        </div>

        <div className="lw-surface lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          {selected && state === 'ready' ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-sky-800 uppercase tracking-wider bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200/60">
                    Entrega a domicilio
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">
                    {selected.trackingNumber}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => openDetail(selected.id)}
                  className="text-xs text-sky-700 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver detalle</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <User className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>{selected.customerName}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>{selected.addressText || 'Dirección en el detalle de la solicitud'}</span>
                </div>
                {selected.customerPhone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{selected.customerPhone}</span>
                  </div>
                )}
                <div className="pt-1">
                  <StatusPill status={selected.status} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 text-xs space-y-2">
                <p className="font-semibold text-slate-800">Programación en servidor</p>
                <p className="text-slate-600">
                  Fecha: <strong>{formatScheduleDate(selected.scheduledDate)}</strong>
                  {selected.scheduledDate ? ` (${selected.scheduledDate.slice(0, 10)})` : ''}
                </p>
                <p className="text-slate-600">
                  Franja: <strong>{selected.slotLabel}</strong>
                </p>
                {!selected.slotId && (
                  <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Todavía no hay franja de entrega. Solo el cliente puede programarla desde su
                    app. Cuando exista, podrás asignar chofer aquí.
                  </p>
                )}
              </div>

              {selected.status === 'READY_FOR_DELIVERY' && selected.slotId && (
                <form onSubmit={(e) => void handleAssign(e)} className="space-y-3 text-xs">
                  <label className="block font-semibold text-slate-700">
                    Chofer de entrega
                    <select
                      aria-label="Chofer de entrega"
                      value={assignDriverId}
                      onChange={(e) => setAssignDriverId(e.target.value)}
                      className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-2 focus:-outline-offset-1 focus:outline-primary"
                      required
                    >
                      <option value="">Seleccionar chofer…</option>
                      {options.eligible.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                          {d.status === 'AVAILABLE' ? ' · Disponible' : ' · En servicio'}
                        </option>
                      ))}
                    </select>
                  </label>
                  {options.eligible.length === 0 && (
                    <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      No hay choferes elegibles en la sede. Revisa su disponibilidad y capacidad.
                    </p>
                  )}
                  {options.excluded.length > 0 && (
                    <details className="text-slate-600">
                      <summary className="cursor-pointer font-semibold">
                        Choferes no elegibles ({options.excluded.length})
                      </summary>
                      <ul aria-label="Choferes no elegibles" className="mt-2 space-y-1">
                        {options.excluded.map(({ driver, reasons }) => (
                          <li key={driver.id}>
                            {driver.name}: {reasons.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {assignError && (
                    <p role="alert" className="text-rose-700 font-medium">
                      {assignError}
                    </p>
                  )}
                  <button type="submit" className={`${btnPrimary} w-full`} disabled={!canAssign}>
                    <Send className="w-3.5 h-3.5" />
                    {assigning ? 'Asignando…' : 'Asignar chofer en servidor'}
                  </button>
                </form>
              )}

              {selected.status === 'DELIVERY_ASSIGNED' && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-950 space-y-2">
                  <p className="font-semibold">Salida a ruta</p>
                  <p>
                    La sede valida el código del chofer (traspaso FACILITY_TO_DRIVER) en Recepción
                    y retiros o en el detalle. No se marca “en ruta” solo en el navegador.
                  </p>
                  <button type="button" className={btnPrimary} onClick={openHandoffs}>
                    Ir a recepción y retiros
                  </button>
                </div>
              )}

              {(selected.status === 'OUT_FOR_DELIVERY' ||
                selected.status === 'ARRIVED_FOR_DELIVERY') && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 space-y-2">
                  <p className="font-semibold">Confirmación de entrega</p>
                  <p>
                    El chofer confirma con el código del cliente en su app. Esta pantalla no puede
                    marcar “Entregada” por su cuenta.
                  </p>
                  <button type="button" className={btnSecondarySm} onClick={() => openDetail(selected.id)}>
                    Abrir detalle
                  </button>
                </div>
              )}

              {selected.status === 'DELIVERED' && (
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  Entrega confirmada en el servidor. El cierre de la solicitud se hace desde su
                  detalle si no hay saldo pendiente.
                </p>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              {state === 'loading'
                ? 'Cargando…'
                : 'Selecciona una entrega en la tabla para gestionarla.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
