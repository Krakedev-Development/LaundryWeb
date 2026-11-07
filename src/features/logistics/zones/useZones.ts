import { useEffect, useState } from 'react';
import { zoneRepository } from '../../../services/zones/zoneRepository';
import {
  ZONES_KEY,
  encodeZones,
  notifyZones,
  subscribeZones,
} from '../../../services/zones/zoneStorage';
import type { Zone } from '../../../entities/zone/model/zone.types';
import {
  createZone,
  geoJsonPolygonToLatLngArray,
  getZones,
  mapZoneResponseToZone,
  updateZone,
} from '../../../services/api/geoApi';

export function useZones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

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

    void (async () => {
      try {
        const remoteZones = await getZones();
        if (!active) return;
        const localZones = zoneRepository.list();
        const mapped = remoteZones.map((raw) =>
          mapZoneResponseToZone(
            raw,
            localZones.find((z) => z.id === raw.id),
          ),
        );
        localStorage.setItem(ZONES_KEY, encodeZones(mapped));
        notifyZones();
      } catch {
        // Fallback to local zones when offline or unauthenticated
      }
    })();

    const unsubscribe = subscribeZones(refresh);
    window.addEventListener('storage', refresh);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const save = (zone: Zone): Zone => {
    const isNewLocalDraft =
      zone.id.startsWith('ZONA-') &&
      !zones.some((existing) => existing.id === zone.id);

    const savedLocal = zoneRepository.save(zone);

    void (async () => {
      try {
        const polygonPayload = geoJsonPolygonToLatLngArray(zone.polygon);
        const savedRemote = isNewLocalDraft
          ? await createZone({
              name: zone.name,
              polygon: polygonPayload,
            })
          : await updateZone(zone.id, {
              name: zone.name,
              polygon: polygonPayload,
              active: zone.active,
            });

        const mapped = mapZoneResponseToZone(savedRemote, zone);
        const current = zoneRepository
          .list()
          .map((item) =>
            item.id === zone.id || item.id === mapped.id ? mapped : item,
          );
        if (!current.some((item) => item.id === mapped.id)) {
          current.push(mapped);
        }
        localStorage.setItem(ZONES_KEY, encodeZones(current));
        notifyZones();
      } catch {
        // Keep optimistic local zone if backend sync fails while offline
      }
    })();

    return savedLocal;
  };

  return { zones, error, save };
}
