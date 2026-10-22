require("./ts-loader.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const values = new Map();
global.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: (k) => values.delete(k),
};
const { storageService: storage } = require("../src/services/storage.ts");

test("Web Admin reviews new reserved rewards once, audits delivery and preserves legacy debits", () => {
  const admin = storage.getCurrentUser();
  storage.setCurrentUser({ ...admin, role: "ADMIN" });
  const reward = storage.createReward({
    name: "Recompensa de prueba",
    description: "Demo",
    pointsCost: 200,
    minPurchases: 0,
    minSpend: 0,
    validityDays: 30,
    status: "ACTIVE",
  });
  const customer = storage.getCustomers().find((c) => c.id === "CUST-001");
  const points = customer.points;
  const red = storage.requestDemoReward(customer.id, reward.id);
  assert.equal(
    storage.getCustomers().find((c) => c.id === customer.id).points,
    points,
  );
  assert.throws(
    () => storage.updateRedemptionStatus(red.id, "APPROVED", ""),
    /motivo/,
  );
  assert.throws(
    () => storage.updateRedemptionStatus(red.id, "DELIVERED", "Entrega"),
    /aprobación/,
  );
  storage.updateRedemptionStatus(red.id, "APPROVED", "Requisitos verificados");
  storage.updateRedemptionStatus(red.id, "APPROVED", "Reintento");
  assert.equal(
    storage.getCustomers().find((c) => c.id === customer.id).points,
    points - 200,
  );
  assert.equal(
    storage.getPointsLedger().filter((p) => p.id === red.id).length,
    1,
  );
  storage.updateRedemptionStatus(red.id, "DELIVERED", "Beneficio entregado");
  assert.throws(
    () => storage.updateRedemptionStatus(red.id, "REJECTED", "Cambio"),
    /Transición/,
  );
  assert.ok(
    storage
      .getAuditLogs()
      .some((a) => a.action === "REWARD_DELIVERED" && a.notes.includes(red.id)),
  );
  const pending = storage.requestDemoReward(customer.id, reward.id);
  const before = storage
    .getCustomers()
    .find((c) => c.id === customer.id).points;
  storage.updateRedemptionStatus(pending.id, "REJECTED", "No disponible");
  assert.equal(
    storage.getCustomers().find((c) => c.id === customer.id).points,
    before,
  );
  assert.equal(
    storage.getRedemptions().find((r) => r.id === pending.id).pointsReserved,
    false,
  );
  const ledger = storage.getPointsLedger();
  storage.updateRedemptionStatus(
    "RED-02",
    "APPROVED",
    "Revisado sin repetir débito anterior",
  );
  assert.deepEqual(storage.getPointsLedger(), ledger);
});

test("Web reserved rewards cannot overspend and failed persistence leaves review and points unchanged", () => {
  const c = storage.getCustomers().find((c) => c.id === "CUST-001");
  const reward = storage.createReward({
    name: "Saldo completo",
    description: "Demo",
    pointsCost: c.points,
    minPurchases: 0,
    minSpend: 0,
    validityDays: 30,
    status: "ACTIVE",
  });
  const red = storage.requestDemoReward(c.id, reward.id);
  assert.throws(() => storage.requestDemoReward(c.id, reward.id), /reservados/);
  const before = values.get("lw_workflow_v2");
  const write = localStorage.setItem;
  localStorage.setItem = () => {
    throw Error("Disk full");
  };
  assert.throws(
    () =>
      storage.updateRedemptionStatus(red.id, "APPROVED", "Revisión completa"),
    /Disk full/,
  );
  localStorage.setItem = write;
  assert.equal(values.get("lw_workflow_v2"), before);
  assert.equal(
    storage.getRedemptions().find((r) => r.id === red.id).status,
    "PENDING",
  );
  storage.updateRedemptionStatus(red.id, "REJECTED", "Liberar reserva");
});

test("Web owns driver creation; Supervisor is limited to its operational facility", () => {
  const admin = storage.getCurrentUser();
  const facility = storage.getFacilities().find((f) => f.status === "ACTIVE");
  const input = {
    ...storage.getDrivers()[0],
    name: "Nuevo chofer",
    email: "nuevo@demo.laundry",
    phone: "0991234567",
    vehiclePlate: "DEMO123",
    facilityId: facility.id,
    maxOrders: 5,
  };
  assert.throws(
    () => storage.createDriver({ ...input, email: "invalido" }),
    /correo/,
  );
  assert.throws(
    () => storage.createDriver({ ...input, facilityId: "UNKNOWN" }),
    /sede/,
  );
  const driver = storage.createDriver(input);
  assert.deepEqual(
    { lat: driver.location.lat, lng: driver.location.lng },
    facility.coordinates,
  );
  assert.equal(driver.location.simulated, true);
  assert.ok(Number.isFinite(Date.parse(driver.location.lastUpdated)));
  assert.throws(
    () => storage.createDriver({ ...input, email: "NUEVO@DEMO.LAUNDRY" }),
    /correo/,
  );
  const state = storage.getWorkflow();
  for (const d of state.drivers) {
    d.location.simulated = true;
    d.location.lastUpdated = "2020-01-01T00:00:00Z";
  }
  values.set("lw_workflow_v2", JSON.stringify(state));
  storage.setCurrentUser({
    ...admin,
    id: "SUP-TEST",
    role: "SUPERVISOR",
    facilityId: facility.id,
  });
  assert.throws(() => storage.createDriver(input), /administrador/);
  assert.throws(
    () => storage.updateRedemptionStatus("RED-02", "DELIVERED", "Entrega"),
    /administrador/,
  );
  assert.throws(
    () => storage.requestDemoReward("CUST-001", "REW-01"),
    /Administrador/,
  );
  assert.equal(
    storage.updateCustomerKyc("CUST-001", "APPROVED").success,
    false,
  );
  storage.refreshDemoLocations();
  const changed = storage.getDrivers();
  assert.ok(
    changed
      .filter((d) => d.facilityId !== facility.id)
      .every((d) => d.location.lastUpdated === "2020-01-01T00:00:00Z"),
  );
  assert.ok(
    storage.getOperationalDrivers().every((d) => d.facilityId === facility.id),
  );
  assert.deepEqual(storage.getOperationalRedemptions(), []);
  storage.setCurrentUser(admin);
});
