require('./ts-loader.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const values = new Map();
global.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
const storage = require('./fixtures/seed.cjs').seededStorage();
const plan = () => ({
  id: 'plan-family',
  name: 'Plan personalizado',
  description: 'Cupos por período',
  price: 30,
  interval: 'MONTHLY',
  includedWeight: 10,
  weightUnit: 'KG',
  includedPickups: 2,
  discountPercent: 5,
  priorityService: false,
  benefits: ['Cuidado de prendas'],
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
});

test('membership plans persist edits without duplicating the plan', () => {
  storage.resetAll();
  storage.saveMembershipPlan(plan());
  const created = storage
    .getMembershipPlans()
    .find((item) => item.id === plan().id);
  assert.ok(created.createdAt);
  storage.saveMembershipPlan({ ...created, price: 40, status: 'INACTIVE' });
  const saved = storage.getMembershipPlans();
  assert.equal(saved.filter((item) => item.id === plan().id).length, 1);
  const edited = saved.find((item) => item.id === plan().id);
  assert.equal(edited.price, 40);
  assert.equal(edited.status, 'INACTIVE');
  assert.equal(edited.createdAt, created.createdAt);
  storage.resetAll();
  assert.deepEqual(storage.getMembershipPlans(), []);
});

test('there are no preloaded plans and returned copies do not alias the stored plans', () => {
  storage.resetAll();
  assert.deepEqual(storage.getMembershipPlans(), []);
  storage.saveMembershipPlan(plan());
  const plans = storage.getMembershipPlans();
  assert.equal(plans.length, 1);
  plans[0].benefits.push('Cambio en una copia');
  assert.equal(
    storage.getMembershipPlans()[0].benefits.includes('Cambio en una copia'),
    false,
  );
});

test('invalid membership terms and supervisor writes cannot change persisted plans', () => {
  storage.resetAll();
  storage.saveMembershipPlan(plan());
  const before = values.get('lw_membership_plans_v1');
  for (const invalid of [
    { discountPercent: 101 },
    { price: -1 },
    { includedPickups: 1.5 },
    { includedWeight: NaN },
  ]) {
    assert.throws(() => storage.saveMembershipPlan({ ...plan(), ...invalid }));
    assert.equal(values.get('lw_membership_plans_v1'), before);
  }
  assert.throws(() =>
    storage.saveMembershipPlan({
      ...plan(),
      id: 'duplicate',
      name: ' PLAN PERSONALIZADO ',
    }),
  );
  storage.switchRole('SUPERVISOR');
  assert.throws(() => storage.saveMembershipPlan(plan()), /administrador/);
  assert.equal(values.get('lw_membership_plans_v1'), before);
});

test('plant retention preserves its reason and can return a modern order to quality control', () => {
  storage.resetAll();
  const state = storage.getWorkflow();
  const order = state.orders[0];
  order.status = 'IN_PROCESS';
  order.businessVersion = 3;
  order.fulfillment.inbound.status = 'COMPLETED';
  order.inspectionCompleted = true;
  order.pricing.amountKnown = true;
  order.pricing.paymentStatus = 'PAID';
  delete order.intakeHold;
  delete order.quarantineReason;
  state.incidents = state.incidents.filter(
    (incident) => incident.orderId !== order.id,
  );
  localStorage.setItem('lw_workflow_v2', JSON.stringify(state));
  assert.equal(
    storage.moveToQuarantine(order.id, 'Revisar mancha persistente').success,
    true,
  );
  assert.equal(
    storage.getOrderById(order.id).quarantineReason,
    'Revisar mancha persistente',
  );
  assert.equal(
    storage.releaseFromQuarantine(
      order.id,
      'QUALITY_CONTROL',
      'Tratamiento completado',
    ).success,
    true,
  );
  assert.equal(storage.getOrderById(order.id).status, 'QUALITY_CONTROL');
  assert.equal(storage.getOrderById(order.id).quarantineReason, undefined);
});
