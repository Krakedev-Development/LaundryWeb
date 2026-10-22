require('./ts-loader.cjs');
const { test } = require('node:test'),
  assert = require('node:assert/strict');
const web = require('../src/services/fulfillment.ts');
const app = require('../../LaundryApp/src/domain/models.ts');
const {
  initializeState,
  transact,
} = require('../../LaundryApp/src/domain/repository.ts');
const {
  decodeState,
  PersistenceQueue,
} = require('../../LaundryApp/src/store/persistence.ts');
test('independent Web and Expo domains expose the same two allowed modes and reject customer drop-off', () => {
  for (const outbound of ['DRIVER', 'CUSTOMER'])
    assert.equal(
      app.modeFor('DRIVER', outbound),
      web.modeFor('DRIVER', outbound),
    );
  for (const modeFor of [app.modeFor, web.modeFor])
    for (const outbound of ['DRIVER', 'CUSTOMER'])
      assert.throws(() => modeFor('CUSTOMER', outbound), /domicilio/);
  assert.deepEqual(Object.keys(app.modeLabels), ['HOME_HOME', 'HOME_STORE']);
  assert.ok(
    !web.handoffTypesFor('HOME_STORE').includes('CUSTOMER_TO_FACILITY'),
  );
});
test('Expo persistence retains accounts, balance, receipts and policy after reload and rejects failed writes', async () => {
  const initial = initializeState();
  let raw = null,
    fail = false;
  const queue = new PersistenceQueue({
    getItem: async () => raw,
    setItem: async (_key, value) => {
      if (fail) throw Error('Disk full');
      raw = value;
    },
  });
  const state = transact(initial, (r) => r.addWalletCredit(10)).state;
  await queue.save(state);
  assert.deepEqual(await queue.load(), state);
  fail = true;
  await assert.rejects(queue.save(initial), /Disk full/);
  assert.equal(
    (await queue.load()).customers[0].walletBalance,
    state.customers[0].walletBalance,
  );
  assert.deepEqual(decodeState(raw).orders, state.orders);
});
