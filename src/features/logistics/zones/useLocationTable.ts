import { useMemo, useState } from 'react';
import type { MapPoint } from '../../../components/maps/BaseMap';
import { driverStates } from '../../../components/maps/mapPointAppearance';
import { locationKinds } from './mapLocationPresentation';

export function useLocationTable(points: MapPoint[]) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [freshness, setFreshness] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es');
    const search = normalize(query.trim());
    const kinds = Object.keys(locationKinds);
    return points
      .filter((point) => {
        if (kind && point.kind !== kind) return false;
        if (status && (point.kind !== 'driver' || point.status !== status))
          return false;
        if (
          freshness &&
          (point.kind !== 'driver' || !!point.stale !== (freshness === 'stale'))
        )
          return false;
        const state =
          point.kind === 'driver'
            ? (driverStates[point.status as keyof typeof driverStates]?.label ??
              '')
            : '';
        return (
          !search ||
          normalize(
            [
              point.id,
              point.label,
              point.detail,
              locationKinds[point.kind].label,
              state,
            ].join(' '),
          ).includes(search)
        );
      })
      .sort(
        (a, b) =>
          kinds.indexOf(a.kind) - kinds.indexOf(b.kind) ||
          a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }) ||
          a.id.localeCompare(b.id),
      );
  }, [points, query, kind, status, freshness]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const change = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  const reset = () => {
    setQuery('');
    setKind('');
    setStatus('');
    setFreshness('');
    setPage(1);
  };
  return {
    query,
    kind,
    status,
    freshness,
    pageSize,
    page: currentPage,
    pages,
    start,
    total: filtered.length,
    rows: filtered.slice(start, start + pageSize),
    hasFilters: !!(query || kind || status || freshness),
    reset,
    setPage,
    setQuery: change(setQuery),
    setKind: change(setKind),
    setStatus: change(setStatus),
    setFreshness: change(setFreshness),
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
}
export type LocationTableState = ReturnType<typeof useLocationTable>;
