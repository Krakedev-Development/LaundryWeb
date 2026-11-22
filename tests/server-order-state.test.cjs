require('./ts-loader.cjs');
const values = new Map();
global.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { localStateFromServer, mapBackendOrderToOrder } = require('../src/services/api/ordersApi.ts');
const { operationalStage, migrateOrder } = require('../src/services/fulfillment.ts');

const raw = (status, mode = 'HOME_STORE', extra = {}) => ({
  id: 'o-1',
  number: 2,
  status,
  mode,
  facilityId: 'f1',
  paymentStatus: 'PAID',
  pricingStatus: 'FINAL',
  total: '21.85',
  version: 17,
  createdAt: new Date().toISOString(),
  items: [],
  legs: [],
  events: [],
  ...extra,
});

test('cada estado del servidor se muestra en su etapa real, también los que no existen en la Web', () => {
  const cases = [
    ['CONFIRMED', 'HOME_HOME', 'CONFIRMED'],
    ['HEADING_TO_PICKUP', 'HOME_HOME', 'HEADING_TO_PICKUP'],
    ['HEADING_TO_FACILITY', 'HOME_HOME', 'HEADING_TO_FACILITY'],
    ['AT_FACILITY', 'HOME_HOME', 'AT_FACILITY'],
    ['INSPECTION', 'HOME_STORE', 'INSPECTION'],
    ['QUALITY_CONTROL', 'HOME_STORE', 'QUALITY_CONTROL'],
    ['READY_FOR_DELIVERY', 'HOME_HOME', 'DELIVERY_SCHEDULED'],
    ['DELIVERY_ASSIGNED', 'HOME_HOME', 'DELIVERY_ASSIGNED'],
    ['OUT_FOR_DELIVERY', 'HOME_HOME', 'OUT_FOR_DELIVERY'],
    // Retiro en sede: lista, no "Confirmado".
    ['READY_FOR_PICKUP', 'HOME_STORE', 'READY_FOR_DELIVERY'],
    ['DELIVERED', 'HOME_STORE', 'DELIVERED'],
    ['COMPLETED', 'HOME_STORE', 'CLOSED'],
  ];
  for (const [status, mode, stage] of cases) {
    const order = mapBackendOrderToOrder(raw(status, mode));
    assert.equal(operationalStage(order), stage, status);
  }
});

test('READY_FOR_PICKUP conserva el modo, la recepción completa y la inspección hecha', () => {
  const order = mapBackendOrderToOrder(raw('READY_FOR_PICKUP'));
  assert.equal(order.status, 'READY');
  assert.equal(order.fulfillment.mode, 'HOME_STORE');
  assert.equal(order.fulfillment.outbound.method, 'CUSTOMER');
  assert.equal(order.fulfillment.inbound.status, 'COMPLETED');
  assert.equal(order.inspectionCompleted, true);
  // La versión del servidor se guarda aparte: la Web no vuelve a "migrar" la solicitud.
  assert.equal(order.version, 17);
  assert.equal(order.workflowVersion, 2);
  const stored = JSON.parse(JSON.stringify(order));
  migrateOrder(stored);
  assert.equal(stored.fulfillment.mode, 'HOME_STORE');
  assert.equal(operationalStage(stored), 'READY_FOR_DELIVERY');
});

test('una incidencia conserva hasta dónde llegó la solicitud', () => {
  const state = localStateFromServer('INCIDENT', false, false, 'IN_PROCESS');
  assert.equal(state.status, 'INCIDENT');
  assert.equal(state.inbound.status, 'COMPLETED');
  const failedPickup = localStateFromServer('INCIDENT', false, false, 'CONFIRMED');
  assert.equal(failedPickup.inbound.milestone, 'PENDING');
});

// T-09b: método y estado de pago reales del servidor, sin valores inventados.
test('el método y el estado de pago salen del servidor; sin dato no se supone tarjeta ni pagado', () => {
  const pricing = (extra) => mapBackendOrderToOrder(raw('IN_PROCESS', 'HOME_HOME', extra)).pricing;
  assert.equal(pricing({ paymentMethodKind: 'TRANSFER', paymentStatus: 'PENDING' }).paymentMethod, 'TRANSFERENCIA');
  assert.equal(pricing({ paymentMethodKind: 'TRANSFER', paymentStatus: 'PENDING' }).paymentStatus, 'PENDING');
  assert.equal(pricing({ paymentMethodKind: 'WALLET' }).paymentMethod, 'BILLETERA');
  assert.equal(pricing({ paymentMethodKind: 'CARD' }).paymentMethod, 'TARJETA');
  assert.equal(pricing({ paymentMethodKind: null }).paymentMethod, undefined);
  assert.equal(pricing({ paymentStatus: undefined }).paymentStatus, 'PENDING');
  assert.equal(pricing({ paymentStatus: 'ALGO_RARO' }).paymentStatus, 'PENDING');
  assert.equal(pricing({ paymentStatus: 'PAID' }).paymentStatus, 'PAID');
});
