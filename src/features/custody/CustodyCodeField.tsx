import { useId } from 'react';
import { QrCode } from 'lucide-react';
import { useQrScanner } from './useQrScanner';

const field =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-sky-700';
const invalid = 'border-rose-400 bg-rose-50/40';
const secondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-[#0F4C81] hover:bg-slate-50';

/** Contenido completo del QR de custodia: LDH1:<solicitud>:<tipo>:<token>. */
const FULL_QR = /^LDH1:[^:]+:[A-Z_]+:.{16,128}$/;

export const CAMERA_ERROR = 'No se pudo abrir la cámara. Escribe el código o usa el lector de QR.';

/**
 * Campo del código de custodia: 6 dígitos escritos, o el QR leído con un lector USB (que escribe
 * su contenido) o con la cámara. Lo comparten los paneles de custodia del detalle (T-12).
 */
export function CustodyCodeField({
  label,
  value,
  onChange,
  error,
  onError,
  scannedText = 'QR leído',
}: {
  /** Etiqueta visible, p. ej. "Código del chofer". */
  label: string;
  value: string;
  onChange(value: string): void;
  error?: string;
  /** Mensaje para mostrar como error del campo (p. ej. si no se pudo abrir la cámara). */
  onError(message: string): void;
  /** Texto que confirma que se leyó un QR completo. */
  scannedText?: string;
}) {
  const scanner = useQrScanner(onChange, () => onError(CAMERA_ERROR));
  const errorId = useId();
  const scanned = FULL_QR.test(value.trim());
  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        <input
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`${field} font-mono ${error ? invalid : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="6 dígitos o lector de QR"
          autoComplete="off"
        />
      </label>
      {scanned && !error && (
        <span className="mt-1 block text-xs font-semibold text-emerald-700">{scannedText}</span>
      )}
      {error && (
        <span id={errorId} className="mt-1 block text-xs text-rose-700">
          {error}
        </span>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={secondary} onClick={scanner.toggle}>
          <QrCode className="h-4 w-4" aria-hidden />
          {scanner.active ? 'Cerrar cámara' : 'Escanear QR'}
        </button>
        {scanned && (
          <button type="button" className={secondary} onClick={() => onChange('')}>
            Usar otro código
          </button>
        )}
      </div>
      {scanner.active && (
        <video ref={scanner.videoRef} className="mt-2 max-h-56 w-full rounded-xl" muted playsInline />
      )}
    </div>
  );
}
