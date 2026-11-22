import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, PackageOpen, QrCode } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ApiError } from '../../services/api/apiConfig';
import {
  custodyErrorMessage,
  parseCustodyInput,
  verifyHandoff,
  type HandoffType,
} from '../../services/api/handoffsApi';
import { completeOrder, type PlantOrder } from '../../services/api/plantApi';

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const invalid = 'border-rose-400 bg-rose-50/40';
const primary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0A3660] disabled:opacity-50';
const secondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-[#0F4C81] hover:bg-slate-50';

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación. Intenta de nuevo.';
const money = (v: string | number | null | undefined) => `$${(Number(v) || 0).toFixed(2)}`;
const QR_FULL = /^LDH1:[^:]+:[A-Z_]+:.{16,128}$/;

type Step = { type: HandoffType; title: string; who: string; help: string; button: string; done: string; recipient: boolean };
const STEPS: Record<string, Step> = {
  DELIVERY_ASSIGNED: {
    type: 'FACILITY_TO_DRIVER',
    title: 'Entrega al chofer para reparto',
    who: 'Código del chofer',
    help: 'El chofer retira la ropa para entregarla. Valida el código o QR que muestra en su app.',
    button: 'Confirmar salida a reparto',
    done: 'El chofer salió a entregar la ropa',
    recipient: false,
  },
  READY_FOR_PICKUP: {
    type: 'FACILITY_TO_CUSTOMER',
    title: 'Retiro en sede',
    who: 'Código del cliente',
    help: 'El cliente retira su ropa. Valida el código o QR que muestra en su app y registra quién retira.',
    button: 'Confirmar retiro',
    done: 'Ropa entregada al cliente',
    recipient: true,
  },
};

/**
 * Traspasos de salida en la sede, contra el servidor: entrega al chofer para reparto y retiro
 * del cliente en sede. Con la solicitud entregada, permite cerrarla.
 *
 * Recibe la solicitud que el detalle ya consultó al servidor (T-10): no la vuelve a pedir. Tras
 * cada confirmación entrega la respuesta del servidor a `onChanged` y el detalle la actualiza.
 */
export function DispatchCustodyPanel({
  order,
  onChanged,
  onStale,
  initialCode = '',
  initialType = '',
}: {
  order: PlantOrder;
  onChanged(updated: PlantOrder): void;
  /** La versión quedó vieja (409): el detalle vuelve a consultar la solicitud al servidor. */
  onStale?(): void;
  /** Código o QR leído en "Recepción y retiros", para no tener que volver a escanearlo. */
  initialCode?: string;
  /** Traspaso de la columna donde se eligió la solicitud (`?traspaso=`). */
  initialType?: HandoffType | '';
}) {
  const { showToast } = useApp();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ code?: string; name?: string; relationship?: string }>({});
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  // El código traído de "Recepción y retiros" solo sirve para la etapa en la que se eligió. Si la
  // solicitud está en otra (o en ninguna de este panel), se descarta para no gastar un intento
  // del traspaso equivocado.
  const initialChecked = useRef(false);
  useEffect(() => {
    if (initialChecked.current || !initialCode) return;
    initialChecked.current = true;
    const current = STEPS[order.status];
    if (current && (!initialType || current.type === initialType)) return;
    setCode('');
    if (current)
      setErrors({
        code: 'El código leído en Recepción y retiros era para otra etapa. Pide el código de esta etapa.',
      });
  }, [order, initialCode, initialType]);

  // Lectura del QR con la cámara (requiere HTTPS o localhost).
  useEffect(() => {
    if (!camera || !video.current) return;
    let cancelled = false;
    let controls: { stop(): void } | undefined;
    import('@zxing/browser')
      .then(async ({ BrowserQRCodeReader }) => {
        controls = await new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video.current!, (result) => {
          if (!result) return;
          setCode(result.getText());
          setCamera(false);
        });
        if (cancelled) controls.stop();
      })
      .catch(() => {
        if (cancelled) return;
        setCamera(false);
        setErrors((prev) => ({ ...prev, code: 'No se pudo abrir la cámara. Escribe el código o usa el lector de QR.' }));
      });
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [camera]);

  if (order.status === 'DELIVERED') {
    const due = Number(order.amountDue) || 0;
    return (
      <section aria-label="Cierre de la solicitud" className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <h2 className="text-sm font-bold text-[#102A43]">Solicitud entregada</h2>
        {due > 0 ? (
          <p className="text-xs text-amber-800">
            Queda un saldo de {money(due)}. Confirma el pago antes de cerrar la solicitud.
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-700">La ropa se entregó y no hay saldo pendiente.</p>
            <button
              type="button"
              className={primary}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const updated = await completeOrder(order.id, order.version);
                  showToast({ type: 'success', title: 'Solicitud cerrada' });
                  onChanged(updated);
                } catch (e) {
                  showToast({ type: 'error', title: 'No se pudo cerrar', message: messageOf(e) });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Cerrar solicitud
            </button>
          </>
        )}
      </section>
    );
  }

  const step = STEPS[order.status];
  if (!step) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    let input;
    try {
      input = parseCustodyInput(code, order.id, step.type, step.recipient ? 'del cliente' : 'del chofer');
    } catch (err) {
      found.code = messageOf(err);
    }
    if (step.recipient && !name.trim()) found.name = 'Escribe el nombre de quien retira.';
    if (step.recipient && !relationship.trim()) found.relationship = 'Indica la relación con el cliente.';
    setErrors(found);
    if (Object.keys(found).length || !input) return;
    setBusy(true);
    try {
      const updated = await verifyHandoff(order.id, {
        type: step.type,
        expectedVersion: order.version,
        ...(step.recipient ? { recipientName: name.trim(), recipientRelationship: relationship.trim() } : {}),
        notes: notes.trim() || undefined,
        ...input,
      });
      setCode('');
      showToast({ type: 'success', title: step.done });
      onChanged(updated as PlantOrder);
    } catch (err) {
      setErrors({ code: custodyErrorMessage(err, step.recipient ? 'del cliente' : 'del chofer') });
      // La versión quedó vieja: se vuelve a consultar para confirmar con la vigente.
      if (err instanceof ApiError && err.status === 409) onStale?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label={step.title} className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
      <div className="flex gap-3">
        <PackageOpen className="h-5 w-5 shrink-0 text-sky-800" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-[#102A43]">{step.title}</h2>
          <p className="mt-1 text-xs text-slate-700">{step.help}</p>
        </div>
      </div>
      <form className="grid gap-4 lg:grid-cols-3" onSubmit={submit} noValidate>
        <div>
          <label className="block text-sm font-medium">
            {step.who}
            <input
              aria-invalid={!!errors.code}
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
          {errors.code && <span className="mt-1 block text-xs text-rose-700">{errors.code}</span>}
          {QR_FULL.test(code.trim()) && !errors.code && (
            <span className="mt-1 block text-xs font-semibold text-emerald-700">QR leído</span>
          )}
          <button type="button" className={`${secondary} mt-2`} onClick={() => setCamera((v) => !v)}>
            <QrCode className="h-4 w-4" aria-hidden />
            {camera ? 'Cerrar cámara' : 'Escanear QR'}
          </button>
          {camera && <video ref={video} className="mt-2 max-h-56 w-full rounded-xl" />}
        </div>
        {step.recipient && (
          <>
            <div>
              <label className="block text-sm font-medium">
                Quién retira
                <input
                  maxLength={120}
                  aria-invalid={!!errors.name}
                  className={`${field} ${errors.name ? invalid : ''}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              {errors.name && <span className="mt-1 block text-xs text-rose-700">{errors.name}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium">
                Relación con el cliente
                <input
                  maxLength={80}
                  aria-invalid={!!errors.relationship}
                  className={`${field} ${errors.relationship ? invalid : ''}`}
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Ej: Titular, familiar"
                />
              </label>
              {errors.relationship && <span className="mt-1 block text-xs text-rose-700">{errors.relationship}</span>}
            </div>
          </>
        )}
        <label className="block text-sm font-medium lg:col-span-3">
          Observaciones (opcional)
          <textarea rows={2} maxLength={300} className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="lg:col-span-3">
          <button type="submit" className={primary} disabled={busy}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {step.button}
          </button>
        </div>
      </form>
    </section>
  );
}
