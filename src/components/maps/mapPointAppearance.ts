import type { MapPoint } from './BaseMap';

export const mapSymbols = {
  facility: 'S',
  driver: 'C',
  pickup: 'R',
  delivery: 'E',
  incident: '!',
};
export const driverStates = {
  AVAILABLE: { label: 'Disponible', color: '#087E8B' },
  ON_SERVICE: { label: 'En servicio', color: '#143F73' },
  BREAK: { label: 'En descanso', color: '#B45309' },
  OFFLINE: { label: 'Desconectado', color: '#64748B' },
};
export function pointColor(point: MapPoint) {
  if (point.kind === 'driver')
    return (
      driverStates[point.status as keyof typeof driverStates]?.color ??
      '#087E8B'
    );
  return {
    facility: '#143F73',
    pickup: '#668B16',
    delivery: '#143F73',
    incident: '#B45309',
  }[point.kind];
}
