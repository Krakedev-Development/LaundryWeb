require('./ts-loader.cjs');
const values = new Map();
global.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mapBackendOrderToOrder } = require('../src/services/api/ordersApi.ts');
const {
  orderDisplayStage,
  pickupNote,
  deliveryNote,
} = require('../src/features/orders/model/orderDisplay.ts');
const { plantPhase, BEFORE_PLANT, AFTER_PLANT } = require('../src/features/plant/plantPhase.ts');

// Paso 2 (UI): cómo se MUESTRA cada etapa. No cambia el estado real ni el flujo.
const raw = (status, mode = 'HOME_HOME', extra = {}) => ({
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
const order = (status, mode, extra) => mapBackendOrderToOrder(raw(status, mode, extra));

test('lista para retiro en sede se muestra como "Listo para retiro", no como entrega que espera chofer', () => {
  assert.equal(orderDisplayStage(order('READY_FOR_PICKUP', 'HOME_STORE')), 'READY');
  assert.equal(orderDisplayStage(order('READY_FOR_DELIVERY', 'HOME_HOME')), 'DELIVERY_SCHEDULED');
  assert.equal(orderDisplayStage(order('IN_PROCESS', 'HOME_HOME')), 'IN_PROCESS');
});

test('"Sin chofer" solo aparece cuando la sede todavía debe asignarlo', () => {
  assert.deepEqual(pickupNote(order('CONFIRMED')), { text: 'Sin chofer', tone: 'action' });
  // Ya entregada: la recogida terminó hace rato, no hay aviso.
  assert.deepEqual(pickupNote(order('DELIVERED')), { text: 'Recogida completada', tone: 'muted' });
  assert.deepEqual(pickupNote(order('IN_PROCESS')), { text: 'Recogida completada', tone: 'muted' });

  assert.deepEqual(deliveryNote(order('IN_PROCESS')), { text: 'Por programar', tone: 'muted' });
  assert.deepEqual(deliveryNote(order('READY_FOR_DELIVERY')), { text: 'Sin chofer', tone: 'action' });
  assert.deepEqual(deliveryNote(order('READY_FOR_PICKUP', 'HOME_STORE')), { text: 'Retiro en sede', tone: 'muted' });
  assert.deepEqual(deliveryNote(order('DELIVERED')), { text: 'Entregada', tone: 'muted' });
});

test('la fase de planta no se marca antes de llegar ni vuelve a "Recepción" al retener', () => {
  assert.equal(plantPhase(order('CONFIRMED')), BEFORE_PLANT);
  assert.equal(plantPhase(order('HEADING_TO_FACILITY')), BEFORE_PLANT);
  assert.equal(plantPhase(order('AT_FACILITY')), 0);
  assert.equal(plantPhase(order('IN_PROCESS')), 4);
  assert.equal(plantPhase(order('READY_FOR_DELIVERY')), 6);
  assert.equal(plantPhase(order('DELIVERED')), AFTER_PLANT);
  // Retenida en lavado: conserva la fase de lavado (dato de la incidencia abierta del servidor).
  const held = order('INCIDENT', 'HOME_HOME', { incidents: [{ status: 'OPEN', previousStatus: 'IN_PROCESS' }] });
  assert.equal(plantPhase(held), 4);
  // Retenida antes de llegar a planta (p. ej. recogida fallida): sin fase.
  const failedPickup = order('INCIDENT', 'HOME_HOME', { incidents: [{ status: 'OPEN', previousStatus: 'CONFIRMED' }] });
  assert.equal(plantPhase(failedPickup), BEFORE_PLANT);
});
