import { operationalStage } from '../../services/fulfillment';
import { storageService } from '../../services/storage';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { BaseMap } from '../../components/maps/BaseMap';
import { useDriverCandidates } from '../../components/maps/useDriverCandidates';
import { routingService } from '../../services/geo';
import { geoConfig } from '../../services/geo/geo.config';
import type { RouteSummary } from '../../services/geo/geo.types';
export function DispatchPage() {
  const navigate = useNavigate();
  const { orders, drivers, assignDriver } = useApp();
  const [type, setType] = useState<'pickup' | 'delivery'>('pickup'),
    [orderId, setOrderId] = useState(''),
    [driverId, setDriverId] = useState(''),
    [notes, setNotes] = useState('');
  const queue = orders.filter(
    (o) =>
      o.fulfillment?.mode !== 'STORE_STORE' &&
      (type === 'pickup'
        ? operationalStage(o) === 'PICKUP_PENDING'
        : ['READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED'].includes(
            operationalStage(o),
          )),
  );
  const order = queue.find((o) => o.id === orderId) ?? queue[0];
  const { candidates, loading, error } = useDriverCandidates(order, type);
  const [route, setRoute] = useState<RouteSummary | null>(null),
    [routeError, setRouteError] = useState('');
  const destination =
    order &&
    (type === 'pickup'
      ? order.customerAddress.coordinates
      : order.deliveryAddress.coordinates);
  const driver = drivers.find((d) => d.id === driverId);
  useEffect(() => {
    setDriverId('');
    setRoute(null);
    setNotes('');
  }, [order?.id, type]);
  useEffect(() => {
    setRoute(null);
    setRouteError('');
    if (!driver || !destination) return;
    const controller = new AbortController();
    routingService
      .getRoute(driver.location, destination, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setRoute(value);
          if (!value)
            setRouteError('No pudimos calcular una ruta por carretera.');
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setRouteError(e.message);
      });
    return () => controller.abort();
  }, [driverId, order?.id, type]);
  return (
    <div className="space-y-6">
      <button
        className="text-sm text-blue-800 underline"
        onClick={() => {
          const demo = storageService.createDemoOrder();
          navigate('/operations/orders/' + demo.id);
        }}
      >
        Abrir solicitud de demostración
      </button>
      <PageHeader
        title="Despacho"
        subtitle="Selecciona una solicitud, compara choferes y confirma la asignación."
      />
      <div className="flex gap-2">
        {(['pickup', 'delivery'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setType(value)}
            className={
              type === value
                ? 'rounded-lg px-4 py-2 bg-[#143F73] text-white'
                : 'rounded-lg px-4 py-2 bg-white border'
            }
          >
            {value === 'pickup' ? 'Recogidas' : 'Entregas'}
          </button>
        ))}
      </div>
      {geoConfig.mode === 'demo' && (
        <p className="text-sm text-amber-800">
          Escenario local: tiempos y distancias simulados.
        </p>
      )}
      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        <section className="space-y-2">
          {!queue.length && <p>No hay solicitudes pendientes de asignación.</p>}
          {queue.map((o) => (
            <button
              key={o.id}
              className={
                'block text-left w-full p-4 rounded-xl border bg-white ' +
                (o.id === order?.id ? 'border-blue-700' : 'border-slate-200')
              }
              onClick={() => setOrderId(o.id)}
            >
              <strong>{o.id}</strong>
              <p className="text-sm">{o.customerName}</p>
              <p className="text-xs">
                {o.zoneName} · {o.priority}
              </p>
            </button>
          ))}
        </section>
        <BaseMap
          center={destination}
          route={route}
          points={
            order && destination
              ? [
                  {
                    id: order.id,
                    coordinates: destination,
                    label: type === 'pickup' ? 'Recogida' : 'Entrega',
                    kind: type,
                  },
                  ...candidates.map((c) => {
                    const d = drivers.find((v) => v.id === c.driverId)!;
                    return {
                      id: d.id,
                      coordinates: d.location,
                      label: d.name,
                      kind: 'driver' as const,
                    };
                  }),
                ]
              : []
          }
          onSelect={(id) => {
            if (candidates.some((c) => c.driverId === id)) setDriverId(id);
          }}
        />
      </div>
      {loading && <p role="status">Calculando mejores choferes…</p>}
      {error && <p role="alert">{error}</p>}
      {routeError && <p role="alert">{routeError}</p>}
      {order && !loading && !error && !candidates.length && (
        <p>
          No hay choferes elegibles. Revisa disponibilidad, cobertura, sede,
          capacidad y antigüedad de ubicación.
        </p>
      )}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {candidates.map((candidate, i) => {
          const d = drivers.find((v) => v.id === candidate.driverId)!;
          return (
            <button
              key={d.id}
              className={
                'text-left bg-white p-4 border rounded-xl ' +
                (driverId === d.id ? 'border-blue-700' : 'border-slate-200')
              }
              onClick={() => setDriverId(d.id)}
            >
              <strong>{d.name}</strong>
              {i === 0 && <span className="ml-2 text-xs">Recomendado</span>}
              <p>
                {Math.ceil(candidate.etaSeconds! / 60)} min ·{' '}
                {(candidate.distanceMeters! / 1000).toFixed(1)} km
              </p>
              <p className="text-xs text-slate-600">
                {candidate.reasons.join(' · ')}
              </p>
            </button>
          );
        })}
      </section>
      {order && (
        <div className="flex flex-wrap gap-3">
          <input
            aria-label="Notas de asignación"
            className="border rounded-lg p-2 flex-1"
            placeholder="Notas de asignación"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            disabled={
              loading || !candidates.some((c) => c.driverId === driverId)
            }
            className="bg-[#143F73] text-white px-5 py-2 rounded-lg disabled:opacity-40"
            onClick={() => {
              if (assignDriver(order.id, driverId, type, notes))
                setDriverId('');
            }}
          >
            Asignar chofer seleccionado
          </button>
        </div>
      )}
    </div>
  );
}
