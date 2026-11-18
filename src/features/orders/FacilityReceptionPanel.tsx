import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, PackageCheck, QrCode } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { BackendOrderDetail } from '../../services/api/ordersApi';
import {
  declaredAtPickup,
  listHandoffs,
  parseCustodyInput,
  validateReception,
  verifyHandoff,
} from '../../services/api/handoffsApi';

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const invalid = 'border-rose-400 bg-rose-50/40';
const primary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0A3660] disabled:opacity-50';
const secondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-[#0F4C81] hover:bg-slate-50';

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación. Intenta de nuevo.';

/**
 * Llegada a planta: el chofer muestra su código o QR y la sede lo valida aquí, junto con las
 * prendas recibidas. Al validarse, el servidor pasa la solicitud a "En planta".
 */
export function FacilityReceptionPanel({
  orderId,
  version,
  onChanged,
  initialCode = '',
}: {
  orderId: string;
  version: number;
  onChanged(updated: BackendOrderDetail): void;
  /** Código o QR leído en "Recepción y retiros", para no tener que volver a escanearlo. */
  initialCode?: string;
}) {
  const { showToast } = useApp();
  const [declared, setDeclared] = useState<number | null>(null);
  const [code, setCode] = useState(initialCode);
  const [received, setReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ code?: string; received?: string; notes?: string }>({});
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let active = true;
    listHandoffs(orderId)
      .then((rows) => {
        if (active) setDeclared(declaredAtPickup(rows));
      })
      .catch(() => {
        // Sin el conteo declarado igual se puede recibir: solo no se compara.
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  // Lectura del QR con la cámara (requiere HTTPS o localhost).
  useEffect(() => {
    if (!camera || !video.current) return;
    let cancelled = false;
    let controls: { stop(): void } | undefined;
    import('@zxing/browser')
      .then(async ({ BrowserQRCodeReader }) => {
        controls = await new BrowserQRCodeReader().decodeFromVideoDevice(
          undefined,
          video.current!,
          (result) => {
            if (!result) return;
            setCode(result.getText());
            setCamera(false);
          },
        );
        if (cancelled) controls.stop();
      })
      .catch(() => {
        if (cancelled) return;
        setCamera(false);
        setErrors((prev) => ({
          ...prev,
          code: 'No se pudo abrir la cámara. Escribe el código o usa el lector de QR.',
        }));
      });
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [camera]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = validateReception(received, declared, notes);
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
      showToast({
        type: 'success',
        title: 'Ropa recibida en planta',
        message: `Se registraron ${received} prendas. La solicitud pasó a En planta.`,
      });
      onChanged(updated);
    } catch (err) {
      setErrors({ code: messageOf(err) });
    } finally {
      setBusy(false);
    }
  };

  const scanned = /^LDH1:[^:]+:[A-Z_]+:.{16,128}$/.test(code.trim());
  return (
    <section
      aria-label="Recepción en planta"
      className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-5"
    >
      <div className="flex gap-3">
        <PackageCheck className="h-5 w-5 shrink-0 text-sky-800" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-[#102A43]">Recepción en planta</h2>
          <p className="mt-1 text-xs text-slate-700">
            El chofer está en camino a la planta. Al recibir la ropa, valida su código o QR y registra
            las prendas recibidas.
          </p>
          {declared !== null && (
            <p className="mt-1 text-xs font-semibold text-slate-800">
              Prendas declaradas en la recogida: {declared}
            </p>
          )}
        </div>
      </div>

      <form className="grid gap-4 lg:grid-cols-3" onSubmit={submit} noValidate>
        <div>
          <label className="block text-sm font-medium">
            Código del chofer
            <input
              aria-invalid={!!errors.code}
              aria-describedby="reception-code-error"
              className={`${field} font-mono ${errors.code ? invalid : ''}`}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErrors((prev) => ({ ...prev, code: undefined }));
              }}
              placeholder="6 dígitos o lector de QR"
              autoComplete="off"
            />
          </label>
          {scanned && !errors.code && (
            <span className="mt-1 block text-xs font-semibold text-emerald-700">QR del chofer leído</span>
          )}
          {errors.code && (
            <span id="reception-code-error" className="mt-1 block text-xs text-rose-700">
              {errors.code}
            </span>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={secondary} onClick={() => setCamera((v) => !v)}>
              <QrCode className="h-4 w-4" aria-hidden />
              {camera ? 'Cerrar cámara' : 'Escanear QR'}
            </button>
            {scanned && (
              <button type="button" className={secondary} onClick={() => setCode('')}>
                Usar otro código
              </button>
            )}
          </div>
          {camera && <video ref={video} className="mt-2 max-h-56 w-full rounded-xl" />}
        </div>
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
          <button type="submit" className={primary} disabled={busy}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Confirmar recepción en planta
          </button>
        </div>
      </form>
    </section>
  );
}
