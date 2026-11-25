import { useCallback, useEffect, useRef, useState } from 'react';
import { adminSocketService } from '../services/realtime/adminSocketService';
import {
  getOperationalSnapshot,
  getZonesMetricsSummary,
  mapFacilityResponseToFacility,
  mapZoneResponseToZone,
  type DriverInactivityAlert,
  type OperationalMapDriver,
  type OperationalMapIncident,
  type OperationalMapOrder,
  type ZoneMetricsSummary,
} from '../services/api/geoApi';
import type { Zone } from '../entities/zone/model/zone.types';
import type { Facility } from '../types';

export interface OperationalMapRealtimeState {
  connected: boolean;
  hasLiveSnapshot: boolean;
  scope: 'ADMIN' | 'SUPERVISOR';
  scopedFacilityId: string | null;
  zones: Zone[];
  facilities: Facility[];
  drivers: OperationalMapDriver[];
  orders: OperationalMapOrder[];
  incidents: OperationalMapIncident[];
  alerts: DriverInactivityAlert[];
  metrics: ZoneMetricsSummary[];
}

interface AdminMapSnapshotWire {
  scope?: 'ADMIN' | 'SUPERVISOR';
  scopedFacilityId?: string | null;
  drivers?: OperationalMapDriver[];
  orders?: OperationalMapOrder[];
  incidents?: OperationalMapIncident[];
  alerts?: DriverInactivityAlert[];
}

const POLL_SOCKET_CONNECTED_MS = 120_000;
const POLL_SOCKET_OFFLINE_MS = 10_000;

/**
 * Sincroniza el Mapa Operativo de LaundryWeb con el canal WebSocket `admin:map:*`
 * (portado de `uber-web/src/hooks/useZoneMapRealtime.ts`) y respaldo REST.
 * El backend acota automáticamente a `SUPERVISOR` a su sede/zona asignada.
 */
export function useOperationalMapRealtime(enabled = true): OperationalMapRealtimeState {
  const [connected, setConnected] = useState(adminSocketService.connected);
  const [hasLiveSnapshot, setHasLiveSnapshot] = useState(false);
  const [scope, setScope] = useState<'ADMIN' | 'SUPERVISOR'>('ADMIN');
  const [scopedFacilityId, setScopedFacilityId] = useState<string | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [drivers, setDrivers] = useState<OperationalMapDriver[]>([]);
  const [orders, setOrders] = useState<OperationalMapOrder[]>([]);
  const [incidents, setIncidents] = useState<OperationalMapIncident[]>([]);
  const [alerts, setAlerts] = useState<DriverInactivityAlert[]>([]);
  const [metrics, setMetrics] = useState<ZoneMetricsSummary[]>([]);

  const mountedRef = useRef(true);

  const fetchRestSnapshot = useCallback(async () => {
    try {
      const [snap, summary] = await Promise.all([
        getOperationalSnapshot(),
        getZonesMetricsSummary().catch(() => [] as ZoneMetricsSummary[]),
      ]);
      if (!mountedRef.current) return;

      const mappedZones = snap.zones.map((z) => mapZoneResponseToZone(z));
      const mappedFacilities = snap.facilities.map((f) =>
        mapFacilityResponseToFacility(f, mappedZones),
      );

      setScope(snap.scope);
      setScopedFacilityId(snap.scopedFacilityId);
      setZones(mappedZones);
      setFacilities(mappedFacilities);
      setDrivers(snap.drivers);
      setOrders(snap.orders);
      setIncidents(snap.incidents);
      if (Array.isArray(snap.alerts)) setAlerts(snap.alerts);
      setMetrics(summary);
      setHasLiveSnapshot(true);
    } catch {
      // Si el backend no está disponible, OperationalMapPage mantiene fallback local.
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void fetchRestSnapshot();
    const socket = adminSocketService.ensureConnected();

    const subscribe = () => {
      if (adminSocketService.connected) {
        adminSocketService.emit('admin:map:subscribe');
      }
    };

    const onConnect = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      subscribe();
    };
    const onDisconnect = () => {
      if (!mountedRef.current) return;
      setConnected(false);
    };

    socket?.on('connect', onConnect);
    socket?.on('authenticated', subscribe);
    socket?.on('disconnect', onDisconnect);
    if (adminSocketService.connected) {
      setConnected(true);
      subscribe();
    }

    const unsubSnapshot = adminSocketService.on(
      'admin:map:snapshot',
      (data: AdminMapSnapshotWire) => {
        if (!mountedRef.current || !data) return;
        if (data.scope) setScope(data.scope);
        if (data.scopedFacilityId !== undefined) {
          setScopedFacilityId(data.scopedFacilityId);
        }
        if (Array.isArray(data.drivers)) setDrivers(data.drivers);
        if (Array.isArray(data.orders)) setOrders(data.orders);
        if (Array.isArray(data.incidents)) setIncidents(data.incidents);
        if (Array.isArray(data.alerts)) setAlerts(data.alerts);
        setHasLiveSnapshot(true);
      },
    );

    const unsubDriverLocations = adminSocketService.on(
      'admin:map:driver-locations',
      (data: { drivers?: OperationalMapDriver[] }) => {
        const incoming = data?.drivers ?? [];
        if (!mountedRef.current || incoming.length === 0) return;
        setDrivers((prev) => {
          const byId = new Map(prev.map((d) => [d.driverId, d]));
          for (const d of incoming) {
            const existing = byId.get(d.driverId);
            byId.set(d.driverId, existing ? { ...existing, ...d } : d);
          }
          return Array.from(byId.values());
        });
      },
    );

    const unsubDriverOffline = adminSocketService.on(
      'admin:map:driver-offline',
      (data: { driverId?: string }) => {
        if (!mountedRef.current || !data?.driverId) return;
        setDrivers((prev) =>
          prev.map((d) =>
            d.driverId === data.driverId ? { ...d, status: 'OFFLINE' } : d,
          ),
        );
      },
    );

    const unsubOrderUpdated = adminSocketService.on(
      'admin:map:order-updated',
      () => {
        void fetchRestSnapshot();
      },
    );

    const unsubDriverAlerts = adminSocketService.on(
      'admin:map:driver-alerts',
      (data: { alerts?: DriverInactivityAlert[] }) => {
        if (!mountedRef.current) return;
        if (Array.isArray(data?.alerts)) {
          setAlerts(data.alerts);
        }
      },
    );

    return () => {
      socket?.off('connect', onConnect);
      socket?.off('authenticated', subscribe);
      socket?.off('disconnect', onDisconnect);
      unsubSnapshot();
      unsubDriverLocations();
      unsubDriverOffline();
      unsubOrderUpdated();
      unsubDriverAlerts();
      adminSocketService.emit('admin:map:unsubscribe');
    };
  }, [enabled, fetchRestSnapshot]);

  // Respaldo REST periódico (largo cuando WS está conectado, rápido si cayó).
  useEffect(() => {
    if (!enabled) return;
    const ms = connected ? POLL_SOCKET_CONNECTED_MS : POLL_SOCKET_OFFLINE_MS;
    const timer = setInterval(() => {
      void fetchRestSnapshot();
    }, ms);
    return () => clearInterval(timer);
  }, [enabled, connected, fetchRestSnapshot]);

  return {
    connected,
    hasLiveSnapshot,
    scope,
    scopedFacilityId,
    zones,
    facilities,
    drivers,
    orders,
    incidents,
    alerts,
    metrics,
  };
}
