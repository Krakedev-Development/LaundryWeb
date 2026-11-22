import { useState } from "react";
import { Link } from "react-router-dom";
import { PaginatedTable } from "../../shared/ui/TablePagination";
import { ArrowUpRight, History, Package, Workflow } from "lucide-react";
import type { Order } from "../../types";
import { operationalStage } from "../../services/fulfillment";
import { Modal } from "../../shared/ui/Modal";
import { StatusBadge } from "../../components/common/StatusBadge";
import { IncidentModal } from "../orders/components/IncidentModal";
import {
  INCIDENT_STATUS_LABEL,
  incidentTypeLabel,
  useServerIncidents,
} from "../../services/api/incidentsApi";
import { PlantProcessPanel } from "./PlantProcessPanel";
import { OrderHistory, displayDate } from "./OrderHistory";
import { PlantProgress } from "./plantProgress";

// Etapas de planta en las que se puede retener la solicitud para revisión.
const HOLDABLE = [
  "AT_FACILITY",
  "WEIGHING",
  "INSPECTION",
  "PRICING_PENDING",
  "CUSTOMER_APPROVAL_PENDING",
  "IN_PROCESS",
  "QUALITY_CONTROL",
];

export function PlantOrderModal({
  order,
  onClose,
  onChanged,
}: {
  order: Order;
  onClose(): void;
  /** La solicitud cambió en el servidor: la lista de planta se vuelve a consultar. */
  onChanged?(): void;
}) {
  const { incidents, refresh: refreshIncidents } = useServerIncidents();
  const [tab, setTab] = useState("summary");
  const [holding, setHolding] = useState(false);
  const stage = operationalStage(order);
  const orderIncidents = incidents.filter((i) => i.orderId === order.id);
  const money = (value: number) =>
    `${order.pricing.currency} ${value.toFixed(2)}`;
  return (
    <Modal
      wide
      title={`Pedido ${order.trackingNumber || order.id}`}
      description={`${order.customerName} · ${order.facilityName}`}
      onClose={onClose}
    >
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={stage} />
          <Link
            to={`/operations/orders/${order.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Abrir ficha del pedido
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[480px]">
            <PlantProgress order={order} />
          </div>
        </div>
      </div>
      <div
        className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4"
        aria-label="Secciones del pedido"
      >
        {[
          { id: "summary", label: "Resumen y prendas", Icon: Package },
          { id: "process", label: "Gestionar proceso", Icon: Workflow },
          { id: "history", label: "Historial y bitácora", Icon: History },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold ${tab === id ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-primary"}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-6">
        {tab === "summary" && (
          <div className="space-y-6">
            <dl className="grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-600">Servicio</dt>
                <dd className="mt-1 font-semibold">{order.serviceType}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Modalidad</dt>
                <dd className="mt-1 font-semibold">
                  {order.fulfillment?.outbound.method === "CUSTOMER"
                    ? "Recogida a domicilio y retiro en sede"
                    : "Recogida y entrega a domicilio"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Peso registrado</dt>
                <dd className="mt-1 font-semibold">
                  {order.pricing.measuredWeight !== undefined
                    ? `${order.pricing.measuredWeight} ${order.pricing.weightUnit}`
                    : "Sin pesaje registrado"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Importe y pago</dt>
                <dd className="mt-1 font-semibold">
                  {order.pricing.amountKnown === false
                    ? "Pendiente de pesaje"
                    : money(order.pricing.total)}{" "}
                  ·{" "}
                  {order.pricing.paymentStatus === "PAID"
                    ? "Pagado"
                    : "Pendiente"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Creación</dt>
                <dd className="mt-1">{displayDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Última actualización</dt>
                <dd className="mt-1">{displayDate(order.updatedAt)}</dd>
              </div>
            </dl>
            {order.customerMessage && (
              <p className="border-l-2 border-sky-700 pl-4 text-sm text-slate-700">
                {order.customerMessage}
              </p>
            )}
            <section>
              <h3 className="mb-3 font-semibold">Prendas del pedido</h3>
              <PaginatedTable
                items={order.items}
                label="prendas del pedido"
                hideWhenSinglePage
              >
                {(itemRows) => (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-600">
                        <tr>
                          <th className="px-3 py-3">Prenda</th>
                          <th className="px-3 py-3">Cantidad</th>
                          <th className="px-3 py-3">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemRows.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-3 font-medium">
                              {item.name}
                            </td>
                            <td className="px-3 py-3 tabular-nums">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {item.notes || "Sin observaciones"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </PaginatedTable>
            </section>
            <section>
              <h3 className="mb-3 font-semibold">Incidencias vinculadas</h3>
              {orderIncidents.map((incident) => (
                <p
                  key={incident.id}
                  className="mb-2 border-l-2 border-amber-500 pl-3 text-sm"
                >
                  <span className="font-semibold">
                    {incidentTypeLabel(incident.type)} ·{" "}
                    {INCIDENT_STATUS_LABEL[incident.status]}
                  </span>
                  <span className="mt-1 block text-slate-600">
                    {incident.description}
                  </span>
                </p>
              ))}
              {orderIncidents.length === 0 && (
                <p className="text-sm text-slate-600">
                  Sin incidencias registradas.
                </p>
              )}
            </section>
          </div>
        )}
        {tab === "process" && (
          <div className="space-y-5">
            <PlantProcessPanel orderId={order.id} onChanged={() => onChanged?.()} />
            {HOLDABLE.includes(stage) && (
              <section className="border-t border-slate-200 pt-5">
                <h3 className="font-semibold">Retener para revisión</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Registra una incidencia que detiene el proceso. Al resolverla
                  en Incidencias, la solicitud vuelve a esta etapa.
                </p>
                <button
                  type="button"
                  onClick={() => setHolding(true)}
                  className="mt-3 rounded-lg border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50"
                >
                  Retener pedido
                </button>
              </section>
            )}
            <Link
              className="inline-block text-sm font-semibold text-primary underline"
              to={`/operations/orders/${order.id}`}
            >
              Abrir el detalle de la solicitud para validar custodia
            </Link>
          </div>
        )}
        {tab === "history" && (
          <OrderHistory orderId={order.id} customerName={order.customerName} />
        )}
      </div>
      {holding && (
        <IncidentModal
          order={order}
          isOpen
          defaultHold
          onClose={() => setHolding(false)}
          onSuccess={() => {
            void refreshIncidents();
            onChanged?.();
          }}
        />
      )}
    </Modal>
  );
}
