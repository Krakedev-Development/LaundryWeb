import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { MetricCard } from '../../components/common/MetricCard';
import { STATUS_LABELS_HUMAN } from '../orders/components/ActivityTab';
import {
  fetchIncidentOrderRef,
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
  incidentTypeLabel,
  isIncidentActive,
  nextIncidentStatuses,
  resolvesFromOrderDetail,
  setIncidentStatus,
  upsertIncident,
  useServerIncidents,
  type IncidentOrderRef,
  type ServerIncident,
  type ServerIncidentSeverity,
  type ServerIncidentStatus,
} from '../../services/api/incidentsApi';

type Tab = 'ALL' | ServerIncidentStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'OPEN', label: 'Abiertas' },
  { id: 'IN_REVIEW', label: 'En revisión' },
  { id: 'RESOLVED', label: 'Resueltas' },
  { id: 'CLOSED', label: 'Cerradas' },
];

const SEVERITY_STYLE: Record<ServerIncidentSeverity, string> = {
  CRITICAL: 'bg-rose-50 text-rose-800 border-rose-200',
  HIGH: 'bg-amber-50 text-amber-800 border-amber-200',
  MEDIUM: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  LOW: 'bg-sky-50 text-sky-800 border-sky-200',
};

const STATUS_STYLE: Record<ServerIncidentStatus, string> = {
  OPEN: 'bg-rose-50 text-rose-700 border-rose-200',
  IN_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
};

const displayDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-EC', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const statusLabel = (status?: string | null) =>
  status ? (STATUS_LABELS_HUMAN[status] ?? status) : '';

