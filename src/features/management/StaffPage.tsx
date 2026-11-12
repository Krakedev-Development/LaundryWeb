import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { KeyRound, Plus, Search, UserCheck, UserX, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../shared/ui/Modal';
import { getFacilities, type FacilityResponse } from '../../services/api/geoApi';
import {
  createSupervisor,
  EMAIL_MAX,
  listStaff,
  NAME_MAX,
  PASSWORD_HINT,
  PASSWORD_MAX,
  passwordError,
  resetTemporaryPassword,
  setAccountStatus,
  validateSupervisor,
  type AccountStatus,
  type NewSupervisor,
  type StaffMember,
  type SupervisorErrors,
} from '../../services/api/staffApi';

const invalidField = 'border-rose-400 bg-rose-50/40';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1 block text-xs font-normal text-rose-700">
      {message}
    </span>
  );
}

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const button =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A3660] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700';
const danger =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700';
const ghost =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50';

const STATUS: Record<AccountStatus, { label: string; style: string }> = {
  ACTIVE: { label: 'Activa', style: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  PASSWORD_CHANGE_REQUIRED: {
    label: 'Debe cambiar contraseña',
    style: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  SUSPENDED: { label: 'Suspendida', style: 'border-rose-200 bg-rose-50 text-rose-800' },
};

const emptyDraft = (): NewSupervisor => ({
  name: '',
  email: '',
  phone: '',
  facilityId: '',
  temporaryPassword: '',
});

const formatDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      )
    : 'Nunca';

const message = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'No se pudo completar la acción.';

type Pending =
  | { kind: 'suspend'; member: StaffMember }
  | { kind: 'reset'; member: StaffMember }
  | null;

// Cuentas de supervisor: alta, suspensión, reactivación y contraseña temporal.
export function StaffPage() {
  const { currentUser, showToast } = useApp();
  const isAdmin = currentUser.role === 'ADMIN';
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [facilities, setFacilities] = useState<FacilityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AccountStatus>('ALL');
  const [draft, setDraft] = useState<NewSupervisor | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [text, setText] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  // Los errores por campo aparecen tras el primer intento y se actualizan al escribir.
  const [submitted, setSubmitted] = useState(false);
  const fieldErrors: SupervisorErrors =
    draft && submitted ? validateSupervisor(draft) : {};

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [members, sites] = await Promise.all([listStaff(), getFacilities()]);
      setStaff(members);
      setFacilities(sites.filter((f) => f.active !== false));
    } catch (cause) {
      setLoadError(message(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const supervisors = useMemo(() => staff.filter((m) => m.role === 'SUPERVISOR'), [staff]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return supervisors.filter(
      (m) =>
        (statusFilter === 'ALL' || m.status === statusFilter) &&
        (!q ||
          `${m.name} ${m.email} ${m.phone ?? ''} ${m.facility?.name ?? ''}`
            .toLowerCase()
            .includes(q)),
    );
  }, [supervisors, query, statusFilter]);

  if (!isAdmin)
    return (
      <p role="alert" className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        La gestión de personal está disponible para el Administrador.
      </p>
    );

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setFormError('');
    try {
      await action();
      showToast({ type: 'success', title: done });
      setDraft(null);
      setPending(null);
      setText('');
      await load();
    } catch (cause) {
      setFormError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  const submitNew = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSubmitted(true);
    setFormError('');
    if (Object.keys(validateSupervisor(draft)).length > 0) return;
    void run(
      () =>
        createSupervisor({
          ...draft,
          name: draft.name.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim(),
        }),
      'Supervisor creado',
    );
  };

  const submitPending = (event: FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    if (pending.kind === 'reset') {
      const invalid = passwordError(text);
      if (invalid) {
        setFormError(`Contraseña temporal inválida. ${invalid}`);
        return;
      }
      void run(() => resetTemporaryPassword(pending.member.id, text), 'Contraseña restablecida');
    } else {
      void run(
        () => setAccountStatus(pending.member.id, 'SUSPENDED', text),
        'Cuenta suspendida',
      );
    }
  };

  const openPending = (next: Pending) => {
    setPending(next);
    setText('');
    setFormError('');
  };

  const change = <K extends keyof NewSupervisor>(key: K, value: NewSupervisor[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal"
        subtitle="Cuentas de supervisores por sede: alta, suspensión y contraseñas temporales."
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search size={17} className="absolute left-3 top-3 text-slate-500" />
            <input
              aria-label="Buscar supervisores"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm"
              placeholder="Buscar por nombre, correo, teléfono o sede"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filtrar por estado de la cuenta"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activas</option>
              <option value="PASSWORD_CHANGE_REQUIRED">Deben cambiar contraseña</option>
              <option value="SUSPENDED">Suspendidas</option>
            </select>
            <button
              className={button}
              onClick={() => {
                setDraft(emptyDraft());
                setFormError('');
                setSubmitted(false);
              }}
            >
              <Plus size={17} />
              Crear supervisor
            </button>
          </div>
        </div>

        {loading ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500" role="status">
            Cargando personal...
          </p>
        ) : loadError ? (
          <div className="px-6 py-12 text-center text-sm">
            <p role="alert" className="mb-3 text-rose-700">
              {loadError}
            </p>
            <button className={ghost} onClick={() => void load()}>
              Reintentar
            </button>
          </div>
        ) : visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-5 py-3">Supervisor</th>
                  <th className="px-5 py-3">Sede</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Último ingreso</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-600">{m.email}</p>
                    </td>
                    <td className="px-5 py-4">{m.facility?.name ?? 'Sin sede'}</td>
                    <td className="px-5 py-4 tabular-nums">{m.phone ?? '-'}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${STATUS[m.status].style}`}
                      >
                        {STATUS[m.status].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(m.lastLoginAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {m.status === 'SUSPENDED' ? (
                          <button
                            className={`${ghost} text-emerald-700`}
                            disabled={busy}
                            aria-label={`Reactivar a ${m.name}`}
                            onClick={() =>
                              void run(() => setAccountStatus(m.id, 'ACTIVE'), 'Cuenta reactivada')
                            }
                          >
                            <UserCheck size={15} />
                            Reactivar
                          </button>
                        ) : (
                          <>
                            <button
                              className={`${ghost} text-[#0F4C81]`}
                              aria-label={`Restablecer contraseña de ${m.name}`}
                              onClick={() => openPending({ kind: 'reset', member: m })}
                            >
                              <KeyRound size={15} />
                              Contraseña
                            </button>
                            <button
                              className={`${ghost} text-rose-700`}
                              aria-label={`Suspender a ${m.name}`}
                              onClick={() => openPending({ kind: 'suspend', member: m })}
                            >
                              <UserX size={15} />
                              Suspender
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <Users size={30} className="mx-auto text-[#0F4C81]" />
            <h2 className="mt-4 text-lg font-semibold">
              {supervisors.length ? 'No hay supervisores con estos filtros' : 'Aún no hay supervisores'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              {supervisors.length
                ? 'Cambia la búsqueda o el estado para ver otras cuentas.'
                : 'Crea la cuenta de un supervisor y asígnale la sede que gestionará.'}
            </p>
          </div>
        )}
      </section>

      {draft && (
        <Modal
          title="Crear supervisor"
          description="La cuenta queda limitada a la sede elegida. En su primer ingreso deberá cambiar la contraseña temporal."
          onClose={() => setDraft(null)}
        >
          <form className="space-y-4 p-5 sm:p-6" onSubmit={submitNew} noValidate>
            <label className="block text-sm font-medium">
              Nombre completo
              <input
                autoFocus
                maxLength={NAME_MAX}
                aria-invalid={!!fieldErrors.name}
                aria-describedby="sup-name-error"
                className={`${field} ${fieldErrors.name ? invalidField : ''}`}
                value={draft.name}
                onChange={(e) => change('name', e.target.value)}
              />
              <FieldError id="sup-name-error" message={fieldErrors.name} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Correo
                <input
                  type="email"
                  maxLength={EMAIL_MAX}
                  autoComplete="off"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby="sup-email-error"
                  className={`${field} ${fieldErrors.email ? invalidField : ''}`}
                  value={draft.email}
                  onChange={(e) => change('email', e.target.value)}
                  placeholder="nombre@dominio.com"
                />
                <FieldError id="sup-email-error" message={fieldErrors.email} />
              </label>
              <label className="block text-sm font-medium">
                Teléfono
                <input
                  type="tel"
                  inputMode="numeric"
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby="sup-phone-error"
                  className={`${field} ${fieldErrors.phone ? invalidField : ''}`}
                  value={draft.phone}
                  // Solo dígitos: se descartan espacios, guiones y prefijos.
                  onChange={(e) => change('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0991234567"
                />
                <FieldError id="sup-phone-error" message={fieldErrors.phone} />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Sede
              <select
                aria-invalid={!!fieldErrors.facilityId}
                aria-describedby="sup-facility-error"
                className={`${field} ${fieldErrors.facilityId ? invalidField : ''}`}
                value={draft.facilityId}
                onChange={(e) => change('facilityId', e.target.value)}
              >
                <option value="">Selecciona una sede</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <FieldError id="sup-facility-error" message={fieldErrors.facilityId} />
            </label>
            {facilities.length === 0 && (
              <p className="text-xs text-amber-800">
                No hay sedes activas. Crea una sede en Logística antes de dar de alta supervisores.
              </p>
            )}
            <label className="block text-sm font-medium">
              Contraseña temporal
              <input
                type="text"
                autoComplete="off"
                maxLength={PASSWORD_MAX}
                aria-invalid={!!fieldErrors.temporaryPassword}
                aria-describedby="sup-password-hint sup-password-error"
                className={`${field} ${fieldErrors.temporaryPassword ? invalidField : ''}`}
                value={draft.temporaryPassword}
                onChange={(e) => change('temporaryPassword', e.target.value)}
              />
              <span id="sup-password-hint" className="mt-1 block text-xs font-normal text-slate-500">
                {PASSWORD_HINT}
              </span>
              <FieldError id="sup-password-error" message={fieldErrors.temporaryPassword} />
            </label>
            {formError && (
              <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                {formError}
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
              <button type="submit" className={button} disabled={busy}>
                Crear supervisor
              </button>
            </footer>
          </form>
        </Modal>
      )}

      {pending && (
        <Modal
          title={pending.kind === 'reset' ? 'Restablecer contraseña' : 'Suspender cuenta'}
          description={
            pending.kind === 'reset'
              ? `${pending.member.name} deberá cambiar esta contraseña en su siguiente ingreso. Sus sesiones abiertas se cerrarán.`
              : `${pending.member.name} no podrá ingresar y sus sesiones abiertas se cerrarán. Puedes reactivarla después.`
          }
          onClose={() => setPending(null)}
        >
          <form className="space-y-4 p-5 sm:p-6" onSubmit={submitPending}>
            <label className="block text-sm font-medium">
              {pending.kind === 'reset' ? 'Nueva contraseña temporal' : 'Motivo (opcional)'}
              <input
                autoFocus
                required={pending.kind === 'reset'}
                type="text"
                autoComplete="off"
                maxLength={pending.kind === 'reset' ? PASSWORD_MAX : 300}
                className={field}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {pending.kind === 'reset' && (
                <span className="mt-1 block text-xs font-normal text-slate-500">{PASSWORD_HINT}</span>
              )}
            </label>
            {formError && (
              <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                {formError}
              </p>
            )}
            <footer className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                onClick={() => setPending(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className={pending.kind === 'reset' ? button : danger}
              >
                {pending.kind === 'reset' ? 'Restablecer contraseña' : 'Suspender cuenta'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </div>
  );
}
