import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Edit2, Plus, Power, Scale } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../shared/ui/Modal';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import {
  listWeightRestrictions,
  listWeightTiers,
  RESTRICTION_MAX,
  saveWeightRestriction,
  saveWeightTier,
  TIER_NAME_MAX,
  validateRestriction,
  validateTier,
  type WeightRestriction,
  type WeightTier,
} from '../../services/api/weightServiceApi';

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const invalidField = 'border-rose-400 bg-rose-50/40';
const primary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0A3660] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700';
const ghost =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50';

// Mismo formato que el resto de la web; el precio por libra admite hasta 4 decimales.
const money = (n: number) => `$${n.toFixed(4).replace(/(\.\d\d\d*?)0+$/, '$1')}`;
const nextOrder = (rows: { sortOrder: number }[]) =>
  String(rows.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1);
const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo guardar. Intenta de nuevo.';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1 block text-xs font-normal text-rose-700">
      {message}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}
    >
      {active ? 'Activa' : 'Inactiva'}
    </span>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

type TierForm = {
  id: string | null;
  name: string;
  estimatedWeightLb: string;
  pricePerPound: string;
  sortOrder: string;
};
type RestrictionForm = { id: string | null; text: string; sortOrder: string };

export function WeightServicePanel() {
  const { showToast } = useApp();
  const [tiers, setTiers] = useState<WeightTier[]>([]);
  const [rules, setRules] = useState<WeightRestriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tierForm, setTierForm] = useState<TierForm | null>(null);
  const [tierErrors, setTierErrors] = useState<ReturnType<typeof validateTier>>({});
  const [ruleForm, setRuleForm] = useState<RestrictionForm | null>(null);
  const [ruleErrors, setRuleErrors] = useState<ReturnType<typeof validateRestriction>>({});
  const tierPages = usePagination(tiers, 'tiers');
  const rulePages = usePagination(rules, 'rules');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [t, r] = await Promise.all([listWeightTiers(), listWeightRestrictions()]);
      setTiers(t);
      setRules(r);
    } catch (e) {
      setLoadError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (work: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await work();
      showToast({ type: 'success', title: success });
      await load();
      return true;
    } catch (e) {
      showToast({ type: 'error', title: 'No se pudo guardar', message: messageOf(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitTier = async (e: FormEvent) => {
    e.preventDefault();
    if (!tierForm) return;
    const errors = validateTier(tierForm);
    setTierErrors(errors);
    if (Object.keys(errors).length) return;
    const ok = await run(
      async () => {
        await saveWeightTier(tierForm.id, {
          name: tierForm.name.trim(),
          estimatedWeightLb: Number(tierForm.estimatedWeightLb),
          pricePerPound: Number(tierForm.pricePerPound),
          sortOrder: Number(tierForm.sortOrder),
        });
      },
      tierForm.id ? 'Bolsa actualizada' : 'Bolsa creada',
    );
    if (ok) setTierForm(null);
  };

  const submitRule = async (e: FormEvent) => {
    e.preventDefault();
    if (!ruleForm) return;
    const errors = validateRestriction(ruleForm);
    setRuleErrors(errors);
    if (Object.keys(errors).length) return;
    const ok = await run(
      async () => {
        await saveWeightRestriction(ruleForm.id, {
          text: ruleForm.text.trim(),
          sortOrder: Number(ruleForm.sortOrder),
        });
      },
      ruleForm.id ? 'Restricción actualizada' : 'Restricción agregada',
    );
    if (ok) setRuleForm(null);
  };

  const openTier = (t?: WeightTier) => {
    setTierErrors({});
    setTierForm(
      t
        ? {
            id: t.id,
            name: t.name,
            estimatedWeightLb: String(t.estimatedWeightLb),
            pricePerPound: String(t.pricePerPound),
            sortOrder: String(t.sortOrder),
          }
        : { id: null, name: '', estimatedWeightLb: '', pricePerPound: '', sortOrder: nextOrder(tiers) },
    );
  };

  const openRule = (r?: WeightRestriction) => {
    setRuleErrors({});
    setRuleForm(
      r
        ? { id: r.id, text: r.text, sortOrder: String(r.sortOrder) }
        : { id: null, text: '', sortOrder: nextOrder(rules) },
    );
  };

  if (loading)
    return (
      <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Cargando servicio por peso...
      </p>
    );
  if (loadError)
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <p className="font-semibold">No se pudo cargar el servicio por peso.</p>
        <p className="mt-1">{loadError}</p>
        <button type="button" className={`${primary} mt-4`} onClick={() => void load()}>
          Reintentar
        </button>
      </div>
    );

  const activeTiers = tiers.filter((t) => t.active).length;

  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-xl bg-sky-50 p-4 text-xs text-sky-900">
        <Scale className="h-5 w-5 shrink-0" aria-hidden />
        <p>
          El cliente elige cuántas bolsas entregará. Cada bolsa tiene su propio precio por libra,
          que queda fijado en la solicitud al crearla. El monto final se calcula en planta con el
          peso real y ese mismo precio.
        </p>
      </div>
      {activeTiers === 0 && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          No hay bolsas activas: los clientes no podrán solicitar el servicio por peso hasta que
          actives o crees al menos una.
        </p>
      )}

      <Section
        title="Bolsas y precio por libra"
        description="Opciones que el cliente ve al elegir el servicio por peso, en el orden indicado."
        action={
          <button type="button" className={primary} onClick={() => openTier()}>
            <Plus className="h-4 w-4" aria-hidden />
            Nueva bolsa
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Bolsas del servicio por peso</caption>
            <thead className="border-b border-slate-200/80 bg-slate-50/80 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Orden</th>
                <th className="px-4 py-3.5">Bolsa</th>
                <th className="px-4 py-3.5 text-right">Libras estimadas</th>
                <th className="px-4 py-3.5 text-right">Precio por libra</th>
                <th className="px-4 py-3.5 text-right">Monto estimado</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tiers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Todavía no hay bolsas configuradas.
                  </td>
                </tr>
              )}
              {tierPages.rows.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-mono text-slate-500">{t.sortOrder}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{t.name}</td>
                  <td className="px-4 py-3.5 text-right font-mono tabular-nums">~{t.estimatedWeightLb} lb</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold tabular-nums">
                    {money(t.pricePerPound)} / lb
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-600">
                    {money(Math.round(t.estimatedWeightLb * t.pricePerPound * 100) / 100)}
                  </td>
                  <td className="px-4 py-3.5"><StatusBadge active={t.active} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button type="button" className={ghost} onClick={() => openTier(t)} aria-label={`Editar ${t.name}`}>
                      <Edit2 className="h-3.5 w-3.5" aria-hidden />
                      Editar
                    </button>
                    <button
                      type="button"
                      className={ghost}
                      disabled={busy}
                      aria-label={`${t.active ? 'Desactivar' : 'Activar'} ${t.name}`}
                      onClick={() =>
                        void run(
                          async () => {
                            await saveWeightTier(t.id, { active: !t.active });
                          },
                          t.active ? 'Bolsa desactivada' : 'Bolsa activada',
                        )
                      }
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
        <TablePagination pagination={tierPages} label="bolsas" />
      </Section>

      <Section
        title="Restricciones del servicio por peso"
        description="Se muestran al cliente antes de elegir la bolsa. Desactiva las que ya no apliquen."
        action={
          <button type="button" className={primary} onClick={() => openRule()}>
            <Plus className="h-4 w-4" aria-hidden />
            Nueva restricción
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Restricciones del servicio por peso</caption>
            <thead className="border-b border-slate-200/80 bg-slate-50/80 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Orden</th>
                <th className="px-4 py-3.5">Restricción</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Todavía no hay restricciones configuradas.
                  </td>
                </tr>
              )}
              {rulePages.rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-mono text-slate-500">{r.sortOrder}</td>
                  <td className="px-4 py-3.5 text-slate-800">
                    <span className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                      {r.text}
                    </span>
                  </td>
                  <td className="px-4 py-3.5"><StatusBadge active={r.active} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button type="button" className={ghost} onClick={() => openRule(r)} aria-label={`Editar restricción ${r.sortOrder}`}>
                      <Edit2 className="h-3.5 w-3.5" aria-hidden />
                      Editar
                    </button>
                    <button
                      type="button"
                      className={ghost}
                      disabled={busy}
                      aria-label={`${r.active ? 'Desactivar' : 'Activar'} restricción ${r.sortOrder}`}
                      onClick={() =>
                        void run(
                          async () => {
                            await saveWeightRestriction(r.id, { active: !r.active });
                          },
                          r.active ? 'Restricción desactivada' : 'Restricción activada',
                        )
                      }
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden />
                      {r.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination pagination={rulePages} label="restricciones" />
      </Section>

      {tierForm && (
        <Modal
          title={tierForm.id ? `Editar bolsa: ${tierForm.name}` : 'Nueva bolsa'}
          description="El precio por libra se aplica a las solicitudes nuevas; las ya creadas conservan el suyo."
          onClose={() => setTierForm(null)}
        >
          <form className="space-y-4 p-5 sm:p-6" onSubmit={submitTier} noValidate>
            <label className="block text-sm font-medium">
              Nombre que verá el cliente
              <input
                autoFocus
                maxLength={TIER_NAME_MAX}
                aria-invalid={!!tierErrors.name}
                aria-describedby="tier-name-error"
                className={`${field} ${tierErrors.name ? invalidField : ''}`}
                value={tierForm.name}
                onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                placeholder="Ej: 2 bolsas"
              />
              <FieldError id="tier-name-error" message={tierErrors.name} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Libras estimadas
                <input
                  inputMode="decimal"
                  aria-invalid={!!tierErrors.estimatedWeightLb}
                  aria-describedby="tier-lb-error"
                  className={`${field} ${tierErrors.estimatedWeightLb ? invalidField : ''}`}
                  value={tierForm.estimatedWeightLb}
                  onChange={(e) => setTierForm({ ...tierForm, estimatedWeightLb: e.target.value })}
                  placeholder="Ej: 20"
                />
                <FieldError id="tier-lb-error" message={tierErrors.estimatedWeightLb} />
              </label>
              <label className="block text-sm font-medium">
                Precio por libra ($)
                <input
                  inputMode="decimal"
                  aria-invalid={!!tierErrors.pricePerPound}
                  aria-describedby="tier-price-error"
                  className={`${field} ${tierErrors.pricePerPound ? invalidField : ''}`}
                  value={tierForm.pricePerPound}
                  onChange={(e) => setTierForm({ ...tierForm, pricePerPound: e.target.value })}
                  placeholder="Ej: 2.20"
                />
                <FieldError id="tier-price-error" message={tierErrors.pricePerPound} />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Orden en la app
              <input
                inputMode="numeric"
                aria-invalid={!!tierErrors.sortOrder}
                aria-describedby="tier-order-error"
                className={`${field} ${tierErrors.sortOrder ? invalidField : ''}`}
                value={tierForm.sortOrder}
                onChange={(e) => setTierForm({ ...tierForm, sortOrder: e.target.value })}
              />
              <FieldError id="tier-order-error" message={tierErrors.sortOrder} />
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className={ghost} onClick={() => setTierForm(null)}>
                Cancelar
              </button>
              <button type="submit" className={primary} disabled={busy}>
                {busy ? 'Guardando...' : tierForm.id ? 'Guardar cambios' : 'Crear bolsa'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {ruleForm && (
        <Modal
          title={ruleForm.id ? 'Editar restricción' : 'Nueva restricción'}
          description="Describe qué prendas o casos no acepta el servicio por peso."
          onClose={() => setRuleForm(null)}
        >
          <form className="space-y-4 p-5 sm:p-6" onSubmit={submitRule} noValidate>
            <label className="block text-sm font-medium">
              Restricción
              <textarea
                autoFocus
                rows={3}
                maxLength={RESTRICTION_MAX}
                aria-invalid={!!ruleErrors.text}
                aria-describedby="rule-text-error"
                className={`${field} ${ruleErrors.text ? invalidField : ''}`}
                value={ruleForm.text}
                onChange={(e) => setRuleForm({ ...ruleForm, text: e.target.value })}
                placeholder="Ej: NO aplica para edredones gruesos o plumones."
              />
              <FieldError id="rule-text-error" message={ruleErrors.text} />
            </label>
            <label className="block text-sm font-medium">
              Orden en la app
              <input
                inputMode="numeric"
                aria-invalid={!!ruleErrors.sortOrder}
                aria-describedby="rule-order-error"
                className={`${field} ${ruleErrors.sortOrder ? invalidField : ''}`}
                value={ruleForm.sortOrder}
                onChange={(e) => setRuleForm({ ...ruleForm, sortOrder: e.target.value })}
              />
              <FieldError id="rule-order-error" message={ruleErrors.sortOrder} />
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className={ghost} onClick={() => setRuleForm(null)}>
                Cancelar
              </button>
              <button type="submit" className={primary} disabled={busy}>
                {busy ? 'Guardando...' : ruleForm.id ? 'Guardar cambios' : 'Agregar restricción'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