function SeverityBadge({ severity }: { severity: ServerIncidentSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.MEDIUM}`}
    >
      {INCIDENT_SEVERITY_LABEL[severity] ?? severity}
    </span>
  );
}

function StatusBadge({ status }: { status: ServerIncidentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] ?? STATUS_STYLE.OPEN}`}
    >
      {INCIDENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Número de solicitud y cliente: primero de las solicitudes ya cargadas, luego del servidor. */
function useOrderRefs(incidents: ServerIncident[]) {
  const { orders } = useApp();
  const [fetched, setFetched] = useState<Record<string, IncidentOrderRef>>({});

  const known = useMemo(() => {
    const map: Record<string, IncidentOrderRef> = {};
    for (const o of orders)
      map[o.id] = { trackingNumber: o.trackingNumber || o.id, customerName: o.customerName };
    return map;
  }, [orders]);

  const missing = useMemo(
    () =>
      [...new Set(incidents.map((i) => i.orderId))].filter(
        (id) => !known[id] && !fetched[id],
      ),
    [incidents, known, fetched],
  );

  useEffect(() => {
    let alive = true;
    for (const id of missing)
      void fetchIncidentOrderRef(id).then((ref) => {
        if (alive && ref) setFetched((prev) => ({ ...prev, [id]: ref }));
      });
    return () => {
      alive = false;
    };
  }, [missing]);

  return useCallback(
    (orderId: string): IncidentOrderRef =>
      known[orderId] ??
      fetched[orderId] ?? { trackingNumber: `Solicitud ${orderId.slice(0, 8)}`, customerName: '—' },
    [known, fetched],
  );
}

export const IncidentsPage: React.FC = () => {
  const { showToast } = useApp();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const { incidents, state, error, refresh } = useServerIncidents();
  const refOf = useOrderRefs(incidents);

  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);
  const [resolution, setResolution] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [busy, setBusy] = useState(false);

  // Al abrir la pantalla siempre se consulta el servidor (la caché compartida puede ser vieja).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (routeId) setSelectedId(routeId);
  }, [routeId]);

  const selected = incidents.find((i) => i.id === selectedId);
  const count = (status: ServerIncidentStatus) => incidents.filter((i) => i.status === status).length;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return incidents.filter((inc) => {
      if (activeTab !== 'ALL' && inc.status !== activeTab) return false;
      if (!q) return true;
      const ref = refOf(inc.orderId);
      return [ref.trackingNumber, ref.customerName, inc.description, incidentTypeLabel(inc.type)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [incidents, activeTab, searchQuery, refOf]);
  const pagination = usePagination(filtered, `${activeTab}|${searchQuery.trim()}`);

  const close = () => {
    setSelectedId(null);
    setIsResolving(false);
    setResolution('');
    if (routeId) navigate('/operations/incidents', { replace: true });
  };

  const apply = async (target: 'IN_REVIEW' | 'RESOLVED' | 'CLOSED') => {
    if (!selected) return;
    if (target === 'RESOLVED' && !resolution.trim()) return;
    setBusy(true);
    try {
      const updated = await setIncidentStatus(
        selected.id,
        target,
        target === 'RESOLVED' ? resolution.trim() : undefined,
      );
      upsertIncident(updated);
      setIsResolving(false);
      setResolution('');
      showToast({
        type: 'success',
        title:
          target === 'IN_REVIEW'
            ? 'Incidencia en revisión'
            : target === 'RESOLVED'
              ? 'Incidencia resuelta'
              : 'Incidencia cerrada',
        message:
          target === 'RESOLVED' && selected.previousStatus
            ? `La solicitud ${refOf(selected.orderId).trackingNumber} vuelve a: ${statusLabel(selected.previousStatus)}.`
            : `Caso de ${refOf(selected.orderId).trackingNumber} actualizado.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'No se pudo actualizar la incidencia',
        message: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
      void refresh();
    } finally {
      setBusy(false);
    }
  };

  const loading = state === 'loading' || state === 'idle';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Incidencias operacionales"
        subtitle="Casos reportados por choferes y personal de sede. Resolver una incidencia que retuvo la solicitud la devuelve a la etapa en que estaba."
      />

      <div className="flex items-center gap-3 rounded-2xl border border-rose-200/90 bg-rose-50/70 p-4 sm:p-5">
        <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
        <p className="text-xs font-bold text-rose-950">
          Una solicitud retenida no avanza hasta que se resuelve su incidencia.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Abiertas"
          value={count('OPEN')}
          subtitle="Sin revisar"
          variant={count('OPEN') > 0 ? 'urgent' : 'default'}
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
        />
        <MetricCard
          title="En revisión"
          value={count('IN_REVIEW')}
          subtitle="En análisis por la sede"
          variant={count('IN_REVIEW') > 0 ? 'warning' : 'default'}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <MetricCard
          title="Resueltas"
          value={count('RESOLVED')}
          subtitle="Con resolución registrada"
          variant="success"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title="Cerradas"
          value={count('CLOSED')}
          subtitle="Archivadas"
          variant="aqua"
          icon={<Lock className="h-5 w-5 text-sky-600" />}
        />
      </div>

      <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 lg:w-auto lg:pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold ${
                  activeTab === tab.id
                    ? 'border-sky-200 bg-sky-50 text-sky-800'
                    : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[11px] opacity-75">
                  ({tab.id === 'ALL' ? incidents.length : count(tab.id)})
                </span>
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-2 lg:w-auto">
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                aria-label="Buscar incidencia"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar solicitud, cliente o tipo..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {state === 'error' && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <span>No se pudieron cargar las incidencias del servidor. {error}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading && incidents.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Cargando incidencias...</p>
        ) : filtered.length === 0 && state !== 'error' ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {incidents.length === 0 ? 'No hay incidencias registradas.' : 'Ninguna incidencia coincide con el filtro.'}
          </p>
        ) : filtered.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/80 bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">Solicitud</th>
                    <th className="px-4 py-3.5">Cliente</th>
                    <th className="px-4 py-3.5">Tipo</th>
                    <th className="px-4 py-3.5">Severidad</th>
                    <th className="px-4 py-3.5">Retención</th>
                    <th className="px-4 py-3.5">Fecha</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.rows.map((inc) => {
                    const ref = refOf(inc.orderId);
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => setSelectedId(inc.id)}
                        className="cursor-pointer hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3.5 font-mono font-semibold text-sky-800">
                          {ref.trackingNumber}
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3.5 font-semibold text-slate-900">
                          {ref.customerName}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-800">
                          {incidentTypeLabel(inc.type)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <SeverityBadge severity={inc.severity} />
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {inc.previousStatus ? (isIncidentActive(inc) ? 'Retenida' : 'Liberada') : 'No'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[11px] text-slate-500">
                          {displayDate(inc.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <StatusBadge status={inc.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(inc.id);
                            }}
                            className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination pagination={pagination} label="incidencias" />
          </>
        ) : null}
      </div>

      {selected && (
        <Modal
          wide
          title={`Incidencia en ${refOf(selected.orderId).trackingNumber}`}
          description={`${incidentTypeLabel(selected.type)} · ${refOf(selected.orderId).customerName}`}
          onClose={close}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
            <SeverityBadge severity={selected.severity} />
            <StatusBadge status={selected.status} />
          </div>
          <div className="space-y-5 p-5 text-sm">
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Registrada</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{displayDate(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Origen</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {selected.driverId ? 'Reportada por el chofer' : 'Registrada por la sede'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Retención de la solicitud</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {!selected.previousStatus
                    ? 'La solicitud no se retuvo.'
                    : isIncidentActive(selected)
                      ? `Retenida. Al resolver vuelve a: ${statusLabel(selected.previousStatus)}.`
                      : `Liberada. Volvió a: ${statusLabel(selected.previousStatus)}.`}
                </dd>
              </div>
            </dl>

            <section>
              <h4 className="mb-1 font-semibold text-slate-900">Descripción</h4>
              <p className="rounded-xl border border-slate-200 bg-white p-3 leading-relaxed text-slate-700">
                {selected.description}
              </p>
            </section>

            {(selected.evidenceRefs?.length ?? 0) > 0 && (
              <p className="text-slate-600">
                Evidencias registradas: {selected.evidenceRefs!.length}
              </p>
            )}

            {selected.resolution && (
              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-900">
                <p className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Resolución {selected.resolvedAt ? `· ${displayDate(selected.resolvedAt)}` : ''}
                </p>
                <p className="mt-1">{selected.resolution}</p>
              </section>
            )}

            {isIncidentActive(selected) && resolvesFromOrderDetail(selected) && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
                Esta recogida fallida se resuelve desde el detalle de la solicitud: reprograma la
                recogida con una nueva franja o cancela la solicitud.
              </p>
            )}

            {isResolving && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void apply('RESOLVED');
                }}
                className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
              >
                <label className="block font-semibold text-emerald-900">
                  Resolución del caso
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    required
                    rows={3}
                    placeholder="Qué se hizo y qué se acordó con el cliente"
                    className="mt-2 w-full rounded-lg border border-emerald-300 bg-white p-2.5 text-sm font-normal"
                  />
                </label>
                {selected.previousStatus && (
                  <p className="text-xs text-emerald-900">
                    Al resolver, la solicitud vuelve a: {statusLabel(selected.previousStatus)}.
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResolving(false)}
                    className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !resolution.trim()}
                    className="rounded-lg bg-emerald-700 px-4 py-1.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Confirmar resolución
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/70 p-4">
            <button
              type="button"
              onClick={() => navigate(`/operations/orders/${selected.orderId}`)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:underline"
            >
              Abrir solicitud {refOf(selected.orderId).trackingNumber}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {!resolvesFromOrderDetail(selected) || !isIncidentActive(selected) ? (
              <div className="flex flex-wrap items-center gap-2">
                {nextIncidentStatuses(selected.status).includes('IN_REVIEW') && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void apply('IN_REVIEW')}
                    className="rounded-lg border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                  >
                    Pasar a revisión
                  </button>
                )}
                {nextIncidentStatuses(selected.status).includes('RESOLVED') && !isResolving && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setIsResolving(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolver incidencia
                  </button>
                )}
                {nextIncidentStatuses(selected.status).includes('CLOSED') && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void apply('CLOSED')}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cerrar caso
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </Modal>
      )}
    </div>
  );
};
