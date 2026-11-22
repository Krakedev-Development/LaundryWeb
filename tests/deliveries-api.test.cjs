require('./ts-loader.cjs');
const values = new Map();
global.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
const assert = require('node:assert/strict');
const { test } = require('node:test');
const api = require('../src/services/api/deliveriesApi.ts');

test('mapOrderToDeliveryRow solo acepta HOME_HOME con chofer en etapas de entrega', () => {
  const base = {
    id: 'o1',
    number: 12,
    status: 'READY_FOR_DELIVERY',
    mode: 'HOME_HOME',
    version: 3,
    facilityId: 'f1',
    paymentStatus: 'PAID',
    pricingStatus: 'FINAL',
    total: '20',
    itemsSubtotal: '15',
    extrasTotal: '0',
    discount: '0',
    membershipDiscount: '0',
    logisticsFee: '3',
    tax: '2',
    policyVersion: 1,
    pricingModel: 'FIXED',
    createdAt: '2026-11-19T10:00:00.000Z',
    updatedAt: '2026-11-19T10:00:00.000Z',
    legs: [
      {
        id: 'leg-out',
        orderId: 'o1',
        kind: 'OUTBOUND',
        method: 'DRIVER',
        status: 'SCHEDULED',
        addressText: 'Av. Principal 100',
        latitude: -2.1,
        longitude: -79.9,
        scheduledDate: '2026-11-19',
        slotId: 'slot-1',
        slot: {
          id: 'slot-1',
          date: '2026-11-19',
          startTime: '16:00',
          endTime: '18:00',
          capacity: 10,
          reservedCount: 1,
        },
        driverId: null,
      },
    ],
    customer: { user: { name: 'Ana Torres', phone: '099111222' } },
  };

  const row = api.mapOrderToDeliveryRow(base, []);
  assert.ok(row);
  assert.equal(row.trackingNumber, 'SOL-0012');
  assert.equal(row.customerName, 'Ana Torres');
  assert.equal(row.slotLabel, '16:00 - 18:00');
  assert.equal(row.slotId, 'slot-1');

  assert.equal(
    api.mapOrderToDeliveryRow({ ...base, mode: 'HOME_STORE', legs: [{ ...base.legs[0], method: 'CUSTOMER' }] }, []),
    null,
  );
  assert.equal(api.mapOrderToDeliveryRow({ ...base, status: 'IN_PROCESS' }, []), null);
});

test('isScheduledToday y formatScheduleDate usan la fecha del servidor', () => {
  const now = new Date(2026, 10, 19, 15, 0, 0); // month 10 = noviembre
  assert.equal(api.isScheduledToday('2026-11-19', now), true);
  assert.equal(api.isScheduledToday('2026-11-19T08:00:00.000Z', now), true);
  assert.equal(api.isScheduledToday('2026-11-18', now), false);
  assert.equal(api.isScheduledToday(null, now), false);
  assert.equal(api.formatScheduleDate('2026-11-19', now), 'Hoy');
});

test('deliveryDriverOptions aplica la regla de Despacho: estado, sede y capacidad; el GPS no excluye', () => {
  const d = (id, status, facilityId = 'f1', activeLegsCount = 0) => ({
    id, userId: `u-${id}`, name: id, email: '', phone: null, status, vehicle: null, plate: null,
    facilityId, facilityName: '', latitude: null, longitude: null, locationAt: null, activeLegsCount,
  });
  const drivers = [d('ok', 'AVAILABLE'), d('busy', 'ON_SERVICE'), d('off', 'OFFLINE'), d('far', 'AVAILABLE', 'f2'), d('full', 'AVAILABLE', 'f1', 3)];
  const free = api.deliveryDriverOptions(drivers, 'f1');
  assert.deepEqual(free.eligible.map((x) => x.id), ['ok', 'busy', 'full']);
  assert.deepEqual(
    Object.fromEntries(free.excluded.map((x) => [x.driver.id, x.reasons])),
    { off: ['Chofer no disponible'], far: ['Sede incompatible'] },
  );
  const limited = api.deliveryDriverOptions(drivers, 'f1', { driverLimit: 3, enforceDriverLimit: true });
  assert.deepEqual(limited.eligible.map((x) => x.id), ['ok', 'busy']);
  assert.deepEqual(limited.excluded.find((x) => x.driver.id === 'full').reasons, ['Sin capacidad disponible']);
});
