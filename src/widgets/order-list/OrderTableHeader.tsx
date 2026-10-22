export function OrderTableHeader() {
  return (
    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
      <tr>
        <th className="py-3.5 px-5">Solicitud</th>
        <th className="py-3.5 px-5">Cliente y Dirección</th>
        <th className="py-3.5 px-5">Servicio</th>
        <th className="py-3.5 px-5">Recogida</th>
        <th className="py-3.5 px-5">Entrega</th>
        <th className="py-3.5 px-5">Estado</th>
        <th className="py-3.5 px-5">Prioridad</th>
        <th className="py-3.5 px-5">SLA</th>
        <th className="py-3.5 px-5 text-right">Acción</th>
      </tr>
    </thead>
  );
}
