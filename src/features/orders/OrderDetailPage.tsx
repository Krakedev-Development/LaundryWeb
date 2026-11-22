import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Receipt,
  Truck,
  Clock,
  AlertTriangle,
  LoaderCircle,
  MoreVertical,
  Copy,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge, SLABadge } from '../../components/common/PriorityBadge';
import { Order } from '../../types';
import {
  confirmOrderPayment,
  getOrder,
  mapBackendOrderToOrder,
  type BackendOrderDetail,
} from '../../services/api/ordersApi';
import { ApiError } from '../../services/api/apiConfig';
import { parseHandoffType } from '../../services/api/handoffsApi';
import { isPlantStage, plantHref } from '../../services/operationsLinks';
import { Tabs, TabPanel } from '../../shared/ui/Tabs';
import { orderDisplayStage } from './model/orderDisplay';
import { storageService } from '../../services/storage';
import { MODE_LABELS } from '../../services/BusinessService';
import { operationalStage } from '../../services/fulfillment';

// Subcomponents for the modular 360° architecture
import { GlobalProgressStepper } from './components/GlobalProgressStepper';
import { OperationTab } from './components/OperationTab';
import { OrderInfoTab } from './components/OrderInfoTab';
import { LogisticsTab } from './components/LogisticsTab';
import { ActivityTab } from './components/ActivityTab';
import { IncidentModal } from './components/IncidentModal';
import {
  isIncidentActive,
  useServerIncidents,
} from '../../services/api/incidentsApi';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Código o QR leído en "Recepción y retiros" (`?custodia=`) y traspaso de la columna elegida
  // (`?traspaso=`): el panel de la etapa los trae cargados. Se guardan en memoria y se quitan de
  // la URL de inmediato, para que el código no quede en el historial ni en un enlace compartido.
  const [searchParams, setSearchParams] = useSearchParams();
  const [custody, setCustody] = useState(() => ({
    code: searchParams.get('custodia') ?? '',
    type: parseHandoffType(searchParams.get('traspaso')),
  }));
  useEffect(() => {
    if (!searchParams.has('custodia') && !searchParams.has('traspaso')) return;
    setCustody({
      code: searchParams.get('custodia') ?? '',
      type: parseHandoffType(searchParams.get('traspaso')),
    });
    const next = new URLSearchParams(searchParams);
    next.delete('custodia');
    next.delete('traspaso');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const {
    orders,
    customers,
    facilities,
    drivers,
    showToast,
  } = useApp();
  const { incidents, refresh: refreshIncidents } = useServerIncidents();
  // Las incidencias de la solicitud se consultan al servidor cada vez que se abre su detalle.
  useEffect(() => {
    void refreshIncidents();
  }, [id, refreshIncidents]);
  const navigate = useNavigate();

  // El detalle solo se muestra con datos del servidor (contrato 4). Sin respuesta no se usa la
  // copia guardada en este equipo: actuar sobre ella sería actuar sobre datos desactualizados.
  const [liveOrder, setLiveOrder] = useState<Order | null>(null);
  // Respuesta del servidor tal cual: los paneles de custodia la reciben por props en vez de volver
  // a pedir la misma solicitud (T-10).
  const [serverOrder, setServerOrder] = useState<BackendOrderDetail | null>(null);
  const [load, setLoad] = useState<
    { status: 'loading' } | { status: 'ready' } | { status: 'notFound' } | { status: 'error'; message: string }
  >({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<'operation' | 'order' | 'logistics' | 'activity'>(
    'operation',
  );
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Modals state
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isQuarantineModalOpen, setIsQuarantineModalOpen] = useState(false);

  // La copia local solo completa datos que el servidor no envía (p. ej. nombres); no se muestra sola.
  const contextOrder = orders.find((o) => o.id === id || o.trackingNumber === id);
  const order = liveOrder;

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLiveOrder(null);
    setServerOrder(null);
    setLoad({ status: 'loading' });
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
        setServerOrder(raw);
        setLoad({ status: 'ready' });
        const next = orders.map((o) => (o.id === mapped.id ? mapped : o));
        if (!next.some((o) => o.id === mapped.id)) next.push(mapped);
        storageService.saveOrders(next);
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) setLoad({ status: 'notFound' });
        else
          setLoad({
            status: 'error',
            message:
              e instanceof ApiError && e.status === 0
                ? 'No se pudo conectar con el servidor.'
                : e instanceof Error
                  ? e.message
                  : 'Error desconocido.',
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [id, attempt]);

  if (load.status === 'loading') {
    return (
      <div role="status" className="flex flex-col items-center justify-center p-16 text-slate-500">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-xs font-semibold">Cargando detalles de la solicitud...</p>
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div
        role="alert"
        className="p-8 bg-white rounded-3xl border border-rose-200 shadow-xs max-w-lg mx-auto my-12 space-y-3"
      >
        <h2 className="text-base font-bold text-slate-900">
          No se pudo cargar la solicitud desde el servidor
        </h2>
        <p className="text-xs text-rose-800">{load.message}</p>
        <p className="text-xs text-slate-600">
          No se muestran datos guardados en este equipo, para no actuar sobre información
          desactualizada.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors cursor-pointer"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => navigate('/operations/orders')}
            className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
          >
            Volver a Solicitudes
          </button>
        </div>
      </div>
    );
  }

  if (load.status === 'notFound' || !order) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-md mx-auto my-12">
        <h2 className="text-base font-bold text-slate-900">Solicitud no encontrada</h2>
        <p className="text-xs text-slate-500 mt-1">
          El código {id} no corresponde a ninguna orden registrada en el sistema.
        </p>
        <button
          onClick={() => navigate('/operations/orders')}
          className="mt-5 px-5 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors cursor-pointer"
        >
          Volver a Solicitudes
        </button>
      </div>
    );
  }

  const orderIncidents = incidents.filter((i) => i.orderId === order.id);
  const activeIncidents = orderIncidents.filter(isIncidentActive);
  const hasActiveIncidents = activeIncidents.length > 0;

  const refreshFromServer = async (updated?: BackendOrderDetail) => {
    if (!order) return;
    try {
      const raw = updated ?? (await getOrder(order.id));
      const mapped = mapBackendOrderToOrder(raw, order, customers, facilities, drivers);
      setLiveOrder(mapped);
      setServerOrder(raw);
      const next = orders.map((o) => (o.id === mapped.id ? mapped : o));
      if (!next.some((o) => o.id === mapped.id)) next.push(mapped);
      storageService.saveOrders(next);
    } catch (e) {
      // El cambio ya lo aceptó el servidor (o no hubo cambio); solo falló volver a consultarlo.
      showToast({
        type: 'error',
        title: 'No se pudo actualizar la solicitud',
        message: `${e instanceof Error ? e.message : 'Error desconocido.'} Recarga la página para ver su estado actual.`,
      });
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
      setServerOrder(updated);
      const next = orders.map((o) => (o.id === mapped.id ? mapped : o));
      if (!next.some((o) => o.id === mapped.id)) next.push(mapped);
      storageService.saveOrders(next);
      showToast({
        type: 'success',
        title: 'Pago confirmado',
        message: `La solicitud ${order.trackingNumber || order.id} quedó registrada como pagada.`,
      });
    } catch (err) {
      // Sin servidor no se registra nada: el pago solo se confirma en el servidor.
      showToast({
        type: 'error',
        title: 'No se pudo confirmar el pago',
        message:
          err instanceof ApiError && err.status === 0
            ? 'No se pudo conectar con el servidor. No se registró ningún cambio; intenta de nuevo.'
            : err instanceof Error
              ? err.message
              : 'Intenta nuevamente.',
      });
    } finally {
      setConfirmingPayment(false);
    }
  };

  // En planta, el proceso y la retención se gestionan solo en Planta (T-07).
  const inPlant = isPlantStage(operationalStage(order));

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
            <StatusBadge status={orderDisplayStage(order)} />
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

                  {/* En planta la retención se hace en Planta (decisión P-1): aquí solo se navega. */}
                  {inPlant ? (
                    <Link
                      to={plantHref(order.id, 'proceso')}
                      onClick={() => setIsActionsMenuOpen(false)}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-amber-700"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Retener en Planta</span>
                    </Link>
                  ) : (
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
                  )}

                </div>
              )}
            </div>
          </div>
        }
      />

      {/* 2. Global Progress Stepper */}
      <GlobalProgressStepper order={order} />

      {/* 3. Secciones de la solicitud (pestañas accesibles compartidas) */}
      <Tabs<typeof activeTab>
        label="Secciones de la solicitud"
        idPrefix="detail"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'operation', label: 'Operación', icon: Sparkles },
          {
            id: 'order',
            label: 'Pedido',
            icon: Receipt,
            badge: order.itemCount,
            badgeLabel: `${order.itemCount} prendas`,
          },
          { id: 'logistics', label: 'Logística', icon: Truck },
          {
            id: 'activity',
            label: 'Actividad',
            icon: Clock,
            ...(orderIncidents.length > 0
              ? {
                  badge: orderIncidents.length,
                  badgeTone: 'alert' as const,
                  badgeLabel: `${orderIncidents.length} incidencias`,
                }
              : {}),
          },
        ]}
      />

      {/* 4. Tab Content Views */}
      <TabPanel idPrefix="detail" id={activeTab}>
      {activeTab === 'operation' && (
        <OperationTab
          order={order}
          onOpenIncident={() => setIsIncidentModalOpen(true)}
          onSwitchTab={setActiveTab}
          refreshFromServer={refreshFromServer}
          hasActiveIncidents={hasActiveIncidents}
          activeIncidentsCount={activeIncidents.length}
          custodyCode={custody.code}
          custodyType={custody.type}
          serverOrder={serverOrder}
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
        />
      )}

      {activeTab === 'activity' && (
        <ActivityTab
          order={order}
          orderIncidents={orderIncidents}
          onOpenIncidentModal={() => setIsIncidentModalOpen(true)}
        />
      )}
      </TabPanel>

      {/* 5. Modals & Drawers */}
      {/* Incident Modal */}
      {isIncidentModalOpen && (
        <IncidentModal
          order={order}
          isOpen={true}
          // En planta se registra la incidencia, pero retener se hace solo en Planta.
          allowHold={!inPlant}
          onClose={() => setIsIncidentModalOpen(false)}
          onSuccess={() => {
            void refreshFromServer();
            void refreshIncidents();
          }}
        />
      )}

      {/* Retención para revisión técnica: incidencia con retención en el servidor */}
      {isQuarantineModalOpen && !inPlant && (
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
