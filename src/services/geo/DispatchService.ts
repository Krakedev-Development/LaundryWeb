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
export interface ExcludedDriver {
  driverId: string;
  reasons: string[];
  /** Momento de la última ubicación recibida, para indicar su antigüedad. */
  locationAt: string;
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
  now = Date.now(),
  staleSeconds = 120,
  enforceLimit = false,
) {
  const reasons: string[] = [];
  if (!['AVAILABLE','ON_SERVICE'].includes(driver.status)) reasons.push('Chofer no disponible');
  if (
    !Number.isFinite(driver.maxOrders) ||
    driver.maxOrders <= 0 ||
    !Number.isFinite(driver.activeOrders) ||
    (enforceLimit && driver.activeOrders >= driver.maxOrders) ||
    driver.activeOrders < 0
  )
    reasons.push('Sin capacidad disponible');
  if (driver.facilityId !== target.facilityId)
    reasons.push('Sede incompatible');
  if (
    driver.zoneId !== target.zoneId &&
    !driver.authorizedZoneIds?.includes(target.zoneId)
  )
    reasons.push('Zona no autorizada');
  if (
    !validCoordinates(driver.coordinates) ||
    isLocationStale(driver.updatedAt, now, staleSeconds)
  )
    reasons.push('Ubicación desactualizada');
  return reasons;
}
export function rankCandidates(
  drivers: DispatchDriver[],
  travel: { driverId: string; etaSeconds: number; distanceMeters: number }[],
  targetZoneId?: string,
): DriverCandidate[] {
  const times = travel.map((v) => v.etaSeconds);
  const min = Math.min(...times),
    max = Math.max(...times);
  return travel
    .map((v) => {
      const driver = drivers.find((d) => d.id === v.driverId)!;
      const proximity =
        max === min ? 1 : 1 - (v.etaSeconds - min) / (max - min);
      const zone = !targetZoneId || driver.zoneId === targetZoneId ? 1 : 0.4;
      const load = Math.max(0, 1 - driver.activeOrders / driver.maxOrders);
      const performance =
        driver.rating === undefined
          ? 0.5
          : Math.max(0, Math.min(1, driver.rating / 5));
      return {
        driverId: driver.id,
        eligible: true,
        etaSeconds: v.etaSeconds,
        distanceMeters: v.distanceMeters,
        score: Math.round(
          (proximity * 0.4 + zone * 0.3 + load * 0.2 + performance * 0.1) * 100,
        ),
        reasons: [
          'Zona y sede autorizadas',
          ...(v.etaSeconds === min ? ['Menor tiempo de llegada'] : []),
          `Carga ${driver.activeOrders}/${driver.maxOrders}`,
          ...(driver.rating === undefined
            ? ['Desempeño sin historial: valor neutral']
            : []),
        ],
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.etaSeconds! - b.etaSeconds! ||
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
  // Igual que candidates(), pero informa también qué choferes quedaron fuera y por qué, para
  // que administración sepa qué corregir en lugar de ver una lista vacía.
  async evaluate(
    drivers: DispatchDriver[],
    target: DispatchTarget,
    signal?: AbortSignal,
    enforceLimit = this.enforceLimit,
  ): Promise<{ candidates: DriverCandidate[]; excluded: ExcludedDriver[] }> {
    const now = Date.now();
    const excluded: ExcludedDriver[] = [];
    for (const d of drivers) {
      const reasons = eligibilityReasons(d, target, now, this.staleSeconds, enforceLimit);
      if (reasons.length) excluded.push({ driverId: d.id, reasons, locationAt: d.updatedAt });
    }
    const candidates = await this.candidates(drivers, target, signal, enforceLimit);
    const ranked = new Set(candidates.map((c) => c.driverId));
    const ineligible = new Set(excluded.map((e) => e.driverId));
    // Con hasta maxCandidates elegibles todos entran al cálculo de rutas: quedar fuera significa
    // que no hay ruta. Con más, también puede estar entre los más lejanos.
    const reason =
      drivers.length - ineligible.size <= this.maxCandidates
        ? 'No se pudo calcular una ruta hasta la dirección'
        : `Fuera de los ${this.maxCandidates} choferes más cercanos o sin ruta hasta la dirección`;
    for (const d of drivers) {
      if (ranked.has(d.id) || ineligible.has(d.id)) continue;
      excluded.push({ driverId: d.id, reasons: [reason], locationAt: d.updatedAt });
    }
    return { candidates, excluded };
  }

  async candidates(
    drivers: DispatchDriver[],
    target: DispatchTarget,
    signal?: AbortSignal,
    enforceLimit = this.enforceLimit,
  ) {
    const eligible = drivers.filter(
      (d) =>
        !eligibilityReasons(d, target, Date.now(), this.staleSeconds, enforceLimit).length,
    );
    // Straight-line distance only shortlists candidates; ranking uses road travel times.
    const shortlist = eligible
      .sort(
        (a, b) =>
          Math.hypot(
            a.coordinates.lat - target.coordinates.lat,
            a.coordinates.lng - target.coordinates.lng,
          ) -
            Math.hypot(
              b.coordinates.lat - target.coordinates.lat,
              b.coordinates.lng - target.coordinates.lng,
            ) || a.id.localeCompare(b.id),
      )
      .slice(0, this.maxCandidates);
    const matrix = await this.provider.getMatrix(
      shortlist.map((d) => ({ id: d.id, coordinates: d.coordinates })),
      [{ id: target.id, coordinates: target.coordinates }],
      { signal },
    );
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
    return rankCandidates(shortlist, travel, target.zoneId);
  }
}
