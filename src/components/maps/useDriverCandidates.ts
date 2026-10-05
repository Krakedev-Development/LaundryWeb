import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { dispatchService } from '../../services/geo';
import { serviceAreaService } from '../../services/geo/ServiceAreaService';
import {
  isLocationStale,
  type DriverCandidate,
} from '../../services/geo/DispatchService';
import type { Order } from '../../types';
export function useDriverCandidates(
  order: Order | undefined,
  type: 'pickup' | 'delivery',
) {
  const { drivers } = useApp();
  const [candidates, setCandidates] = useState<DriverCandidate[]>([]),
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
    setError('');
    if (!order || !coordinates) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const area = serviceAreaService.findArea(coordinates);
    dispatchService
      .candidates(
        drivers.map((d) => ({
          id: d.id,
          status: d.status,
          coordinates: d.location,
          updatedAt: d.location.lastUpdated,
          facilityId: d.facilityId,
          zoneId: d.zoneId,
          activeOrders: d.activeOrders,
          maxOrders: d.maxOrders,
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
      )
      .then((value) => {
        if (!controller.signal.aborted) setCandidates(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
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
    coordinates?.lat,
    coordinates?.lng,
  ]);
  return { candidates, loading, error };
}
