import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, LoaderCircle, Scale } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isIncidentActive, useServerIncidents } from '../../services/api/incidentsApi';
import {
  ADJUSTMENT_TYPES,
  advance,
  confirmPayment,
  createAdjustment,
  getPlantOrder,
  listAdjustments,
  PLANT_STATUSES,
  poundsToGrams,
  recordWeight,
  resolvePricing,
  validateAdjustment,
  type AdjustmentType,
  type PlantOrder,
  type StaffAdjustment,
} from '../../services/api/plantApi';
import { btnPrimary, btnSecondary, field, fieldInvalid } from '../../shared/ui/controls';


const money = (v: string | number | null | undefined) => `$${(Number(v) || 0).toFixed(2)}`;
const signed = (v: string | number) => `${Number(v) > 0 ? '+' : '-'}${money(Math.abs(Number(v)))}`;
const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación. Intenta de nuevo.';

const STEP_LABEL: Record<string, string> = {
  AT_FACILITY: 'En planta',
  WEIGHING: 'Pesaje',
  INSPECTION: 'Inspección',
  PRICING_PENDING: 'Cálculo del precio',
  CUSTOMER_APPROVAL_PENDING: 'Esperando la decisión del cliente',
  IN_PROCESS: 'En lavado y cuidado',
  QUALITY_CONTROL: 'Control de calidad',
  INCIDENT: 'Retenida por incidencia',
};
const ADJ_STATUS = { PENDING_CUSTOMER: 'Esperando al cliente', APPROVED: 'Aprobado', REJECTED: 'Rechazado' };

/**
 * Proceso en planta contra el servidor, paso a paso. El servidor es la única fuente de verdad:
 * si no responde se muestra el error con "Reintentar"; nunca se avanza en local.
 */
