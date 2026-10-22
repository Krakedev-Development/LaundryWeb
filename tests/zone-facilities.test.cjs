require("./ts-loader.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const values = new Map();
global.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
const { storageService: storage } = require("../src/services/storage.ts");
const { zoneRepository } = require("../src/services/zones/zoneRepository.ts");
const {
  readZones,
  ZONES_KEY,
} = require("../src/services/zones/zoneStorage.ts");
test("several facilities share one polygon without reassigning existing operations or coverage", () => {
  const orders = JSON.stringify(storage.getWorkflow().orders);
  const zone = zoneRepository.save({
    id: "custom-zone",
    name: "Zona adicional",
    active: true,
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [10, 10],
          [12, 10],
          [12, 12],
          [10, 12],
          [10, 10],
        ],
      ],
    },
  });
  const template = storage.getFacilities()[0];
  const first = storage.createFacility({
    ...template,
    name: "Nueva A",
    zoneId: zone.id,
    zone: zone.name,
    coordinates: { lat: 11, lng: 11 },
  });
  const second = storage.createFacility({
    ...template,
    name: "Nueva B",
    zoneId: zone.id,
    zone: zone.name,
    coordinates: { lat: 11.5, lng: 11.5 },
  });
  assert.equal(
    readZones().find((item) => item.id === zone.id).facilityId,
    first.id,
  );
  assert.equal(
    storage.getFacilities().filter((item) => item.zoneId === zone.id).length,
    2,
  );
  assert.equal(JSON.stringify(storage.getWorkflow().orders), orders);
  assert.throws(
    () =>
      storage.updateFacility({ ...second, coordinates: { lat: 20, lng: 20 } }),
    /dentro/,
  );
  const before = values.get("lw_facilities");
  const write = localStorage.setItem;
  localStorage.setItem = (key, value) => {
    if (key === ZONES_KEY) throw Error("quota");
    write(key, value);
  };
  assert.throws(
    () => storage.createFacility({ ...second, name: "Fallida" }),
    /quota/,
  );
  localStorage.setItem = write;
  assert.equal(values.get("lw_facilities"), before);
  storage.setCurrentUser({ ...storage.getCurrentUser(), role: "SUPERVISOR" });
  assert.throws(
    () => storage.createFacility({ ...second, name: "No autorizada" }),
    /Administrador/,
  );
  storage.setCurrentUser({ ...storage.getCurrentUser(), role: "ADMIN" });
  storage.resetAll();
  assert.equal(values.has(ZONES_KEY), false);
  assert.equal(readZones().length, 3);
});
