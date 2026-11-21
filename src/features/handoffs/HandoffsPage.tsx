import React, { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Building2,
  LogIn,
  PackageCheck,
  RefreshCw,
  ScanLine,
  Truck,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { listOrders, type BackendOrderSummary } from '../../services/api/ordersApi';
import { getFacilities, type FacilityResponse } from '../../services/api/geoApi';
import { ApiError } from '../../services/api/apiConfig';
import { Modal } from '../../shared/ui/Modal';

/*
 * Puerta de entrada del mostrador. La validación de los traspasos (código, prendas, quién retira)
 * vive en un solo lugar: el detalle de la solicitud, conectado al servidor. Aquí se escanea el QR
 * para abrir la solicitud correcta, o se elige de la cola cuando solo se tiene el código de 6 dígitos.
 */

const button =
  'sidebar-focus inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0A3660] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer';
const secondary =
  'sidebar-focus inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer';
const field =
  'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-normal text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0F4C81] focus:bg-white focus:ring-2 focus:ring-[#0F4C81]/10';

type QueueKey = 'HEADING_TO_FACILITY' | 'DELIVERY_ASSIGNED' | 'READY_FOR_PICKUP';

/** Etapas en las que la sede recibe o entrega prendas, con el traspaso que se valida en cada una. */
export const QUEUES: {
  status: QueueKey;
  type: string;
  title: string;
  hint: string;
  icon: typeof Truck;
}[] = [
  {
    status: 'HEADING_TO_FACILITY',
    type: 'DRIVER_TO_FACILITY',
    title: 'Llegan a planta',
    hint: 'El chofer entrega las prendas recogidas.',
    icon: LogIn,
  },
  {
    status: 'DELIVERY_ASSIGNED',
    type: 'FACILITY_TO_DRIVER',
    title: 'Salen a reparto',
    hint: 'La sede entrega las prendas al chofer.',
    icon: Truck,
  },
  {
    status: 'READY_FOR_PICKUP',
    type: 'FACILITY_TO_CUSTOMER',
    title: 'Retiro en sede',
    hint: 'El cliente o un autorizado retira sus prendas.',
    icon: PackageCheck,
  },
];

const QR = /^LDH1:([^:]+):([A-Z_]+):(.{16,128})$/;

export type ScanResult =
  | { kind: 'qr'; orderId: string; raw: string }
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string };

/** Interpreta lo leído en el mostrador: un QR abre su solicitud; un código exige elegirla. */
export function interpretScan(raw: string): ScanResult {
  const value = raw.trim();
  if (!value) return { kind: 'error', message: 'Escanea el QR o escribe el código de 6 dígitos.' };
  if (/^\d{6}$/.test(value)) return { kind: 'code', code: value };
  const qr = value.match(QR);
  if (qr) {
    if (!QUEUES.some((q) => q.type === qr[2]))
      return {
        kind: 'error',
        message: 'Este QR no es de un traspaso en la sede: lo valida el chofer en su app.',
      };
    return { kind: 'qr', orderId: qr[1], raw: value };
  }
  return {
    kind: 'error',
    message: 'No es un código válido. Usa el QR o el código de 6 dígitos que muestra quien entrega.',
  };
}

type Row = BackendOrderSummary & { customer?: { user?: { name?: string | null } | null } | null };

const solLabel = (r: Row) => `SOL-${String(r.number).padStart(4, '0')}`;

