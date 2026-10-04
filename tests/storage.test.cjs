require('./ts-loader.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const values = new Map();
global.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
const { storageService } = require('../src/services/storage.ts');
test('local Web lifecycle rechecks assignments, prevents double assignment and releases capacity', () => {
  const order = storageService.createDemoOrder();
  const driver = storageService
    .getDrivers()
    .find(
      (d) =>
        d.facilityId === order.facilityId &&
        d.status === 'AVAILABLE' &&
        d.activeOrders < d.maxOrders,
    );
  assert.ok(driver);
  const load = driver.activeOrders;
  assert.equal(
    storageService.assignDriver(order.id, driver.id, 'pickup').success,
    true,
  );
  assert.equal(
    storageService.assignDriver(order.id, driver.id, 'pickup').success,
    false,
  );
  assert.equal(
    storageService.updateOrderStatus(order.id, 'DELIVERED').success,
    false,
  );
  for (const state of [
    'HEADING_TO_PICKUP',
    'ARRIVED_FOR_PICKUP',
    'PICKED_UP',
    'HEADING_TO_FACILITY',
    'AT_FACILITY',
    'IN_PROCESS',
    'QUALITY_CONTROL',
    'READY_FOR_DELIVERY',
  ])
    assert.equal(
      storageService.updateOrderStatus(order.id, state).success,
      true,
      state,
    );
  assert.equal(
    storageService.getDrivers().find((d) => d.id === driver.id).activeOrders,
    load,
  );
  assert.equal(
    storageService.assignDriver(order.id, driver.id, 'delivery').success,
    true,
  );
  for (const state of [
    'OUT_FOR_DELIVERY',
    'ARRIVED_FOR_DELIVERY',
    'DELIVERED',
    'CLOSED',
  ])
    assert.equal(
      storageService.updateOrderStatus(order.id, state).success,
      true,
      state,
    );
  assert.equal(
    storageService.getDrivers().find((d) => d.id === driver.id).activeOrders,
    load,
  );
});
