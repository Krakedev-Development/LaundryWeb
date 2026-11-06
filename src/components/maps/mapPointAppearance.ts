import React, { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Truck,
  Navigation,
  Building2,
  Package,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import type { MapPoint } from './BaseMap';

export type MapTheme = 'tactical' | 'light';

export const MAP_THEME_STORAGE_KEY = 'lw_map_theme_v1';
const MAP_THEME_EVENT = 'lw:map-theme-change';

export const MAP_TILE_URLS: Record<MapTheme, string> = {
  tactical: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  light: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};

export function readMapTheme(): MapTheme {
  if (typeof window === 'undefined') return 'tactical';
  try {
    const saved = window.localStorage.getItem(MAP_THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'tactical' ? saved : 'tactical';
  } catch {
    return 'tactical';
  }
}

export function writeMapTheme(theme: MapTheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MAP_THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent(MAP_THEME_EVENT, { detail: theme }));
  } catch {
    // Ignore storage quota errors
  }
}

export function useMapTheme(): [MapTheme, (next: MapTheme) => void] {
  const [theme, setTheme] = useState<MapTheme>(() => readMapTheme());

  useEffect(() => {
    const sync = () => setTheme(readMapTheme());
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<MapTheme>).detail;
      if (detail === 'light' || detail === 'tactical') {
        setTheme(detail);
      } else {
        sync();
      }
    };
    window.addEventListener('storage', sync);
    window.addEventListener(MAP_THEME_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(MAP_THEME_EVENT, onCustom);
    };
  }, []);

  const update = (next: MapTheme) => {
    setTheme(next);
    writeMapTheme(next);
  };

  return [theme, update];
}

export const mapSymbols = {
  facility: 'S',
  driver: 'C',
  pickup: 'R',
  delivery: 'E',
  incident: '!',
};

export const driverStates = {
  AVAILABLE: { label: 'Disponible', color: '#10B981' },
  ON_SERVICE: { label: 'En servicio', color: '#0284C7' },
  BREAK: { label: 'En descanso', color: '#F59E0B' },
  OFFLINE: { label: 'Desconectado', color: '#64748B' },
};

export function pointColor(point: MapPoint) {
  if (point.kind === 'driver')
    return (
      driverStates[point.status as keyof typeof driverStates]?.color ??
      '#10B981'
    );
  return {
    facility: '#0F4C81',
    pickup: '#059669',
    delivery: '#0284C7',
    incident: '#E11D48',
  }[point.kind];
}

function computeDriverHeading(point: MapPoint): {
  angle: number;
  cardinal: string;
} {
  const seed =
    Math.abs(
      Math.round((point.coordinates.lat * 1000 + point.coordinates.lng * 1000) * 17),
    ) +
    point.id
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const directions = [
    { angle: 0, cardinal: 'N' },
    { angle: 45, cardinal: 'NE' },
    { angle: 90, cardinal: 'E' },
    { angle: 135, cardinal: 'SE' },
    { angle: 180, cardinal: 'S' },
    { angle: 225, cardinal: 'SO' },
    { angle: 270, cardinal: 'O' },
    { angle: 315, cardinal: 'NO' },
  ];
  return directions[seed % directions.length];
}

