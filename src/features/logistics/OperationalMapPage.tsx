import '../../shared/ui/operations/operations.css';
import { MapLayersToolbar } from './zones/MapLayersToolbar';
import { MapLocations } from './zones/MapLocations';
import { MapPinned, Radio } from 'lucide-react';
import { DriverMapLegend } from './zones/DriverMapLegend';
import { driverStates } from '../../components/maps/mapPointAppearance';
import { operationalStage } from '../../services/fulfillment';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import type { MapPoint } from '../../components/maps/BaseMap';
import { MapboxZoneMap } from '../../components/maps/MapboxZoneMap';
import { isLocationStale } from '../../services/geo/DispatchService';
import { useZones } from './zones/useZones';
import { facilityZoneId } from '../../entities/zone/model/zone.rules';
import { DriverMapControls } from './zones/DriverMapControls';
import {
  isIncidentActive,
  useServerIncidents,
} from '../../services/api/incidentsApi';
import { useOperationalMapRealtime } from '../../hooks/useOperationalMapRealtime';
import type { Driver } from '../../types';

export function OperationalMapPage() {
  const {
    facilities: localFacilities,
    drivers: localDrivers,
    orders: localOrders,
    currentUser,
  } = useApp();
  const { incidents: localIncidents } = useServerIncidents();
  const { zones: localZones, error } = useZones();
  const realtime = useOperationalMapRealtime(true);
  const isSupervisor = currentUser.role === 'SUPERVISOR';
  const navigate = useNavigate();

  const [layers, setLayers] = useState({
    facility: true,
    driver: true,
    pickup: true,
    delivery: true,
    incident: true,
  });
  const [zone, setZone] = useState('');
  const [showZones, setShowZones] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [following, setFollowing] = useState(false);

  // Fuente de verdad: snapshot en tiempo real del servidor (acotado para SUPERVISOR);
  // fallback a datos locales si el servidor no respondió.
  const zones = realtime.hasLiveSnapshot ? realtime.zones : localZones;
  const facilities = realtime.hasLiveSnapshot
    ? realtime.facilities
    : localFacilities;

  const liveDriversAsControl = useMemo(() => {
    if (!realtime.hasLiveSnapshot) {
      return localDrivers.map((d) => ({
        id: d.id,
        name: d.name,
        plate: d.vehiclePlate ?? '',
        status: d.status,
        zoneId: d.zoneId,
        location: d.location,
      }));
    }
    return realtime.drivers
      .filter((d) => d.lat !== null && d.lng !== null)
      .map((d) => ({
        id: d.driverId,
        name: d.name,
        plate: d.plate ?? '',
        status: (d.status as Driver['status']) ?? 'OFFLINE',
        zoneId: d.zoneId,
        location: {
          lat: d.lat as number,
          lng: d.lng as number,
          lastUpdated: d.locationAt ?? new Date(0).toISOString(),
        },
      }));
  }, [realtime.hasLiveSnapshot, realtime.drivers, localDrivers]);

  const filteredDrivers = liveDriversAsControl.filter(
    (driver) => !zone || driver.zoneId === zone,
  );
  const followed =
    following && filteredDrivers.find((driver) => driver.id === selectedDriver);

  const points: MapPoint[] = [];

  if (layers.facility) {
    facilities
      .filter((f) => !zone || facilityZoneId(f, zones) === zone)
      .forEach((f) =>
        points.push({
          id: f.id,
          label: f.name,
          coordinates: f.coordinates,
          kind: 'facility',
          detail: `${f.address} · ${f.status === 'ACTIVE' ? 'Operativa' : 'Mantenimiento'}`,
        }),
      );
  }

  if (layers.driver) {
    filteredDrivers.forEach((d) => {
      const age = Math.max(
        0,
        Math.floor((Date.now() - Date.parse(d.location.lastUpdated)) / 60000),
      );
      points.push({
        id: d.id,
        label: d.name,
        coordinates: d.location,
        kind: 'driver',
        status: d.status,
        stale: isLocationStale(d.location.lastUpdated),
        detail:
          (driverStates[d.status]?.label ?? d.status) +
          (d.plate ? ` · ${d.plate}` : '') +
          ' · Última señal hace ' +
          (Number.isFinite(age) ? age : '?') +
          ' min',
      });
    });
  }

  if (realtime.hasLiveSnapshot) {
    realtime.orders
      .filter((o) => !zone || o.zoneId === zone)
      .forEach((o) => {
        const code = `ORD-${String(o.orderNumber).padStart(4, '0')}`;
        if (o.kind === 'pickup' && layers.pickup) {
          points.push({
            id: o.orderId,
            label: `${code} · Recogida`,
            coordinates: { lat: o.lat, lng: o.lng },
            kind: 'pickup',
            detail: `${o.customerName} · ${o.addressText}`,
          });
        }
        if (o.kind === 'delivery' && layers.delivery) {
          points.push({
            id: o.orderId,
            label: `${code} · Entrega`,
            coordinates: { lat: o.lat, lng: o.lng },
            kind: 'delivery',
            detail: `${o.customerName} · ${o.addressText}`,
          });
        }
      });

    if (layers.incident) {
      realtime.incidents
        .filter((inc) => !zone || inc.zoneId === zone)
        .forEach((inc) => {
          const code = `ORD-${String(inc.orderNumber).padStart(4, '0')}`;
          points.push({
            id: inc.incidentId,
            label: `Incidencia · ${code}`,
            coordinates: { lat: inc.lat, lng: inc.lng },
            kind: 'incident',
            detail: inc.description,
          });
        });
    }
  } else {
    localOrders
      .filter((o) => !zone || o.zoneId === zone)
      .forEach((o) => {
        if (
          layers.pickup &&
          [
            'PICKUP_PENDING',
            'PICKUP_ASSIGNED',
            'HEADING_TO_PICKUP',
            'ARRIVED_FOR_PICKUP',
          ].includes(operationalStage(o))
        ) {
          points.push({
            id: o.id,
            label: o.id + ' · Recogida',
            coordinates: o.customerAddress.coordinates,
            kind: 'pickup',
            detail: o.customerName,
          });
        }
        if (
          layers.delivery &&
          [
            'DELIVERY_ASSIGNED',
            'OUT_FOR_DELIVERY',
            'ARRIVED_FOR_DELIVERY',
          ].includes(operationalStage(o))
        ) {
          points.push({
            id: o.id,
            label: o.id + ' · Entrega',
            coordinates: o.deliveryAddress.coordinates,
            kind: 'delivery',
            detail: o.customerName,
          });
        }
      });
    if (layers.incident) {
      localIncidents
        .filter(isIncidentActive)
        .forEach((i) => {
          const o = localOrders.find((v) => v.id === i.orderId);
          if (o && (!zone || o.zoneId === zone)) {
            points.push({
              id: i.id,
              label: 'Incidencia · ' + o.id,
              coordinates: o.customerAddress.coordinates,
              kind: 'incident',
              detail: i.description,
            });
          }
        });
    }
  }

  const openPoint = (id: string, kind?: MapPoint['kind']) => {
    const resolvedKind = kind ?? points.find((p) => p.id === id)?.kind;
    if (resolvedKind === 'pickup' || resolvedKind === 'delivery') {
      navigate('/operations/orders/' + id);
    } else if (resolvedKind === 'facility') {
      navigate('/logistics/facilities');
    } else if (resolvedKind === 'driver') {
      navigate('/logistics/drivers');
    } else {
      navigate('/operations/incidents/' + id);
    }
  };

  return (
    <div className="ops-ui space-y-6">
      <PageHeader
        title="Mapa Operativo Logístico"
        subtitle={
          isSupervisor
            ? 'Seguimiento en tiempo real acotado a tu sede y zona asignada.'
            : 'Seguimiento en tiempo real de zonas, sedes, choferes y pedidos con Mapbox.'
        }
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                realtime.connected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              {realtime.connected ? 'En vivo · WebSocket' : 'Sincronización REST'}
            </span>
          </div>
        }
      />
      <MapLayersToolbar
        layers={layers}
        onLayersChange={setLayers}
        zones={zones}
        zone={zone}
        onZoneChange={(value) => {
          setZone(value);
          setSelectedDriver('');
          setFollowing(false);
        }}
        showZones={showZones}
        onShowZonesChange={setShowZones}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <DriverMapControls
        drivers={filteredDrivers}
        selected={selectedDriver}
        onSelect={(id) => {
          setSelectedDriver(id);
          setFollowing(false);
        }}
        following={following}
        onFollow={() => setFollowing((value) => !value)}
      />
      <section className="ops-panel" aria-label="Mapa y estados operativos">
        <div className="ops-panel-header">
          <div className="ops-panel-title">
            <span className="ops-icon">
              <MapPinned />
            </span>
            <div>
              <h2 className="ops-heading">Distribución operativa</h2>
              <p className="ops-caption">
                Sedes, choferes en tiempo real y servicios activos sobre Mapbox.
              </p>
            </div>
          </div>
          <span className="ops-badge ops-badge-selected">
            {zone
              ? zones.find((area) => area.id === zone)?.name
              : isSupervisor
                ? 'Tu sede y zona asignada'
                : 'Todas las zonas'}
          </span>
        </div>
        <div className="ops-map-content">
          <MapboxZoneMap
            fitZones
            points={points}
            zones={
              showZones ? zones.filter((area) => !zone || area.id === zone) : []
            }
            selectedZoneId={zone || undefined}
            metrics={realtime.metrics}
            center={followed ? followed.location : undefined}
            onSelect={(id, kind) => {
              if (kind === 'driver') {
                setSelectedDriver(id);
                setFollowing(true);
              } else {
                openPoint(id, kind);
              }
            }}
            height={520}
          />
        </div>
        <DriverMapLegend />
      </section>
      <MapLocations points={points} onOpen={(id) => openPoint(id)} />
    </div>
  );
}