export function PlantProcessPanel({
  orderId,
  onChanged,
  onlyInPlant = false,
  onActiveChange,
  refreshKey,
}: {
  orderId: string;
  onChanged?(updated: PlantOrder): void;
  /** No muestra nada si la solicitud no está en planta (p. ej. en el detalle de la solicitud). */
  onlyInPlant?: boolean;
  /** Avisa si el panel del servidor está guiando el proceso en planta, para ocultar acciones repetidas. */
  onActiveChange?(active: boolean): void;
  /** Cambia cuando la solicitud cambió en otro panel (p. ej. su versión): se vuelve a consultar. */
  refreshKey?: string | number;
}) {
  const { showToast } = useApp();
  const { incidents } = useServerIncidents();
  const [order, setOrder] = useState<PlantOrder | null>(null);
  const [adjustments, setAdjustments] = useState<StaffAdjustment[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [weight, setWeight] = useState('');
  const [weightError, setWeightError] = useState('');
  const [adj, setAdj] = useState({ type: 'EXTRA_ITEM' as AdjustmentType, internalReason: '', customerMessage: '', amount: '' });
  const [adjErrors, setAdjErrors] = useState<ReturnType<typeof validateAdjustment>>({});

  const load = useCallback(async () => {
    try {
      const raw = await getPlantOrder(orderId);
      setOrder(raw);
      setAdjustments(await listAdjustments(orderId).catch(() => []));
      setState('ready');
      return raw;
    } catch (e) {
      setError(messageOf(e));
      setState('error');
      return null;
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const active =
    state === 'ready' && !!order && (PLANT_STATUSES as readonly string[]).includes(order.status);
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);
  useEffect(() => () => onActiveChange?.(false), [onActiveChange]);

  if (state === 'loading')
    return onlyInPlant ? null : (
      <p role="status" className="text-sm text-slate-500">
        Cargando el proceso en planta...
      </p>
    );
  if (state === 'error' || !order)
    return onlyInPlant ? null : (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <p className="font-semibold">No se pudo cargar el proceso en planta.</p>
        <p className="mt-1">{error}</p>
        <button type="button" className={`${btnPrimary} mt-3`} onClick={() => void load()}>
          Reintentar
        </button>
      </div>
    );

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await work();
      showToast({ type: 'success', title: success });
      const updated = await load();
      if (updated) onChanged?.(updated);
    } catch (e) {
      showToast({ type: 'error', title: 'No se pudo completar', message: messageOf(e) });
      void load();
    } finally {
      setBusy(false);
    }
  };

  const status = order.status;
  const perWeight = order.pricingModel === 'PER_WEIGHT';
  const pending = adjustments.filter((a) => a.status === 'PENDING_CUSTOMER');
  const due = Number(order.amountDue) || 0;
  const inPlant = (PLANT_STATUSES as readonly string[]).includes(status);
  const heldBy = incidents.find((i) => i.orderId === order.id && i.previousStatus && isIncidentActive(i));
  if (onlyInPlant && !inPlant) return null;

  const submitWeight = (e: FormEvent) => {
    e.preventDefault();
    let grams: number;
    try {
      grams = poundsToGrams(weight);
    } catch (err) {
      setWeightError(messageOf(err));
      return;
    }
    setWeightError('');
    void run(() => recordWeight(order.id, grams, order.version), 'Peso registrado');
  };

  const submitAdjustment = (e: FormEvent) => {
    e.preventDefault();
    const errors = validateAdjustment(adj);
    setAdjErrors(errors);
    if (Object.keys(errors).length) return;
    void run(async () => {
      await createAdjustment(order.id, {
        type: adj.type,
        internalReason: adj.internalReason.trim(),
        customerMessage: adj.customerMessage.trim(),
        amountDifference: Number(adj.amount.replace(',', '.')),
        expectedVersion: order.version,
      });
      setAdj({ type: 'EXTRA_ITEM', internalReason: '', customerMessage: '', amount: '' });
    }, 'Ajuste registrado');
  };

  return (
    <section aria-label="Proceso en planta" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
          <ClipboardCheck className="h-4 w-4" aria-hidden />
          Proceso en planta
        </h3>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
          {STEP_LABEL[status] ?? status}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Servicio</dt>
          <dd className="font-semibold">{perWeight ? 'Por peso' : 'Por prenda'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Total</dt>
          <dd className="font-semibold">{money(order.total)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Pagado</dt>
          <dd className="font-semibold">{money(order.amountPaid)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Saldo</dt>
          <dd className={`font-semibold ${due > 0 ? 'text-amber-700' : ''}`}>{money(due)}</dd>
        </div>
      </dl>

      {due > 0 && order.paymentMethodKind === 'TRANSFER' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <span>El cliente eligió transferencia: confirma el pago cuando recibas el dinero.</span>
          <button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() =>
              void run(() => confirmPayment(order.id, order.version, 'Transferencia recibida'), 'Pago confirmado')
            }
          >
            Confirmar pago por transferencia
          </button>
        </div>
      )}

      {status === 'INCIDENT' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">La solicitud está retenida por una incidencia.</p>
          <p className="mt-1">El proceso continúa cuando se resuelve: vuelve a la etapa en que estaba.</p>
          {heldBy ? (
            <Link
              to={`/operations/incidents/${heldBy.id}`}
              className="mt-2 inline-block font-semibold text-primary underline"
            >
              Resolver en Incidencias
            </Link>
          ) : (
            <Link to="/operations/incidents" className="mt-2 inline-block font-semibold text-primary underline">
              Ver Incidencias
            </Link>
          )}
        </div>
      )}
      {!inPlant && status !== 'INCIDENT' && (
        <p className="text-xs text-slate-600">Esta solicitud no está en planta.</p>
      )}

      {status === 'AT_FACILITY' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">
            {perWeight
              ? 'Servicio por peso: pesa la ropa para calcular el precio final.'
              : 'Servicio por prenda: no requiere pesaje, pasa a la inspección de prendas.'}
          </p>
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() =>
              void run(
                () => advance(order.id, perWeight ? 'WEIGHING' : 'INSPECTION', order.version),
                perWeight ? 'Pesaje iniciado' : 'Inspección iniciada',
              )
            }
          >
            {perWeight ? 'Iniciar pesaje' : 'Iniciar inspección'}
          </button>
        </div>
      )}

      {status === 'WEIGHING' && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={submitWeight} noValidate>
          <div>
            <label className="block text-sm font-medium">
              Peso real (lb)
              <input
                inputMode="decimal"
                aria-invalid={!!weightError}
                aria-describedby="plant-weight-error"
                className={`${field} ${weightError ? fieldInvalid : ''}`}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={order.estimatedWeightLb ? `Estimado: ${order.estimatedWeightLb}` : 'Ej: 12.5'}
              />
            </label>
            {weightError && (
              <span id="plant-weight-error" className="mt-1 block text-xs text-rose-700">
                {weightError}
              </span>
            )}
          </div>
          <button type="submit" className={btnPrimary} disabled={busy}>
            <Scale className="h-4 w-4" aria-hidden />
            Registrar peso
          </button>
        </form>
      )}

      {['INSPECTION', 'PRICING_PENDING', 'CUSTOMER_APPROVAL_PENDING'].includes(status) && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Ajustes de precio</h4>
          {adjustments.length === 0 ? (
            <p className="text-xs text-slate-500">Sin ajustes.</p>
          ) : (
            <ul aria-label="Ajustes de precio" className="space-y-1 text-xs">
              {adjustments.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-1">
                  <span>
                    {a.customerMessage}
                    {a.internalReason ? <span className="text-slate-500"> · {a.internalReason}</span> : null}
                  </span>
                  <span className="font-semibold">
                    {signed(a.amountDifference)} · {ADJ_STATUS[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {status !== 'CUSTOMER_APPROVAL_PENDING' && (
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitAdjustment} noValidate>
              <label className="block text-sm font-medium">
                Tipo de ajuste
                <select
                  className={field}
                  value={adj.type}
                  onChange={(e) => setAdj({ ...adj, type: e.target.value as AdjustmentType })}
                >
                  {ADJUSTMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <label className="block text-sm font-medium">
                  Monto ($)
                  <input
                    inputMode="decimal"
                    aria-invalid={!!adjErrors.amount}
                    className={`${field} ${adjErrors.amount ? fieldInvalid : ''}`}
                    value={adj.amount}
                    onChange={(e) => setAdj({ ...adj, amount: e.target.value })}
                    placeholder="Ej: 2.50 o -1.00"
                  />
                </label>
                {adjErrors.amount && <span className="mt-1 block text-xs text-rose-700">{adjErrors.amount}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Mensaje para el cliente
                  <input
                    maxLength={300}
                    aria-invalid={!!adjErrors.customerMessage}
                    className={`${field} ${adjErrors.customerMessage ? fieldInvalid : ''}`}
                    value={adj.customerMessage}
                    onChange={(e) => setAdj({ ...adj, customerMessage: e.target.value })}
                  />
                </label>
                {adjErrors.customerMessage && (
                  <span className="mt-1 block text-xs text-rose-700">{adjErrors.customerMessage}</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Motivo interno
                  <input
                    maxLength={300}
                    aria-invalid={!!adjErrors.internalReason}
                    className={`${field} ${adjErrors.internalReason ? fieldInvalid : ''}`}
                    value={adj.internalReason}
                    onChange={(e) => setAdj({ ...adj, internalReason: e.target.value })}
                  />
                </label>
                {adjErrors.internalReason && (
                  <span className="mt-1 block text-xs text-rose-700">{adjErrors.internalReason}</span>
                )}
              </div>
              <div className="md:col-span-2">
                <button type="submit" className={btnSecondary} disabled={busy}>
                  Agregar ajuste
                </button>
                <p className="mt-1 text-xs text-slate-500">
                  Un aumento requiere la aprobación del cliente; un descuento se aplica directamente.
                </p>
              </div>
            </form>
          )}
        </div>
      )}

      {status === 'INSPECTION' && (
        <button
          type="button"
          className={btnPrimary}
          disabled={busy}
          onClick={() => void run(() => advance(order.id, 'PRICING_PENDING', order.version), 'Inspección terminada')}
        >
          Pasar a cálculo del precio
        </button>
      )}

      {(status === 'PRICING_PENDING' || status === 'CUSTOMER_APPROVAL_PENDING') && (
        <div className="space-y-1">
          {status === 'CUSTOMER_APPROVAL_PENDING' && pending.length > 0 && (
            <p className="text-xs text-amber-800">
              Esperando la decisión del cliente sobre {pending.length === 1 ? 'un ajuste' : `${pending.length} ajustes`}.
            </p>
          )}
          <button
            type="button"
            className={btnPrimary}
            disabled={busy || (status === 'CUSTOMER_APPROVAL_PENDING' && pending.length > 0)}
            onClick={() => void run(() => resolvePricing(order.id, order.version), 'Precio procesado')}
          >
            Fijar precio
          </button>
          {status === 'PRICING_PENDING' && pending.length > 0 && (
            <p className="text-xs text-slate-500">Hay ajustes que el cliente debe aprobar: se le enviarán.</p>
          )}
        </div>
      )}

      {status === 'IN_PROCESS' && (
        <button
          type="button"
          className={btnPrimary}
          disabled={busy}
          onClick={() => void run(() => advance(order.id, 'QUALITY_CONTROL', order.version, 'Lavado terminado'), 'En control de calidad')}
        >
          Pasar a control de calidad
        </button>
      )}

      {status === 'QUALITY_CONTROL' && (
        <button
          type="button"
          className={btnPrimary}
          disabled={busy}
          onClick={() =>
            void run(
              () =>
                advance(
                  order.id,
                  order.mode === 'HOME_STORE' ? 'READY_FOR_PICKUP' : 'READY_FOR_DELIVERY',
                  order.version,
                  'Calidad aprobada',
                ),
              order.mode === 'HOME_STORE' ? 'Lista para retirar' : 'Lista para entrega',
            )
          }
        >
          {order.mode === 'HOME_STORE' ? 'Marcar lista para retirar' : 'Marcar lista para entrega'}
        </button>
      )}

      {busy && (
        <p role="status" className="flex items-center gap-2 text-xs text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Guardando...
        </p>
      )}
    </section>
  );
}
