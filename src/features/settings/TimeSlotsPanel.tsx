import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Edit2, Info, Plus, Power } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../shared/ui/Modal';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { getFacilities } from '../../services/api/geoApi';
import { SlotTemplatesSection } from './SlotTemplatesSection';
import {
  addDays,
  contextLabel,
  createSlot,
  datesBetween,
  formatSlotDate,
  listSlots,
  SLOT_CONTEXTS,
  todayInAgenda,
  updateSlot,
  validateCapacity,
  validateSlotForm,
  type Slot,
  type SlotContext,
  type SlotForm,
} from '../../services/api/slotsApi';

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const invalidField = 'border-rose-400 bg-rose-50/40';
const primary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0A3660] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700';
const ghost =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50';

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación. Intenta de nuevo.';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1 block text-xs font-normal text-rose-700">
      {message}
    </span>
  );
}

function SlotStatus({ slot }: { slot: Slot }) {
  const [label, tone] = !slot.active
    ? ['Inactiva', 'border-slate-200 bg-slate-100 text-slate-600']
    : slot.reservedCount >= slot.capacity
      ? ['Completa', 'border-amber-200 bg-amber-50 text-amber-800']
      : ['Activa', 'border-emerald-200 bg-emerald-50 text-emerald-800'];
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

type Site = { id: string; name: string };
type Failure = { date: string; message: string };

export function TimeSlotsPanel() {
  const { showToast } = useApp();
  const today = todayInAgenda();
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesError, setSitesError] = useState('');
  const [filters, setFilters] = useState({
    facilityId: '',
    context: 'DRIVER_PICKUP' as SlotContext,
    from: today,
    to: addDays(today, 13),
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<SlotForm | null>(null);
  const [formErrors, setFormErrors] = useState<ReturnType<typeof validateSlotForm>>({});
  const [failures, setFailures] = useState<Failure[]>([]);
  const [editing, setEditing] = useState<{ slot: Slot; capacity: string } | null>(null);
  const [capacityError, setCapacityError] = useState<string>();
  const pages = usePagination(slots, `${filters.facilityId}|${filters.context}|${filters.from}|${filters.to}`);

  const loadSites = useCallback(async () => {
    setSitesError('');
    try {
      const rows = (await getFacilities()).filter((f) => f.active !== false);
      setSites(rows.map((f) => ({ id: f.id, name: f.name })));
      setFilters((prev) =>
        rows.some((f) => f.id === prev.facilityId)
          ? prev
          : { ...prev, facilityId: rows[0]?.id ?? '' },
      );
      if (!rows.length) setLoading(false);
    } catch (e) {
      setSitesError(messageOf(e));
      setLoading(false);
    }
  }, []);

  const loadSlots = useCallback(async () => {
    if (!filters.facilityId) return;
    setLoading(true);
    setLoadError('');
    try {
      setSlots(
        await listSlots({
          facilityId: filters.facilityId,
          context: filters.context,
          from: filters.from || undefined,
          to: filters.to || undefined,
        }),
      );
    } catch (e) {
      setLoadError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);
  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const openCreate = () => {
    setFormErrors({});
    setFailures([]);
    setForm({
      facilityId: filters.facilityId,
      context: filters.context,
      date: filters.from && filters.from >= today ? filters.from : today,
      until: '',
      startTime: '',
      endTime: '',
      capacity: '',
    });
  };

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const errors = validateSlotForm(form, today);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    const failed: Failure[] = [];
    let created = 0;
    // Se crean de a una: si un día choca con otra franja, los demás igual se crean.
    for (const date of datesBetween(form.date, form.until || undefined)) {
      try {
        await createSlot({
          facilityId: form.facilityId,
          context: form.context,
          date,
          startTime: form.startTime,
          endTime: form.endTime,
          capacity: Number(form.capacity),
        });
        created++;
      } catch (err) {
        failed.push({ date, message: messageOf(err) });
      }
    }
    setBusy(false);
    if (created) {
      showToast({
        type: 'success',
        title: created === 1 ? 'Franja creada' : `${created} franjas creadas`,
      });
      // La tabla muestra la sede y el tramo donde se acaba de crear.
      if (form.facilityId !== filters.facilityId || form.context !== filters.context)
        setFilters({ ...filters, facilityId: form.facilityId, context: form.context });
      else void loadSlots();
    }
    if (failed.length) setFailures(failed);
    else setForm(null);
  };

  const submitCapacity = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const error = validateCapacity(editing.capacity, editing.slot.reservedCount);
    setCapacityError(error);
    if (error) return;
    setBusy(true);
    try {
      await updateSlot(editing.slot.id, { capacity: Number(editing.capacity) });
      showToast({ type: 'success', title: 'Cupos actualizados' });
      setEditing(null);
      await loadSlots();
    } catch (err) {
      showToast({ type: 'error', title: 'No se pudo guardar', message: messageOf(err) });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (slot: Slot) => {
    setBusy(true);
    try {
      await updateSlot(slot.id, { active: !slot.active });
      showToast({ type: 'success', title: slot.active ? 'Franja desactivada' : 'Franja activada' });
      await loadSlots();
    } catch (err) {
      showToast({ type: 'error', title: 'No se pudo guardar', message: messageOf(err) });
    } finally {
      setBusy(false);
    }
  };

  const totals = slots.reduce(
    (acc, s) => {
      if (!s.active) return acc;
      acc.capacity += s.capacity;
      acc.reserved += s.reservedCount;
      return acc;
    },
    { capacity: 0, reserved: 0 },
  );
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? '';
  const range = (s: Slot) => `${s.startTime} - ${s.endTime}`;
  const repeatCount = form ? datesBetween(form.date, form.until || undefined).length : 0;

  return (
    <section className="fintech-card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CalendarDays className="h-4 w-4 text-sky-800" aria-hidden />
            Franjas horarias y cupos
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Horarios que el cliente puede reservar en la app, por sede y tipo de tramo.
          </p>
        </div>
        <button
          type="button"
          className={primary}
          onClick={openCreate}
          disabled={!sites.length}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nueva franja
        </button>
      </header>

      <div className="space-y-4 p-5">
        <div className="flex gap-3 rounded-xl bg-sky-50 p-4 text-xs text-sky-900">
          <Info className="h-5 w-5 shrink-0" aria-hidden />
          <p>
            Cada solicitud ocupa un cupo de la franja elegida y lo libera si se cancela. Las
            franjas completas o inactivas no se ofrecen al cliente. Los cupos no pueden bajar de
            lo ya reservado.
          </p>
        </div>

        {sitesError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-semibold">No se pudieron cargar las sedes.</p>
            <p className="mt-1">{sitesError}</p>
            <button type="button" className={`${primary} mt-3`} onClick={() => void loadSites()}>
              Reintentar
            </button>
          </div>
        ) : !sites.length && !loading ? (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            No hay sedes activas. Crea una sede en Sedes para poder configurar sus franjas.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs font-semibold text-slate-700">
                Sede
                <select
                  className={field}
                  value={filters.facilityId}
                  onChange={(e) => setFilters({ ...filters, facilityId: e.target.value })}
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Tipo de tramo
                <select
                  className={field}
                  value={filters.context}
                  onChange={(e) =>
                    setFilters({ ...filters, context: e.target.value as SlotContext })
                  }
                >
                  {SLOT_CONTEXTS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Desde
                <input
                  type="date"
                  className={field}
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Hasta
                <input
                  type="date"
                  className={field}
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                />
              </label>
            </div>

            {filters.facilityId && (
              <SlotTemplatesSection
                facilityId={filters.facilityId}
                facilityName={siteName(filters.facilityId)}
                context={filters.context}
                onGenerated={() => void loadSlots()}
              />
            )}

            <h3 className="pt-2 text-sm font-bold text-slate-900">Agenda</h3>
            {!loading && !loadError && (
              <p className="text-xs text-slate-600" aria-live="polite">
                {slots.length} {slots.length === 1 ? 'franja' : 'franjas'} · {totals.capacity} cupos
                activos · {totals.reserved} reservados ·{' '}
                {Math.max(totals.capacity - totals.reserved, 0)} disponibles
              </p>
            )}

            {loading ? (
              <p role="status" className="py-8 text-center text-sm text-slate-500">
                Cargando franjas...
              </p>
            ) : loadError ? (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <p className="font-semibold">No se pudieron cargar las franjas.</p>
                <p className="mt-1">{loadError}</p>
                <button type="button" className={`${primary} mt-3`} onClick={() => void loadSlots()}>
                  Reintentar
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">Franjas horarias</caption>
                    <thead className="border-b border-slate-200/80 bg-slate-50/80 font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Horario</th>
                        <th className="px-4 py-3 text-right">Cupos</th>
                        <th className="px-4 py-3 text-right">Reservados</th>
                        <th className="px-4 py-3 text-right">Disponibles</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {slots.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                            No hay franjas de {contextLabel(filters.context).toLowerCase()} en{' '}
                            {siteName(filters.facilityId)} para estas fechas. El cliente verá
                            &quot;No hay horarios disponibles&quot;.
                          </td>
                        </tr>
                      )}
                      {pages.rows.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                            {formatSlotDate(s.date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">{range(s)}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{s.capacity}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{s.reservedCount}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                            {s.active ? Math.max(s.capacity - s.reservedCount, 0) : 0}
                          </td>
                          <td className="px-4 py-3">
                            <SlotStatus slot={s} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <button
                              type="button"
                              className={ghost}
                              aria-label={`Editar cupos ${s.date} ${range(s)}`}
                              onClick={() => {
                                setCapacityError(undefined);
                                setEditing({ slot: s, capacity: String(s.capacity) });
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" aria-hidden />
                              Cupos
                            </button>
                            <button
                              type="button"
                              className={ghost}
                              disabled={busy}
                              aria-label={`${s.active ? 'Desactivar' : 'Activar'} ${s.date} ${range(s)}`}
                              onClick={() => void toggle(s)}
                            >
                              <Power className="h-3.5 w-3.5" aria-hidden />
                              {s.active ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination pagination={pages} label="franjas" />
              </>
            )}
          </>
        )}
      </div>

      {form && (
        <Modal
          title="Nueva franja"
          description="Si eliges una fecha final, se crea la misma franja para cada día del rango."
          onClose={() => setForm(null)}
        >
          <form className="space-y-4 p-5 sm:p-6" onSubmit={submitCreate} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">
                  Sede
                  <select
                    aria-describedby="slot-site-error"
                    className={`${field} ${formErrors.facilityId ? invalidField : ''}`}
                    value={form.facilityId}
                    onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <FieldError id="slot-site-error" message={formErrors.facilityId} />
              </div>
              <label className="block text-sm font-medium">
                Tipo de tramo
                <select
                  className={field}
                  value={form.context}
                  onChange={(e) => setForm({ ...form, context: e.target.value as SlotContext })}
                >
                  {SLOT_CONTEXTS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <label className="block text-sm font-medium">
                  Fecha
                  <input
                    type="date"
                    min={today}
                    aria-invalid={!!formErrors.date}
                    aria-describedby="slot-date-error"
                    className={`${field} ${formErrors.date ? invalidField : ''}`}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <FieldError id="slot-date-error" message={formErrors.date} />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Repetir hasta (opcional)
                  <input
                    type="date"
                    min={form.date || today}
                    aria-invalid={!!formErrors.until}
                    aria-describedby="slot-until-error"
                    className={`${field} ${formErrors.until ? invalidField : ''}`}
                    value={form.until}
                    onChange={(e) => setForm({ ...form, until: e.target.value })}
                  />
                </label>
                <FieldError id="slot-until-error" message={formErrors.until} />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Hora de inicio
                  <input
                    type="time"
                    aria-invalid={!!formErrors.startTime}
                    aria-describedby="slot-start-error"
                    className={`${field} ${formErrors.startTime ? invalidField : ''}`}
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </label>
                <FieldError id="slot-start-error" message={formErrors.startTime} />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Hora de fin
                  <input
                    type="time"
                    aria-invalid={!!formErrors.endTime}
                    aria-describedby="slot-end-error"
                    className={`${field} ${formErrors.endTime ? invalidField : ''}`}
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </label>
                <FieldError id="slot-end-error" message={formErrors.endTime} />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Cupos por franja
                  <input
                    inputMode="numeric"
                    aria-invalid={!!formErrors.capacity}
                    aria-describedby="slot-capacity-error"
                    className={`${field} ${formErrors.capacity ? invalidField : ''}`}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="Ej: 10"
                  />
                </label>
                <FieldError id="slot-capacity-error" message={formErrors.capacity} />
              </div>
            </div>
            {failures.length > 0 && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-semibold">
                  {failures.length === 1
                    ? 'Una franja no se creó:'
                    : `${failures.length} franjas no se crearon:`}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {failures.map((f) => (
                    <li key={f.date}>
                      {formatSlotDate(f.date)}: {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className={ghost} onClick={() => setForm(null)}>
                {failures.length ? 'Cerrar' : 'Cancelar'}
              </button>
              <button type="submit" className={primary} disabled={busy}>
                {busy
                  ? 'Creando...'
                  : repeatCount > 1
                    ? `Crear ${repeatCount} franjas`
                    : 'Crear franja'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal
          title={`Cupos: ${formatSlotDate(editing.slot.date)} ${range(editing.slot)}`}
          description={`${contextLabel(editing.slot.context)} · ${siteName(editing.slot.facilityId)}. Ya hay ${editing.slot.reservedCount} cupos reservados.`}
          onClose={() => setEditing(null)}
        >
          <form className="space-y-4 p-5 sm:p-6" onSubmit={submitCapacity} noValidate>
            <div>
              <label className="block text-sm font-medium">
                Cupos de la franja
                <input
                  autoFocus
                  inputMode="numeric"
                  aria-invalid={!!capacityError}
                  aria-describedby="slot-edit-capacity-error"
                  className={`${field} ${capacityError ? invalidField : ''}`}
                  value={editing.capacity}
                  onChange={(e) => setEditing({ ...editing, capacity: e.target.value })}
                />
              </label>
              <FieldError id="slot-edit-capacity-error" message={capacityError} />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className={ghost} onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button type="submit" className={primary} disabled={busy}>
                {busy ? 'Guardando...' : 'Guardar cupos'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
