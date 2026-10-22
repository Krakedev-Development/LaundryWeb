require("./ts-loader.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { zone, fixture } = require("./zones.fixtures.cjs");
const {
  ZONES_KEY,
  readZones,
} = require("../src/services/zones/zoneStorage.ts");
const {
  validateZone,
  validateZoneChange,
} = require("../src/entities/zone/model/zone.rules.ts");
test("invalid polygons, non-admin edits and malformed saved records fail without writes", () => {
  const f = fixture("SUPERVISOR");
  assert.throws(() => f.repository.save(zone), /Administrador/);
  assert.equal(f.values.size, 0);
  assert.throws(() =>
    validateZone({
      ...zone,
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [2, 2],
            [0, 2],
            [2, 0],
            [0, 0],
          ],
        ],
      },
    }),
  );
  assert.throws(() =>
    validateZone({
      ...zone,
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    }),
  );
  f.values.set(ZONES_KEY, "{invalid");
  assert.throws(() => readZones(f.storage));
  assert.equal(f.values.get(ZONES_KEY), "{invalid");
});
test("geometry changes preserve facilities and active operations; renaming is safe", () => {
  const facility = {
    zoneId: zone.id,
    coordinates: { lat: 1, lng: 1 },
    status: "ACTIVE",
  };
  assert.throws(
    () => validateZoneChange(zone, { ...zone, active: false }, [facility], []),
    /sedes/,
  );
  assert.throws(
    () =>
      validateZoneChange(
        zone,
        { ...zone, active: false },
        [],
        [{ zoneId: zone.id, status: "CONFIRMED" }],
      ),
    /curso/,
  );
  assert.doesNotThrow(() =>
    validateZoneChange(
      zone,
      { ...zone, name: "Otro nombre" },
      [facility],
      [{ zoneId: zone.id, status: "CONFIRMED" }],
    ),
  );
  assert.throws(
    () =>
      validateZoneChange(
        zone,
        {
          ...zone,
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [0.5, 0],
                [0.5, 0.5],
                [0, 0],
              ],
            ],
          },
        },
        [facility],
        [],
      ),
    /fuera/,
  );
});
