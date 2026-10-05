import { operationalStage } from '../../services/fulfillment';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseMap, type MapPoint } from '../../components/maps/BaseMap';
import { isLocationStale } from '../../services/geo/DispatchService';
import { SERVICE_AREAS } from '../../services/geo/demo';
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
  const points: MapPoint[] = [];
  if (layers.facility)
    facilities
      .filter(
        (f) =>
          !zone ||
          SERVICE_AREAS.find((a) => a.facilityId === f.id)?.id === zone,
      )
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
            d.status +
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
    <div className="space-y-5">
      <PageHeader
        title="Mapa Operativo Logístico"
        subtitle="Escenario local de Samborondón. Movimiento de choferes simulado."
      />
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border">
        {(Object.keys(layers) as (keyof typeof layers)[]).map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={(e) =>
                setLayers({ ...layers, [key]: e.target.checked })
              }
            />{' '}
            {
              {
                facility: 'Sedes',
                driver: 'Choferes',
                pickup: 'Recogidas',
                delivery: 'Entregas',
                incident: 'Incidencias',
              }[key]
            }
          </label>
        ))}
        <select
          aria-label="Zona"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        >
          <option value="">Todas las zonas</option>
          {SERVICE_AREAS.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>
      <BaseMap points={points} onSelect={open} height={520} />
      <section
        className="grid md:grid-cols-2 xl:grid-cols-3 gap-3"
        aria-label="Ubicaciones operativas"
      >
        {points.map((p) => (
          <button
            key={p.kind + p.id}
            className="text-left rounded-xl border bg-white p-4"
            onClick={() => open(p.id)}
          >
            <strong>{p.label}</strong>
            <p className="text-sm text-slate-600">{p.detail}</p>
            {p.stale && (
              <p className="text-xs text-amber-800">Ubicación desactualizada</p>
            )}
          </button>
        ))}
      </section>
      {!points.length && <p>No hay ubicaciones para estos filtros.</p>}
    </div>
  );
}