export function renderTacticalMarkerHtml(
  point: MapPoint,
  theme: MapTheme = 'tactical',
): { html: string; iconSize: [number, number]; iconAnchor: [number, number] } {
  const isDark = theme === 'tactical';
  const staleClass = point.stale ? 'opacity-50 saturate-50' : 'opacity-100';

  if (point.kind === 'driver') {
    const statusKey = (point.status ?? 'AVAILABLE') as keyof typeof driverStates;
    const isAvailable = statusKey === 'AVAILABLE';
    const isOnRoute = statusKey === 'ON_SERVICE';
    const isOffline = statusKey === 'OFFLINE';
    const chipLabel = isOnRoute
      ? 'En ruta'
      : isAvailable
        ? 'Disponible'
        : driverStates[statusKey]?.label ?? 'En ruta';

    const { angle, cardinal } = computeDriverHeading(point);
    const pulseColor = isOnRoute
      ? 'bg-sky-400'
      : isAvailable
        ? 'bg-emerald-400'
        : 'bg-amber-400';
    const coreTone = isOnRoute
      ? 'bg-sky-600 border-sky-300 text-white shadow-sky-500/40'
      : isAvailable
        ? 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-500/40'
        : isOffline
          ? 'bg-slate-600 border-slate-400 text-slate-100 shadow-slate-900/30'
          : 'bg-amber-600 border-amber-300 text-white shadow-amber-500/40';
    const chipTone = isOnRoute
      ? 'bg-sky-950/90 text-sky-200 border-sky-500/40'
      : isAvailable
        ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
        : isOffline
          ? 'bg-slate-900/90 text-slate-300 border-slate-600/40'
          : 'bg-amber-950/90 text-amber-200 border-amber-500/40';

    const shortName = point.label.split(' ').slice(0, 2).join(' ');

    const html = renderToStaticMarkup(
      React.createElement(
        'div',
        {
          className: `group relative flex flex-col items-center select-none ${staleClass}`,
        },
        React.createElement(
          'div',
          { className: 'relative flex items-center justify-center' },
          !isOffline &&
            !point.stale &&
            React.createElement('span', {
              className: `absolute -inset-2.5 rounded-full ${pulseColor} opacity-35 animate-ping`,
            }),
          !isOffline &&
            React.createElement('span', {
              className: `absolute -inset-1 rounded-full ${pulseColor} opacity-20`,
            }),
          React.createElement(
            'div',
            {
              className: `relative z-10 flex size-9 items-center justify-center rounded-full border-2 shadow-lg transition-transform duration-200 group-hover:scale-110 ${coreTone}`,
            },
            React.createElement(Truck, { className: 'size-4 stroke-[2.25]' }),
          ),
          React.createElement(
            'span',
            {
              className:
                'absolute -right-5 -top-2 z-20 inline-flex items-center gap-0.5 rounded-full border border-slate-700 bg-slate-900/95 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sky-300 shadow-md',
            },
            React.createElement(Navigation, {
              className: 'size-2.5 text-sky-400',
              style: { transform: `rotate(${angle}deg)` },
            }),
            cardinal,
          ),
        ),
        React.createElement(
          'div',
          {
            className: `mt-1 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-tight whitespace-nowrap shadow-md backdrop-blur-xs ${chipTone}`,
          },
          React.createElement('span', {
            className: `size-1.5 rounded-full ${
              isOnRoute
                ? 'bg-sky-400'
                : isAvailable
                  ? 'bg-emerald-400'
                  : 'bg-slate-400'
            }`,
          }),
          React.createElement('span', null, chipLabel),
          React.createElement(
            'span',
            { className: 'opacity-75 font-medium' },
            `· ${shortName}`,
          ),
        ),
      ),
    );
    return { html, iconSize: [140, 64], iconAnchor: [70, 22] };
  }

  if (point.kind === 'facility') {
    const badgeTone = isDark
      ? 'bg-slate-900/95 text-white border-sky-500/40 shadow-sky-950/60'
      : 'bg-white/95 text-slate-900 border-slate-200 shadow-slate-900/15';
    const html = renderToStaticMarkup(
      React.createElement(
        'div',
        {
          className:
            'group relative flex flex-col items-center select-none',
        },
        React.createElement(
          'div',
          { className: 'relative flex items-center justify-center' },
          React.createElement('span', {
            className:
              'absolute -inset-2 rounded-2xl bg-sky-500/25 blur-xs transition-opacity group-hover:opacity-100',
          }),
          React.createElement(
            'div',
            {
              className:
                'relative z-10 flex size-10 items-center justify-center rounded-2xl border-2 border-white bg-[#0F4C81] text-white shadow-xl ring-4 ring-sky-500/30 transition-transform duration-200 group-hover:scale-110',
            },
            React.createElement(Building2, {
              className: 'size-5 stroke-[2.2]',
            }),
          ),
        ),
        React.createElement(
          'div',
          {
            className: `mt-1.5 flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-extrabold tracking-tight whitespace-nowrap shadow-lg backdrop-blur-xs ${badgeTone}`,
          },
          React.createElement('span', {
            className: 'size-1.5 rounded-full bg-sky-400',
          }),
          React.createElement('span', null, point.label),
        ),
      ),
    );
    return { html, iconSize: [160, 68], iconAnchor: [80, 24] };
  }

  if (point.kind === 'pickup') {
    const html = renderToStaticMarkup(
      React.createElement(
        'div',
        {
          className:
            'group relative flex flex-col items-center select-none',
        },
        React.createElement(
          'div',
          {
            className:
              'relative z-10 flex size-8 items-center justify-center rounded-xl border-2 border-white bg-emerald-600 text-white shadow-lg ring-3 ring-emerald-500/30 transition-transform duration-200 group-hover:scale-110',
          },
          React.createElement(Package, { className: 'size-4 stroke-[2.25]' }),
        ),
        React.createElement(
          'span',
          {
            className:
              'mt-1 rounded-md border border-emerald-500/40 bg-emerald-950/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-200 whitespace-nowrap shadow-sm',
          },
          'Recogida',
        ),
      ),
    );
    return { html, iconSize: [96, 54], iconAnchor: [48, 18] };
  }

  if (point.kind === 'delivery') {
    const html = renderToStaticMarkup(
      React.createElement(
        'div',
        {
          className:
            'group relative flex flex-col items-center select-none',
        },
        React.createElement(
          'div',
          {
            className:
              'relative z-10 flex size-8 items-center justify-center rounded-xl border-2 border-white bg-indigo-600 text-white shadow-lg ring-3 ring-indigo-500/30 transition-transform duration-200 group-hover:scale-110',
          },
          React.createElement(ArrowUpRight, {
            className: 'size-4 stroke-[2.5]',
          }),
        ),
        React.createElement(
          'span',
          {
            className:
              'mt-1 rounded-md border border-indigo-500/40 bg-indigo-950/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-200 whitespace-nowrap shadow-sm',
          },
          'Entrega',
        ),
      ),
    );
    return { html, iconSize: [96, 54], iconAnchor: [48, 18] };
  }

  // incident
  const html = renderToStaticMarkup(
    React.createElement(
      'div',
      {
        className: 'group relative flex flex-col items-center select-none',
      },
      React.createElement(
        'div',
        { className: 'relative flex items-center justify-center' },
        React.createElement('span', {
          className:
            'absolute -inset-2 rounded-full bg-rose-500 opacity-35 animate-ping',
        }),
        React.createElement(
          'div',
          {
            className:
              'relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-white shadow-lg ring-3 ring-rose-500/30 transition-transform duration-200 group-hover:scale-110',
          },
          React.createElement(AlertTriangle, {
            className: 'size-4 stroke-[2.25]',
          }),
        ),
      ),
      React.createElement(
        'span',
        {
          className:
            'mt-1 rounded-md border border-rose-500/40 bg-rose-950/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-200 whitespace-nowrap shadow-sm',
        },
        'Incidencia',
      ),
    ),
  );
  return { html, iconSize: [96, 54], iconAnchor: [48, 18] };
}
