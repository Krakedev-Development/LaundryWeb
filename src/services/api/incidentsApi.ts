import { useEffect, useState } from 'react';
import { apiRequest } from './apiConfig';
import { session } from '../auth/session';
import { getOrder } from './ordersApi';

// Incidencias del servidor (/incidents). El servidor es la única fuente de verdad: crear,
// pasar a revisión, resolver y cerrar se hace aquí. Al resolver una incidencia que retuvo la
// solicitud, el servidor la devuelve al estado en que estaba (previousStatus).

export type ServerIncidentStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type ServerIncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ServerIncident {
  id: string;
  orderId: string;
  driverId?: string | null;
  type: string;
  severity: ServerIncidentSeverity;
  status: ServerIncidentStatus;
  description: string;
  resolution?: string | null;
  previousStatus?: string | null;
  evidenceRefs?: string[];
  createdById?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

/** Datos de la solicitud que el listado de incidencias no trae. */
export interface IncidentOrderRef {
  trackingNumber: string;
  customerName: string;
}

export interface CreateIncidentPayload {
  orderId: string;
  type: string;
  severity: ServerIncidentSeverity;
  description: string;
  holdOrder?: boolean;
}

const request = <T>(path: string, method: string, body?: unknown) =>
  apiRequest<T>(path, {
    method,
    token: session.getToken(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export async function listIncidents(): Promise<ServerIncident[]> {
  const rows = await request<ServerIncident[] | { data?: ServerIncident[] }>('/incidents', 'GET');
  return Array.isArray(rows) ? rows : (rows?.data ?? []);
}

export const createIncident = (payload: CreateIncidentPayload) =>
  request<ServerIncident>('/incidents', 'POST', payload);

export const setIncidentStatus = (
  id: string,
  status: Exclude<ServerIncidentStatus, 'OPEN'>,
  resolution?: string,
) =>
  request<ServerIncident>(`/incidents/${id}/status`, 'POST', {
    status,
    ...(resolution ? { resolution } : {}),
  });

// ---- Reglas de presentación

export const INCIDENT_STATUS_LABEL: Record<ServerIncidentStatus, string> = {
  OPEN: 'Abierta',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
};

export const INCIDENT_SEVERITY_LABEL: Record<ServerIncidentSeverity, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const INCIDENT_TYPE_LABEL: Record<string, string> = {
  FAILED_PICKUP: 'Recogida fallida',
  FAILED_DELIVERY: 'Entrega fallida',
  MANCHA_PERSISTENTE: 'Mancha persistente',
  PRENDA_DANADA: 'Prenda dañada',
  PERDIDA_PARCIAL: 'Pérdida o discrepancia de prendas',
  DIRECCION_ERRONEA: 'Dirección errónea o inaccesible',
  CLIENTE_AUSENTE: 'Cliente ausente',
  RETRASO_OPERACIONAL: 'Retraso operacional',
  OTRO: 'Otro motivo',
};

export const incidentTypeLabel = (type: string) => INCIDENT_TYPE_LABEL[type] ?? type;

/** Incidencia que todavía requiere gestión. */
export const isIncidentActive = (i: Pick<ServerIncident, 'status'>) =>
  i.status === 'OPEN' || i.status === 'IN_REVIEW';

/**
 * La recogida fallida se resuelve reprogramando o cancelando desde el detalle de la solicitud;
 * resolverla aquí liberaría el pedido sin nueva franja de recogida.
 */
export const resolvesFromOrderDetail = (i: Pick<ServerIncident, 'type'>) =>
  i.type === 'FAILED_PICKUP';

/** Siguientes estados que el personal puede aplicar (mismas reglas que el servidor). */
export const nextIncidentStatuses = (
  status: ServerIncidentStatus,
): Exclude<ServerIncidentStatus, 'OPEN'>[] =>
  status === 'OPEN' ? ['IN_REVIEW', 'RESOLVED'] : status === 'IN_REVIEW' ? ['RESOLVED'] : status === 'RESOLVED' ? ['CLOSED'] : [];

// ---- Caché compartida (pantalla, sidebar y header ven la misma lista)

type Snapshot = {
  incidents: ServerIncident[];
  state: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
};

let snapshot: Snapshot = { incidents: [], state: 'idle' };
let inflight: Promise<void> | null = null;
const listeners = new Set<(s: Snapshot) => void>();

const publish = (next: Snapshot) => {
  snapshot = next;
  listeners.forEach((l) => l(snapshot));
};

export function refreshIncidents(): Promise<void> {
  if (inflight) return inflight;
  publish({ ...snapshot, state: snapshot.state === 'ready' ? 'ready' : 'loading' });
  inflight = listIncidents()
    .then((incidents) => publish({ incidents, state: 'ready' }))
    .catch((err: unknown) =>
      publish({
        ...snapshot,
        state: 'error',
        error: err instanceof Error ? err.message : 'No se pudieron cargar las incidencias.',
      }),
    )
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Sustituye o agrega una incidencia devuelta por el servidor sin recargar toda la lista. */
export function upsertIncident(incident: ServerIncident) {
  const rest = snapshot.incidents.filter((i) => i.id !== incident.id);
  publish({ ...snapshot, incidents: [incident, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
}

/** Solo para pruebas. */
export function resetIncidentsCache() {
  snapshot = { incidents: [], state: 'idle' };
  inflight = null;
}

export function useServerIncidents() {
  const [state, setState] = useState(snapshot);
  useEffect(() => {
    listeners.add(setState);
    setState(snapshot);
    if (snapshot.state === 'idle') void refreshIncidents();
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return { ...state, refresh: refreshIncidents };
}

// ---- Referencias de solicitud (número y cliente)

const orderRefs = new Map<string, Promise<IncidentOrderRef | null>>();

export function fetchIncidentOrderRef(orderId: string): Promise<IncidentOrderRef | null> {
  let pending = orderRefs.get(orderId);
  if (!pending) {
    pending = getOrder(orderId)
      .then((o) => ({
        trackingNumber: `SOL-${String(o.number).padStart(4, '0')}`,
        customerName:
          (o as unknown as { customer?: { user?: { name?: string } } }).customer?.user?.name ??
          'Cliente',
      }))
      .catch(() => {
        orderRefs.delete(orderId);
        return null;
      });
    orderRefs.set(orderId, pending);
  }
  return pending;
}
