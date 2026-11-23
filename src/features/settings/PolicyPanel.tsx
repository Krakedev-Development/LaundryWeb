import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { History, Info, Settings2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import {
  formFromPolicy,
  getActivePolicy,
  getPolicyHistory,
  inputFromForm,
  publishPolicy,
  REQUIRED_FOR_ORDERS,
  validatePolicyForm,
  type FlagField,
  type NumberField,
  type Policy,
  type PolicyForm,
} from '../../services/api/policyApi';

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const invalidField = 'border-rose-400 bg-rose-50/40';
const primary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0A3660] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700';

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación. Intenta de nuevo.';

type NumberSpec = { key: NumberField; label: string; hint?: string };
type Group = { title: string; numbers: NumberSpec[]; flags: { key: FlagField; label: string }[] };

// pricePerPound no se muestra: cada bolsa del servicio por peso tiene su propio precio.
const GROUPS: Group[] = [
  {
    title: 'Precios de la solicitud',
    numbers: [
      { key: 'taxRate', label: 'IVA (%)', hint: 'Ej: 15' },
      { key: 'pickupFee', label: 'Cargo de recogida ($)' },
      { key: 'deliveryFee', label: 'Cargo de entrega a domicilio ($)' },
      { key: 'minimumOrderAmount', label: 'Monto mínimo de la solicitud ($)', hint: 'Opcional' },
    ],
    flags: [{ key: 'taxIncluded', label: 'Los precios ya incluyen IVA' }],
  },
  {
    title: 'Cambios, cancelaciones y cargos',
    numbers: [
      { key: 'cutoffMinutes', label: 'Anticipación para cambios y cancelaciones (minutos)' },
      { key: 'lateCancellationFee', label: 'Cargo por cancelación tardía ($)' },
      { key: 'noShowFee', label: 'Cargo por ausencia del cliente ($)' },
      { key: 'failedPickupFee', label: 'Cargo por recogida fallida ($)' },
    ],
    flags: [
      { key: 'blockNewOrdersOnCharges', label: 'Bloquear nuevas solicitudes si hay cargos pendientes' },
      { key: 'requireStorePickupSlot', label: 'Exigir franja de retiro en sede al crear la solicitud' },
    ],
  },
  {
    title: 'Choferes y custodia',
    numbers: [
      { key: 'driverLimit', label: 'Límite de carga por chofer (solicitudes)' },
      { key: 'handoffMaxAttempts', label: 'Intentos máximos del código de entrega' },
      { key: 'handoffTtlMinutes', label: 'Vigencia del código de entrega (minutos)' },
    ],
    flags: [
      { key: 'enforceDriverLimit', label: 'Aplicar el límite de carga del chofer' },
      { key: 'driverMayReorder', label: 'Permitir al chofer reordenar sus paradas pendientes' },
    ],
  },
  {
    title: 'Clientes, billetera y puntos',
    numbers: [
      { key: 'walletTopUpMin', label: 'Recarga mínima de billetera ($)' },
      { key: 'walletTopUpMax', label: 'Recarga máxima de billetera ($)' },
      { key: 'pointsPerCurrencyUnit', label: 'Puntos por cada $1' },
      { key: 'kycMaxResubmissions', label: 'Reenvíos de verificación de identidad tras un rechazo' },
    ],
    flags: [],
  },
];

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

