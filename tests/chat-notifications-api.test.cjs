require('./ts-loader.cjs');
const values = new Map();
global.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
const assert = require('node:assert/strict');
const { test } = require('node:test');

const { mergeChatMessages } = require('../src/services/api/chatApi.ts');

test('mergeChatMessages deduplicates by id and sorts chronologically', () => {
  const existing = [
    {
      id: 'm2',
      orderId: 'o1',
      senderId: 'u2',
      senderName: 'Chofer',
      senderRole: 'DRIVER',
      text: 'Voy en camino',
      createdAt: '2026-11-27T10:05:00.000Z',
    },
  ];
  const incoming = [
    {
      id: 'm1',
      orderId: 'o1',
      senderId: 'u1',
      senderName: 'Cliente',
      senderRole: 'CLIENT',
      text: 'Hola',
      createdAt: '2026-11-27T10:00:00.000Z',
    },
    {
      id: 'm2',
      orderId: 'o1',
      senderId: 'u2',
      senderName: 'Chofer',
      senderRole: 'DRIVER',
      text: 'Voy en camino',
      createdAt: '2026-11-27T10:05:00.000Z',
    },
  ];

  const merged = mergeChatMessages(existing, incoming);
  assert.equal(merged.length, 2);
  assert.deepEqual(
    merged.map((m) => m.id),
    ['m1', 'm2'],
  );
});
