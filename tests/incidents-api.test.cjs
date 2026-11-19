require('./ts-loader.cjs');
const values = new Map();
global.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
const assert = require('node:assert/strict');
const { test } = require('node:test');
const api = require('../src/services/api/incidentsApi.ts');

test('los siguientes estados siguen las mismas reglas que el servidor', () => {
  assert.deepEqual(api.nextIncidentStatuses('OPEN'), ['IN_REVIEW', 'RESOLVED']);
  assert.deepEqual(api.nextIncidentStatuses('IN_REVIEW'), ['RESOLVED']);
  assert.deepEqual(api.nextIncidentStatuses('RESOLVED'), ['CLOSED']);
  assert.deepEqual(api.nextIncidentStatuses('CLOSED'), []);
});

test('solo abiertas y en revisión cuentan como activas', () => {
  assert.equal(api.isIncidentActive({ status: 'OPEN' }), true);
  assert.equal(api.isIncidentActive({ status: 'IN_REVIEW' }), true);
  assert.equal(api.isIncidentActive({ status: 'RESOLVED' }), false);
  assert.equal(api.isIncidentActive({ status: 'CLOSED' }), false);
});

test('la recogida fallida se resuelve desde el detalle y los tipos tienen nombre legible', () => {
  assert.equal(api.resolvesFromOrderDetail({ type: 'FAILED_PICKUP' }), true);
  assert.equal(api.resolvesFromOrderDetail({ type: 'PRENDA_DANADA' }), false);
  assert.equal(api.incidentTypeLabel('FAILED_PICKUP'), 'Recogida fallida');
  // Un tipo desconocido del servidor se muestra tal cual, sin romper la pantalla.
  assert.equal(api.incidentTypeLabel('VEHICULO'), 'VEHICULO');
});
