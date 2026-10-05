require('./ts-loader.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  FacilityDiscoveryService,
} = require('../src/services/geo/FacilityDiscoveryService.ts');
test('facility discovery filters business eligibility before Matrix and does not require home coverage', async () => {
  let observed;
  const service = new FacilityDiscoveryService({
    getMatrix: async (origins, destinations) => {
      observed = { origins, destinations };
      return destinations.map((d, i) => ({
        originId: 'CUSTOMER',
        destinationId: d.id,
        reachable: true,
        durationSeconds: 100 - i * 25,
        distanceMeters: 200,
      }));
    },
  });
  const base = {
    coordinates: { lat: -2.124, lng: -79.867 },
    active: true,
    acceptsCustomerDropoff: true,
    allowsCustomerPickup: true,
  };
  const facilities = [
    { ...base, id: 'A' },
    { ...base, id: 'B' },
    { ...base, id: 'OFF', active: false },
    { ...base, id: 'NO_PICKUP', allowsCustomerPickup: false },
    { ...base, id: 'WRONG_SERVICE', serviceIds: ['industrial'] },
  ];
  const origin = { lat: 0, lng: -80 };
  const ranked = await service.rank(facilities, origin, ['care']);
  assert.deepEqual(
    observed.destinations.map((d) => d.id),
    ['A', 'B'],
  );
  assert.deepEqual(observed.origins[0].coordinates, origin);
  assert.deepEqual(
    ranked.map((r) => r.facility.id),
    ['B', 'A'],
  );
});
