import type { Polygon, Position } from 'geojson';
import type { Coordinates } from '../../../services/geo/geo.types';

const cross = (a: Position, b: Position, c: Position) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const between = (a: number, b: number, value: number) =>
  value >= Math.min(a, b) && value <= Math.max(a, b);
function intersects(a: Position, b: Position, c: Position, d: Position) {
  const values = [
    cross(a, b, c),
    cross(a, b, d),
    cross(c, d, a),
    cross(c, d, b),
  ];
  if (values[0] * values[1] < 0 && values[2] * values[3] < 0) return true;
  return [
    [a, b, c, values[0]],
    [a, b, d, values[1]],
    [c, d, a, values[2]],
    [c, d, b, values[3]],
  ].some(
    ([start, end, point, value]) =>
      value === 0 &&
      between(
        (start as Position)[0],
        (end as Position)[0],
        (point as Position)[0],
      ) &&
      between(
        (start as Position)[1],
        (end as Position)[1],
        (point as Position)[1],
      ),
  );
}

export function polygonFromVertices(vertices: Coordinates[]): Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      vertices.length
        ? [
            ...vertices.map(({ lng, lat }) => [lng, lat]),
            [vertices[0].lng, vertices[0].lat],
          ]
        : [],
    ],
  };
}

export function validateRing(ring: Position[]) {
  if (
    ring.length < 4 ||
    JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))
  )
    throw Error('Cierra el polígono con al menos tres vértices.');
  const points = ring.slice(0, -1);
  if (
    points.some(
      (p) =>
        p.length !== 2 ||
        !Number.isFinite(p[0]) ||
        !Number.isFinite(p[1]) ||
        Math.abs(p[0]) > 180 ||
        Math.abs(p[1]) > 90,
    )
  )
    throw Error('Las coordenadas del polígono no son válidas.');
  if (new Set(points.map((p) => p.join(','))).size !== points.length)
    throw Error('Los vértices deben ser distintos.');
  const area = points.reduce(
    (sum, p, i) => sum + p[0] * ring[i + 1][1] - ring[i + 1][0] * p[1],
    0,
  );
  if (Math.abs(area) < 1e-12)
    throw Error('El polígono debe encerrar una superficie.');
  for (let first = 0; first < points.length; first++)
    for (let second = first + 1; second < points.length; second++) {
      if (second === first + 1 || (first === 0 && second === points.length - 1))
        continue;
      if (
        intersects(ring[first], ring[first + 1], ring[second], ring[second + 1])
      )
        throw Error('Los lados del polígono no pueden cruzarse.');
    }
}
