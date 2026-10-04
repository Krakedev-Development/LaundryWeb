import { prepareWebDemoData } from './geo/WebDemoData';
import { eligibilityReasons } from './geo/DispatchService';
import { serviceAreaService } from './geo/ServiceAreaService';
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
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CATALOG,
  INITIAL_CUSTOMERS,
  INITIAL_DRIVERS,
  INITIAL_FACILITIES,
  INITIAL_INCIDENTS,
  INITIAL_ORDERS,
  INITIAL_POINTS_LEDGER,
  INITIAL_PROMOTIONS,
  INITIAL_REDEMPTIONS,
  INITIAL_REWARDS,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from './mockData';

const STORAGE_KEYS = {
  CURRENT_USER: 'lw_current_user',
  ORDERS: 'lw_orders',
  CUSTOMERS: 'lw_customers',
  DRIVERS: 'lw_drivers',
  FACILITIES: 'lw_facilities',
  INCIDENTS: 'lw_incidents',
  CATALOG: 'lw_catalog',
  PROMOTIONS: 'lw_promotions',
  REWARDS: 'lw_rewards',
  REDEMPTIONS: 'lw_redemptions',
  POINTS_LEDGER: 'lw_points_ledger',
  AUDIT_LOGS: 'lw_audit_logs',
  SETTINGS: 'lw_settings',
};

type Listener = () => void;

