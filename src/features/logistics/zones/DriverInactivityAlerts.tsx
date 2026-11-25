import React from 'react';
import { AlertTriangle, LocateFixed } from 'lucide-react';
import type { DriverInactivityAlert } from '../../../services/api/geoApi';

export function DriverInactivityAlerts({
  alerts,
  onLocate,
}: {
  alerts: DriverInactivityAlert[];
  onLocate(driverId: string): void;
}) {
  if (alerts.length === 0) return null;

  return (
    <section
      aria-label="Alertas de choferes inactivos"
      className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <h2 className="text-sm font-bold">
            Alertas de inactividad ({alerts.length})
          </h2>
        </div>
        <span className="text-xs font-medium text-amber-800">
          Monitoreo automático cada 30 s
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alerts.map((alert) => {
          const isCritical = alert.severity === 'CRITICAL';
          return (
            <div
              key={`${alert.driverId}:${alert.code}`}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${
                isCritical
                  ? 'border-rose-200 bg-rose-50 text-rose-900'
                  : 'border-amber-200 bg-white text-slate-800'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      isCritical
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isCritical ? 'Crítica' : 'Advertencia'}
                  </span>
                  <strong className="truncate">{alert.driverName}</strong>
                </div>
                <p className="mt-0.5 text-[11px] opacity-85">{alert.message}</p>
              </div>
              <button
                type="button"
                onClick={() => onLocate(alert.driverId)}
                disabled={alert.lat === null || alert.lng === null}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <LocateFixed className="h-3.5 w-3.5 text-sky-600" />
                <span>Ubicar</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
