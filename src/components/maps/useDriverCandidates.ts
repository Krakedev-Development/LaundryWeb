import { storageService } from '../../services/storage';
import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { dispatchService } from '../../services/geo';
import { serviceAreaService } from '../../services/geo/ServiceAreaService';
import {
  isLocationStale,
  type DriverCandidate,
  type ExcludedDriver,
} from '../../services/geo/DispatchService';
import { getOrderDriverCandidates } from '../../services/api/ordersApi';
import type { Order } from '../../types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useDriverCandidates(
  order: Order | undefined,
  type: 'pickup' | 'delivery',
) {
  const { drivers } = useApp();
  const policy = storageService.getWorkflow().businessPolicy;
  const [candidates, setCandidates] = useState<DriverCandidate[]>([]),
    [excluded, setExcluded] = useState<ExcludedDriver[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const coordinates =
    order &&
    (type === 'pickup'
      ? order.customerAddress.coordinates
      : order.deliveryAddress.coordinates);
  const snapshot = drivers
    .map(
      (d) =>
        `${d.id}:${d.status}:${d.activeOrders}:${d.maxOrders}:${d.facilityId}:${d.zoneId}:${d.rating}:${d.authorizedZoneIds?.join(',')}:${isLocationStale(d.location.lastUpdated)}`,
    )
    .join('|');
  useEffect(() => {
    setCandidates([]);
    setExcluded([]);
    setError('');
    if (!order || !coordinates) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const leg = type === 'pickup' ? 'INBOUND' : 'OUTBOUND';

    const evaluateLocalFallback = () => {
      const area = serviceAreaService.findArea(coordinates);
      return dispatchService.evaluate(
        drivers.map((d) => ({
          id: d.id,
          status: d.status,
          coordinates: d.location,
          updatedAt: d.location.lastUpdated,
          facilityId: d.facilityId,
          zoneId: d.zoneId,
          activeOrders: d.activeOrders,
          maxOrders: policy.driverLimit ?? d.maxOrders,
          rating: d.rating,
          authorizedZoneIds: d.authorizedZoneIds,
        })),
        {
          id: order.id,
          coordinates,
          facilityId: order.facilityId,
          zoneId: area?.id ?? order.zoneId,
        },
        controller.signal,
        policy.enforceDriverLimit,
      );
    };

    const run = async () => {
      if (UUID_RE.test(order.id)) {
        try {
          const remote = await getOrderDriverCandidates(order.id, leg);
          if (controller.signal.aborted) return;
          setCandidates(
            remote.candidates.map((c) => ({
              driverId: c.driverId,
              eligible: true,
              etaSeconds: c.etaSeconds,
              distanceMeters: c.distanceMeters,
              detourMeters: c.detourMeters,
              routeFit: c.routeFit,
              activeStopsCount: c.activeStopsCount,
              score: c.score,
              reasons: c.reasons,
            })),
          );
          setExcluded(
            remote.excluded.map((e) => ({
              driverId: e.driverId,
              reasons: e.reasons,
              locationAt: e.locationAt ?? '',
            })),
          );
          return;
        } catch {
          // Si falla el servidor, conservar respaldo local de elegibilidad.
        }
      }
      const value = await evaluateLocalFallback();
      if (controller.signal.aborted) return;
      setCandidates(value.candidates);
      setExcluded(value.excluded);
    };

    void run()
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'No se pudieron evaluar choferes.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    order?.id,
    order?.facilityId,
    type,
    snapshot,
    policy.enforceDriverLimit,
    policy.driverLimit,
    coordinates?.lat,
    coordinates?.lng,
  ]);
  return { candidates, excluded, loading, error };
}
