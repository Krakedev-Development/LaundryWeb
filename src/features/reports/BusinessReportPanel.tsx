import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import { MODE_LABELS } from '../../services/BusinessService';
export function BusinessReportPanel({ facilityId }: { facilityId: string }) {
  const { orders } = useApp(),
    state = storageService.getWorkflow();
  const selected = orders.filter(
      (o) => facilityId === 'ALL' || o.facilityId === facilityId,
    ),
    ids = new Set(selected.map((o) => o.id));
  const metrics = [
    [
      'Importe pendiente de pesaje',
      selected.filter((o) => o.pricing.amountKnown === false).length,
    ],
    [
      'Ajustes por revisar',
      state.adjustments.filter(
        (a) => ids.has(a.orderId) && a.status === 'PENDING',
      ).length,
    ],
    [
      'Cambios de agenda',
      state.changes.filter((c) => ids.has(c.orderId)).length,
    ],
    [
      'Cargos pendientes',
      `$${state.charges
        .filter((c) => ids.has(c.orderId) && c.status === 'PENDING')
        .reduce((n, c) => n + c.amount, 0)
        .toFixed(2)}`,
    ],
    [
      'Pagos de demostración',
      `$${state.payments
        .filter((p) => ids.has(p.orderId))
        .reduce((n, p) => n + p.amount, 0)
        .toFixed(2)}`,
    ],
  ];
  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
      <h2 className="font-bold text-lg">Modalidades, precios y agenda</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {Object.entries(MODE_LABELS).map(([mode, label]) => (
          <div key={mode} className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="font-bold text-2xl mt-2 text-[#0A3660]">
              {selected.filter((o) => o.fulfillment?.mode === mode).length}
            </p>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="border border-slate-100 rounded-xl p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="font-bold text-lg mt-2">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Los pedidos sin importe calculado se excluyen de ingresos. Datos de esta
        instalación local del MVP.
      </p>
    </section>
  );
}
