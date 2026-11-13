import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import {
  ACTIVITY_PAGE_SIZE,
  getActivity,
  type StaffActivity,
  type StaffMember,
} from '../../services/api/staffApi';
import { activityContext, activityLabel } from './activityLabels';

const RANGES = [
  { days: 7, label: 'Últimos 7 días' },
  { days: 30, label: 'Últimos 30 días' },
  { days: 90, label: 'Últimos 90 días' },
];
const DAY_MS = 24 * 60 * 60 * 1000;

const dateTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      )
    : 'Sin registro';

// Seguimiento simple de un supervisor: resumen del período y sus acciones, 10 por página.
export function StaffActivityModal({
  member,
  onClose,
}: {
  member: StaffMember;
  onClose(): void;
}) {
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StaffActivity | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  // El período queda fijo al elegirlo: recorrer páginas no lo desplaza aunque llegue
  // actividad nueva, así ningún registro se repite ni se salta entre páginas.
  const range = useMemo(() => {
    const to = new Date();
    return { from: new Date(to.getTime() - days * DAY_MS), to };
  }, [days]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getActivity(member.id, range, page)
      .then((result) => active && setData(result))
      .catch((cause: unknown) =>
        active &&
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar la actividad.'),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [member.id, range, page, attempt]);

  const cards = data
    ? [
        { label: 'Último ingreso', value: dateTime(data.summary.lastLoginAt), Icon: LogIn },
        { label: 'Ingresos en el período', value: String(data.summary.logins), Icon: CalendarClock },
        { label: 'Acciones en el período', value: String(data.summary.actions), Icon: Activity },
      ]
    : [];
  const first = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <Modal
      wide
      title={`Actividad de ${member.name}`}
      description={`${member.facility?.name ?? 'Sin sede'} · ${member.email}`}
      onClose={onClose}
    >
      <div className="space-y-5 p-5 sm:p-6">
        <label className="block text-sm font-medium text-slate-700">
          Período{' '}
          <select
            aria-label="Período de la actividad"
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setPage(1);
            }}
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {RANGES.map((r) => (
              <option key={r.days} value={r.days}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
            <p role="alert" className="text-rose-800">
              {error}
            </p>
            <button
              type="button"
              className="mt-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0F4C81] hover:bg-white"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : !data ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">
            Cargando actividad...
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {cards.map(({ label, value, Icon }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Icon size={15} className="text-[#0F4C81]" aria-hidden="true" />
                    {label}
                  </p>
                  <p className="mt-1.5 text-base font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            {data.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
                Sin actividad registrada en este período.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <ol
                  aria-label="Actividad registrada"
                  aria-busy={loading}
                  className={`divide-y divide-slate-100 transition-opacity ${loading ? 'opacity-60' : ''}`}
                >
                  {data.items.map((item) => {
                    const context = activityContext(item);
                    return (
                      <li
                        key={`${item.source}-${item.id}`}
                        className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{activityLabel(item)}</p>
                          {context && <p className="text-xs text-slate-600">{context}</p>}
                        </div>
                        <time dateTime={item.createdAt} className="shrink-0 text-xs text-slate-500">
                          {dateTime(item.createdAt)}
                        </time>
                      </li>
                    );
                  })}
                </ol>
                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
                  <p role="status" aria-live="polite">
                    {first}–{last} de {data.total} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Página anterior de la actividad"
                      disabled={loading || data.page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                      Página {data.page} de {data.totalPages}
                    </span>
                    <button
                      type="button"
                      aria-label="Página siguiente de la actividad"
                      disabled={loading || data.page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </footer>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
