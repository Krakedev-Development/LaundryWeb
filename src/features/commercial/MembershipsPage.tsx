import { useEffect, useState, type FormEvent } from 'react';
import { CreditCard, Pencil, Plus, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../shared/ui/Modal';
import { MEMBERSHIP_INTERVALS, type MembershipPlan } from './membershipPlans';

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const button =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A3660] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700';
const newPlan = (): MembershipPlan => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  price: 0,
  interval: 'MONTHLY',
  includedWeight: 0,
  weightUnit: 'KG',
  includedPickups: 0,
  discountPercent: 0,
  priorityService: false,
  benefits: [],
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function MembershipsPage() {
  const { currentUser, settings, showToast } = useApp();
  const [plans, setPlans] = useState(() => storageService.getMembershipPlans());
  const [draft, setDraft] = useState<MembershipPlan | null>(null);
  const [benefits, setBenefits] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [error, setError] = useState('');
  useEffect(
    () =>
      storageService.subscribe(() =>
        setPlans(storageService.getMembershipPlans()),
      ),
    [],
  );
  if (currentUser.role !== 'ADMIN')
    return (
      <p
        role="alert"
        className="rounded-xl border border-slate-200 bg-white p-8 text-center"
      >
        La gestión de membresías está disponible para el Administrador.
      </p>
    );
  const visible = plans.filter(
    (plan) =>
      (status === 'ALL' || plan.status === status) &&
      `${plan.name} ${plan.description}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const money = (price: number) =>
    `${settings.currencySymbol}${price.toFixed(2)}`;
  const open = (plan: MembershipPlan) => {
    setDraft({ ...plan });
    setBenefits(plan.benefits.join('\n'));
    setError('');
  };
  const change = <K extends keyof MembershipPlan>(
    key: K,
    value: MembershipPlan[K],
  ) => setDraft((plan) => (plan ? { ...plan, [key]: value } : plan));
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    try {
      storageService.saveMembershipPlan({
        ...draft,
        name: draft.name.trim(),
        description: draft.description.trim(),
        benefits: benefits
          .split('\n')
          .map((text) => text.trim())
          .filter(Boolean),
      });
      setDraft(null);
      showToast({
        type: 'success',
        title: 'Membresía guardada',
        message: draft.name,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar. Intenta de nuevo.',
      );
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Membresías"
        subtitle="Define planes periódicos, cupos y beneficios para tus clientes."
        actions={
          <button className={button} onClick={() => open(newPlan())}>
            <Plus size={17} />
            Crear membresía
          </button>
        }
      />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-500"
            />
            <input
              aria-label="Buscar membresías"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm"
              placeholder="Buscar por nombre o descripción"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar estado de membresía"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Activas</option>
            <option value="INACTIVE">Inactivas</option>
          </select>
          <span className="text-sm text-slate-600">
            {visible.length} planes
          </span>
        </div>
        {visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Precio por período</th>
                  <th className="px-5 py-3">Incluye por período</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50">
                    <td className="max-w-xs px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {plan.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {plan.description || 'Sin descripción'}
                      </p>
                      {plan.priorityService && (
                        <p className="mt-1 text-xs text-sky-800">
                          Atención prioritaria
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-semibold tabular-nums">
                        {money(plan.price)}
                      </p>
                      <p className="text-xs text-slate-600">
                        {MEMBERSHIP_INTERVALS[plan.interval]}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p>
                        {plan.includedWeight} {plan.weightUnit} ·{' '}
                        {plan.includedPickups} recogidas
                      </p>
                      <p className="text-xs text-slate-600">
                        {plan.discountPercent}% de descuento adicional
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          plan.status === 'ACTIVE'
                            ? 'text-emerald-800'
                            : 'text-slate-600'
                        }
                      >
                        {plan.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        aria-label={`Editar ${plan.name}`}
                        onClick={() => open(plan)}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-[#0F4C81] hover:bg-sky-50"
                      >
                        <Pencil size={15} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <CreditCard size={30} className="mx-auto text-[#0F4C81]" />
            <h2 className="mt-4 text-lg font-semibold">
              {plans.length
                ? 'No hay planes con estos filtros'
                : 'Crea tu primera membresía'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              {plans.length
                ? 'Cambia la búsqueda o el estado para ver otros planes.'
                : 'Combina una cuota periódica con peso incluido, recogidas y beneficios.'}
            </p>
            {!plans.length && (
              <button
                className={`${button} mt-5`}
                onClick={() => open(newPlan())}
              >
                Crear membresía
              </button>
            )}
          </div>
        )}
      </section>
      <p className="text-xs leading-relaxed text-slate-600">
        Los planes Esencial y Familiar son ejemplos editables de esta demo. La
        contratación por clientes, el consumo de cupos y los cobros recurrentes
        se incorporarán a su flujo de suscripción.
      </p>
      {draft && (
        <Modal
          title={
            plans.some((plan) => plan.id === draft.id)
              ? 'Editar membresía'
              : 'Crear membresía'
          }
          description="Los cupos y el precio corresponden al período elegido."
          onClose={() => setDraft(null)}
        >
          <form className="space-y-5 p-5 sm:p-6" onSubmit={save}>
            <label className="block text-sm font-medium">
              Nombre del plan
              <input
                autoFocus
                required
                maxLength={100}
                className={field}
                value={draft.name}
                onChange={(event) => change('name', event.target.value)}
                placeholder="Ej.: Plan familiar"
              />
            </label>
            <label className="block text-sm font-medium">
              Descripción
              <textarea
                maxLength={500}
                rows={2}
                className={field}
                value={draft.description}
                onChange={(event) => change('description', event.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Precio ({settings.currency})
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  className={field}
                  value={Number.isFinite(draft.price) ? draft.price : ''}
                  onChange={(event) =>
                    change('price', event.target.valueAsNumber)
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Periodicidad
                <select
                  className={field}
                  aria-label="Periodicidad"
                  value={draft.interval}
                  onChange={(event) =>
                    change(
                      'interval',
                      event.target.value as MembershipPlan['interval'],
                    )
                  }
                >
                  {Object.entries(MEMBERSHIP_INTERVALS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <fieldset className="space-y-4 border-t border-slate-200 pt-4">
              <legend className="pr-2 text-sm font-semibold">
                Beneficios por período
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Peso incluido
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    className={field}
                    value={
                      Number.isFinite(draft.includedWeight)
                        ? draft.includedWeight
                        : ''
                    }
                    onChange={(event) =>
                      change('includedWeight', event.target.valueAsNumber)
                    }
                  />
                </label>
                <label className="text-sm font-medium">
                  Unidad
                  <select
                    className={field}
                    aria-label="Unidad"
                    value={draft.weightUnit}
                    onChange={(event) =>
                      change(
                        'weightUnit',
                        event.target.value as MembershipPlan['weightUnit'],
                      )
                    }
                  >
                    <option value="KG">Kilogramos (KG)</option>
                    <option value="LB">Libras (LB)</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Recogidas incluidas
                  <input
                    required
                    min="0"
                    step="1"
                    type="number"
                    className={field}
                    value={
                      Number.isFinite(draft.includedPickups)
                        ? draft.includedPickups
                        : ''
                    }
                    onChange={(event) =>
                      change('includedPickups', event.target.valueAsNumber)
                    }
                  />
                </label>
                <label className="text-sm font-medium">
                  Descuento adicional (%)
                  <input
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    type="number"
                    className={field}
                    value={
                      Number.isFinite(draft.discountPercent)
                        ? draft.discountPercent
                        : ''
                    }
                    onChange={(event) =>
                      change('discountPercent', event.target.valueAsNumber)
                    }
                  />
                </label>
              </div>
              <p className="text-xs text-slate-600">
                Un cupo de cero no incluye ese beneficio. Los cupos son totales
                por período.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.priorityService}
                  onChange={(event) =>
                    change('priorityService', event.target.checked)
                  }
                />
                Atención prioritaria
              </label>
              <label className="block text-sm font-medium">
                Otros beneficios (uno por línea)
                <textarea
                  className={field}
                  rows={3}
                  value={benefits}
                  onChange={(event) => setBenefits(event.target.value)}
                />
              </label>
            </fieldset>
            <label className="block text-sm font-medium">
              Estado
              <select
                className={field}
                aria-label="Estado"
                value={draft.status}
                onChange={(event) =>
                  change(
                    'status',
                    event.target.value as MembershipPlan['status'],
                  )
                }
              >
                <option value="ACTIVE">Activa</option>
                <option value="INACTIVE">Inactiva</option>
              </select>
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
              >
                {error}
              </p>
            )}
            <footer className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                onClick={() => setDraft(null)}
              >
                Cancelar
              </button>
              <button type="submit" className={button}>
                Guardar membresía
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </div>
  );
}
