import {
  validCoordinates,
  type Coordinates,
  type GeoProvider,
} from './geo.types';
export const DISPATCH_WEIGHTS = {
  proximity: 0.4,
  zone: 0.3,
  load: 0.2,
  performance: 0.1,
};
export interface DispatchDriver {
  id: string;
  status: string;
  coordinates: Coordinates;
  updatedAt: string;
  facilityId: string;
  zoneId: string;
  activeOrders: number;
  maxOrders: number;
  rating?: number;
  authorizedZoneIds?: string[];
}
export interface DispatchTarget {
  id: string;
  coordinates: Coordinates;
  facilityId: string;
  zoneId: string;
}
export interface DriverCandidate {
  driverId: string;
  eligible: boolean;
  etaSeconds: number | null;
  distanceMeters: number | null;
  score: number;
  reasons: string[];
}
export function isLocationStale(
  updatedAt: string,
  now = Date.now(),
  staleSeconds = 120,
) {
  const timestamp = Date.parse(updatedAt);
  return (
    !Number.isFinite(timestamp) ||
    timestamp > now + 30000 ||
    now - timestamp > staleSeconds * 1000
  );
}
export function eligibilityReasons(
  driver: DispatchDriver,
  target: DispatchTarget,
  _now = Date.now(),
  _staleSeconds = 120,
  enforceLimit = false,
) {
  const reasons: string[] = [];
  if (!['AVAILABLE', 'ON_SERVICE'].includes(driver.status))
    reasons.push('Chofer no disponible');
  if (
    !Number.isFinite(driver.activeOrders) ||
    driver.activeOrders < 0 ||
    (enforceLimit &&
      (!Number.isFinite(driver.maxOrders) ||
        driver.maxOrders <= 0 ||
        driver.activeOrders >= driver.maxOrders))
  )
    reasons.push('Sin capacidad disponible');
  if (driver.facilityId !== target.facilityId)
    reasons.push('Sede incompatible');
  return reasons;
}
export function rankCandidates(
  drivers: DispatchDriver[],
  travel: { driverId: string; etaSeconds: number; distanceMeters: number }[],
  targetZoneId?: string,
  staleSeconds = 120,
  now = Date.now(),
): DriverCandidate[] {
  const times = travel.map((v) => v.etaSeconds);
  const min = times.length ? Math.min(...times) : 0;
  const max = times.length ? Math.max(...times) : 0;
  return drivers
    .map((driver) => {
      const v = travel.find((item) => item.driverId === driver.id);
      const gpsPending =
        !validCoordinates(driver.coordinates) ||
        isLocationStale(driver.updatedAt, now, staleSeconds);
      const safeMaxOrders = driver.maxOrders > 0 ? driver.maxOrders : 8;
      const zoneMatched =
        !targetZoneId ||
        driver.zoneId === targetZoneId ||
        Boolean(driver.authorizedZoneIds?.includes(targetZoneId));
      const zone = zoneMatched ? 1 : 0.4;
      const load = Math.max(0, 1 - driver.activeOrders / safeMaxOrders);
      const performance =
        driver.rating === undefined
          ? 0.5
          : Math.max(0, Math.min(1, driver.rating / 5));
      const proximity = v
        ? max === min
          ? 1
          : 1 - (v.etaSeconds - min) / (max - min)
        : 0;
      const reasons: string[] = [];
      if (gpsPending || !v) {
        reasons.push('En sede · GPS pendiente');
      } else {
        reasons.push(zoneMatched ? 'Zona y sede autorizadas' : 'En sede operativa');
        if (v.etaSeconds === min) reasons.push('Menor tiempo de llegada');
      }
      reasons.push(`Carga ${driver.activeOrders}/${safeMaxOrders}`);
      if (driver.rating === undefined) {
        reasons.push('Desempeño sin historial: valor neutral');
      }
      return {
        driverId: driver.id,
        eligible: true,
        etaSeconds: v ? v.etaSeconds : null,
        distanceMeters: v ? v.distanceMeters : null,
        score: Math.round(
          (proximity * 0.4 + zone * 0.3 + load * 0.2 + performance * 0.1) * 100,
        ),
        reasons,
      };
    })
    .sort(
      (a, b) =>
        (b.etaSeconds !== null ? 1 : 0) - (a.etaSeconds !== null ? 1 : 0) ||
        b.score - a.score ||
        (a.etaSeconds ?? Infinity) - (b.etaSeconds ?? Infinity) ||
        a.driverId.localeCompare(b.driverId),
    );
}
export class DispatchService {
  constructor(
    private provider: GeoProvider,
    private maxCandidates = 10,
    private staleSeconds = 120,
    private enforceLimit = false,
  ) {}
  async candidates(
    drivers: DispatchDriver[],
    target: DispatchTarget,
    signal?: AbortSignal,
    enforceLimit = this.enforceLimit,
  ) {
    const now = Date.now();
    const eligible = drivers.filter(
      (d) =>
        !eligibilityReasons(d, target, now, this.staleSeconds, enforceLimit)
          .length,
    );
    // Straight-line distance only shortlists candidates; ranking uses road travel times.
    const shortlist = eligible
      .sort((a, b) => {
        const aValid = validCoordinates(a.coordinates) ? 0 : 1;
        const bValid = validCoordinates(b.coordinates) ? 0 : 1;
        if (aValid !== bValid) return aValid - bValid;
        if (aValid === 0 && validCoordinates(target.coordinates)) {
          const distDiff =
            Math.hypot(
              a.coordinates.lat - target.coordinates.lat,
              a.coordinates.lng - target.coordinates.lng,
            ) -
            Math.hypot(
              b.coordinates.lat - target.coordinates.lat,
              b.coordinates.lng - target.coordinates.lng,
            );
          if (distDiff !== 0) return distDiff;
        }
        return a.id.localeCompare(b.id);
      })
      .slice(0, this.maxCandidates);

    const routable = shortlist.filter((d) => validCoordinates(d.coordinates));
    let matrix: Awaited<ReturnType<GeoProvider['getMatrix']>> = [];
    if (routable.length > 0 && validCoordinates(target.coordinates)) {
      try {
        matrix = await this.provider.getMatrix(
          routable.map((d) => ({ id: d.id, coordinates: d.coordinates })),
          [{ id: target.id, coordinates: target.coordinates }],
          { signal },
        );
      } catch (err) {
        if (signal?.aborted) throw err;
        matrix = [];
      }
    }
    const travel = matrix
      .filter(
        (v) =>
          v.reachable &&
          v.durationSeconds !== null &&
          v.distanceMeters !== null,
      )
      .map((v) => ({
        driverId: v.originId,
        etaSeconds: v.durationSeconds!,
        distanceMeters: v.distanceMeters!,
      }));
    return rankCandidates(
      shortlist,
      travel,
      target.zoneId,
      this.staleSeconds,
      now,
    );
  }
}
