import { useEffect, useState } from 'react';
import { zoneRepository } from '../../../services/zones/zoneRepository';
import { subscribeZones } from '../../../services/zones/zoneStorage';
import type { Zone } from '../../../entities/zone/model/zone.types';

export function useZones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => {
      try {
        setZones(zoneRepository.list());
        setError('');
      } catch {
        setZones([]);
        setError(
          'No se pudieron leer las zonas guardadas. No se sobrescribirán los datos.',
        );
      }
    };
    refresh();
    const unsubscribe = subscribeZones(refresh);
    window.addEventListener('storage', refresh);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return { zones, error, save: (zone: Zone) => zoneRepository.save(zone) };
}
