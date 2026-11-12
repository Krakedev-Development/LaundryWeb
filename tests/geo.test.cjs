require('./ts-loader.cjs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  ServiceAreaService,
} = require('../src/services/geo/ServiceAreaService.ts');
const {
  SAMPLE_CENTER,
  SAMPLE_FACILITIES,
  SERVICE_AREAS,
} = require('./fixtures/sample/geoSample.ts');
const {
  MapboxGeoProvider,
} = require('../src/services/geo/mapbox/MapboxGeoProvider.ts');
const {
  DispatchService,
  rankCandidates,
  eligibilityReasons,
  isLocationStale,
} = require('../src/services/geo/DispatchService.ts');
const { SampleGeoProvider } = require('./fixtures/sample/SampleGeoProvider.ts');
const {
  RoutingService,
  routeCacheKey,
} = require('../src/services/geo/RoutingService.ts');
const config = {
  accessToken: 'pk.test',
  country: 'EC',
  language: 'es',
  permanentGeocoding: true,
};
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers });
test('coverage handles active zones, boundaries, holes and invalid coordinates', () => {
  const coverage = new ServiceAreaService(SERVICE_AREAS);
  assert.equal(coverage.findArea(SAMPLE_CENTER).facilityId, 'FAC-02');
  SAMPLE_FACILITIES.forEach((f) =>
    assert.equal(coverage.findArea(f.coordinates).facilityId, f.id),
  );
  assert.equal(coverage.isCovered({ lat: 0, lng: 0 }), false);
  assert.equal(coverage.isCovered({ lat: NaN, lng: 0 }), false);
  assert.equal(coverage.isCovered({ lat: -2.132, lng: -79.884 }), true);
  const area = {
    id: 'hole',
    name: 'Hole',
    facilityId: 'FAC',
    active: true,
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        [
          [3, 3],
          [7, 3],
          [7, 7],
          [3, 7],
          [3, 3],
        ],
      ],
    },
  };
  const custom = new ServiceAreaService([area]);
  assert.equal(custom.isCovered({ lat: 2, lng: 2 }), true);
  assert.equal(custom.isCovered({ lat: 5, lng: 5 }), false);
  area.active = false;
  assert.equal(custom.isCovered({ lat: 2, lng: 2 }), false);
});
const target = {
  id: 'order',
  coordinates: SAMPLE_CENTER,
  facilityId: 'FAC-02',
  zoneId: 'ZONA-SUR',
};
const driver = (id, extra = {}) => ({
  id,
  status: 'AVAILABLE',
  coordinates: SAMPLE_CENTER,
  updatedAt: new Date().toISOString(),
  facilityId: 'FAC-02',
  zoneId: 'ZONA-SUR',
  activeOrders: 0,
  maxOrders: 4,
  ...extra,
});
test('eligibility excludes unavailable, full, stale and unauthorized drivers before Matrix', async () => {
  const drivers = [
    driver('a'),
    driver('offline', { status: 'OFFLINE' }),
    driver('full', { activeOrders: 4 }),
    driver('old', { updatedAt: 'Hace 1 min' }),
    driver('other', { facilityId: 'FAC-01' }),
    driver('zone', { zoneId: 'OTHER' }),
  ];
  const provider = new SampleGeoProvider();
  const original = provider.getMatrix.bind(provider);
  let origins;
  provider.getMatrix = (values, destinations) => {
    origins = values;
    return original(values, destinations);
  };
  const candidates = await new DispatchService(provider,10,120,true).candidates(
    drivers,
    target,
  );
  assert.deepEqual(
    origins.map((v) => v.id),
    ['a'],
  );
  assert.deepEqual(
    candidates.map((v) => v.driverId),
    ['a'],
  );
  assert.equal(
    isLocationStale(new Date(Date.now() + 60000).toISOString()),
    true,
  );
  assert.ok(
    eligibilityReasons(driver('zero', { maxOrders: 0 }), target).length,
  );
});
test('ranking is finite for one candidate/equal ETA, handles missing history and deterministic ties', () => {
  const drivers = [driver('b'), driver('a')];
  const ranked = rankCandidates(
    drivers,
    drivers.map((d) => ({ driverId: d.id, etaSeconds: 0, distanceMeters: 0 })),
  );
  assert.deepEqual(
    ranked.map((v) => v.driverId),
    ['a', 'b'],
  );
  assert.ok(ranked.every((v) => Number.isFinite(v.score)));
  assert.deepEqual(rankCandidates([], []), []);
});
test('Mapbox requests permanent geocoding and converts longitude/latitude correctly', async () => {
  let request;
  const provider = new MapboxGeoProvider(config, async (url) => {
    request = new URL(url);
    return json({
      features: [
        {
          geometry: { coordinates: [-79.867, -2.124] },
          properties: { full_address: 'Samborondón', mapbox_id: 'place' },
        },
      ],
    });
  });
  const addresses = await provider.searchAddress('Samborondón', {
    permanent: true,
  });
  assert.equal(request.searchParams.get('permanent'), 'true');
  assert.equal(request.searchParams.get('country'), 'EC');
  assert.deepEqual(addresses[0].coordinates, { lat: -2.124, lng: -79.867 });
  assert.equal(addresses[0].persistence, 'permanent');
  const disabled = new MapboxGeoProvider(
    { ...config, permanentGeocoding: false },
    () => {
      throw new Error('must not request');
    },
  );
  await assert.rejects(
    disabled.searchAddress('address', { permanent: true }),
    (e) => e.code === 'PERSISTENCE_DISABLED',
  );
});
test('Matrix batches traffic coordinates, uses asymmetric elements and Directions for a single pair', async () => {
  const requests = [];
  const provider = new MapboxGeoProvider(config, async (url) => {
    const request = new URL(url);
    requests.push(request);
    if (request.pathname.includes('directions/v5'))
      return json({
        code: 'Ok',
        routes: [
          {
            distance: 500,
            duration: 60,
            geometry: {
              type: 'LineString',
              coordinates: [
                [-79.867, -2.124],
                [-79.869, -2.124],
              ],
            },
          },
        ],
      });
    const sources = request.searchParams.get('sources').split(';');
    return json({
      code: 'Ok',
      durations: sources.map(() => [60]),
      distances: sources.map(() => [500]),
    });
  });
  const origins = Array.from({ length: 10 }, (_, i) => ({
    id: String(i),
    coordinates: SAMPLE_CENTER,
  }));
  const results = await provider.getMatrix(
    origins,
    [{ id: 'target', coordinates: SAMPLE_CENTER }],
    { profile: 'driving-traffic' },
  );
  assert.equal(results.length, 10);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].searchParams.get('sources').split(';').length, 9);
  assert.equal(requests[0].searchParams.get('destinations'), '9');
  assert.ok(requests[1].pathname.includes('directions/v5'));
});
test('unreachable pairs remain null and 429 blocks subsequent requests without retry loops', async () => {
  const noRoute = new MapboxGeoProvider(config, async () =>
    json({ code: 'NoRoute' }),
  );
  const result = await noRoute.getMatrix(
    [
      { id: 'a', coordinates: SAMPLE_CENTER },
      { id: 'b', coordinates: SAMPLE_CENTER },
    ],
    [{ id: 't', coordinates: SAMPLE_CENTER }],
  );
  assert.ok(result.every((v) => !v.reachable && v.durationSeconds === null));
  let calls = 0;
  const busy = new MapboxGeoProvider(config, async () => {
    calls++;
    return json({}, 429, { 'retry-after': '30' });
  });
  await assert.rejects(
    busy.getRoute(SAMPLE_CENTER, SAMPLE_CENTER),
    (e) => e.code === 'RATE_LIMIT',
  );
  await assert.rejects(
    busy.getRoute(SAMPLE_CENTER, SAMPLE_CENTER),
    (e) => e.code === 'RATE_LIMIT',
  );
  assert.equal(calls, 1);
});
test('route cache includes waypoints/profile, caches valid responses and expires', async (t) => {
  let time = 1000;
  t.mock.method(Date, 'now', () => time);
  const provider = new SampleGeoProvider();
  let calls = 0;
  const original = provider.getRoute.bind(provider);
  provider.getRoute = (...args) => {
    calls++;
    return original(...args);
  };
  const cache = new RoutingService(provider, 10);
  await cache.getRoute(SAMPLE_CENTER, SAMPLE_CENTER);
  await cache.getRoute(SAMPLE_CENTER, SAMPLE_CENTER);
  assert.equal(calls, 1);
  await cache.getRoute(SAMPLE_CENTER, SAMPLE_CENTER, {
    waypoints: [SAMPLE_FACILITIES[0].coordinates],
  });
  assert.equal(calls, 2);
  assert.notEqual(
    routeCacheKey(SAMPLE_CENTER, SAMPLE_CENTER),
    routeCacheKey(SAMPLE_CENTER, SAMPLE_CENTER, { profile: 'driving-traffic' }),
  );
  time += 20;
  await cache.getRoute(SAMPLE_CENTER, SAMPLE_CENTER);
  assert.equal(calls, 3);
});
