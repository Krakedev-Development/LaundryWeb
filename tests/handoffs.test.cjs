require('./ts-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { HandoffService } = require('../src/services/HandoffService.ts');
const {
  advanceOperational,
  migrateOrder,
  operationalStage,
} = require('../src/services/fulfillment.ts');
function setup(mode = 'STORE_STORE') {
  let state = {
    orders: [
      {
        id: mode === 'STORE_STORE' ? 'SOL-STORE-001' : 'SOL-HOME-001',
        customerId: 'CLIENT',
        facilityId: 'FAC-02',
        status: 'PICKUP_PENDING',
        pickup: { date: '2026-10-05', timeSlot: '09:00' },
        delivery: { date: '2026-10-07', timeSlot: '10:00' },
        updatedAt: new Date().toISOString(),
      },
    ],
    handoffs: [],
    handoffAudits: [],
  };
  let paid = true;
  let confirmations = 0;
  const actors = {
    ADMIN: { id: 'ADMIN', name: 'Admin', role: 'ADMIN', facilityId: 'FAC-02' },
    SUP: {
      id: 'SUP',
      name: 'Operador',
      role: 'SUPERVISOR',
      facilityId: 'FAC-02',
    },
    OTHER: {
      id: 'OTHER',
      name: 'Otra sede',
      role: 'SUPERVISOR',
      facilityId: 'FAC-01',
    },
    DRIVER: { id: 'DRIVER', name: 'Chofer', role: 'DRIVER' },
    CLIENT: { id: 'CLIENT', name: 'Cliente', role: 'CLIENT' },
  };
  const service = new HandoffService({
    read: () => state,
    transaction: (work) => {
      const next = structuredClone(state);
      work(next);
      state = next;
    },
    actor: (id) => actors[id],
    paid: () => paid,
    declaredCount: () => 3,
    random: () => crypto.randomBytes(20).toString('hex'),
    confirmed: () => confirmations++,
  });
  migrateOrder(state.orders[0], mode);
  service.initialize(state, state.orders[0], true);
  const h = (type) =>
    state.handoffs.find(
      (h) => h.type === type && !['REVOKED', 'USED'].includes(h.status),
    );
  const stage = (target) => {
    advanceOperational(state.orders[0], target);
    service.refresh(state, state.orders[0]);
  };
  const confirm = (type, actor = 'SUP', details = { count: 3 }) => {
    const value = h(type);
    const result = service.verify(value.fallbackCode, actor, value.id);
    service.confirm(actor, { ticket: result.ticket, ...details });
    return result;
  };
  return {
    service,
    h,
    stage,
    confirm,
    get state() {
      return state;
    },
    get confirmations() {
      return confirmations;
    },
    setPaid: (v) => (paid = v),
  };
}
test('STORE_STORE completes through verified receipt, processing and authorized third-party pickup', () => {
  const s = setup();
  assert.equal(s.state.orders[0].status, 'AWAITING_INTAKE');
  const first = s.confirm('CUSTOMER_TO_FACILITY');
  assert.equal(s.state.orders[0].status, 'AT_FACILITY');
  s.service.confirm('SUP', { ticket: first.ticket, count: 3 });
  assert.equal(s.confirmations, 1);
  s.stage('IN_PROCESS');
  s.stage('QUALITY_CONTROL');
  s.stage('READY');
  s.confirm('FACILITY_TO_CUSTOMER', 'SUP', {
    recipient: 'Ana Pérez',
    relationship: 'Persona autorizada con código',
  });
  assert.equal(s.state.orders[0].status, 'COMPLETED');
  assert.equal(s.state.handoffs.filter((h) => h.status === 'USED').length, 2);
  assert.equal(s.state.orders[0].fulfillment.outbound.status, 'COMPLETED');
});
test('HOME_HOME requires four custody transfers with separate travel milestones', () => {
  const s = setup('HOME_HOME');
  const f = s.state.orders[0].fulfillment;
  f.inbound.driverId = 'DRIVER';
  f.inbound.driverAssignmentId = 'PICKUP';
  f.outbound.driverId = 'DRIVER';
  f.outbound.driverAssignmentId = 'DELIVERY';
  s.stage('PICKUP_ASSIGNED');
  s.stage('HEADING_TO_PICKUP');
  s.stage('ARRIVED_FOR_PICKUP');
  s.confirm('CUSTOMER_TO_DRIVER', 'DRIVER');
  assert.equal(operationalStage(s.state.orders[0]), 'PICKED_UP');
  s.stage('HEADING_TO_FACILITY');
  s.stage('ARRIVED_AT_FACILITY');
  s.confirm('DRIVER_TO_FACILITY');
  s.stage('IN_PROCESS');
  s.stage('QUALITY_CONTROL');
  s.stage('READY');
  s.stage('DELIVERY_ASSIGNED');
  s.confirm('FACILITY_TO_DRIVER', 'SUP', {});
  assert.equal(s.state.orders[0].fulfillment.outbound.milestone, 'RELEASED');
  s.stage('OUT_FOR_DELIVERY');
  s.stage('ARRIVED_FOR_DELIVERY');
  s.confirm('DRIVER_TO_CUSTOMER', 'DRIVER', {
    recipient: 'Ana Pérez',
    relationship: 'Cliente',
  });
  assert.equal(s.state.orders[0].status, 'COMPLETED');
  assert.equal(s.confirmations, 4);
});
test('verification never changes custody and rejects unpaid, wrong actor and wrong facility without attempts', () => {
  const s = setup();
  const h = s.h('CUSTOMER_TO_FACILITY');
  s.service.verify(s.service.payload(h), 'SUP');
  assert.equal(s.state.orders[0].status, 'AWAITING_INTAKE');
  assert.equal(s.h('CUSTOMER_TO_FACILITY').status, 'ACTIVE');
  for (const actor of ['CLIENT', 'DRIVER', 'OTHER'])
    assert.throws(() => s.service.verify(h.fallbackCode, actor, h.id));
  assert.equal(s.h('CUSTOMER_TO_FACILITY').attempts, 0);
  s.setPaid(false);
  assert.throws(() => s.service.verify(h.fallbackCode, 'SUP'), /pago/);
  assert.equal(s.h('CUSTOMER_TO_FACILITY').attempts, 0);
});
test('invalid global code does not lock any order; contextual bad attempts lock and regeneration revokes old generation', () => {
  const s = setup();
  const h = s.h('CUSTOMER_TO_FACILITY');
  assert.throws(() => s.service.verify('000000', 'SUP'));
  assert.equal(s.h('CUSTOMER_TO_FACILITY').attempts, 0);
  const verified = s.service.verify(h.fallbackCode, 'SUP');
  for (let i = 0; i < 5; i++)
    assert.throws(() => s.service.verify('000000', 'SUP', h.id));
  assert.equal(s.h('CUSTOMER_TO_FACILITY').status, 'LOCKED');
  assert.throws(() =>
    s.service.regenerate(h.id, 'SUP', 'Revisado por operador'),
  );
  assert.throws(() => s.service.regenerate(h.id, 'ADMIN', ''));
  const newer = s.service.regenerate(
    h.id,
    'ADMIN',
    'Bloqueo por intentos incorrectos',
  );
  assert.equal(newer.generation, 2);
  assert.notEqual(newer.qrToken, h.qrToken);
  assert.notEqual(newer.fallbackCode, h.fallbackCode);
  assert.equal(s.state.handoffs.find((v) => v.id === h.id).status, 'REVOKED');
  assert.throws(() =>
    s.service.confirm('SUP', { ticket: verified.ticket, count: 3 }),
  );
  assert.throws(() => s.service.verify(h.fallbackCode, 'SUP'));
  s.confirm('CUSTOMER_TO_FACILITY');
  assert.throws(() =>
    s.service.regenerate(newer.id, 'ADMIN', 'Cambio posterior a recepción'),
  );
});
test('confirmation rechecks payment, actor, current stage and receipt; old tickets cannot bypass validations', () => {
  const s = setup();
  const v = s.service.verify(s.h('CUSTOMER_TO_FACILITY').fallbackCode, 'SUP');
  s.setPaid(false);
  assert.throws(
    () => s.service.confirm('SUP', { ticket: v.ticket, count: 3 }),
    /pago/,
  );
  s.setPaid(true);
  assert.throws(() =>
    s.service.confirm('OTHER', { ticket: v.ticket, count: 3 }),
  );
  assert.throws(
    () => s.service.confirm('SUP', { ticket: v.ticket, count: 0 }),
    /cantidad/,
  );
  s.stage('IN_PROCESS');
  assert.throws(() => s.service.confirm('SUP', { ticket: v.ticket, count: 3 }));
  assert.equal(
    s.state.handoffs.find((h) => h.id === v.handoff.id).status,
    'PENDING',
  );
});
test('intake discrepancy records physical custody and blocks release until reasoned resolution', () => {
  const s = setup();
  s.confirm('CUSTOMER_TO_FACILITY', 'SUP', {
    count: 2,
    notes: 'Una prenda no fue entregada',
  });
  assert.equal(s.state.orders[0].status, 'INCIDENT');
  assert.equal(s.state.orders[0].fulfillment.inbound.status, 'COMPLETED');
  assert.equal(s.state.orders[0].intakeHold.declared, 3);
  assert.throws(() =>
    s.service.resolve(
      s.state.orders[0].id,
      'OTHER',
      'Se confirmó la diferencia',
    ),
  );
  assert.throws(() => s.service.resolve(s.state.orders[0].id, 'SUP', ''));
  s.service.resolve(
    s.state.orders[0].id,
    'SUP',
    'Cliente acepta recepción de dos prendas, tarifa pendiente de revisión',
  );
  assert.equal(s.state.orders[0].status, 'AT_FACILITY');
  assert.equal(s.state.orders[0].intakeHold.declared, 3);
  assert.ok(s.state.orders[0].intakeHold.resolvedAt);
});
test('default code remains usable after days, local persistence round-trip retains receipts/audit and expired/revoked codes fail', () => {
  const s = setup();
  const h = s.h('CUSTOMER_TO_FACILITY');
  h.createdAt = '2020-01-01T00:00:00Z';
  assert.equal(h.expiresAt, undefined);
  s.service.verify(h.fallbackCode, 'SUP');
  s.h('CUSTOMER_TO_FACILITY').expiresAt = '2020-01-02T00:00:00Z';
  assert.throws(() => s.service.verify(h.fallbackCode, 'SUP'), /vencido/);
  delete s.h('CUSTOMER_TO_FACILITY').expiresAt;
  s.service.revoke(h.id, 'ADMIN', 'Reemplazo solicitado por cliente');
  assert.throws(() => s.service.verify(h.fallbackCode, 'SUP'), /revocado/);
  const json = JSON.stringify(s.state);
  assert.equal(JSON.stringify(JSON.parse(json)), json);
});
test('migration preserves legacy history and derives logistics from business state', () => {
  const o = {
    id: 'OLD',
    customerId: 'CLIENT',
    facilityId: 'FAC-02',
    status: 'OUT_FOR_DELIVERY',
    timeline: [{ status: 'PICKED_UP' }],
    updatedAt: 'old',
  };
  migrateOrder(o);
  assert.equal(o.status, 'READY');
  assert.equal(operationalStage(o), 'OUT_FOR_DELIVERY');
  assert.equal(o.fulfillment.inbound.status, 'COMPLETED');
  assert.deepEqual(o.timeline, [{ status: 'PICKED_UP' }]);
  const before = JSON.stringify(o);
  migrateOrder(o);
  assert.equal(JSON.stringify(o), before);
});

test('administrative override requires reason, rechecks payment and facility, never reuses a completed handoff', () => {
  const s = setup();
  const h = s.h('CUSTOMER_TO_FACILITY');
  for (let i = 0; i < 5; i++)
    assert.throws(() => s.service.verify('000000', 'SUP', h.id));
  assert.throws(() =>
    s.service.verifyAdministrativeOverride(h.id, 'SUP', 'Atención autorizada'),
  );
  assert.throws(() =>
    s.service.verifyAdministrativeOverride(h.id, 'ADMIN', ''),
  );
  s.setPaid(false);
  assert.throws(
    () =>
      s.service.verifyAdministrativeOverride(
        h.id,
        'ADMIN',
        'Atención autorizada',
      ),
    /pago/,
  );
  s.setPaid(true);
  const v = s.service.verifyAdministrativeOverride(
    h.id,
    'ADMIN',
    'Código bloqueado; identidad revisada presencialmente',
  );
  assert.equal(s.state.orders[0].status, 'AWAITING_INTAKE');
  s.service.confirm('ADMIN', { ticket: v.ticket, count: 3 });
  assert.equal(s.state.orders[0].status, 'AT_FACILITY');
  assert.ok(
    s.state.handoffAudits.some(
      (a) => a.action === 'CONFIRMED_OVERRIDE' && a.reason,
    ),
  );
  assert.throws(() =>
    s.service.verifyAdministrativeOverride(
      h.id,
      'ADMIN',
      'Atención autorizada',
    ),
  );
});
