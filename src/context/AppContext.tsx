import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AuditLog,
  CatalogItem,
  Customer,
  Driver,
  Facility,
  Incident,
  IncidentStatus,
  KycStatus,
  Order,
  OrderStatus,
  PointsLedgerEntry,
  Promotion,
  Reward,
  RewardRedemption,
  SystemSettings,
  User,
  UserRole,
} from '../types';
import { storageService } from '../services/storage';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  currentUser: User;
  switchRole: (role: UserRole) => void;
  logout: () => void;
  orders: Order[];
  customers: Customer[];
  drivers: Driver[];
  facilities: Facility[];
  incidents: Incident[];
  catalog: CatalogItem[];
  promotions: Promotion[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  pointsLedger: PointsLedgerEntry[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  // Actions
  assignDriver: (orderId: string, driverId: string, type: 'pickup' | 'delivery', notes?: string) => boolean;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, notes?: string, isOverride?: boolean, overrideReason?: string) => boolean;
  moveToQuarantine: (orderId: string, reason: string, notes?: string) => boolean;
  releaseFromQuarantine: (orderId: string, targetStatus?: OrderStatus, notes?: string) => boolean;
  scheduleDelivery: (orderId: string, targetDate: string, timeSlot: string, recipientName: string, recipientPhone: string, notes?: string, driverId?: string) => boolean;
  createIncident: (data: Omit<Incident, 'id' | 'createdAt' | 'status' | 'internalNotes'>) => Incident;
  updateIncidentStatus: (id: string, status: IncidentStatus, notes?: string) => boolean;
  addIncidentNote: (id: string, text: string) => void;
  updateCustomerKyc: (id: string, status: KycStatus, reason?: string) => boolean;
  adjustCustomerPoints: (id: string, pointsDelta: number, reason: string) => boolean;
  createDriver: (data: Omit<Driver, 'id' | 'activeOrders' | 'rating' | 'completedTripsToday'>) => Driver;
  updateDriver: (driver: Driver) => void;
  createFacility: (data: Omit<Facility, 'id' | 'activeOrders' | 'assignedDriversCount' | 'currentLoadKgDay'>) => Facility;
  updateFacility: (facility: Facility) => void;
  createCatalogItem: (item: Omit<CatalogItem, 'id'>) => CatalogItem;
  updateCatalogItem: (item: CatalogItem) => void;
  createPromotion: (promo: Omit<Promotion, 'id' | 'usageCount'>) => boolean;
  createReward: (reward: Omit<Reward, 'id'>) => Reward;
  updateRedemptionStatus: (id: string, status: RewardRedemption['status'], notes?: string) => boolean;
  updateSettings: (settings: SystemSettings) => void;
  resetAll: () => void;
  // Toasts
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(storageService.getCurrentUser());
  const [orders, setOrders] = useState<Order[]>(storageService.getOrders());
  const [customers, setCustomers] = useState<Customer[]>(storageService.getCustomers());
  const [drivers, setDrivers] = useState<Driver[]>(storageService.getDrivers());
  const [facilities, setFacilities] = useState<Facility[]>(storageService.getFacilities());
  const [incidents, setIncidents] = useState<Incident[]>(storageService.getIncidents());
  const [catalog, setCatalog] = useState<CatalogItem[]>(storageService.getCatalog());
  const [promotions, setPromotions] = useState<Promotion[]>(storageService.getPromotions());
  const [rewards, setRewards] = useState<Reward[]>(storageService.getRewards());
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>(storageService.getRedemptions());
  const [pointsLedger, setPointsLedger] = useState<PointsLedgerEntry[]>(storageService.getPointsLedger());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(storageService.getAuditLogs());
  const [settings, setSettings] = useState<SystemSettings>(storageService.getSettings());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const refreshState = () => {
    setCurrentUser(storageService.getCurrentUser());
    setOrders(storageService.getOrders());
    setCustomers(storageService.getCustomers());
    setDrivers(storageService.getDrivers());
    setFacilities(storageService.getFacilities());
    setIncidents(storageService.getIncidents());
    setCatalog(storageService.getCatalog());
    setPromotions(storageService.getPromotions());
    setRewards(storageService.getRewards());
    setRedemptions(storageService.getRedemptions());
    setPointsLedger(storageService.getPointsLedger());
    setAuditLogs(storageService.getAuditLogs());
    setSettings(storageService.getSettings());
  };

  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      refreshState();
    });
    return () => unsubscribe();
  }, []);

  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const switchRole = (role: UserRole) => {
    storageService.switchRole(role);
    showToast({
      type: 'info',
      title: `Modo de sesión cambiado a ${role === 'ADMIN' ? 'Administrador' : 'Supervisor'}`,
      message: 'Los permisos y opciones de navegación se han actualizado según la matriz de acceso.',
    });
  };

  const logout = () => {
    // switch to logged out state or navigate to /login
    showToast({
      type: 'info',
      title: 'Sesión finalizada',
    });
  };

  const assignDriver = (orderId: string, driverId: string, type: 'pickup' | 'delivery', notes?: string) => {
    const res = storageService.assignDriver(orderId, driverId, type, notes);
    if (res.success) {
      showToast({
        type: 'success',
        title: type === 'pickup' ? 'Chofer de recogida asignado' : 'Chofer de entrega asignado',
        message: `La solicitud ${orderId} ha actualizado su estado operativo.`,
      });
      return true;
    } else {
      showToast({
        type: 'error',
        title: 'Error de asignación',
        message: res.error,
      });
      return false;
    }
  };

  const updateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
    isOverride?: boolean,
    overrideReason?: string
  ) => {
    const res = storageService.updateOrderStatus(orderId, newStatus, notes, isOverride, overrideReason);
    if (res.success) {
      showToast({
        type: isOverride ? 'warning' : 'success',
        title: isOverride ? 'Override administrativo aplicado' : 'Estado de solicitud actualizado',
        message: `Orden ${orderId} ahora en estado: ${newStatus}`,
      });
      return true;
    } else {
      showToast({
        type: 'error',
        title: 'Acción bloqueada por reglas de negocio',
        message: res.error,
      });
      return false;
    }
  };

  const moveToQuarantine = (orderId: string, reason: string, notes?: string) => {
    const res = storageService.moveToQuarantine(orderId, reason, notes);
    if (res.success) {
      showToast({
        type: 'warning',
        title: 'Lote enviado a CUARENTENA',
        message: `Motivo: ${reason}`,
      });
      return true;
    }
    return false;
  };

  const releaseFromQuarantine = (orderId: string, targetStatus?: OrderStatus, notes?: string) => {
    const res = storageService.releaseFromQuarantine(orderId, targetStatus, notes);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Orden liberada de cuarentena',
        message: `Ha avanzado a control de calidad para inspección final.`,
      });
      return true;
    }
    return false;
  };

  const scheduleDelivery = (
    orderId: string,
    targetDate: string,
    timeSlot: string,
    recipientName: string,
    recipientPhone: string,
    notes?: string,
    driverId?: string
  ) => {
    const res = storageService.scheduleDelivery(orderId, targetDate, timeSlot, recipientName, recipientPhone, notes, driverId);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Entrega programada exitosamente',
        message: `Programada para ${targetDate} (${timeSlot})${driverId ? ' con chofer asignado.' : '.'}`,
      });
      return true;
    }
    return false;
  };

  const createIncident = (data: Omit<Incident, 'id' | 'createdAt' | 'status' | 'internalNotes'>) => {
    const inc = storageService.createIncident(data);
    showToast({
      type: 'warning',
      title: `Incidencia registrada (${inc.id})`,
      message: 'Recuerda: las órdenes con incidencias abiertas no pueden cerrarse hasta resolverse.',
    });
    return inc;
  };

  const updateIncidentStatus = (id: string, status: IncidentStatus, notes?: string) => {
    const res = storageService.updateIncidentStatus(id, status, notes);
    if (res.success) {
      showToast({
        type: status === 'RESOLVED' ? 'success' : 'info',
        title: `Incidencia ${id} ${status === 'RESOLVED' ? 'Resuelta' : 'Actualizada'}`,
        message: notes,
      });
      return true;
    }
    return false;
  };

  const addIncidentNote = (id: string, text: string) => {
    storageService.addIncidentNote(id, text);
    showToast({
      type: 'info',
      title: 'Nota interna añadida a incidencia',
    });
  };

  const updateCustomerKyc = (id: string, status: KycStatus, reason?: string) => {
    const res = storageService.updateCustomerKyc(id, status, reason);
    if (res.success) {
      showToast({
        type: status === 'APPROVED' ? 'success' : 'error',
        title: `Validación KYC ${status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}`,
        message: reason || 'Expediente del cliente actualizado.',
      });
      return true;
    } else {
      showToast({
        type: 'error',
        title: 'Error de validación KYC',
        message: res.error,
      });
      return false;
    }
  };

  const adjustCustomerPoints = (id: string, pointsDelta: number, reason: string) => {
    const res = storageService.adjustCustomerPoints(id, pointsDelta, reason);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Ajuste de puntos registrado en Ledger',
        message: `${pointsDelta > 0 ? '+' : ''}${pointsDelta} puntos acreditados/debitados.`,
      });
      return true;
    } else {
      showToast({
        type: 'error',
        title: 'Error al ajustar puntos',
        message: res.error,
      });
      return false;
    }
  };

  const createDriver = (data: Omit<Driver, 'id' | 'activeOrders' | 'rating' | 'completedTripsToday'>) => {
    const drv = storageService.createDriver(data);
    showToast({
      type: 'success',
      title: 'Chofer registrado exitosamente',
      message: `${drv.name} asignado a ${drv.facilityName}`,
    });
    return drv;
  };

  const updateDriver = (drv: Driver) => {
    storageService.updateDriver(drv);
    showToast({
      type: 'info',
      title: 'Datos del chofer actualizados',
    });
  };

  const createFacility = (data: Omit<Facility, 'id' | 'activeOrders' | 'assignedDriversCount' | 'currentLoadKgDay'>) => {
    const fac = storageService.createFacility(data);
    showToast({
      type: 'success',
      title: 'Sede operativa registrada',
      message: fac.name,
    });
    return fac;
  };

  const updateFacility = (fac: Facility) => {
    storageService.updateFacility(fac);
    showToast({
      type: 'info',
      title: 'Sede actualizada',
    });
  };

  const createCatalogItem = (data: Omit<CatalogItem, 'id'>) => {
    const itm = storageService.createCatalogItem(data);
    showToast({
      type: 'success',
      title: 'Ítem agregado al catálogo',
      message: itm.name,
    });
    return itm;
  };

  const updateCatalogItem = (itm: CatalogItem) => {
    storageService.updateCatalogItem(itm);
    showToast({
      type: 'info',
      title: 'Ítem de catálogo actualizado',
    });
  };

  const createPromotion = (promo: Omit<Promotion, 'id' | 'usageCount'>) => {
    const res = storageService.createPromotion(promo);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Promoción creada exitosamente',
        message: `Código: ${promo.code} (${promo.discountValue}${promo.discountType === 'PERCENTAGE' ? '%' : '$'})`,
      });
      return true;
    } else {
      showToast({
        type: 'error',
        title: 'Error al crear promoción',
        message: res.error,
      });
      return false;
    }
  };

  const createReward = (data: Omit<Reward, 'id'>) => {
    const rew = storageService.createReward(data);
    showToast({
      type: 'success',
      title: 'Recompensa creada en el catálogo de fidelización',
      message: rew.name,
    });
    return rew;
  };

  const updateRedemptionStatus = (id: string, status: RewardRedemption['status'], notes?: string) => {
    const res = storageService.updateRedemptionStatus(id, status, notes);
    if (res.success) {
      showToast({
        type: status === 'APPROVED' ? 'success' : 'info',
        title: `Canje de recompensa ${status}`,
        message: notes,
      });
      return true;
    }
    return false;
  };

  const updateSettings = (st: SystemSettings) => {
    storageService.updateSettings(st);
    showToast({
      type: 'success',
      title: 'Configuración general guardada',
    });
  };

  const resetAll = () => {
    storageService.resetAll();
    showToast({
      type: 'info',
      title: 'Datos de demostración restablecidos',
      message: 'Todas las solicitudes, choferes y estados han vuelto a su valor inicial.',
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        switchRole,
        logout,
        orders,
        customers,
        drivers,
        facilities,
        incidents,
        catalog,
        promotions,
        rewards,
        redemptions,
        pointsLedger,
        auditLogs,
        settings,
        assignDriver,
        updateOrderStatus,
        moveToQuarantine,
        releaseFromQuarantine,
        scheduleDelivery,
        createIncident,
        updateIncidentStatus,
        addIncidentNote,
        updateCustomerKyc,
        adjustCustomerPoints,
        createDriver,
        updateDriver,
        createFacility,
        updateFacility,
        createCatalogItem,
        updateCatalogItem,
        createPromotion,
        createReward,
        updateRedemptionStatus,
        updateSettings,
        resetAll,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
