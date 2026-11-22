import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, LoaderCircle, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ApiError } from '../../services/api/apiConfig';
import type { BackendOrderDetail } from '../../services/api/ordersApi';
import {
  cancelOrder,
  listOrderIncidents,
  openFailedPickup,
  resolveIncident,
  scheduleInbound,
  type OrderIncident,
} from '../../services/api/failedPickupApi';
import {
  addDays,
  formatSlotDate,
  listSlots,
  todayInAgenda,
  type Slot,
} from '../../services/api/slotsApi';
import { btnDanger, btnPrimary, field } from '../../shared/ui/controls';


const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación. Intenta de nuevo.';
const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

/**
 * Solicitud retenida por recogida fallida: la sede reprograma la recogida (nueva franja y, al
 * resolver la incidencia, vuelve a Confirmada para asignar chofer) o la cancela.
 */
export function FailedPickupPanel({
  orderId,
  version,
  facilityId,
  onChanged,
}: {
  orderId: string;
  version: number;
  facilityId: string;
  /** Recibe la solicitud actualizada del servidor (o nada si hay que recargarla). */
  onChanged(updated?: BackendOrderDetail): void;
}) {
  const { showToast } = useApp();
  const [incident, setIncident] = useState<OrderIncident | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'schedule' | 'cancel' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const found = openFailedPickup(await listOrderIncidents(orderId)) ?? null;
      setIncident(found);
      if (found && facilityId) {
        const today = todayInAgenda();
        const rows = await listSlots({
          facilityId,
          context: 'DRIVER_PICKUP',
          from: today,
          to: addDays(today, 13),
        });
        setSlots(rows.filter((s) => s.active && s.capacity - s.reservedCount > 0));
      }
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [orderId, facilityId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return (
      <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        Cargando la recogida fallida...
      </p>
    );
  if (error)
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
        <p className="font-semibold">No se pudo cargar la incidencia de la solicitud.</p>
        <p className="mt-1">{error}</p>
        <button type="button" className={`${btnPrimary} mt-3`} onClick={() => void load()}>
          Reintentar
        </button>
      </div>
    );
  if (!incident) return null;

  const reschedule = async () => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) {
      showToast({ type: 'error', title: 'Elige la nueva franja de recogida' });
      return;
    }
    setBusy('schedule');
    try {
      try {
        await scheduleInbound(orderId, version, slot.id);
      } catch (e) {
        // Si ya se había programado antes, solo falta resolver la incidencia.
        if (!(e instanceof ApiError && /ya tiene una franja/i.test(e.message))) throw e;
      }
      const when = `${formatSlotDate(slot.date)} ${slot.startTime} - ${slot.endTime}`;
      await resolveIncident(incident.id, `Recogida reprogramada para ${when}.`);
      showToast({
        type: 'success',
        title: 'Recogida reprogramada',
        message: `Nueva recogida: ${when}. Asigna un chofer para continuar.`,
      });
      onChanged();
    } catch (e) {
      showToast({ type: 'error', title: 'No se pudo reprogramar', message: messageOf(e) });
      void load();
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!reason.trim()) {
      showToast({ type: 'error', title: 'Indica el motivo de la cancelación' });
      return;
    }
    setBusy('cancel');
    try {
      const updated = await cancelOrder(orderId, version, reason.trim());
      showToast({
        type: 'success',
        title: 'Solicitud cancelada',
        message: 'Se reembolsó lo pagado a la billetera del cliente. El cargo por recogida fallida se mantiene.',
      });
      onChanged(updated);
    } catch (e) {
      showToast({ type: 'error', title: 'No se pudo cancelar', message: messageOf(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      aria-label="Recogida fallida"
      className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50/70 p-5"
    >
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-amber-950">Recogida fallida</h2>
          <p className="mt-1 text-xs text-amber-900">
            Motivo: <strong>{incident.description}</strong> · Reportada el {dateTime(incident.createdAt)}
          </p>
          <p className="mt-1 text-xs text-amber-900">
            La solicitud está retenida y se aplicó al cliente el cargo por recogida fallida. Reprograma
            la recogida o cancela la solicitud.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            <CalendarClock className="h-4 w-4" aria-hidden />
            Reprogramar recogida
          </h3>
          {slots.length ? (
            <label className="block text-sm font-medium">
              Nueva franja de recogida
              <select className={field} value={slotId} onChange={(e) => setSlotId(e.target.value)}>
                <option value="">Elige una franja</option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatSlotDate(s.date)} · {s.startTime} - {s.endTime} ·{' '}
                    {s.capacity - s.reservedCount} cupos
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-xs text-slate-600">
              No hay franjas de recogida con cupo en los próximos 14 días. Créalas en Configuración.
            </p>
          )}
          <button
            type="button"
            className={btnPrimary}
            disabled={!slots.length || busy !== null}
            onClick={() => void reschedule()}
          >
            {busy === 'schedule' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Reprogramar recogida
          </button>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            <XCircle className="h-4 w-4" aria-hidden />
            Cancelar solicitud
          </h3>
          <label className="block text-sm font-medium">
            Motivo de la cancelación
            <textarea
              rows={2}
              maxLength={300}
              className={field}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: El cliente desistió del servicio"
            />
          </label>
          <p className="text-xs text-slate-500">
            Se reembolsa lo pagado a la billetera del cliente; el cargo por recogida fallida se mantiene.
          </p>
          <button
            type="button"
            className={btnDanger}
            disabled={busy !== null}
            onClick={() => void cancel()}
          >
            {busy === 'cancel' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Cancelar solicitud
          </button>
        </div>
      </div>
    </section>
  );
}
