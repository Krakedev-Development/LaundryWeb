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
  const stage = operationalStage(order);

  const isDeliveryStage = [
    'READY_FOR_DELIVERY',
    'DELIVERY_SCHEDULED',
    'DELIVERY_ASSIGNED',
    'OUT_FOR_DELIVERY',
    'ARRIVED_FOR_DELIVERY',
    'DELIVERED',
    'CLOSED',
  ].includes(stage);

  const isHeadingToFacility = [
    'PICKED_UP',
    'HEADING_TO_FACILITY',
    'ARRIVED_AT_FACILITY',
  ].includes(stage);

  const isPickupStage = !isDeliveryStage && !isHeadingToFacility;
  const isPickupInRoute = stage === 'HEADING_TO_PICKUP' || stage === 'ARRIVED_FOR_PICKUP';
  const isDeliveryInRoute = stage === 'OUT_FOR_DELIVERY' || stage === 'ARRIVED_FOR_DELIVERY';

  const driverId = isDeliveryStage ? order.delivery.driverId : order.pickup.driverId;
  const driver = drivers.find((d) => d.id === driverId);

  // Solo hay telemetría si hay conductor asignado con ubicación y está activamente en ruta
  const hasTelemetry = Boolean(
    driver?.location &&
      (isPickupInRoute || stage === 'HEADING_TO_FACILITY' || isDeliveryInRoute)
  );

  const target = isHeadingToFacility
    ? facility?.coordinates
    : isDeliveryStage
      ? order.deliveryAddress.coordinates
      : order.customerAddress.coordinates;

  const origin = hasTelemetry ? driver?.location : null;

  const [route, setRoute] = useState<RouteSummary | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasTelemetry || !origin || !target) {
      setRoute(null);
      setError('');
      setLoading(false);
      return;
    }
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
  }, [order.id, stage, driverId, hasTelemetry, origin?.lat, origin?.lng, target?.lat, target?.lng]);

  const points: MapPoint[] = [];

  if (isPickupStage) {
    if (order.customerAddress.coordinates) {
      points.push({
        id: 'pickup',
        kind: 'pickup',
        label: 'Recogida',
        coordinates: order.customerAddress.coordinates,
      });
    }
    if (facility) {
      points.push({
        id: facility.id,
        kind: 'facility',
        label: facility.name,
        coordinates: facility.coordinates,
      });
    }
  } else if (isHeadingToFacility) {
    if (facility) {
      points.push({
        id: facility.id,
        kind: 'facility',
        label: facility.name,
        coordinates: facility.coordinates,
      });
    }
  } else {
    if (order.deliveryAddress.coordinates) {
      points.push({
        id: 'delivery',
        kind: 'delivery',
        label: 'Entrega',
        coordinates: order.deliveryAddress.coordinates,
      });
    }
    if (facility) {
      points.push({
        id: facility.id,
        kind: 'facility',
        label: facility.name,
        coordinates: facility.coordinates,
      });
    }
  }

  if (driver?.location && hasTelemetry) {
    points.push({
      id: driver.id,
      kind: 'driver',
      label: driver.name,
      coordinates: driver.location,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold">Ubicaciones y ruta de la etapa actual</h2>
      <BaseMap points={points} route={route} center={target} />
      {loading && <p role="status">Calculando ruta…</p>}
      {error && <p role="alert">{error}</p>}
      {/* Una ruta de menos de 50 m no es informativa (faltan las coordenadas reales). */}
      {route && route.distanceMeters >= 50 && (
        <p className="text-sm">
          {(route.distanceMeters / 1000).toFixed(1)} km ·{' '}
          {Math.ceil(route.durationSeconds / 60)} min estimados
        </p>
      )}
      {!hasTelemetry && (
        <p className="text-xs text-slate-500">
          Ubicaciones de la etapa actual. El trazado de ruta en vivo se activa cuando el chofer inicia el traslado.
        </p>
      )}
    </section>
  );
}