export function PolicyPanel() {
  const { showToast } = useApp();
  const [active, setActive] = useState<Policy | null>(null);
  const [history, setHistory] = useState<Policy[]>([]);
  const [form, setForm] = useState<PolicyForm>(formFromPolicy(null));
  const [errors, setErrors] = useState<ReturnType<typeof validatePolicyForm>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const pages = usePagination(history, 'policy-history');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [current, versions] = await Promise.all([getActivePolicy(), getPolicyHistory()]);
      setActive(current);
      setHistory(versions);
      setForm(formFromPolicy(current));
      setErrors({});
    } catch (e) {
      setLoadError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validatePolicyForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const published = await publishPolicy(inputFromForm(form));
      showToast({ type: 'success', title: `Política publicada: versión ${published.version}` });
      await load();
    } catch (err) {
      showToast({ type: 'error', title: 'No se pudo publicar la política', message: messageOf(err) });
    } finally {
      setBusy(false);
    }
  };

  const missing = REQUIRED_FOR_ORDERS.filter(({ key }) => active?.[key] === null || active?.[key] === undefined);

  return (
    <section className="lw-surface overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <header className="border-b border-slate-100 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Settings2 className="h-4 w-4 text-sky-800" aria-hidden />
          Política de negocio
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Reglas vigentes de la operación. Cada cambio publica una versión nueva; las solicitudes ya
          creadas conservan la versión con la que se crearon.
        </p>
      </header>

      <div className="space-y-5 p-5">
        {loading ? (
          <p role="status" className="py-6 text-center text-sm text-slate-500">
            Cargando política...
          </p>
        ) : loadError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-semibold">No se pudo cargar la política.</p>
            <p className="mt-1">{loadError}</p>
            <button type="button" className={`${primary} mt-3`} onClick={() => void load()}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {!active ? (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                Todavía no hay una política publicada. Sin ella no se pueden crear franjas ni
                solicitudes. Completa los datos y publícala.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3 rounded-xl bg-sky-50 p-4 text-xs text-sky-900">
                <Info className="h-5 w-5 shrink-0" aria-hidden />
                <p>
                  Vigente: <strong>versión {active.version}</strong>, publicada el{' '}
                  {dateTime(active.createdAt)}
                  {active.reason ? ` · ${active.reason}` : ''}.
                </p>
              </div>
            )}
            {active && missing.length > 0 && (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                Falta configurar: {missing.map((m) => m.label).join(', ')}. Sin estos valores el
                servidor no puede calcular el precio de una solicitud.
              </p>
            )}

            <form className="space-y-6" onSubmit={submit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">
                    Zona horaria
                    <input
                      aria-invalid={!!errors.timezone}
                      aria-describedby="policy-timezone-error"
                      className={`${field} font-mono ${errors.timezone ? invalidField : ''}`}
                      value={form.timezone}
                      onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    />
                  </label>
                  <FieldError id="policy-timezone-error" message={errors.timezone} />
                </div>
              </div>

              {GROUPS.map((group) => (
                <fieldset key={group.title} className="space-y-3 border-t border-slate-100 pt-4">
                  <legend className="pr-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {group.title}
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {group.numbers.map(({ key, label, hint }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium">
                          {label}
                          <input
                            inputMode="decimal"
                            placeholder={hint ?? 'Sin configurar'}
                            aria-invalid={!!errors[key]}
                            aria-describedby={`policy-${key}-error`}
                            className={`${field} ${errors[key] ? invalidField : ''}`}
                            value={form[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          />
                        </label>
                        <FieldError id={`policy-${key}-error`} message={errors[key]} />
                      </div>
                    ))}
                  </div>
                  {group.flags.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.flags.map(({ key, label }) => (
                        <label key={key} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={form[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              ))}

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-sm font-medium">
                    Motivo del cambio
                    <input
                      maxLength={500}
                      aria-invalid={!!errors.reason}
                      aria-describedby="policy-reason-error"
                      className={`${field} ${errors.reason ? invalidField : ''}`}
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      placeholder="Ej: Ajuste del cargo de entrega"
                    />
                  </label>
                  <FieldError id="policy-reason-error" message={errors.reason} />
                </div>
                <p className="text-xs text-slate-500">
                  Los campos vacíos quedan sin configurar. Las reglas que los necesitan se rechazan
                  hasta que se completen.
                </p>
                <div className="flex justify-end">
                  <button type="submit" className={primary} disabled={busy}>
                    {busy ? 'Publicando...' : active ? 'Publicar nueva versión' : 'Publicar política'}
                  </button>
                </div>
              </div>
            </form>

            {history.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <History className="h-4 w-4" aria-hidden />
                  Historial de versiones
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="lw-table w-full text-left text-xs">
                    <caption className="sr-only">Historial de la política de negocio</caption>
                    <thead className="border-b border-slate-200/80 bg-slate-50/80 font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Versión</th>
                        <th className="px-4 py-3">Publicada</th>
                        <th className="px-4 py-3">Motivo</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pages.rows.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-mono font-bold">{p.version}</td>
                          <td className="whitespace-nowrap px-4 py-3">{dateTime(p.createdAt)}</td>
                          <td className="px-4 py-3 text-slate-700">{p.reason ?? '—'}</td>
                          <td className="px-4 py-3">
                            {p.active ? (
                              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                Vigente
                              </span>
                            ) : (
                              <span className="text-slate-500">Reemplazada</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination pagination={pages} label="versiones" />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1 block text-xs font-normal text-rose-700">
      {message}
    </span>
  );
}
