require('./ts-loader.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const values = new Map();
global.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
// Sin fixtures: lo que ve un operador en una instalación nueva.
const { storageService: storage } = require('../src/services/storage.ts');
const { readZones } = require('../src/services/zones/zoneStorage.ts');

test('una instalación nueva arranca sin datos de negocio', () => {
  assert.deepEqual(storage.getOrders(), []);
  assert.deepEqual(storage.getCustomers(), []);
  assert.deepEqual(storage.getDrivers(), []);
  assert.deepEqual(storage.getFacilities(), []);
  assert.deepEqual(storage.getIncidents(), []);
  assert.deepEqual(storage.getCatalog(), []);
  assert.deepEqual(storage.getPromotions(), []);
  assert.deepEqual(storage.getRewards(), []);
  assert.deepEqual(storage.getRedemptions(), []);
  assert.deepEqual(storage.getMembershipPlans(), []);
  assert.deepEqual(storage.getHandoffs(), []);
  assert.deepEqual(readZones(), []);
});

test('los parámetros de negocio no traen valores por defecto', () => {
  const s = storage.getSettings();
  for (const key of [
    'maxOrdersPerDriver',
    'slaPickupMinutes',
    'slaDeliveryHours',
  ])
    assert.equal(s[key], 0, key);
  for (const key of [
    'defaultFacilityId',
    'currency',
    'currencySymbol',
    'timezone',
    'locale',
    'defaultCity',
    'phoneCountryCode',
  ])
    assert.equal(s[key], '', key);
  assert.equal(s.autoSuggestDrivers, false);
  assert.equal(s.quarantineNotifySupervisor, false);
});

test('no existe usuario ni rol por defecto: sin sesión no hay operador', () => {
  assert.equal(storage.hasSession(), false);
  assert.throws(() => storage.getCurrentUser(), /sesión/);
  assert.equal(storage.switchRole, undefined);
  assert.equal(storage.resetAll, undefined);
  assert.equal(storage.createSampleOrder, undefined);
});

test('con sesión, las operaciones de configuración exigen el rol correcto', () => {
  storage.setCurrentUser({
    id: 'u1',
    name: 'Operador',
    email: 'op@example.test',
    role: 'SUPERVISOR',
    avatar: '',
    facilityId: 'f1',
  });
  assert.equal(storage.hasSession(), true);
  assert.throws(() => storage.updateSettings(storage.getSettings()), /administrador/);
  storage.clearSession();
  assert.equal(storage.hasSession(), false);
});
