// Simulaciones de cliente y datos de prueba para ejercitar el motor local. Solo para pruebas.
import { BusinessService } from '../../../src/services/BusinessService';
import { serviceAreaService } from '../../../src/services/geo/ServiceAreaService';
import { INITIAL_ORDERS } from './mockData';

// `this` es el servicio de almacenamiento.
export const sampleMethods: Record<string, (this: any, ...args: any[]) => any> = {
  sampleBusinessActor(this: any, actor: Actor) {
    if (this.getCurrentUser().role !== 'ADMIN')
      throw new Error(
        'La simulación de cliente o chofer está reservada al Administrador del MVP.',
      );
    if (
      (actor.role === 'CLIENT' &&
        !this.getWorkflow().customers.some((c) => c.id === actor.id)) ||
      (actor.role === 'DRIVER' &&
        !this.getDrivers().some((d) => d.id === actor.id))
    )
      throw new Error('Cuenta sample no encontrada.');
    return new BusinessService({
      read: () => this.getWorkflow(),
      transaction: (work) => {
        const state = this.getWorkflow();
        const result = work(state);
        localStorage.setItem(this.workflowKey, JSON.stringify(state));
        this.notify();
        return result;
      },
      actor: () => actor,
      facilities: () => this.getFacilities(),
      catalog: () => this.getCatalog(),
      promotions: () => this.getPromotions(),
      zoneFor: (address, facility) => {
        const area = serviceAreaService.findArea(address.coordinates);
        return area?.facilityId === facility ? area.id : undefined;
      },
      covers: (address, facility) =>
        serviceAreaService.findArea(address.coordinates)?.facilityId ===
        facility,
      handoffs: this.handoffService,
    });
  },

  createSampleOrder(this: any): Order {
    const orders = this.getOrders();
    const existing = orders.find((o) => o.id === 'SOL-SAMPLE-001');
    if (existing) return existing;
    const template =
      INITIAL_ORDERS.find((o) => o.facilityId === 'FAC-02') ??
      INITIAL_ORDERS[0];
    const order: Order = JSON.parse(JSON.stringify(template));
    Object.assign(order, {
      id: 'SOL-SAMPLE-001',
      trackingNumber: 'SAMPLE-SAMBORONDON',
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
  },

  requestSampleReward(this: any, 
    customerId: string,
    rewardId: string,
  ): RewardRedemption {
    if (this.getCurrentUser().role !== 'ADMIN')
      throw Error(
        'Solo el Administrador puede simular una solicitud de canje en este MVP web.',
      );
    const state = this.getWorkflow();
    state.redemptions ??= this.getRedemptions();
    const customer = state.customers.find((c) => c.id === customerId);
    const reward = this.getRewards().find(
      (r) => r.id === rewardId && r.status === 'ACTIVE',
    );
    if (!customer || !reward)
      throw Error('Selecciona un cliente y una recompensa activa.');
    const reserved = state.redemptions
      .filter(
        (r) =>
          r.customerId === customerId &&
          r.status === 'PENDING' &&
          r.pointsReserved,
      )
      .reduce((sum, r) => sum + r.pointsSpent, 0);
    const purchases = state.orders.filter(
      (o) => o.customerId === customerId && o.status === 'COMPLETED',
    );
    const spend = purchases.reduce((sum, o) => sum + o.pricing.total, 0);
    if (
      customer.points - reserved < reward.pointsCost ||
      customer.completedOrders < reward.minPurchases ||
      spend < reward.minSpend
    )
      throw Error(
        'El cliente no cumple los requisitos del canje o tiene puntos reservados.',
      );
    const redemption: RewardRedemption = {
      id: 'RED-' + crypto.randomUUID(),
      customerId,
      customerName: customer.fullName,
      rewardId,
      rewardName: reward.name,
      pointsSpent: reward.pointsCost,
      date: new Date().toISOString(),
      status: 'PENDING',
      pointsReserved: true,
    };
    state.redemptions.push(redemption);
    state.businessAudits.push({
      id: crypto.randomUUID(),
      actorId: customerId,
      actorRole: 'CLIENT',
      action: 'SAMPLE_REWARD_REQUESTED',
      reason:
        'Solicitud local simulada por Administrador; no sincroniza con LaundryApp.',
      at: redemption.date,
    });
    localStorage.setItem(this.workflowKey, JSON.stringify(state));
    this.notify();
    return redemption;
  },
};
