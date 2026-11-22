import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, PackageCheck, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ApiError } from '../../services/api/apiConfig';
import type { BackendOrderDetail } from '../../services/api/ordersApi';
import {
  custodyErrorMessage,
  declaredAtPickup,
  listHandoffs,
  parseCustodyInput,
  validateReception,
  verifyHandoff,
} from '../../services/api/handoffsApi';
import { CustodyCodeField } from '../custody/CustodyCodeField';

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const invalid = 'border-rose-400 bg-rose-50/40';
const primary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50';
const secondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-primary hover:bg-slate-50';

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación. Intenta de nuevo.';

/** Lo que el panel necesita del servidor antes de poder confirmar. */
type ServerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; declared: number | null };

/**
 * Llegada a planta: el chofer muestra su código o QR y la sede lo valida aquí, junto con las
 * prendas recibidas. Al validarse, el servidor pasa la solicitud a "En planta".
 *
 * Antes de confirmar se consulta al servidor el conteo declarado en la recogida; la versión
 * vigente llega del detalle (T-10). Sin el conteo no se confirma: una diferencia de prendas
 * pasaría sin explicación.
 */
export function FacilityReceptionPanel({
  orderId,
  version,
  onChanged,
  onStale,
  initialCode = '',
}: {
  orderId: string;
  /** Versión vigente de la solicitud, tal como la devolvió el servidor al detalle. */
  version: number;
  onChanged(updated: BackendOrderDetail): void;
  /** La versión quedó vieja (409): el detalle vuelve a consultar la solicitud. */
  onStale(): void;
  /** Código o QR leído en "Recepción y retiros", para no tener que volver a escanearlo. */
  initialCode?: string;
}) {
  const { showToast } = useApp();
  const [server, setServer] = useState<ServerState>({ status: 'loading' });
  const [code, setCode] = useState(initialCode);
  const [received, setReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ code?: string; received?: string; notes?: string }>({});
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setServer({ status: 'loading' });
    try {
      const rows = await listHandoffs(orderId);
      if (mounted.current)
        setServer({ status: 'ready', declared: declaredAtPickup(rows) });
    } catch (e) {
      if (mounted.current)
        setServer({
          status: 'error',
          message:
            e instanceof ApiError && e.status === 0 ? 'Sin conexión con el servidor.' : messageOf(e),
        });
    }
  }, [orderId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (server.status !== 'ready') return;
    const found: typeof errors = validateReception(received, server.declared, notes);
    let input;
    try {
      input = parseCustodyInput(code, orderId, 'DRIVER_TO_FACILITY');
    } catch (err) {
      found.code = messageOf(err);
    }
    setErrors(found);
    if (Object.keys(found).length || !input) return;
    setBusy(true);
    try {
      const updated = await verifyHandoff(orderId, {
        type: 'DRIVER_TO_FACILITY',
        expectedVersion: version,
        receivedCount: Number(received),
        notes: notes.trim() || undefined,
        ...input,
      });
      setCode('');
      showToast({
        type: 'success',
        title: 'Ropa recibida en planta',
        message: `Se registraron ${received} prendas. La solicitud pasó a En planta.`,
      });
      onChanged(updated);
    } catch (err) {
      setErrors({ code: custodyErrorMessage(err) });
      // La versión quedó vieja: el detalle vuelve a consultar la solicitud y trae la vigente.
      if (err instanceof ApiError && err.status === 409) onStale();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="Recepción en planta"
      className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-5"
    >
      <div className="flex gap-3">
        <PackageCheck className="h-5 w-5 shrink-0 text-sky-800" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-ink">Recepción en planta</h2>
          <p className="mt-1 text-xs text-slate-700">
            El chofer está en camino a la planta. Al recibir la ropa, valida su código o QR y registra
            las prendas recibidas.
          </p>
          {server.status === 'ready' && (
            <p className="mt-1 text-xs font-semibold text-slate-800">
              {server.declared !== null
                ? `Prendas declaradas en la recogida: ${server.declared}`
                : 'El chofer no declaró un conteo en la recogida.'}
            </p>
          )}
          {server.status === 'loading' && (
            <p role="status" className="mt-1 text-xs text-slate-600">
              Consultando el conteo declarado en la recogida…
            </p>
          )}
        </div>
      </div>

      {server.status === 'error' && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <p className="font-semibold">No se pudo obtener el conteo declarado en la recogida.</p>
          <p className="mt-1">
            {server.message} Sin ese dato no se puede confirmar la recepción, porque una diferencia de
            prendas pasaría sin registrar.
          </p>
          <button type="button" className={`${secondary} mt-2`} onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reintentar
          </button>
        </div>
      )}

      <form className="grid gap-4 lg:grid-cols-3" onSubmit={submit} noValidate>
        <CustodyCodeField
          label="Código del chofer"
          scannedText="QR del chofer leído"
          value={code}
          error={errors.code}
          onChange={(value) => {
            setCode(value);
            setErrors((prev) => ({ ...prev, code: undefined }));
          }}
          onError={(message) => setErrors((prev) => ({ ...prev, code: message }))}
        />
        <div>
          <label className="block text-sm font-medium">
            Prendas recibidas
            <input
              inputMode="numeric"
              aria-invalid={!!errors.received}
              aria-describedby="reception-received-error"
              className={`${field} ${errors.received ? invalid : ''}`}
              value={received}
              onChange={(e) => setReceived(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          {errors.received && (
            <span id="reception-received-error" className="mt-1 block text-xs text-rose-700">
              {errors.received}
            </span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            Observaciones
            <textarea
              rows={2}
              maxLength={300}
              aria-invalid={!!errors.notes}
              aria-describedby="reception-notes-error"
              className={`${field} ${errors.notes ? invalid : ''}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Obligatorio si el conteo no coincide"
            />
          </label>
          {errors.notes && (
            <span id="reception-notes-error" className="mt-1 block text-xs text-rose-700">
              {errors.notes}
            </span>
          )}
        </div>
        <div className="lg:col-span-3">
          <button type="submit" className={primary} disabled={busy || server.status !== 'ready'}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Confirmar recepción en planta
          </button>
        </div>
      </form>
    </section>
  );
}
