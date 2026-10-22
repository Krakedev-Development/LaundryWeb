require("./ts-loader.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { zone, fixture } = require("./zones.fixtures.cjs");
const {
  ZONES_KEY,
  readZones,
} = require("../src/services/zones/zoneStorage.ts");
const {
  validatePinnedFacility,
  facilityZoneId,
} = require("../src/entities/zone/model/zone.rules.ts");
const {
  commitLocalRecords,
} = require("../src/shared/storage/LocalStorageAdapter.ts");
test("zones persist without replacing seed areas; multiple facilities retain their zone", () => {
  const f = fixture();
  f.repository.save(zone);
  const zones = readZones(f.storage);
  assert.equal(zones.length, 4);
  assert.equal(zones.at(-1).name, zone.name);
  assert.equal(zones.at(-1).facilityId, undefined);
  for (const id of ["FAC-04", "FAC-05"]) {
    const facility = {
      id,
      zoneId: zone.id,
      coordinates: { lat: 1, lng: 1 },
      status: "ACTIVE",
    };
    validatePinnedFacility(facility, zones);
    assert.equal(facilityZoneId(facility, zones), zone.id);
  }
  assert.throws(
    () =>
      validatePinnedFacility(
        { zoneId: zone.id, coordinates: { lat: 3, lng: 3 } },
        zones,
      ),
    /dentro/,
  );
  assert.throws(() => f.repository.save({ ...zone, id: "other" }), /nombre/);
});
test("a failed multi-record write rolls back facilities and zones together", () => {
  const f = fixture();
  f.storage.setItem("facilities", "previous");
  const write = f.storage.setItem;
  f.storage.setItem = (key, value) => {
    if (key === ZONES_KEY) throw Error("quota");
    write(key, value);
  };
  assert.throws(
    () =>
      commitLocalRecords(f.storage, {
        facilities: "next",
        [ZONES_KEY]: "zones",
      }),
    /quota/,
  );
  assert.equal(f.storage.getItem("facilities"), "previous");
  assert.equal(f.storage.getItem(ZONES_KEY), null);
});
