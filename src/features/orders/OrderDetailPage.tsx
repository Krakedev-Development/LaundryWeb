import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Receipt,
  Truck,
  Clock,
  AlertTriangle,
  ShieldAlert,
  LoaderCircle,
  MoreVertical,
  Copy,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge, SLABadge } from '../../components/common/PriorityBadge';
import { AssignDriverModal } from '../../components/common/AssignDriverModal';
import { OverrideModal } from '../../components/common/OverrideModal';
import { OrderStatus, Order } from '../../types';
import {
  confirmOrderPayment,
  getOrder,
  mapBackendOrderToOrder,
  transitionOrder,
  type BackendOrderDetail,
} from '../../services/api/ordersApi';
import { ApiError } from '../../services/api/apiConfig';
import { storageService } from '../../services/storage';
import { MODE_LABELS } from '../../services/BusinessService';
import { operationalStage } from '../../services/fulfillment';

// Subcomponents for the modular 360° architecture
import { GlobalProgressStepper } from './components/GlobalProgressStepper';
import { OperationTab } from './components/OperationTab';
import { OrderInfoTab } from './components/OrderInfoTab';
import { LogisticsTab } from './components/LogisticsTab';
import { ActivityTab } from './components/ActivityTab';
import {
  GarmentInspectionModal,
  type GarmentInspectionUnit,
} from './components/GarmentInspectionModal';
import { IncidentModal } from './components/IncidentModal';
import {
  createIncident,
  isIncidentActive,
  upsertIncident,
  useServerIncidents,
  type ServerIncidentSeverity,
} from '../../services/api/incidentsApi';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Código o QR leído en "Recepción y retiros": el panel de la etapa lo trae ya cargado.
  const [searchParams] = useSearchParams();
  const custodyCode = searchParams.get('custodia') ?? '';
  const {
    orders,
    customers,
    facilities,
    drivers,
    currentUser,
    updateOrderStatus,
    showToast,
  } = useApp();
  const { incidents, refresh: refreshIncidents } = useServerIncidents();
  // Las incidencias de la solicitud se consultan al servidor cada vez que se abre su detalle.
  useEffect(() => {
    void refreshIncidents();
  }, [id, refreshIncidents]);
  const navigate = useNavigate();

  const [liveOrder, setLiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<'operation' | 'order' | 'logistics' | 'activity'>(
    'operation',
  );
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignType, setAssignType] = useState<'pickup' | 'delivery'>('pickup');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isQuarantineModalOpen, setIsQuarantineModalOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);

  const contextOrder = orders.find((o) => o.id === id || o.trackingNumber === id);
  const order = liveOrder || contextOrder;

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const raw = await getOrder(id);
        if (!active) return;
        const mapped = mapBackendOrderToOrder(
          raw,
          contextOrder,
          customers,
          facilities,
          drivers,
        );
        setLiveOrder(mapped);
        const next = orders.map((o) => (o.id === mapped.id ? mapped : o));
        if (!next.some((o) => o.id === mapped.id)) next.push(mapped);
        storageService.saveOrders(next);
      } catch {
        // Fallback to contextOrder if offline or mock id
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading && !order) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <LoaderCircle className="w-8 h-8 animate-spin text-[#0F4C81] mb-3" />
        <p className="text-xs font-semibold">Cargando detalles de la solicitud...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-md mx-auto my-12">
        <h2 className="text-base font-bold text-slate-900">Solicitud no encontrada</h2>
        <p className="text-xs text-slate-500 mt-1">
          El código {id} no corresponde a ninguna orden registrada en el sistema.
        </p>
        <button
          onClick={() => navigate('/operations/orders')}
          className="mt-5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl transition-colors cursor-pointer"
        >
          Volver a Solicitudes
        </button>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const orderIncidents = incidents.filter((i) => i.orderId === order.id);
  const activeIncidents = orderIncidents.filter(isIncidentActive);
  const hasActiveIncidents = activeIncidents.length > 0;

  // Transition handler
  const handleAdvanceStatus = async (nextStatus: OrderStatus, noteText?: string) => {
    try {
      const updated = await transitionOrder(order.id, {
        to: nextStatus,
        expectedVersion: order.version ?? order.workflowVersion ?? 1,
        note: noteText,
      });
      const mapped = mapBackendOrderToOrder(
        updated,
        order,
        customers,
        facilities,
        drivers,
      );
      setLiveOrder(mapped);
      const next = orders.map((o) => (o.id === mapped.id ? mapped : o));
      storageService.saveOrders(next);
      showToast({
        type: 'success',
        title: 'Estado de solicitud actualizado',
        message: `Orden ${order.trackingNumber || order.id} ahora en: ${nextStatus}`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        updateOrderStatus(order.id, nextStatus, noteText);
        return;
      }
      showToast({
        type: 'error',
        title: 'No se pudo actualizar el estado',
        message: err instanceof Error ? err.message : 'Revisa los datos.',
      });
    }
  };

  const refreshFromServer = async (updated?: BackendOrderDetail) => {
    if (!order) return;
    try {
      const raw = updated ?? (await getOrder(order.id));
      const mapped = mapBackendOrderToOrder(raw, order, customers, facilities, drivers);
      setLiveOrder(mapped);
      const next = orders.map((o) => (o.id === mapped.id ? mapped : o));
      if (!next.some((o) => o.id === mapped.id)) next.push(mapped);
      storageService.saveOrders(next);
    } catch {
      // Offline fallback
    }
  };

  const handleConfirmPayment = async () => {
    setConfirmingPayment(true);
    try {
      const updated = await confirmOrderPayment(
        order.id,
        order.version ?? order.workflowVersion ?? 1,
        'Pago verificado y aprobado por consola administrativa',
      );
      const mapped = mapBackendOrderToOrder(
        updated,
        order,
        customers,
        facilities,
        drivers,
      );
      setLiveOrder(mapped);
      const next = orders.map((o) => (o.id === mapped.id ? mapped : o));
      if (!next.some((o) => o.id === mapped.id)) next.push(mapped);
      storageService.saveOrders(next);
      showToast({
        type: 'success',
        title: 'Pago confirmado',
        message: `La solicitud ${order.trackingNumber || order.id} quedó registrada como pagada.`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        updateOrderStatus(order.id, 'CONFIRMED', 'Pago confirmado localmente');
        return;
      }
      showToast({
        type: 'error',
        title: 'No se pudo confirmar el pago',
        message: err instanceof Error ? err.message : 'Intenta nuevamente.',
      });
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleOpenAssign = (type: 'pickup' | 'delivery') => {
    setAssignType(type);
    setIsAssignModalOpen(true);
  };

  // Garment Inspection Confirmation callback (Section 10 of audit)
  const handleConfirmInspection = async (
    results: GarmentInspectionUnit[],
    customerMessageDraft?: string,
  ) => {
    const hasIncidents = results.some((r) => r.result === 'INCIDENT');

    // Las prendas con incidencia se registran en el servidor como un solo caso que retiene la
    // solicitud: el lavado no empieza hasta resolverlo.
    const damaged = results.filter((r) => r.result === 'INCIDENT');
    if (damaged.length > 0) {
      const rank: ServerIncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const toServer: Record<string, ServerIncidentSeverity> = {
        BAJA: 'LOW', MEDIA: 'MEDIUM', ALTA: 'HIGH', CRITICA: 'CRITICAL',
      };
      const severity = damaged
        .map((u) => toServer[u.severity ?? 'MEDIA'] ?? 'MEDIUM')
        .reduce((a, b) => (rank.indexOf(b) > rank.indexOf(a) ? b : a), 'LOW' as ServerIncidentSeverity);
      try {
        const created = await createIncident({
          orderId: order.id,
          type: 'PRENDA_DANADA',
          severity,
          holdOrder: true,
          description: damaged
            .map((u) => `Prenda #${u.unitIndex} (${u.itemName}): ${u.incidentType} - ${u.description}`)
            .join('\n')
            .slice(0, 1000),
        });
        upsertIncident(created);
      } catch (err) {
        showToast({
          type: 'error',
          title: 'No se pudo registrar la incidencia',
          message: err instanceof Error ? err.message : 'Intenta de nuevo.',
        });
        return;
      }
    }

    // Advance to IN_PROCESS if no blocking incidents
    if (!hasIncidents) {
      await handleAdvanceStatus(
        'IN_PROCESS',
        `Inspección de ${results.length} prendas finalizada conforme. Iniciando lavado.`,
      );
    } else {
      showToast({
        type: 'warning',
        title: 'Inspección finalizada con incidencias',
        message:
          'Se registró la incidencia y la solicitud queda retenida hasta resolverla en Incidencias.',
      });
      void refreshFromServer();
    }
  };

  const handleCopyIdentifier = () => {
    navigator.clipboard.writeText(order.trackingNumber || order.id);
    showToast({
      type: 'info',
      title: 'Identificador copiado',
      message: `${order.trackingNumber || order.id} copiado al portapapeles.`,
    });
    setIsActionsMenuOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Compact Request Header */}
      <PageHeader
        title={`Solicitud ${order.trackingNumber || order.id}`}
        subtitle={`Creada el ${order.createdAt} · ${order.itemCount} prendas · ${
          MODE_LABELS[order.fulfillment?.mode ?? 'HOME_HOME']
        }`}
        breadcrumbs={[
          { label: 'Operaciones', path: '/operations/orders' },
          { label: 'Solicitudes', path: '/operations/orders' },
          { label: order.trackingNumber || order.id },
        ]}
        badge={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={operationalStage(order)} />
            <PriorityBadge priority={order.priority} showIcon />
            <SLABadge risk={order.slaStatus} deadline={order.slaDeadline} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2.5">
            {/* Secondary Action: Registrar incidencia */}
            <button
              onClick={() => setIsIncidentModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Registrar incidencia</span>
            </button>

            {/* Actions Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                title="Más opciones operacionales y administrativas"
              >
                <span>Acciones</span>
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {isActionsMenuOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs text-slate-700 animate-in fade-in">
                  <button
                    onClick={handleCopyIdentifier}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar identificador</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsQuarantineModalOpen(true);
                      setIsActionsMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-amber-700"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Retener para revisión técnica</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setIsOverrideModalOpen(true);
                        setIsActionsMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-900 border-t border-slate-100"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                      <span>Override Admin</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* 2. Global Progress Stepper */}
      <GlobalProgressStepper order={order} />

      {/* 3. Four Functional Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4" aria-label="Secciones de la solicitud">
          {/* Tab 1: Operación */}
          <button
            onClick={() => setActiveTab('operation')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'operation'
                ? 'border-[#0F4C81] text-[#0F4C81]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Operación</span>
          </button>

          {/* Tab 2: Pedido */}
          <button
            onClick={() => setActiveTab('order')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'order'
                ? 'border-[#0F4C81] text-[#0F4C81]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Pedido</span>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
              {order.itemCount}
            </span>
          </button>

          {/* Tab 3: Logística */}
          <button
            onClick={() => setActiveTab('logistics')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'logistics'
                ? 'border-[#0F4C81] text-[#0F4C81]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Logística</span>
          </button>

          {/* Tab 4: Actividad */}
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'activity'
                ? 'border-[#0F4C81] text-[#0F4C81]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Actividad</span>
            {orderIncidents.length > 0 && (
              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full">
                {orderIncidents.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* 4. Tab Content Views */}
      {activeTab === 'operation' && (
        <OperationTab
          order={order}
          onAdvanceStatus={handleAdvanceStatus}
          onOpenAssign={handleOpenAssign}
          onOpenInspection={() => setIsInspectionModalOpen(true)}
          onOpenQuarantine={() => setIsQuarantineModalOpen(true)}
          onOpenIncident={() => setIsIncidentModalOpen(true)}
          onSwitchTab={setActiveTab}
          refreshFromServer={refreshFromServer}
          confirmingPayment={confirmingPayment}
          onConfirmPayment={handleConfirmPayment}
          hasActiveIncidents={hasActiveIncidents}
          activeIncidentsCount={activeIncidents.length}
          custodyCode={custodyCode}
        />
      )}

      {activeTab === 'order' && (
        <OrderInfoTab
          order={order}
          onRefresh={() => void refreshFromServer()}
          confirmingPayment={confirmingPayment}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {activeTab === 'logistics' && (
        <LogisticsTab
          order={order}
          onOpenAssign={handleOpenAssign}
          onRefresh={() => void refreshFromServer()}
        />
      )}

      {activeTab === 'activity' && (
        <ActivityTab
          order={order}
          orderIncidents={orderIncidents}
          onOpenIncidentModal={() => setIsIncidentModalOpen(true)}
        />
      )}

      {/* 5. Modals & Drawers */}
      {/* Assign Driver Modal */}
      {isAssignModalOpen && (
        <AssignDriverModal
          order={order}
          type={assignType}
          isOpen={true}
          onClose={() => setIsAssignModalOpen(false)}
        />
      )}

      {/* Garment Inspection Modal (Section 10 of Audit) */}
      {isInspectionModalOpen && (
        <GarmentInspectionModal
          order={order}
          isOpen={true}
          onClose={() => setIsInspectionModalOpen(false)}
          onConfirmInspection={handleConfirmInspection}
        />
      )}

      {/* Override Modal */}
      {isOverrideModalOpen && (
        <OverrideModal
          order={order}
          isOpen={true}
          onClose={() => setIsOverrideModalOpen(false)}
        />
      )}

      {/* Incident Modal */}
      {isIncidentModalOpen && (
        <IncidentModal
          order={order}
          isOpen={true}
          onClose={() => setIsIncidentModalOpen(false)}
          onSuccess={() => {
            void refreshFromServer();
            void refreshIncidents();
          }}
        />
      )}

      {/* Retención para revisión técnica: incidencia con retención en el servidor */}
      {isQuarantineModalOpen && (
        <IncidentModal
          order={order}
          isOpen={true}
          defaultHold
          onClose={() => setIsQuarantineModalOpen(false)}
          onSuccess={() => {
            void refreshFromServer();
            void refreshIncidents();
          }}
        />
      )}
    </div>
  );
};
