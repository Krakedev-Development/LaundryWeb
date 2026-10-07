import { useState } from 'react';
import { CalendarDays, Settings2, Info } from 'lucide-react';
import { storageService } from '../../services/storage';
import { useApp } from '../../context/AppContext';
import type {
  BusinessPolicy,
  SlotContext,
  TimeSlot,
} from '../../services/BusinessService';
const cls =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-slate-50 text-sm';
export function BusinessSettingsPanel() {
  const { currentUser, facilities, showToast } = useApp();
  const state = storageService.getWorkflow();
  const [policy, setPolicy] = useState({ ...state.businessPolicy });
  const [slot, setSlot] = useState<TimeSlot>({
    id: '',
    facilityId: facilities[0]?.id ?? '',
    context: 'FACILITY_DROPOFF',
    date: '',
    start: '09:00',
    end: '11:00',
    capacity: 8,
    reservedCount: 0,
    active: true,
  });
  if (currentUser.role !== 'ADMIN') return null;
  const run = (work: () => void) => {
    try {
      work();
      showToast({ type: 'success', title: 'Configuración local guardada' });
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Revisa la configuración',
        message: e instanceof Error ? e.message : 'Datos inválidos.',
      });
    }
  };
  const numeric: [keyof BusinessPolicy, string][] = [
    ['minimumOrderAmount', 'Importe mínimo opcional'],
    ['taxRate', 'IVA (fracción: 0.15 = 15%)'],
    ['pickupFee', 'Cargo de recogida'],
    ['deliveryFee', 'Cargo de entrega'],
    ['cutoffMinutes', 'Corte de cambios, minutos'],
    ['lateCancellationFee', 'Cancelación tardía'],
    ['noShowFee', 'Ausencia del cliente'],
    ['failedPickupFee', 'Recogida fallida'],
    ['driverLimit', 'Límite opcional de carga'],
  ];
  return (
    <section className="rounded-2xl border border-blue-100 bg-white shadow-sm p-6 space-y-6">
      <h2 className="font-bold text-lg flex gap-2">
        <Settings2 />
        Políticas y agenda del MVP
      </h2>
      <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-900 flex gap-3">
        <Info className="shrink-0" />
        <div>
          <p className="font-semibold">Decisiones en revisión</p>
          <p>
            Los campos vacíos conservan la decisión pendiente. Los valores
            configurados son reglas de esta instalación de demostración.
          </p>
          <ul className="list-disc pl-4 mt-2">
            {policy.review.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {numeric.map(([key, label]) => (
          <label key={key} className="text-sm">
            {label}
            <input
              aria-label={label}
              className={cls + ' mt-2'}
              min="0"
              step="0.01"
              type="number"
              placeholder="En revisión"
              value={typeof policy[key] === 'number' ? String(policy[key]) : ''}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  [key]:
                    e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </label>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {(
          [
            ['taxIncluded', 'IVA incluido en el precio'],
            [
              'blockNewOrdersOnCharges',
              'Bloquear nuevas solicitudes por cargos pendientes',
            ],
            ['enforceDriverLimit', 'Aplicar límite de carga del chofer'],
            [
              'driverMayReorder',
              'Permitir al chofer reordenar paradas pendientes',
            ],
            ['requireStorePickupSlot', 'Exigir reserva de retiro en sede'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm flex gap-2">
            <input
              type="checkbox"
              checked={Boolean(policy[key])}
              onChange={(e) =>
                setPolicy({ ...policy, [key]: e.target.checked })
              }
            />
            {label}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          run(() => storageService.businessService.savePolicy(policy))
        }
        className="px-5 py-3 rounded-xl bg-[#0F4C81] text-white font-semibold"
      >
        Guardar políticas locales
      </button>
      <div className="border-t pt-5 space-y-4">
        <h3 className="font-semibold flex gap-2">
          <CalendarDays size={20} />
          Franjas con capacidad
        </h3>
        <p className="text-sm text-slate-500">
          La agenda inicial utiliza ocho cupos de demostración por franja. No
          representa una capacidad definitiva del negocio.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm">
            Sede
            <select
              aria-label="Sede de franja"
              className={cls}
              value={slot.facilityId}
              onChange={(e) => setSlot({ ...slot, facilityId: e.target.value })}
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Contexto
            <select
              aria-label="Contexto de franja"
              className={cls}
              value={slot.context}
              onChange={(e) =>
                setSlot({ ...slot, context: e.target.value as SlotContext })
              }
            >
              {[
                ['DRIVER_PICKUP', 'Recogida'],
                ['DRIVER_DELIVERY', 'Entrega'],
                ['FACILITY_DROPOFF', 'Ingreso en sede'],
                ['FACILITY_PICKUP', 'Retiro en sede'],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Fecha
            <input
              aria-label="Fecha de franja"
              className={cls}
              type="date"
              value={slot.date}
              onChange={(e) => setSlot({ ...slot, date: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Desde
            <input
              aria-label="Inicio de franja"
              className={cls}
              type="time"
              value={slot.start}
              onChange={(e) => setSlot({ ...slot, start: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Hasta
            <input
              aria-label="Fin de franja"
              className={cls}
              type="time"
              value={slot.end}
              onChange={(e) => setSlot({ ...slot, end: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Cupos
            <input
              aria-label="Capacidad de franja"
              className={cls}
              type="number"
              min="1"
              value={slot.capacity}
              onChange={(e) =>
                setSlot({ ...slot, capacity: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <button
          type="button"
          className="rounded-xl bg-[#0F4C81] px-4 py-3 text-white text-sm font-semibold"
          onClick={() =>
            run(() =>
              storageService.businessService.saveSlot({
                ...slot,
                id: slot.id || crypto.randomUUID(),
              }),
            )
          }
        >
          Crear franja
        </button>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th>Franja</th>
                <th>Reservas</th>
                <th>Activa</th>
              </tr>
            </thead>
            <tbody>
              {state.timeSlots
                .filter(
                  (s) =>
                    s.facilityId === slot.facilityId &&
                    s.context === slot.context,
                )
                .map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="py-2">
                      {s.date} · {s.start}–{s.end}
                    </td>
                    <td>
                      {s.reservedCount}/{s.capacity}
                    </td>
                    <td>
                      <input
                        aria-label={`Activar ${s.id}`}
                        type="checkbox"
                        checked={s.active}
                        onChange={(e) =>
                          run(() =>
                            storageService.businessService.saveSlot({
                              ...s,
                              active: e.target.checked,
                            }),
                          )
                        }
                      />
                      <button
                        className="ml-3 text-blue-800 underline"
                        onClick={() => setSlot({ ...s })}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