export function HandoffsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Record<QueueKey, Row[]>>({
    HEADING_TO_FACILITY: [],
    DELIVERY_ASSIGNED: [],
    READY_FOR_PICKUP: [],
  });
  const [facilities, setFacilities] = useState<FacilityResponse[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [input, setInput] = useState('');
  const [pendingCode, setPendingCode] = useState('');
  // Con un código de 6 dígitos no se sabe de qué solicitud es: antes de llevarlo al detalle se
  // confirma la solicitud elegida, porque un código en la solicitud equivocada gasta sus intentos.
  const [confirming, setConfirming] = useState<{ row: Row; queue: (typeof QUEUES)[number] } | null>(null);
  const [scanError, setScanError] = useState('');
  const [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const lists = await Promise.all(
        QUEUES.map((q) => listOrders({ status: q.status, pageSize: 100 })),
      );
      setRows({
        HEADING_TO_FACILITY: lists[0].data as Row[],
        DELIVERY_ASSIGNED: lists[1].data as Row[],
        READY_FOR_PICKUP: lists[2].data as Row[],
      });
      setState('ready');
    } catch (e) {
      setLoadError(
        e instanceof ApiError && e.status === 0
          ? 'Sin conexión con el servidor.'
          : e instanceof Error
            ? e.message
            : 'Error desconocido.',
      );
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
    getFacilities()
      .then(setFacilities)
      .catch(() => setFacilities([]));
  }, [load]);

  // El detalle quita `custodia` y `traspaso` de la URL en cuanto los lee.
  const openOrder = (orderId: string, code = '', type = '') => {
    const params = new URLSearchParams();
    if (code) params.set('custodia', code);
    if (type) params.set('traspaso', type);
    const query = params.toString();
    navigate(`/operations/orders/${orderId}${query ? `?${query}` : ''}`);
  };

  const submit = (value: string) => {
    const result = interpretScan(value);
    if (result.kind === 'error') {
      setScanError(result.message);
      return;
    }
    setScanError('');
    if (result.kind === 'qr') {
      openOrder(result.orderId, result.raw, result.raw.match(QR)?.[2]);
      return;
    }
    // El código de 6 dígitos no dice a qué solicitud pertenece: se elige en la cola.
    setPendingCode(result.code);
    setInput('');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

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
            if (!result || cancelled) return;
            setCamera(false);
            submit(result.getText());
          },
        );
        if (cancelled) controls.stop();
      })
      .catch(() => {
        setScanError('No se pudo abrir la cámara. Usa un lector o escribe el código.');
        setCamera(false);
      });
    return () => {
      cancelled = true;
      controls?.stop();
    };
    // submit solo navega o guarda el código; no necesita volver a crear el lector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  const facilityName = (id: string) => facilities.find((f) => f.id === id)?.name;
  const visible = (status: QueueKey) =>
    rows[status].filter((r) => !facilityId || r.facilityId === facilityId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Recepción y retiros"
        subtitle="Escanea el QR de quien entrega o elige la solicitud. La validación se completa en su detalle."
      />

      <section
        aria-label="Leer código"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
      >
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600" htmlFor="handoff-scan">
            <span className="flex items-center gap-1.5">
              <ScanLine className="size-3.5" aria-hidden="true" />
              QR o código de 6 dígitos
            </span>
            <input
              id="handoff-scan"
              className={field}
              value={input}
              autoComplete="off"
              placeholder="Escanea con el lector o escribe el código"
              onChange={(e) => {
                setInput(e.target.value);
                setScanError('');
              }}
            />
          </label>
          <button type="submit" className={button}>
            <ArrowUpRight className="size-4" aria-hidden="true" />
            Continuar
          </button>
          <button type="button" className={secondary} onClick={() => setCamera((v) => !v)}>
            <ScanLine className="size-4" aria-hidden="true" />
            {camera ? 'Cerrar cámara' : 'Escanear con cámara'}
          </button>
        </form>
        {scanError && (
          <p role="alert" className="text-xs font-medium text-rose-700">
            {scanError}
          </p>
        )}
        {pendingCode && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900"
          >
            <span>
              Código <strong>{pendingCode}</strong> listo. Elige la solicitud en la cola para validarlo en su detalle.
            </span>
            <button
              type="button"
              className="font-semibold underline cursor-pointer"
              onClick={() => setPendingCode('')}
            >
              Descartar código
            </button>
          </div>
        )}
        {camera && (
          <video ref={video} className="w-full max-w-sm rounded-xl border border-slate-200" muted playsInline />
        )}
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="min-w-0 w-full text-xs font-semibold text-slate-600 sm:w-auto sm:min-w-64">
          <span className="flex items-center gap-1.5">
            <Building2 className="size-3.5" aria-hidden="true" />
            Sede
          </span>
          <select
            aria-label="Sede"
            className={field}
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
          >
            <option value="">Todas mis sedes</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={secondary} onClick={() => void load()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {state === 'loading' && (
        <p role="status" className="text-sm text-slate-500">
          Cargando solicitudes...
        </p>
      )}
      {state === 'error' && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">No se pudieron cargar las solicitudes.</p>
          <p className="mt-1">{loadError}</p>
          <button type="button" className={`${button} mt-3`} onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      )}
      {state === 'ready' && (
        <div className="grid gap-5 lg:grid-cols-3">
          {QUEUES.map((q) => {
            const list = visible(q.status);
            return (
              <section
                key={q.status}
                aria-label={q.title}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                <header className="flex items-start justify-between gap-2 border-b border-slate-200 bg-slate-50 p-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-[#102A43]">
                      <q.icon className="size-4 text-[#0F4C81]" aria-hidden="true" />
                      {q.title}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-slate-500">{q.hint}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {list.length}
                  </span>
                </header>
                <ul className="divide-y divide-slate-100">
                  {list.length === 0 && (
                    <li className="p-6 text-center text-xs text-slate-500">No hay solicitudes en esta etapa.</li>
                  )}
                  {list.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0 text-xs">
                        <p className="font-bold text-[#102A43]">SOL-{String(r.number).padStart(4, '0')}</p>
                        <p className="truncate text-slate-600">{r.customer?.user?.name ?? 'Cliente'}</p>
                        {facilityName(r.facilityId) && (
                          <p className="truncate text-[11px] text-slate-400">{facilityName(r.facilityId)}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={secondary}
                        aria-label={`Validar SOL-${String(r.number).padStart(4, '0')}`}
                        onClick={() =>
                          pendingCode ? setConfirming({ row: r, queue: q }) : openOrder(r.id, '', q.type)
                        }
                      >
                        Validar
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {confirming && (
        <Modal
          title="Confirmar la solicitud"
          description="El código se validará en el detalle de esta solicitud."
          onClose={() => setConfirming(null)}
        >
          <div className="space-y-4 p-5 text-sm text-slate-700 sm:p-6">
            <p>
              Vas a validar el código <strong className="font-mono">{pendingCode}</strong> en{' '}
              <strong>{solLabel(confirming.row)}</strong> ·{' '}
              {confirming.row.customer?.user?.name ?? 'Cliente'} ({confirming.queue.title}).
            </p>
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Si el código no es de esta solicitud, el intento fallido cuenta y el traspaso puede
              quedar bloqueado. Verifica la solicitud con quien entrega antes de seguir.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={secondary} onClick={() => setConfirming(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={button}
                onClick={() => {
                  const { row, queue } = confirming;
                  const code = pendingCode;
                  setConfirming(null);
                  setPendingCode('');
                  openOrder(row.id, code, queue.type);
                }}
              >
                Validar en {solLabel(confirming.row)}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
