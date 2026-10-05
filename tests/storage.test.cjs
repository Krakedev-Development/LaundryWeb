require('./ts-loader.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const values = new Map();
global.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  removeItem: (key) => values.delete(key),
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

  storageService.setCurrentUser({
    ...storageService.getCurrentUser(),
    facilityId: order.facilityId,
  });
  function stage(target) {
    assert.equal(
      storageService.updateOrderStatus(order.id, target).success,
      true,
      target,
    );
  }
  function handoff(
    type,
    actor = storageService.getCurrentUser().id,
    details = { count: order.items.reduce((n, i) => n + i.quantity, 0) },
  ) {
    const h = storageService
      .getHandoffs()
      .find(
        (h) =>
          h.orderId === order.id && h.type === type && h.status === 'ACTIVE',
      );
    assert.ok(h, type);
    const v = storageService.handoffService.verify(h.fallbackCode, actor, h.id);
    storageService.handoffService.confirm(actor, {
      ticket: v.ticket,
      ...details,
    });
  }
  stage('HEADING_TO_PICKUP');
  stage('ARRIVED_FOR_PICKUP');
  handoff('CUSTOMER_TO_DRIVER', driver.id);
  stage('HEADING_TO_FACILITY');
  stage('ARRIVED_AT_FACILITY');
  handoff('DRIVER_TO_FACILITY');
  stage('IN_PROCESS');
  stage('QUALITY_CONTROL');
  stage('READY_FOR_DELIVERY');
  assert.equal(
    storageService.getDrivers().find((d) => d.id === driver.id).activeOrders,
    load,
  );
  assert.equal(
    storageService.assignDriver(order.id, driver.id, 'delivery').success,
    true,
  );
  assert.equal(
    storageService.updateOrderStatus(order.id, 'OUT_FOR_DELIVERY').success,
    false,
  );
  handoff('FACILITY_TO_DRIVER');
  stage('OUT_FOR_DELIVERY');
  stage('ARRIVED_FOR_DELIVERY');
  handoff('DRIVER_TO_CUSTOMER', driver.id, {
    recipient: 'Ana Pérez',
    relationship: 'Persona autorizada',
  });
  assert.equal(storageService.getOrderById(order.id).status, 'COMPLETED');
  assert.equal(
    storageService.getDrivers().find((d) => d.id === driver.id).activeOrders,
    load,
  );
  const persisted = JSON.parse(values.get('lw_workflow_v2'));
  assert.equal(
    persisted.handoffs.filter(
      (h) => h.orderId === order.id && h.status === 'USED',
    ).length,
    4,
  );
  assert.equal(
    persisted.pointsLedger.filter((p) => p.orderId === order.id).length,
    1,
  );
});

test('reception demo upgrades existing storage, covers every sede and preserves consumed codes on reload', () => {
  const legacy = storageService.getWorkflow();
  const previousOrder = structuredClone(
    legacy.orders.find((o) => o.id === 'SOL-DEMO-001'),
  );
  // Recreate the previous version, which had no per-sede reception fixtures.
  const added = legacy.orders.filter((o) => o.id.startsWith('SOL-DEMO-FAC-'));
  for (const order of added) {
    const driver = legacy.drivers.find(
      (d) => d.id === order.fulfillment.inbound.driverId,
    );
    if (driver) driver.activeOrders--;
  }
  legacy.orders = legacy.orders.filter(
    (o) => !o.id.startsWith('SOL-DEMO-FAC-'),
  );
  legacy.handoffs = legacy.handoffs.filter(
    (h) => !h.orderId.startsWith('SOL-DEMO-FAC-'),
  );
  legacy.handoffAudits = legacy.handoffAudits.filter(
    (a) => !a.orderId.startsWith('SOL-DEMO-FAC-'),
  );
  values.set('lw_workflow_v2', JSON.stringify(legacy));
  const upgraded = new storageService.constructor();
  assert.deepEqual(upgraded.getOrderById(previousOrder.id), previousOrder);
  for (const facility of upgraded
    .getFacilities()
    .filter((f) => f.status === 'ACTIVE')) {
    for (const type of [
      'CUSTOMER_TO_FACILITY',
      'FACILITY_TO_CUSTOMER',
      'DRIVER_TO_FACILITY',
    ]) {
      const handoff = upgraded
        .getHandoffs()
        .find(
          (h) =>
            h.orderId.startsWith('SOL-DEMO-FAC-') &&
            h.facilityId === facility.id &&
            h.type === type &&
            h.status === 'ACTIVE',
        );
      assert.ok(handoff, `${facility.id}: ${type}`);
      const verification = upgraded.handoffService.verify(
        handoff.fallbackCode,
        `DEMO-ADMIN-${facility.id}`,
        handoff.id,
      );
      assert.equal(verification.handoff.id, handoff.id);
    }
  }
  const intake = upgraded
    .getHandoffs()
    .find(
      (h) => h.orderId === 'SOL-DEMO-FAC-01-INGRESO' && h.status === 'ACTIVE',
    );
  assert.throws(
    () =>
      upgraded.handoffService.verify(
        intake.fallbackCode,
        'DEMO-ADMIN-FAC-02',
        intake.id,
      ),
    /sede/,
  );
  const operator = 'DEMO-ADMIN-FAC-01';
  const verification = upgraded.handoffService.verify(
    intake.fallbackCode,
    operator,
    intake.id,
  );
  const order = upgraded.getOrderById(intake.orderId);
  upgraded.handoffService.confirm(operator, {
    ticket: verification.ticket,
    count: order.items.reduce((n, i) => n + i.quantity, 0),
  });
  const snapshot = upgraded.getWorkflow();
  const reloaded = new storageService.constructor();
  assert.equal(reloaded.getOrderById(order.id).status, 'AT_FACILITY');
  assert.equal(
    reloaded.getHandoffs().find((h) => h.id === intake.id).status,
    'USED',
  );
  assert.equal(reloaded.getWorkflow().orders.length, snapshot.orders.length);
  assert.equal(reloaded.getHandoffs().length, snapshot.handoffs.length);
  assert.deepEqual(reloaded.getDrivers(), snapshot.drivers);
  const codes = reloaded.getHandoffs().map((h) => h.fallbackCode);
  assert.equal(new Set(codes).size, codes.length);
});
