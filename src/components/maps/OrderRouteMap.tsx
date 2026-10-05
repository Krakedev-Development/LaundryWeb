import { operationalStage } from '../../services/fulfillment';
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Order } from '../../types';
import { BaseMap, type MapPoint } from './BaseMap';
import { routingService } from '../../services/geo';
import type { RouteSummary } from '../../services/geo/geo.types';
export function OrderRouteMap({ order }: { order: Order }) {
  const { facilities, drivers } = useApp();
  const facility = facilities.find((f) => f.id === order.facilityId);
  const delivery = [
    'READY_FOR_DELIVERY',
    'DELIVERY_SCHEDULED',
    'DELIVERY_ASSIGNED',
    'OUT_FOR_DELIVERY',
    'ARRIVED_FOR_DELIVERY',
    'DELIVERED',
    'CLOSED',
  ].includes(operationalStage(order));
  const toFacility = [
    'PICKED_UP',
    'HEADING_TO_FACILITY',
    'ARRIVED_AT_FACILITY',
    'AT_FACILITY',
    'IN_PROCESS',
    'QUALITY_CONTROL',
  ].includes(operationalStage(order));
  const driverId = delivery ? order.delivery.driverId : order.pickup.driverId;
  const driver = drivers.find((d) => d.id === driverId);
  const target = toFacility
    ? facility?.coordinates
    : delivery
      ? order.deliveryAddress.coordinates
      : order.customerAddress.coordinates;
  const origin = driver?.location ?? facility?.coordinates;
  const [route, setRoute] = useState<RouteSummary | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (order.fulfillment?.mode === "STORE_STORE" || !origin || !target) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setRoute(null);
    routingService
      .getRoute(origin, target, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setRoute(value);
          if (!value) setError('No pudimos calcular una ruta por carretera.');
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [order.id, operationalStage(order), driverId, target?.lat, target?.lng]);
  const points: MapPoint[] = [
    {
      id: 'pickup',
      kind: 'pickup',
      label: 'Recogida',
      coordinates: order.customerAddress.coordinates,
    },
    {
      id: 'delivery',
      kind: 'delivery',
      label: 'Entrega',
      coordinates: order.deliveryAddress.coordinates,
    },
  ];
  if (facility)
    points.push({
      id: facility.id,
      kind: 'facility',
      label: facility.name,
      coordinates: facility.coordinates,
    });
  if (driver)
    points.push({
      id: driver.id,
      kind: 'driver',
      label: driver.name,
      coordinates: driver.location,
    });
  if(order.fulfillment?.mode === "STORE_STORE" && facility) return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold mb-3">Sede de ingreso y retiro</h2><BaseMap center={facility.coordinates} points={[{id:facility.id,kind:"facility",label:facility.name,coordinates:facility.coordinates}]} height={300}/></section>;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold">Ubicaciones y ruta de la etapa actual</h2>
      <BaseMap points={points} route={route} center={target} />
      {loading && <p role="status">Calculando ruta…</p>}
      {error && <p role="alert">{error}</p>}
      {route && (
        <p className="text-sm">
          {(route.distanceMeters / 1000).toFixed(1)} km ·{' '}
          {Math.ceil(route.durationSeconds / 60)} min estimados
          {route.simulated ? ' · demostración' : ''}
        </p>
      )}
      <p className="text-xs text-slate-500">
        Recogida y entrega se calculan como etapas independientes.
      </p>
    </section>
  );
}
