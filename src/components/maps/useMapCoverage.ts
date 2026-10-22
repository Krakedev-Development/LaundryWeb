import { useEffect, useState } from 'react';
import type { Zone } from '../../entities/zone/model/zone.types';
import { readZones, subscribeZones } from '../../services/zones/zoneStorage';

export function useMapCoverage(provided?: Zone[]) {
  const [saved, setSaved] = useState<Zone[]>([]);
  useEffect(() => {
    if (provided) return;
    const refresh = () => {
      try {
        setSaved(readZones());
      } catch {
        setSaved([]);
      }
    };
    refresh();
    const unsubscribe = subscribeZones(refresh);
    window.addEventListener('storage', refresh);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', refresh);
    };
  }, [!!provided]);
  return provided ?? saved;
}
