import { useCallback, useEffect, useState } from 'react';
import { getOrder, type BackendOrderEvent } from '../../services/api/ordersApi';
import { listAdjustments, type StaffAdjustment } from '../../services/api/plantApi';
import { listHandoffs, type HandoffRecord } from '../../services/api/handoffsApi';
import {
  INCIDENT_STATUS_LABEL,
  incidentTypeLabel,
  useServerIncidents,
} from '../../services/api/incidentsApi';
import { HANDOFF_LABELS } from '../../services/fulfillment';

interface Entry {
  id: string;
  at: string;
  title: string;
  detail?: string;
  actor?: string;
  source: string;
}

export function displayDate(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed)
    ? new Intl.DateTimeFormat('es', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed)
    : value || 'Fecha no registrada';
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administración',
  SUPERVISOR: 'Sede',
  DRIVER: 'Chofer',
  CLIENT: 'Cliente',
};

const money = (value: string | number) => `$${Number(value).toFixed(2)}`;

type Loaded = {
  events: BackendOrderEvent[];
  adjustments: StaffAdjustment[];
  handoffs: HandoffRecord[];
};

/**
 * Historial completo de la solicitud tal como lo registra el servidor: eventos de estado,
 * ajustes de precio, traspasos de custodia confirmados e incidencias.
 */
export function OrderHistory({ orderId, customerName }: { orderId: string; customerName: string }) {
  const { incidents } = useServerIncidents();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [order, adjustments, handoffs] = await Promise.all([
        getOrder(orderId),
        listAdjustments(orderId).catch(() => [] as StaffAdjustment[]),
        listHandoffs(orderId).catch(() => [] as HandoffRecord[]),
      ]);
      setData({ events: order.events ?? [], adjustments, handoffs });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.');
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error)
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <p>No se pudo cargar el historial del servidor. {error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100"
        >
          Reintentar
        </button>
      </div>
    );
  if (!data) return <p className="py-8 text-center text-sm text-slate-600">Cargando historial...</p>;

  const entries: Entry[] = [];
  data.events.forEach((ev) =>
    entries.push({
      id: `event-${ev.id}`,
      at: ev.createdAt,
      title: ev.title,
      detail: ev.description ?? undefined,
      actor: ev.actorRole ? (ROLE_LABEL[ev.actorRole] ?? ev.actorRole) : undefined,
      source: 'Historial',
    }),
  );
  data.adjustments.forEach((a) =>
    entries.push({
      id: `adjustment-${a.id}`,
      at: a.createdAt,
      title: `Ajuste ${Number(a.amountDifference) >= 0 ? 'propuesto' : 'aplicado'}: ${money(a.amountDifference)}`,
      detail: [
        a.customerMessage,
        a.status === 'PENDING_CUSTOMER'
          ? 'Esperando la decisión del cliente'
          : a.status === 'APPROVED'
            ? `Aprobado${a.requiresCustomerApproval ? ` por ${customerName}` : ''}`
            : `Rechazado por ${customerName}`,
      ]
        .filter(Boolean)
        .join(' · '),
      source: 'Precio',
    }),
  );
  data.handoffs
    .filter((h) => h.usedAt)
    .forEach((h) =>
      entries.push({
        id: `handoff-${h.id}`,
        at: h.usedAt!,
        title: HANDOFF_LABELS[h.type] ?? h.type,
        detail:
          h.receivedCount !== null
            ? `Recibidas: ${h.receivedCount}${h.declaredCount !== null ? `; declaradas: ${h.declaredCount}` : ''}`
            : undefined,
        source: 'Constancia de custodia',
      }),
    );
  incidents
    .filter((i) => i.orderId === orderId)
    .forEach((i) => {
      entries.push({
        id: `incident-${i.id}`,
        at: i.createdAt,
        title: `Incidencia: ${incidentTypeLabel(i.type)}`,
        detail: `${INCIDENT_STATUS_LABEL[i.status]} · ${i.description}`,
        source: 'Incidencia',
      });
      if (i.resolvedAt)
        entries.push({
          id: `resolution-${i.id}`,
          at: i.resolvedAt,
          title: `Incidencia resuelta: ${incidentTypeLabel(i.type)}`,
          detail: i.resolution ?? undefined,
          source: 'Resolución',
        });
    });
  entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <section aria-label="Historial completo y bitácora">
      <p className="mb-5 text-sm text-slate-600">
        {entries.length} registros · Más recientes primero. Registrados por el servidor.
      </p>
      {!entries.length ? (
        <p className="py-8 text-center text-sm text-slate-600">
          Este pedido todavía no tiene registros.
        </p>
      ) : (
        <ol className="ml-2 border-l border-slate-200">
          {entries.map((entry) => (
            <li key={entry.id} className="relative pb-6 pl-6 last:pb-0">
              <span className="absolute -left-1.5 top-1.5 size-3 rounded-full border-2 border-white bg-[#0F4C81]" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-sky-800">{entry.source}</span>
                <time className="text-xs text-slate-600">{displayDate(entry.at)}</time>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">{entry.title}</p>
              {entry.detail && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                  {entry.detail}
                </p>
              )}
              {entry.actor && <p className="mt-1 text-xs text-slate-600">{entry.actor}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
