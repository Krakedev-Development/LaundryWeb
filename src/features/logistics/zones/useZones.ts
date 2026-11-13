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

  // El servidor es la fuente de verdad: la zona se guarda primero allí y solo después,
  // con su identificador real, en la copia local. Si el servidor la rechaza, el error
  // llega a quien guarda y no queda una zona local que desaparezca al recargar.
  const save = async (zone: Zone): Promise<Zone> => {
    const isNew = !zones.some((existing) => existing.id === zone.id);
    // Validaciones locales (nombre, polígono, sedes y solicitudes) antes de enviar.
    zoneRepository.validate(zone);
    const polygon = geoJsonPolygonToLatLngArray(zone.polygon);
    const remote = isNew
      ? await createZone({ name: zone.name.trim(), polygon })
      : await updateZone(zone.id, {
          name: zone.name.trim(),
          polygon,
          active: zone.active,
        });
    const mapped = mapZoneResponseToZone(remote, zone);
    const current = zoneRepository.list().filter((item) => item.id !== zone.id);
    const next = current.some((item) => item.id === mapped.id)
      ? current.map((item) => (item.id === mapped.id ? mapped : item))
      : [...current, mapped];
    localStorage.setItem(ZONES_KEY, encodeZones(next));
    notifyZones();
    return mapped;
  };

  return { zones, error, save };
}
