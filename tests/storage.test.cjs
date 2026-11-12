require('./ts-loader.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const values = new Map();
global.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  removeItem: (key) => values.delete(key),
  setItem: (key, value) => values.set(key, value),
};
const storageService = require('./fixtures/seed.cjs').seededStorage();
test('local Web lifecycle rechecks assignments, prevents double assignment and releases capacity', () => {
  const order = storageService.createSampleOrder();
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


test('supervisor views scope audit and ledger to its facility without sensitive notes or reward review privileges', () => {
  const previous = storageService.getCurrentUser(),
    outside = storageService.getOrders().find((o) => o.facilityId !== 'FAC-01');
  storageService.addAuditLog({
    userName: 'Admin',
    userRole: 'ADMIN',
    action: 'Detalle fuera de sede',
    entity: 'Order',
    entityId: outside.id,
    notes: 'Nota privada',
  });
  storageService.setCurrentUser({
    ...previous,
    id: 'SUP-TEST',
    role: 'SUPERVISOR',
    facilityId: 'FAC-01',
  });
  const orderIds = new Set(
      storageService.getOperationalOrders().map((o) => o.id),
    ),
    handoffIds = new Set(
      storageService
        .getHandoffs()
        .filter((h) => orderIds.has(h.orderId))
        .map((h) => h.id),
    ),
    customerIds = new Set(
      storageService.getOperationalCustomers().map((c) => c.id),
    );
  assert.ok(
    storageService
      .getOperationalAuditLogs()
      .every(
        (log) =>
          (orderIds.has(log.entityId) || handoffIds.has(log.entityId)) &&
          !log.notes,
      ),
  );
  assert.ok(
    !storageService
      .getOperationalAuditLogs()
      .some((log) => log.entityId === outside.id),
  );
  assert.ok(
    storageService
      .getOperationalPointsLedger()
      .every((entry) => customerIds.has(entry.customerId)),
  );
  assert.deepEqual(storageService.getOperationalRedemptions(), []);
  assert.throws(
    () => storageService.updateRedemptionStatus('RED-01', 'REJECTED'),
    /administrador/,
  );
  storageService.setCurrentUser(previous);
});
