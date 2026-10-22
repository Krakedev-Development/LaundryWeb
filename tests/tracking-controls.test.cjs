require("./ts-loader.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  MockTrackingProvider,
  demoTrackingRoute,
} = require("../src/services/geo/MockTrackingProvider.ts");
test("pause freezes movement, resume excludes paused time and restart preserves subscription cleanup", () => {
  const original = Date.now;
  let now = 100000;
  Date.now = () => now;
  const provider = new MockTrackingProvider(1000000);
  try {
    provider.start(
      "driver",
      demoTrackingRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }),
      1000,
    );
    now += 250;
    provider.pause("driver");
    assert.equal(
      provider.locationAt("driver", now + 10000).coordinates.lat,
      0.25,
    );
    now += 10000;
    provider.resume("driver");
    assert.equal(provider.locationAt("driver", now + 250).coordinates.lat, 0.5);
    let called = 0;
    const unsubscribe = provider.subscribeToDriver("driver", () => called++);
    provider.restart("driver");
    assert.equal(called, 2);
    assert.equal(provider.locationAt("driver", now).coordinates.lat, 0);
    unsubscribe();
    provider.restart("driver");
    assert.equal(called, 2);
  } finally {
    provider.dispose();
    Date.now = original;
  }
});
