export function OrderTableHeader() {
  return (
    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
      <tr>
        <th scope="col" className="py-3.5 px-5 sticky left-0 z-10 bg-slate-50">
          Solicitud
        </th>
        <th scope="col" className="py-3.5 px-5">
          Cliente
        </th>
        <th scope="col" className="py-3.5 px-5">
          Servicio
        </th>
        <th scope="col" className="py-3.5 px-5">
          Recogida
        </th>
        <th scope="col" className="py-3.5 px-5">
          Entrega
        </th>
        <th scope="col" className="py-3.5 px-5">
          Estado
        </th>
        <th scope="col" className="py-3.5 px-5">
          Prioridad
        </th>
        <th scope="col" className="py-3.5 px-5">
          SLA
        </th>
        <th scope="col" className="py-3.5 px-5 text-right">
          Acción
        </th>
      </tr>
    </thead>
  );
}
