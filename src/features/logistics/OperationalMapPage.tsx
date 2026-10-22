import '../../shared/ui/operations/operations.css';
import { MapLayersToolbar } from './zones/MapLayersToolbar';
import { MapLocations } from './zones/MapLocations';
import { MapPinned } from 'lucide-react';
import { DriverMapLegend } from './zones/DriverMapLegend';
import { driverStates } from '../../components/maps/mapPointAppearance';
import { operationalStage } from '../../services/fulfillment';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseMap, type MapPoint } from '../../components/maps/BaseMap';
import { isLocationStale } from '../../services/geo/DispatchService';
import { useZones } from './zones/useZones';
import { facilityZoneId } from '../../entities/zone/model/zone.rules';
import { DriverMapControls } from './zones/DriverMapControls';
export function OperationalMapPage() {
  const { facilities, drivers, orders, incidents } = useApp();
  const navigate = useNavigate();
  const [layers, setLayers] = useState({
    facility: true,
    driver: true,
    pickup: true,
    delivery: true,
    incident: true,
  });
  const [zone, setZone] = useState('');
  const { zones, error } = useZones();
  const [showZones, setShowZones] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [following, setFollowing] = useState(false);
  const filteredDrivers = drivers.filter(
    (driver) => !zone || driver.zoneId === zone,
  );
  const followed =
    following && filteredDrivers.find((driver) => driver.id === selectedDriver);
  const points: MapPoint[] = [];
  if (layers.facility)
    facilities
      .filter((f) => !zone || facilityZoneId(f, zones) === zone)
      .forEach((f) =>
        points.push({
          id: f.id,
          label: f.name,
          coordinates: f.coordinates,
          kind: 'facility',
          detail: f.address,
        }),
      );
  if (layers.driver)
    drivers
      .filter((d) => !zone || d.zoneId === zone)
      .forEach((d) => {
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
            ' · Última ubicación hace ' +
            (Number.isFinite(age) ? age : '?') +
            ' min',
        });
      });
  orders
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
      )
        points.push({
          id: o.id,
          label: o.id + ' · Recogida',
          coordinates: o.customerAddress.coordinates,
          kind: 'pickup',
          detail: o.customerName,
        });
      if (
        layers.delivery &&
        [
          'DELIVERY_ASSIGNED',
          'OUT_FOR_DELIVERY',
          'ARRIVED_FOR_DELIVERY',
        ].includes(operationalStage(o))
      )
        points.push({
          id: o.id,
          label: o.id + ' · Entrega',
          coordinates: o.deliveryAddress.coordinates,
          kind: 'delivery',
          detail: o.customerName,
        });
    });
  if (layers.incident)
    incidents
      .filter((i) => ['OPEN', 'IN_PROGRESS'].includes(i.status))
      .forEach((i) => {
        const o = orders.find((v) => v.id === i.orderId);
        if (o && (!zone || o.zoneId === zone))
          points.push({
            id: i.id,
            label: 'Incidencia · ' + o.id,
            coordinates: o.customerAddress.coordinates,
            kind: 'incident',
            detail: i.description,
          });
      });
  const open = (id: string) => {
    if (id.startsWith('SOL-')) navigate('/operations/orders/' + id);
    else if (id.startsWith('FAC-')) navigate('/logistics/facilities');
    else if (id.startsWith('DRV-')) navigate('/logistics/drivers');
    else navigate('/operations/incidents/' + id);
  };
  return (
    <div className="ops-ui space-y-6">
      <PageHeader
        title="Mapa Operativo Logístico"
        subtitle="Escenario local de Samborondón. Movimiento de choferes simulado."
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
                Sedes, choferes y servicios en el mapa.
              </p>
            </div>
          </div>
          <span className="ops-badge ops-badge-selected">
            {zone
              ? zones.find((area) => area.id === zone)?.name
              : 'Todas las zonas'}
          </span>
        </div>
        <div className="ops-map-content">
          <BaseMap
            fitZones
            points={points}
            zones={
              showZones ? zones.filter((area) => !zone || area.id === zone) : []
            }
            center={followed ? followed.location : undefined}
            onSelect={(id) => {
              if (drivers.some((driver) => driver.id === id)) {
                setSelectedDriver(id);
                setFollowing(true);
              } else open(id);
            }}
            height={520}
          />
        </div>
        <DriverMapLegend />
      </section>
      <MapLocations points={points} onOpen={open} />
    </div>
  );
}
