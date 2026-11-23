export function OrderTableHeader() {
  return (
    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
      <tr>
        <th className="py-3.5 px-4">Solicitud y cliente</th>
        <th className="hidden xl:table-cell py-3.5 px-4">Servicio</th>
        <th className="py-3.5 px-4">Recogida y entrega</th>
        <th className="py-3.5 px-4">Estado</th>
        <th className="py-3.5 px-4">Prioridad y SLA</th>
        <th className="py-3.5 px-4 text-right">
          <span className="sr-only">Acción</span>
        </th>
      </tr>
    </thead>
  );
}
