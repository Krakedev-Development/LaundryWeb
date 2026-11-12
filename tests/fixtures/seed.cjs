// Datos de prueba: viven únicamente en las pruebas. El producto arranca vacío y sus datos
// reales llegan por la API. Este módulo reproduce un espacio de trabajo poblado para ejercitar
// el motor local de flujo, custodia y negocio.
require('../ts-loader.cjs');

const sample = require('./sample/mockData.ts');
const { SERVICE_AREAS } = require('./sample/geoSample.ts');
const { prepareHandoffSampleData } = require('./sample/HandoffSampleData.ts');
const { prepareBusinessSampleData } = require('./sample/BusinessSampleData.ts');
const { sampleMethods } = require('./sample/storageSample.ts');

const KEYS = {
  CURRENT_USER: ['lw_current_user', () => sample.INITIAL_USERS[0]],
  ORDERS: ['lw_orders', () => sample.INITIAL_ORDERS],
  CUSTOMERS: ['lw_customers', () => sample.INITIAL_CUSTOMERS],
  DRIVERS: ['lw_drivers', () => sample.INITIAL_DRIVERS],
  FACILITIES: ['lw_facilities', () => sample.INITIAL_FACILITIES],
  INCIDENTS: ['lw_incidents', () => sample.INITIAL_INCIDENTS],
  CATALOG: ['lw_catalog', () => sample.INITIAL_CATALOG],
  PROMOTIONS: ['lw_promotions', () => sample.INITIAL_PROMOTIONS],
  REWARDS: ['lw_rewards', () => sample.INITIAL_REWARDS],
  REDEMPTIONS: ['lw_redemptions', () => sample.INITIAL_REDEMPTIONS],
  POINTS_LEDGER: ['lw_points_ledger', () => sample.INITIAL_POINTS_LEDGER],
  AUDIT_LOGS: ['lw_audit_logs', () => sample.INITIAL_AUDIT_LOGS],
  SETTINGS: ['lw_settings', () => sample.INITIAL_SETTINGS],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

// Escribe los datos en localStorage (que la prueba ya definió) antes de cargar el servicio.
function writeSeed() {
  for (const [key, build] of Object.values(KEYS))
    if (!global.localStorage.getItem(key))
      global.localStorage.setItem(key, JSON.stringify(clone(build())));
  if (!global.localStorage.getItem('lw_zones_v1'))
    global.localStorage.setItem(
      'lw_zones_v1',
      JSON.stringify({ version: 1, zones: clone(SERVICE_AREAS) }),
    );
}

// Escenarios de custodia y negocio que antes preparaba el propio servicio.
function completeWorkflow(storage) {
  const { migrateOrder } = require('../../src/services/fulfillment.ts');
  const fac = storage.getFacilities();
  fac.forEach((f) => {
    f.openingHours ??= 'Lunes a sábado, 08:00–18:00';
  });
  global.localStorage.setItem('lw_facilities', JSON.stringify(fac));
  const state = storage.getWorkflow();
  for (const [id, mode] of [
    ['SOL-STORE-001', 'HOME_STORE'],
    ['SOL-HOME-001', 'HOME_HOME'],
  ]) {
    if (state.orders.some((o) => o.id === id)) continue;
    const template =
      state.orders.find((o) => o.facilityId === 'FAC-02') ?? state.orders[0];
    if (!template) continue;
    const o = clone(template);
    o.id = id;
    o.status = 'PICKUP_PENDING';
    o.workflowVersion = undefined;
    o.fulfillment = undefined;
    o.intakeHold = undefined;
    o.timeline = [];
    o.pickup.completedAt = undefined;
    o.delivery.completedAt = undefined;
    o.customerId = 'CUST-001';
    o.customerName = storage
      .getCustomers()
      .find((c) => c.id === 'CUST-001').fullName;
    o.createdAt = new Date().toISOString();
    o.updatedAt = o.createdAt;
    o.trackingNumber = id;
    o.incidentsCount = 0;
    o.quarantineReason = undefined;
    o.previousStatus = undefined;
    o.pricing.paymentStatus = 'PAID';
    o.pickup.driverId = undefined;
    o.delivery.driverId = undefined;
    if (mode === 'HOME_STORE') {
      const f = storage.getFacilities().find((v) => v.id === o.facilityId);
      o.deliveryAddress = {
        ...o.customerAddress,
        street: f.address,
        number: '',
        coordinates: f.coordinates,
      };
      o.delivery.timeSlot = 'Retiro al estar listo';
    }
    migrateOrder(o, mode);
    if (mode === 'HOME_STORE') {
      o.pricing.deliveryFee = 0;
      o.pricing.total = Number(
        (
          o.pricing.subtotal +
          o.pricing.extrasTotal -
          o.pricing.discount
        ).toFixed(2),
      );
    }
    state.orders.unshift(o);
  }
  state.orders.forEach((o) => {
    const legacy = o.workflowVersion !== 2;
    migrateOrder(o);
    for (const leg of [o.fulfillment.inbound, o.fulfillment.outbound])
      if (leg.driverId)
        leg.driverAssignmentId ??=
          o.id + (leg === o.fulfillment.inbound ? '-pickup' : '-delivery');
    storage.handoffService.initialize(state, o, legacy);
  });
  prepareHandoffSampleData(state, fac, storage.handoffService);
  const catalog = storage.getCatalog();
  prepareBusinessSampleData(state, fac, storage.handoffService, catalog);
  global.localStorage.setItem('lw_facilities', JSON.stringify(fac));
  global.localStorage.setItem('lw_catalog', JSON.stringify(catalog));
  global.localStorage.setItem(storage.workflowKey, JSON.stringify(state));
}

// Devuelve el servicio de almacenamiento ya poblado con los datos de prueba.
function seededStorage() {
  writeSeed();
  const { storageService } = require('../../src/services/storage.ts');
  const { notifyZones } = require('../../src/services/zones/zoneStorage.ts');
  completeWorkflow(storageService);
  // Utilidades de simulación y reinicio, disponibles solo en las pruebas.
  Object.assign(storageService, sampleMethods, {
    switchRole(role) {
      const target = sample.INITIAL_USERS.find((u) => u.role === role) || {
        ...this.getCurrentUser(),
        role,
        name: role === 'ADMIN' ? 'Carlos Mendoza' : 'Elena Rostova',
      };
      this.setCurrentUser(target);
    },
    resetAll() {
      const keys = [
        'lw_membership_plans_v1',
        'lw_zones_v1',
        this.workflowKey,
        ...Object.values(KEYS).map(([key]) => key),
      ];
      keys.forEach((key) => global.localStorage.removeItem(key));
      writeSeed();
      this.initializeWorkflow();
      completeWorkflow(this);
      notifyZones();
      this.notify();
    },
  });
  return storageService;
}

module.exports = { seededStorage, sample, sampleMethods, SERVICE_AREAS };
