import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CalendarClock, Edit2, Plus, Power, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../shared/ui/Modal';
import {
  contextLabel,
  createSlotTemplate,
  describeGeneration,
  generateSlots,
  listSlotTemplates,
  TEMPLATE_HORIZON_DAYS,
  updateSlotTemplate,
  validateCapacity,
  validateTemplateForm,
  WEEKDAYS,
  weekdayLabel,
  type SlotContext,
  type SlotTemplate,
  type TemplateForm,
} from '../../services/api/slotsApi';

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const invalidField = 'border-rose-400 bg-rose-50/40';
const primary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0A3660] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700';
const secondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const ghost =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50';

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación. Intenta de nuevo.';
const order = (d: number) => (d === 0 ? 7 : d); // la semana empieza el lunes

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1 block text-xs font-normal text-rose-700">
      {message}
    </span>
  );
}

type Failure = { weekday: number; message: string };

export function SlotTemplatesSection({
  facilityId,
  facilityName,
  context,
  onGenerated,
}: {
  facilityId: string;
  facilityName: string;
  context: SlotContext;
  /** Se llama cuando el servidor creó franjas, para refrescar la agenda. */
  onGenerated(): void;
}) {
  const { showToast } = useApp();
  const [rows, setRows] = useState<SlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<TemplateForm | null>(null);
  const [formErrors, setFormErrors] = useState<ReturnType<typeof validateTemplateForm>>({});
  const [failures, setFailures] = useState<Failure[]>([]);
  const [editing, setEditing] = useState<{ row: SlotTemplate; capacity: string } | null>(null);
  const [capacityError, setCapacityError] = useState<string>();

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setLoadError('');
    try {
      const list = await listSlotTemplates(facilityId, context);
      setRows(
        [...list].sort(
          (a, b) => order(a.weekday) - order(b.weekday) || a.startTime.localeCompare(b.startTime),
        ),
      );
    } catch (e) {
      setLoadError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [facilityId, context]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const errors = validateTemplateForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    const failed: Failure[] = [];
    let saved = 0;
    let created = 0;
    for (const weekday of [...form.weekdays].sort((a, b) => order(a) - order(b))) {
      try {
        const res = await createSlotTemplate({
          facilityId,
          context,
          weekday,
          startTime: form.startTime,
          endTime: form.endTime,
          capacity: Number(form.capacity),
        });
        saved++;
        created += res.generated?.created ?? 0;
      } catch (err) {
        failed.push({ weekday, message: messageOf(err) });
      }
    }
    setBusy(false);
    if (saved) {
      showToast({
        type: 'success',
        title: saved === 1 ? 'Franja semanal guardada' : `${saved} franjas semanales guardadas`,
        message: `${created === 1 ? '1 franja creada' : `${created} franjas creadas`} en la agenda.`,
      });
      await load();
      if (created) onGenerated();
    }
    if (failed.length) setFailures(failed);
    else setForm(null);
  };

  const submitCapacity = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const error = validateCapacity(editing.capacity, 0);
    setCapacityError(error);
    if (error) return;
    setBusy(true);
    try {
      await updateSlotTemplate(editing.row.id, { capacity: Number(editing.capacity) });
      showToast({
        type: 'success',
        title: 'Cupos de la plantilla actualizados',
        message: 'Aplican a las franjas que se creen desde ahora; las ya creadas no cambian.',
      });
      setEditing(null);
      await load();
    } catch (err) {
      showToast({ type: 'error', title: 'No se pudo guardar', message: messageOf(err) });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: SlotTemplate) => {
    setBusy(true);
    try {
      const res = await updateSlotTemplate(row.id, { active: !row.active });
      showToast({
        type: 'success',
        title: row.active ? 'Franja semanal desactivada' : 'Franja semanal activada',
        message: row.active
          ? 'Ya no se crearán nuevas franjas con este horario. Las existentes se mantienen.'
          : res.generated
            ? describeGeneration(res.generated)
            : undefined,
      });
      await load();
      if (res.generated?.created) onGenerated();
    } catch (err) {
      showToast({ type: 'error', title: 'No se pudo guardar', message: messageOf(err) });
    } finally {
      setBusy(false);
    }
  };

  const generateNow = async () => {
    setBusy(true);
    try {
      const r = await generateSlots(facilityId);
      showToast({
        type: r.skippedReason ? 'error' : 'success',
        title: r.skippedReason ? 'No se generó la agenda' : 'Agenda al día',
        message: describeGeneration(r),
      });
      if (r.created) onGenerated();
    } catch (err) {
      showToast({ type: 'error', title: 'No se pudo generar la agenda', message: messageOf(err) });
    } finally {
      setBusy(false);
    }
  };

  const range = (t: SlotTemplate) => `${t.startTime} - ${t.endTime}`;
  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CalendarClock className="h-4 w-4 text-sky-800" aria-hidden />
            Plantilla semanal
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Horarios que se repiten cada semana para {contextLabel(context).toLowerCase()} en{' '}
            {facilityName}. El servidor mantiene creadas automáticamente las franjas de los
            próximos {TEMPLATE_HORIZON_DAYS} días y revisa la agenda cada hora. Cambiar o
            desactivar la plantilla no modifica las franjas ya creadas ni sus reservas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={secondary}
            disabled={busy || activeCount === 0}
            onClick={() => void generateNow()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Generar ahora
          </button>
          <button
            type="button"
            className={primary}
            onClick={() => {
              setFormErrors({});
              setFailures([]);
              setForm({ weekdays: [], startTime: '', endTime: '', capacity: '' });
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nueva franja semanal
          </button>
        </div>
      </div>

      {loading ? (
        <p role="status" className="py-4 text-center text-sm text-slate-500">
          Cargando plantilla...
        </p>
      ) : loadError ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">No se pudo cargar la plantilla semanal.</p>
          <p className="mt-1">{loadError}</p>
          <button type="button" className={`${primary} mt-3`} onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Plantilla semanal</caption>
            <thead className="border-b border-slate-200/80 bg-slate-50/80 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Día</th>
                <th className="px-4 py-3">Horario</th>
                <th className="px-4 py-3 text-right">Cupos</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Sin plantilla: las franjas de este tramo se crean solo a mano.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-900">{weekdayLabel(t.weekday)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">{range(t)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{t.capacity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${
                        t.active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      className={ghost}
                      aria-label={`Editar cupos semanales ${weekdayLabel(t.weekday)} ${range(t)}`}
                      onClick={() => {
                        setCapacityError(undefined);
                        setEditing({ row: t, capacity: String(t.capacity) });
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" aria-hidden />
                      Cupos
                    </button>
                    <button
                      type="button"
                      className={ghost}
                      disabled={busy}
                      aria-label={`${t.active ? 'Desactivar' : 'Activar'} semanal ${weekdayLabel(t.weekday)} ${range(t)}`}
                      onClick={() => void toggle(t)}
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden />
                      {t.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal
          title="Nueva franja semanal"
          description={`${contextLabel(context)} · ${facilityName}. Se crea una franja semanal por cada día elegido.`}
          onClose={() => setForm(null)}
        >
          <form className="space-y-4 p-5 sm:p-6" onSubmit={submitCreate} noValidate>
            <fieldset aria-describedby="template-days-error">
              <legend className="text-sm font-medium">Días de la semana</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => {
                  const on = form.weekdays.includes(d.value);
                  return (
                    <label
                      key={d.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        on ? 'border-sky-700 bg-sky-50 font-semibold text-sky-900' : 'border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setForm({
                            ...form,
                            weekdays: on
                              ? form.weekdays.filter((x) => x !== d.value)
                              : [...form.weekdays, d.value],
                          })
                        }
                      />
                      {d.label}
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                className={`${ghost} mt-2`}
                onClick={() => setForm({ ...form, weekdays: [1, 2, 3, 4, 5] })}
              >
                Lunes a viernes
              </button>
              <FieldError id="template-days-error" message={formErrors.weekdays} />
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium">
                  Hora de inicio
                  <input
                    type="time"
                    aria-invalid={!!formErrors.startTime}
                    aria-describedby="template-start-error"
                    className={`${field} ${formErrors.startTime ? invalidField : ''}`}
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </label>
                <FieldError id="template-start-error" message={formErrors.startTime} />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Hora de fin
                  <input
                    type="time"
                    aria-invalid={!!formErrors.endTime}
                    aria-describedby="template-end-error"
                    className={`${field} ${formErrors.endTime ? invalidField : ''}`}
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </label>
                <FieldError id="template-end-error" message={formErrors.endTime} />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Cupos por franja
                  <input
                    inputMode="numeric"
                    aria-invalid={!!formErrors.capacity}
                    aria-describedby="template-capacity-error"
                    className={`${field} ${formErrors.capacity ? invalidField : ''}`}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="Ej: 10"
                  />
                </label>
                <FieldError id="template-capacity-error" message={formErrors.capacity} />
              </div>
            </div>
            {failures.length > 0 && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-semibold">
                  {failures.length === 1 ? 'Un día no se guardó:' : `${failures.length} días no se guardaron:`}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {failures.map((f) => (
                    <li key={f.weekday}>
                      {weekdayLabel(f.weekday)}: {f.message}
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
                {busy ? 'Guardando...' : 'Guardar franja semanal'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal
          title={`Cupos semanales: ${weekdayLabel(editing.row.weekday)} ${range(editing.row)}`}
          description="Aplica a las franjas que se creen desde ahora. Las ya creadas se editan una por una en la agenda."
          onClose={() => setEditing(null)}
        >
          <form className="space-y-4 p-5 sm:p-6" onSubmit={submitCapacity} noValidate>
            <div>
              <label className="block text-sm font-medium">
                Cupos por franja
                <input
                  autoFocus
                  inputMode="numeric"
                  aria-invalid={!!capacityError}
                  aria-describedby="template-edit-capacity-error"
                  className={`${field} ${capacityError ? invalidField : ''}`}
                  value={editing.capacity}
                  onChange={(e) => setEditing({ ...editing, capacity: e.target.value })}
                />
              </label>
              <FieldError id="template-edit-capacity-error" message={capacityError} />
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
    </div>
  );
}
