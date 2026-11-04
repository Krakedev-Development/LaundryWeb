import type { AuditLog, Incident, Order } from '../../types';
import type { BusinessState } from '../../services/BusinessService';
import { HANDOFF_LABELS } from '../../services/fulfillment';

interface Entry {
  id: string;
  at: string;
  title: string;
  detail?: string;
  actor?: string;
  source: string;
}
function dateValue(value: string) {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const time = /Hoy\s+(\d{1,2}):(\d{2})/i.exec(value);
  if (time) {
    const date = new Date();
    date.setHours(Number(time[1]), Number(time[2]), 0, 0);
    return date.getTime();
  }
  return 0;
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

export function OrderHistory({
  order,
  state,
  audits,
  incidents,
}: {
  order: Order;
  state: BusinessState;
  audits: AuditLog[];
  incidents: Incident[];
}) {
  const handoffs = state.handoffs.filter((item) => item.orderId === order.id);
  const handoffIds = new Set(handoffs.map((item) => item.id));
  const entries: Entry[] = order.timeline.map((event, index) => ({
    id: `timeline-${event.id}-${index}`,
    at: event.timestamp,
    title: event.label,
    actor: `${event.userName} · ${event.userRole}`,
    detail: event.notes,
    source: event.isOverride ? 'Cambio excepcional' : 'Historial',
  }));
  audits
    .filter(
      (event) => event.entityId === order.id || handoffIds.has(event.entityId),
    )
    .forEach((event, index) =>
      entries.push({
        id: `audit-${event.id}-${index}`,
        at: event.timestamp,
        title: event.action.replaceAll('_', ' '),
        detail: [
          event.previousValue && `Antes: ${event.previousValue}`,
          event.newValue && `Después: ${event.newValue}`,
          event.notes,
        ]
          .filter(Boolean)
          .join(' · '),
        actor: `${event.userName} · ${event.userRole}`,
        source: 'Bitácora',
      }),
    );
  state.weights
    .filter((item) => item.orderId === order.id)
    .forEach((item) =>
      entries.push({
        id: `weight-${item.id}`,
        at: item.at,
        title: `Pesaje: ${item.weight} ${item.unit}`,
        actor: item.actorId,
        source: 'Prendas',
      }),
    );
  state.payments
    .filter((item) => item.orderId === order.id)
    .forEach((item) =>
      entries.push({
        id: `payment-${item.id}`,
        at: item.at,
        title: `Pago demo: $${item.amount.toFixed(2)}`,
        detail: item.method,
        source: 'Pago',
      }),
    );
  state.adjustments
    .filter((item) => item.orderId === order.id)
    .forEach((item) => {
      entries.push({
        id: `adjustment-${item.id}`,
        at: item.createdAt,
        title: `Ajuste propuesto: $${item.amount.toFixed(2)}`,
        detail: `${item.reason} · ${item.customerMessage}`,
        source: 'Precio',
      });
      if (item.decidedAt)
        entries.push({
          id: `decision-${item.id}`,
          at: item.decidedAt,
          title:
            item.status === 'ACCEPTED' ? 'Ajuste aceptado' : 'Ajuste rechazado',
          actor: order.customerName,
          source: 'Decisión demo',
        });
    });
  state.changes
    .filter((item) => item.orderId === order.id)
    .forEach((item) =>
      entries.push({
        id: `change-${item.id}`,
        at: item.at,
        title: 'Cambio de agenda o modalidad',
        detail: item.reason,
        actor: item.actorId,
        source: 'Agenda',
      }),
    );
  state.charges
    .filter((item) => item.orderId === order.id)
    .forEach((item) =>
      entries.push({
        id: `charge-${item.id}`,
        at: item.createdAt,
        title: `Cargo: $${item.amount.toFixed(2)}`,
        detail: `${item.reason} · ${item.status}${item.waivedReason ? ` · ${item.waivedReason}` : ''}`,
        source: 'Cargo demo',
      }),
    );
  state.messages
    .filter((item) => item.orderId === order.id)
    .forEach((item) =>
      entries.push({
        id: `message-${item.id}`,
        at: item.at,
        title: 'Mensaje del pedido',
        detail: item.text,
        actor: item.senderId,
        source: 'Comunicación',
      }),
    );
  handoffs
    .filter((item) => item.usedAt)
    .forEach((item) =>
      entries.push({
        id: `receipt-${item.id}`,
        at: item.usedAt!,
        title: HANDOFF_LABELS[item.type],
        detail: [
          item.receipt?.count !== undefined &&
            `Recibidas: ${item.receipt.count}; declaradas: ${item.receipt.declaredCount}`,
          item.receipt?.recipient,
          item.receipt?.relationship,
          item.receipt?.notes,
        ]
          .filter(Boolean)
          .join(' · '),
        actor: item.usedByUserId,
        source: 'Constancia de custodia',
      }),
    );
  incidents
    .filter((item) => item.orderId === order.id)
    .forEach((item) => {
      entries.push({
        id: `incident-${item.id}`,
        at: item.createdAt,
        title: `Incidencia ${item.id}`,
        detail: item.description,
        actor: item.reportedBy,
        source: 'Incidencia',
      });
      item.internalNotes.forEach((note) =>
        entries.push({
          id: `note-${item.id}-${note.id}`,
          at: note.createdAt,
          title: `Nota de ${item.id}`,
          detail: note.text,
          actor: note.author,
          source: 'Nota interna',
        }),
      );
      if (item.resolvedAt)
        entries.push({
          id: `resolution-${item.id}`,
          at: item.resolvedAt,
          title: `Incidencia ${item.id} resuelta`,
          detail: item.resolutionNotes,
          source: 'Resolución',
        });
    });
  entries.sort((a, b) => dateValue(b.at) - dateValue(a.at));
  return (
    <section aria-label="Historial completo y bitácora">
      <p className="mb-5 text-sm text-slate-600">
        {entries.length} registros · Más recientes primero. Incluye eventos
        operativos y registros de auditoría.
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
                <span className="text-xs font-semibold text-sky-800">
                  {entry.source}
                </span>
                <time className="text-xs text-slate-600">
                  {displayDate(entry.at)}
                </time>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {entry.title}
              </p>
              {entry.detail && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                  {entry.detail}
                </p>
              )}
              {entry.actor && (
                <p className="mt-1 text-xs text-slate-600">{entry.actor}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