class StorageService {
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.initIfEmpty();
    const data = {
      orders: this.getOrders(),
      customers: this.getCustomers(),
      drivers: this.getDrivers(),
      facilities: this.getFacilities(),
      settings: this.getSettings(),
    };
    prepareWebDemoData(data);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data.orders));
    localStorage.setItem(
      STORAGE_KEYS.CUSTOMERS,
      JSON.stringify(data.customers),
    );
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(data.drivers));
    localStorage.setItem(
      STORAGE_KEYS.FACILITIES,
      JSON.stringify(data.facilities),
    );
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Listener notification error:', err);
      }
    });
  }

  private initIfEmpty() {
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_USER,
        JSON.stringify(INITIAL_USERS[0]),
      ); // default admin
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      localStorage.setItem(
        STORAGE_KEYS.CUSTOMERS,
        JSON.stringify(INITIAL_CUSTOMERS),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.DRIVERS)) {
      localStorage.setItem(
        STORAGE_KEYS.DRIVERS,
        JSON.stringify(INITIAL_DRIVERS),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.FACILITIES)) {
      localStorage.setItem(
        STORAGE_KEYS.FACILITIES,
        JSON.stringify(INITIAL_FACILITIES),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.INCIDENTS)) {
      localStorage.setItem(
        STORAGE_KEYS.INCIDENTS,
        JSON.stringify(INITIAL_INCIDENTS),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATALOG)) {
      localStorage.setItem(
        STORAGE_KEYS.CATALOG,
        JSON.stringify(INITIAL_CATALOG),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROMOTIONS)) {
      localStorage.setItem(
        STORAGE_KEYS.PROMOTIONS,
        JSON.stringify(INITIAL_PROMOTIONS),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.REWARDS)) {
      localStorage.setItem(
        STORAGE_KEYS.REWARDS,
        JSON.stringify(INITIAL_REWARDS),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.REDEMPTIONS)) {
      localStorage.setItem(
        STORAGE_KEYS.REDEMPTIONS,
        JSON.stringify(INITIAL_REDEMPTIONS),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.POINTS_LEDGER)) {
      localStorage.setItem(
        STORAGE_KEYS.POINTS_LEDGER,
        JSON.stringify(INITIAL_POINTS_LEDGER),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(
        STORAGE_KEYS.AUDIT_LOGS,
        JSON.stringify(INITIAL_AUDIT_LOGS),
      );
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(INITIAL_SETTINGS),
      );
    }
  }

  public resetAll(): void {
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify(INITIAL_USERS[0]),
    );
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    localStorage.setItem(
      STORAGE_KEYS.CUSTOMERS,
      JSON.stringify(INITIAL_CUSTOMERS),
    );
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(INITIAL_DRIVERS));
    localStorage.setItem(
      STORAGE_KEYS.FACILITIES,
      JSON.stringify(INITIAL_FACILITIES),
    );
    localStorage.setItem(
      STORAGE_KEYS.INCIDENTS,
      JSON.stringify(INITIAL_INCIDENTS),
    );
    localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(INITIAL_CATALOG));
    localStorage.setItem(
      STORAGE_KEYS.PROMOTIONS,
      JSON.stringify(INITIAL_PROMOTIONS),
    );
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(INITIAL_REWARDS));
    localStorage.setItem(
      STORAGE_KEYS.REDEMPTIONS,
      JSON.stringify(INITIAL_REDEMPTIONS),
    );
    localStorage.setItem(
      STORAGE_KEYS.POINTS_LEDGER,
      JSON.stringify(INITIAL_POINTS_LEDGER),
    );
    localStorage.setItem(
      STORAGE_KEYS.AUDIT_LOGS,
      JSON.stringify(INITIAL_AUDIT_LOGS),
    );
    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify(INITIAL_SETTINGS),
    );
    this.notify();
  }

  public publishDemoLocation(
    id: string,
    coordinates: { lat: number; lng: number },
    updatedAt: string,
  ) {
    const drivers = this.getDrivers();
    const driver = drivers.find((d) => d.id === id);
    if (driver) {
      Object.assign(driver.location, coordinates, {
        lastUpdated: updatedAt,
        simulated: true,
      });
      this.saveDrivers(drivers);
    }
  }
  public refreshDemoLocations() {
    const drivers = this.getDrivers();
    drivers.forEach((d) => {
      if (d.location.simulated && d.status !== 'OFFLINE')
        d.location.lastUpdated = new Date().toISOString();
    });
    this.saveDrivers(drivers);
  }
  public createDemoOrder(): Order {
    const orders = this.getOrders();
    const existing = orders.find((o) => o.id === 'SOL-DEMO-001');
    if (existing) return existing;
    const template =
      INITIAL_ORDERS.find((o) => o.facilityId === 'FAC-02') ??
      INITIAL_ORDERS[0];
    const order: Order = JSON.parse(JSON.stringify(template));
    Object.assign(order, {
      id: 'SOL-DEMO-001',
      trackingNumber: 'DEMO-SAMBORONDON',
      status: 'PICKUP_PENDING',
      incidentsCount: 0,
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    order.pickup = {
      date: new Date().toISOString().slice(0, 10),
      timeSlot: '16:00 - 18:00',
    };
    order.delivery = {
      targetDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      timeSlot: '16:00 - 18:00',
      recipientName: order.customerName,
      recipientPhone: order.customerPhone,
    };
    this.saveOrders([order, ...orders]);
    return order;
  }

  // --- AUTH ---
  public getCurrentUser(): User {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return INITIAL_USERS[0];
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS[0];
    }
  }

  public setCurrentUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.notify();
  }

  public switchRole(role: UserRole): void {
    const target = INITIAL_USERS.find((u) => u.role === role) || {
      ...this.getCurrentUser(),
      role,
      name: role === 'ADMIN' ? 'Carlos Mendoza' : 'Elena Rostova',
    };
    this.setCurrentUser(target);
  }

  // --- ORDERS ---
  public getOrders(): Order[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  }

  public getOrderById(id: string): Order | undefined {
    return this.getOrders().find((o) => o.id === id);
  }

  public saveOrders(orders: Order[]): void {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.notify();
  }

  public assignDriver(
    orderId: string,
    driverId: string,
    type: 'pickup' | 'delivery',
    notes?: string,
  ): { success: boolean; error?: string } {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1)
      return { success: false, error: 'Orden no encontrada' };

    const drivers = this.getDrivers();
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return { success: false, error: 'Chofer no encontrado' };

    const order = orders[orderIndex];
    const allowed =
      type === 'pickup'
        ? ['PICKUP_PENDING']
        : ['READY_FOR_DELIVERY', 'DELIVERY_SCHEDULED'];
    if (!allowed.includes(order.status))
      return {
        success: false,
        error: 'La etapa ya fue asignada o no permite asignación.',
      };
    const targetCoordinates =
      type === 'pickup'
        ? order.customerAddress.coordinates
        : order.deliveryAddress.coordinates;
    const area = serviceAreaService.findArea(targetCoordinates);
    if (!area)
      return { success: false, error: 'Dirección fuera de cobertura.' };
    const reasons = eligibilityReasons(
      {
        id: driver.id,
        status: driver.status,
        coordinates: driver.location,
        updatedAt: driver.location.lastUpdated,
        facilityId: driver.facilityId,
        zoneId: driver.zoneId,
        activeOrders: driver.activeOrders,
        maxOrders: driver.maxOrders,
        rating: driver.rating,
        authorizedZoneIds: driver.authorizedZoneIds,
      },
      {
        id: order.id,
        coordinates: targetCoordinates,
        facilityId: order.facilityId,
        zoneId: area.id,
      },
    );
    if (reasons.length) return { success: false, error: reasons.join('. ') };
    const currentUser = this.getCurrentUser();
    const now =
      'Hoy ' +
      new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

    if (type === 'pickup') {
      order.pickup.driverId = driver.id;
      order.pickup.driverName = driver.name;
      order.pickup.vehiclePlate = driver.vehiclePlate;
      if (notes) order.pickup.notes = notes;

      const prevStatus = order.status;
      order.status = 'PICKUP_ASSIGNED';
      order.updatedAt = new Date().toISOString();

      order.timeline.push({
        id: 'TL-' + Date.now(),
        status: 'PICKUP_ASSIGNED',
        label: `Chofer asignado para recogida: ${driver.name} (${driver.vehiclePlate})`,
        timestamp: now,
        userName: currentUser.name,
        userRole: currentUser.role,
        notes: notes || 'Asignación vía módulo de despacho',
      });

      this.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CHOFER_RECOGIDA_ASIGNADO',
        entity: 'Order',
        entityId: order.id,
        previousValue: prevStatus,
        newValue: `Asignado a ${driver.name}`,
        notes: notes || undefined,
      });
    } else {
      order.delivery.driverId = driver.id;
      order.delivery.driverName = driver.name;
      order.delivery.vehiclePlate = driver.vehiclePlate;
      if (notes) order.delivery.notes = notes;

      const prevStatus = order.status;
      order.status = 'DELIVERY_ASSIGNED';
      order.updatedAt = new Date().toISOString();

      order.timeline.push({
        id: 'TL-' + Date.now(),
        status: 'DELIVERY_ASSIGNED',
        label: `Chofer asignado para entrega: ${driver.name} (${driver.vehiclePlate})`,
        timestamp: now,
        userName: currentUser.name,
        userRole: currentUser.role,
        notes: notes || 'Asignación de entrega',
      });

      this.addAuditLog({
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CHOFER_ENTREGA_ASIGNADO',
        entity: 'Order',
        entityId: order.id,
        previousValue: prevStatus,
        newValue: `Asignado a ${driver.name}`,
        notes: notes || undefined,
      });
    }

    // Update driver active orders count
    driver.activeOrders = Math.min(driver.maxOrders, driver.activeOrders + 1);
    this.saveDrivers(drivers);
    this.saveOrders(orders);
    return { success: true };
  }

  public updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
    isOverride: boolean = false,
    overrideReason?: string,
  ): { success: boolean; error?: string } {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1)
      return { success: false, error: 'Orden no encontrada' };

    const order = orders[orderIndex];

    // Rule: Cannot close order if there are OPEN or IN_PROGRESS incidents
    if (newStatus === 'CLOSED' || newStatus === 'DELIVERED') {
      const incidents = this.getIncidents().filter(
        (i) =>
          i.orderId === orderId &&
          (i.status === 'OPEN' || i.status === 'IN_PROGRESS'),
      );
      if (incidents.length > 0) {
        return {
          success: false,
          error: `No se puede finalizar la orden. Existen ${incidents.length} incidencia(s) abiertas o en investigación.`,
        };
      }
    }

    // Rule: Order in quarantine cannot advance to READY_FOR_DELIVERY unless released
    if (
      order.status === 'QUARANTINE' &&
      newStatus === 'READY_FOR_DELIVERY' &&
      !isOverride
    ) {
      return {
        success: false,
        error:
          'La orden se encuentra en CUARENTENA. Debe ser liberada técnicamente antes de pasar a Lista para entrega.',
      };
    }

    const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      CREATED: ['PICKUP_PENDING'],
      PICKUP_PENDING: ['PICKUP_ASSIGNED'],
      PICKUP_ASSIGNED: ['HEADING_TO_PICKUP'],
      HEADING_TO_PICKUP: ['ARRIVED_FOR_PICKUP'],
      ARRIVED_FOR_PICKUP: ['PICKED_UP'],
      PICKED_UP: ['HEADING_TO_FACILITY'],
      HEADING_TO_FACILITY: ['AT_FACILITY'],
      AT_FACILITY: ['IN_PROCESS'],
      IN_PROCESS: ['QUALITY_CONTROL', 'QUARANTINE'],
      QUALITY_CONTROL: ['READY_FOR_DELIVERY', 'QUARANTINE'],
      READY_FOR_DELIVERY: ['DELIVERY_SCHEDULED', 'DELIVERY_ASSIGNED'],
      DELIVERY_SCHEDULED: ['DELIVERY_ASSIGNED'],
      DELIVERY_ASSIGNED: ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: ['ARRIVED_FOR_DELIVERY'],
      ARRIVED_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: ['CLOSED'],
      QUARANTINE: ['QUALITY_CONTROL'],
    };
    if (
      !isOverride &&
      !['INCIDENT', 'CANCELLED', 'QUARANTINE'].includes(newStatus) &&
      !transitions[order.status]?.includes(newStatus)
    )
      return {
        success: false,
        error: 'Transición no permitida en esta etapa.',
      };
    if (isOverride && this.getCurrentUser().role !== 'ADMIN')
      return {
        success: false,
        error:
          'Solo un administrador puede cambiar una etapa excepcionalmente.',
      };
    const drivers = this.getDrivers();
    const deliveryPhase = [
      'DELIVERY_ASSIGNED',
      'OUT_FOR_DELIVERY',
      'ARRIVED_FOR_DELIVERY',
    ].includes(order.status);
    const assignedId = deliveryPhase
      ? order.delivery.driverId
      : order.pickup.driverId;
    const assigned = drivers.find((d) => d.id === assignedId);
    if (
      assigned &&
      ['HEADING_TO_PICKUP', 'OUT_FOR_DELIVERY', 'HEADING_TO_FACILITY'].includes(
        newStatus,
      )
    )
      assigned.status = 'ON_SERVICE';
    if (
      assigned &&
      ['AT_FACILITY', 'DELIVERED', 'CANCELLED'].includes(newStatus)
    ) {
      assigned.activeOrders = Math.max(0, assigned.activeOrders - 1);
      assigned.status = 'AVAILABLE';
    }
    this.saveDrivers(drivers);
    const prevStatus = order.status;
    const currentUser = this.getCurrentUser();
    const now =
      'Hoy ' +
      new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

    order.previousStatus = prevStatus;
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();

    const labelMap: Record<OrderStatus, string> = {
      CREATED: 'Solicitud creada',
      PICKUP_PENDING: 'Esperando asignación de recogida',
      PICKUP_ASSIGNED: 'Chofer asignado para recogida',
      HEADING_TO_PICKUP: 'Chofer en ruta hacia punto de recogida',
      ARRIVED_FOR_PICKUP: 'Chofer en dirección de recogida',
      HEADING_TO_FACILITY: 'Traslado a planta',
      ARRIVED_FOR_DELIVERY: 'Chofer en dirección de entrega',
      PICKED_UP: 'Prendas recogidas exitosamente',
      AT_FACILITY: 'Recepción en planta de lavado',
      IN_PROCESS: 'En procesamiento / túnel de lavado',
      QUALITY_CONTROL: 'Inspección de control de calidad',
      READY_FOR_DELIVERY: 'Lista para despacho y empaque',
      DELIVERY_SCHEDULED: 'Entrega programada con fecha/franja',
      DELIVERY_ASSIGNED: 'Chofer asignado para entrega',
      OUT_FOR_DELIVERY: 'En camino hacia la dirección del cliente',
      DELIVERED: 'Prendas entregadas en destino',
      CLOSED: 'Solicitud finalizada y cerrada',
      INCIDENT: 'Incidencia operacional activa',
      CANCELLED: 'Solicitud cancelada',
      QUARANTINE: 'Lote enviado a CUARENTENA para revisión',
    };

    order.timeline.push({
      id: 'TL-' + Date.now(),
      status: newStatus,
      label: labelMap[newStatus] || newStatus,
      timestamp: now,
      userName: currentUser.name,
      userRole: currentUser.role,
      notes: isOverride
        ? `[OVERRIDE ADMIN] Motivo: ${overrideReason} | Nota: ${notes || ''}`
        : notes,
      isOverride,
    });

    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: isOverride ? 'OVERRIDE_ESTADO_ORDEN' : 'ESTADO_ORDEN_ACTUALIZADO',
      entity: 'Order',
      entityId: order.id,
      previousValue: prevStatus,
      newValue: newStatus,
      notes: isOverride ? `Motivo: ${overrideReason}. ${notes || ''}` : notes,
    });

    this.saveOrders(orders);
    return { success: true };
  }

  public moveToQuarantine(
    orderId: string,
    reason: string,
    notes?: string,
  ): { success: boolean; error?: string } {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1)
      return { success: false, error: 'Orden no encontrada' };

    const order = orders[orderIndex];
    order.quarantineReason = reason;
    order.quarantineNotes = notes;
    order.quarantineDate =
      'Hoy ' +
      new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

    return this.updateOrderStatus(
      orderId,
      'QUARANTINE',
      `Cuarentena: ${reason}. ${notes || ''}`,
    );
  }

  public releaseFromQuarantine(
    orderId: string,
    targetStatus: OrderStatus = 'QUALITY_CONTROL',
    resolutionNotes?: string,
  ): { success: boolean; error?: string } {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Orden no encontrada' };

    order.quarantineReason = undefined;
    order.quarantineNotes = undefined;

    return this.updateOrderStatus(
      orderId,
      targetStatus,
      `Liberado de cuarentena: ${resolutionNotes || 'Tratamiento aprobado'}`,
    );
  }

  public scheduleDelivery(
    orderId: string,
    targetDate: string,
    timeSlot: string,
    recipientName: string,
    recipientPhone: string,
    notes?: string,
    driverId?: string,
  ): { success: boolean; error?: string } {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Orden no encontrada' };

    order.delivery.targetDate = targetDate;
    order.delivery.timeSlot = timeSlot;
    order.delivery.recipientName = recipientName;
    order.delivery.recipientPhone = recipientPhone;
    if (notes) order.delivery.notes = notes;
    order.delivery.scheduledAt =
      'Hoy ' +
      new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

    if (driverId) {
      const drivers = this.getDrivers();
      const driver = drivers.find((d) => d.id === driverId);
      if (driver) {
        order.delivery.driverId = driver.id;
        order.delivery.driverName = driver.name;
        order.delivery.vehiclePlate = driver.vehiclePlate;
        return this.updateOrderStatus(
          orderId,
          'DELIVERY_ASSIGNED',
          `Programado y asignado a ${driver.name}`,
        );
      }
    }

    return this.updateOrderStatus(
      orderId,
      'DELIVERY_SCHEDULED',
      `Entrega programada para ${targetDate} (${timeSlot})`,
    );
  }

  // --- INCIDENTS ---
  public getIncidents(): Incident[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    return raw ? JSON.parse(raw) : [];
  }

  public getIncidentById(id: string): Incident | undefined {
    return this.getIncidents().find((i) => i.id === id);
  }

  public saveIncidents(incidents: Incident[]): void {
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
    this.notify();
  }

  public createIncident(
    incidentData: Omit<
      Incident,
      'id' | 'createdAt' | 'status' | 'internalNotes'
    >,
  ): Incident {
    const incidents = this.getIncidents();
    const currentUser = this.getCurrentUser();
    const newId = 'INC-0' + (188 + incidents.length);

    const newIncident: Incident = {
      ...incidentData,
      id: newId,
      status: 'OPEN',
      createdAt:
        'Hoy ' +
        new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      internalNotes: [],
    };

    incidents.unshift(newIncident);
    this.saveIncidents(incidents);

    // Update order incident count and add timeline entry
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === incidentData.orderId);
    if (order) {
      order.incidentsCount += 1;
      order.timeline.push({
        id: 'TL-' + Date.now(),
        status: order.status,
        label: `Incidencia registrada (${newId}): ${incidentData.type}`,
        timestamp:
          'Hoy ' +
          new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        userName: currentUser.name,
        userRole: currentUser.role,
        notes: incidentData.description,
      });
      this.saveOrders(orders);
    }

    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'INCIDENCIA_REGISTRADA',
      entity: 'Incident',
      entityId: newId,
      newValue: incidentData.severity + ' - ' + incidentData.type,
      notes: `Orden ${incidentData.orderId}: ${incidentData.description}`,
    });

    return newIncident;
  }

  public updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    resolutionNotes?: string,
  ): { success: boolean } {
    const incidents = this.getIncidents();
    const inc = incidents.find((i) => i.id === incidentId);
    if (!inc) return { success: false };

    const prev = inc.status;
    inc.status = status;
    const currentUser = this.getCurrentUser();

    if (status === 'RESOLVED') {
      inc.resolvedAt =
        'Hoy ' +
        new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        });
      inc.resolutionNotes = resolutionNotes;
    }

    this.saveIncidents(incidents);

    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'INCIDENCIA_ESTADO_CAMBIADO',
      entity: 'Incident',
      entityId: incidentId,
      previousValue: prev,
      newValue: status,
      notes: resolutionNotes || undefined,
    });

    return { success: true };
  }

  public addIncidentNote(incidentId: string, text: string): void {
    const incidents = this.getIncidents();
    const inc = incidents.find((i) => i.id === incidentId);
    if (!inc) return;

    const currentUser = this.getCurrentUser();
    inc.internalNotes.push({
      id: 'NOT-' + Date.now(),
      author: currentUser.name,
      text,
      createdAt:
        'Hoy ' +
        new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
    });

    this.saveIncidents(incidents);
  }

  // --- CUSTOMERS & KYC ---
  public getCustomers(): Customer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return raw ? JSON.parse(raw) : [];
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  public saveCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    this.notify();
  }

  public updateCustomerKyc(
    customerId: string,
    status: KycStatus,
    rejectionReason?: string,
  ): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Solo los Administradores pueden aprobar o rechazar KYC',
      };
    }

    if (
      status === 'REJECTED' &&
      (!rejectionReason || !rejectionReason.trim())
    ) {
      return {
        success: false,
        error:
          'Debe ingresar un motivo obligatorio para rechazar la validación KYC',
      };
    }

    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return { success: false, error: 'Cliente no encontrado' };

    const prevStatus = customer.kycStatus;
    customer.kycStatus = status;
    customer.kycReviewedAt =
      'Hoy ' +
      new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    customer.kycReviewedBy = currentUser.name;
    if (status === 'REJECTED') {
      customer.kycRejectionReason = rejectionReason;
    } else {
      customer.kycRejectionReason = undefined;
    }

    this.saveCustomers(customers);

    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: status === 'APPROVED' ? 'KYC_APROBADO' : 'KYC_RECHAZADO',
      entity: 'Customer',
      entityId: customer.id,
      previousValue: prevStatus,
      newValue: status,
      notes:
        rejectionReason ||
        `Validación completa de identidad para ${customer.fullName}`,
    });

    return { success: true };
  }

  public adjustCustomerPoints(
    customerId: string,
    pointsDelta: number,
    reason: string,
  ): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    if (currentUser.role !== 'ADMIN') {
      return {
        success: false,
        error:
          'Solo Administradores pueden realizar ajustes manuales de puntos',
      };
    }
    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: 'El motivo del ajuste administrativo de puntos es obligatorio',
      };
    }

    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return { success: false, error: 'Cliente no encontrado' };

    const prevPoints = customer.points;
    customer.points = Math.max(0, customer.points + pointsDelta);
    this.saveCustomers(customers);

    // Ledger entry
    const ledger = this.getPointsLedger();
    ledger.unshift({
      id: 'LED-' + Date.now(),
      customerId: customer.id,
      points: pointsDelta,
      type: 'ADMIN_ADJUSTMENT',
      reason,
      date:
        'Hoy ' +
        new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      adminUser: currentUser.name,
    });
    localStorage.setItem(STORAGE_KEYS.POINTS_LEDGER, JSON.stringify(ledger));

    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'AJUSTE_PUNTOS_ADMIN',
      entity: 'Customer',
      entityId: customer.id,
      previousValue: `${prevPoints} pts`,
      newValue: `${customer.points} pts (${pointsDelta > 0 ? '+' : ''}${pointsDelta})`,
      notes: reason,
    });

    this.notify();
    return { success: true };
  }

  public getPointsLedger(): PointsLedgerEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.POINTS_LEDGER);
    return raw ? JSON.parse(raw) : [];
  }

  // --- DRIVERS ---
  public getDrivers(): Driver[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVERS);
    return raw ? JSON.parse(raw) : [];
  }

  public getDriverById(id: string): Driver | undefined {
    return this.getDrivers().find((d) => d.id === id);
  }

  public saveDrivers(drivers: Driver[]): void {
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
    this.notify();
  }

  public createDriver(
    driverData: Omit<
      Driver,
      'id' | 'activeOrders' | 'rating' | 'completedTripsToday'
    >,
  ): Driver {
    const drivers = this.getDrivers();
    const newId = 'DRV-' + (109 + drivers.length);
    const newDriver: Driver = {
      ...driverData,
      id: newId,
      activeOrders: 0,
      rating: 5.0,
      completedTripsToday: 0,
    };
    drivers.push(newDriver);
    this.saveDrivers(drivers);

    const currentUser = this.getCurrentUser();
    this.addAuditLog({
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'CHOFER_CREADO',
      entity: 'Driver',
      entityId: newId,
      newValue: newDriver.name,
      notes: `Vehículo: ${newDriver.vehicleType} - Placa: ${newDriver.vehiclePlate}`,
    });

    return newDriver;
  }

  public updateDriver(driver: Driver): void {
    const drivers = this.getDrivers();
    const idx = drivers.findIndex((d) => d.id === driver.id);
    if (idx !== -1) {
      drivers[idx] = driver;
      this.saveDrivers(drivers);
    }
  }

  // --- FACILITIES ---
  public getFacilities(): Facility[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FACILITIES);
    return raw ? JSON.parse(raw) : [];
  }

  public saveFacilities(facilities: Facility[]): void {
    localStorage.setItem(STORAGE_KEYS.FACILITIES, JSON.stringify(facilities));
    this.notify();
  }

  public createFacility(
    facData: Omit<
      Facility,
      'id' | 'activeOrders' | 'assignedDriversCount' | 'currentLoadKgDay'
    >,
  ): Facility {
    const facilities = this.getFacilities();
    const newId = 'FAC-0' + (facilities.length + 1);
    const newFacility: Facility = {
      ...facData,
      id: newId,
      activeOrders: 0,
      assignedDriversCount: 0,
      currentLoadKgDay: 0,
    };
    facilities.push(newFacility);
    this.saveFacilities(facilities);
    return newFacility;
  }

  public updateFacility(facility: Facility): void {
    const facilities = this.getFacilities();
    const idx = facilities.findIndex((f) => f.id === facility.id);
    if (idx !== -1) {
      facilities[idx] = facility;
      this.saveFacilities(facilities);
    }
  }

  // --- CATALOG ---
  public getCatalog(): CatalogItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CATALOG);
    return raw ? JSON.parse(raw) : [];
  }

  public saveCatalog(items: CatalogItem[]): void {
    localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(items));
    this.notify();
  }

  public createCatalogItem(itemData: Omit<CatalogItem, 'id'>): CatalogItem {
    const catalog = this.getCatalog();
    const newId = 'CAT-' + (catalog.length + 1).toString().padStart(2, '0');
    const newItem: CatalogItem = { ...itemData, id: newId };
    catalog.push(newItem);
    this.saveCatalog(catalog);
    return newItem;
  }

  public updateCatalogItem(item: CatalogItem): void {
    const catalog = this.getCatalog();
    const idx = catalog.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      catalog[idx] = item;
      this.saveCatalog(catalog);
    }
  }

  // --- PROMOTIONS ---
  public getPromotions(): Promotion[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROMOTIONS);
    return raw ? JSON.parse(raw) : [];
  }

  public savePromotions(promotions: Promotion[]): void {
    localStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(promotions));
    this.notify();
  }

  public createPromotion(promoData: Omit<Promotion, 'id' | 'usageCount'>): {
    success: boolean;
    error?: string;
    promo?: Promotion;
  } {
    if (new Date(promoData.endDate) < new Date(promoData.startDate)) {
      return {
        success: false,
        error: 'La fecha de fin no puede ser anterior a la de inicio',
      };
    }
    if (
      promoData.discountType === 'PERCENTAGE' &&
      promoData.discountValue > 100
    ) {
      return {
        success: false,
        error: 'El porcentaje de descuento no puede ser superior al 100%',
      };
    }
    if (promoData.discountValue <= 0) {
      return {
        success: false,
        error: 'El valor de descuento debe ser mayor que 0',
      };
    }
    if (
      !promoData.applicableServices ||
      promoData.applicableServices.length === 0
    ) {
      return {
        success: false,
        error: 'Debe seleccionar al menos un servicio aplicable',
      };
    }

    const promotions = this.getPromotions();
    const newId = 'PROM-0' + (promotions.length + 1);
    const newPromo: Promotion = {
      ...promoData,
      id: newId,
      usageCount: 0,
    };
    promotions.push(newPromo);
    this.savePromotions(promotions);
    return { success: true, promo: newPromo };
  }

  // --- REWARDS & REDEMPTIONS ---
  public getRewards(): Reward[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REWARDS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveRewards(rewards: Reward[]): void {
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
    this.notify();
  }

  public createReward(data: Omit<Reward, 'id'>): Reward {
    const rewards = this.getRewards();
    const newId = 'REW-0' + (rewards.length + 1);
    const newReward: Reward = { ...data, id: newId };
    rewards.push(newReward);
    this.saveRewards(rewards);
    return newReward;
  }

  public getRedemptions(): RewardRedemption[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REDEMPTIONS);
    return raw ? JSON.parse(raw) : [];
  }

  public updateRedemptionStatus(
    redemptionId: string,
    status: RewardRedemption['status'],
    notes?: string,
  ): { success: boolean } {
    const redemptions = this.getRedemptions();
    const red = redemptions.find((r) => r.id === redemptionId);
    if (!red) return { success: false };

    const currentUser = this.getCurrentUser();
    red.status = status;
    red.reviewedBy = currentUser.name;
    if (notes) red.notes = notes;

    localStorage.setItem(STORAGE_KEYS.REDEMPTIONS, JSON.stringify(redemptions));
    this.notify();
    return { success: true };
  }

  // --- SETTINGS ---
  public getSettings(): SystemSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : INITIAL_SETTINGS;
  }

  public updateSettings(settings: SystemSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.notify();
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...entry,
      id: 'AUD-' + Date.now(),
      timestamp:
        'Hoy ' +
        new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
    };
    logs.unshift(newLog);
    localStorage.setItem(
      STORAGE_KEYS.AUDIT_LOGS,
      JSON.stringify(logs.slice(0, 100)),
    );
    this.notify();
  }
}

export const storageService = new StorageService();
