require('./ts-loader.cjs');
const values = new Map();
global.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
const assert = require('node:assert/strict');
const { test } = require('node:test');
const api = require('../src/services/api/pointsApi.ts');

test('mapServerRedemption traduce el canje del servidor al modelo de la web', () => {
  const mapped = api.mapServerRedemption({
    id: 'r1',
    customerId: 'c1',
    rewardId: 'rw1',
    pointsCost: 120,
    status: 'PENDING',
    createdAt: '2026-11-19T15:00:00.000Z',
    reward: { title: 'Lavado gratis' },
    customer: { user: { name: 'Ana Ruiz' } },
  });
  assert.equal(mapped.customerName, 'Ana Ruiz');
  assert.equal(mapped.rewardName, 'Lavado gratis');
  assert.equal(mapped.pointsSpent, 120);
  assert.equal(mapped.status, 'PENDING');
  assert.equal(mapped.pointsReserved, true);
});
