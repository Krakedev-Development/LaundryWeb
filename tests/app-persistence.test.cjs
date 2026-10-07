require("./ts-loader.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const values = new Map();
let failWrite = false;
const asyncStorage = {
  getItem: async (k) => values.get(k) ?? null,
  setItem: async (k, v) => {
    if (failWrite) throw Error("Disk full");
    values.set(k, v);
  },
  removeItem: async (k) => values.delete(k),
};
const original = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === "@react-native-async-storage/async-storage") return asyncStorage;
  if (id === "expo-crypto")
    return {
      randomUUID: crypto.randomUUID,
      getRandomBytes: crypto.randomBytes,
    };
  if (id === "expo-secure-store")
    return {
      getItemAsync: asyncStorage.getItem,
      setItemAsync: asyncStorage.setItem,
      deleteItemAsync: asyncStorage.removeItem,
    };
  if (id === "react-native") return { Platform: { OS: "android" } };
  return original.call(this, id, parent, isMain);
};
const root = path.resolve(__dirname, "../../LaundryApp");
test("App domain mirrors Web; fixture IDs and both independent repositories use the same contract", () => {
  for (const name of [
    "fulfillment",
    "HandoffService",
    "BusinessService",
    "BusinessDemoData",
  ])
    assert.equal(
      fs.readFileSync(
        path.join(root, `src/services/domain/${name}.ts`),
        "utf8",
      ),
      fs
        .readFileSync(
          path.join(__dirname, `../src/services/${name}.ts`),
          "utf8",
        )
        .replace(/from (['"])\.\.\/types\1/g, "from '../../domain/models'"),
    );
  const demo = JSON.parse(
    fs.readFileSync(path.join(root, "src/domain/demo.json"), "utf8"),
  );
  for (const id of [
    "SOL-HH-001",
    "SOL-HS-001",
    "SOL-SH-001",
    "SOL-SS-001",
    "SOL-WEIGHT-001",
  ])
    assert.ok(demo.workflow.orders.some((o) => o.id === id));
});
test("App local persistence preserves legacy IDs, balances and orders; payments survive reload and failed writes do not claim success", async () => {
  let { useBusinessStore: store, businessService, flushBusiness } = require(
    path.join(root, "src/store/useBusinessStore.ts"),
  );
  const { useAuthStore } = require(
    path.join(root, "src/store/useAuthStore.ts"),
  );
  await store.getState().initialize();
  let state = store.getState().state;
  assert.ok(state, store.getState().error);
  for(const id of ['APP-DEMO-PICKUP','APP-DEMO-DELIVERY','APP-DEMO-ADJUSTMENT']) assert.ok(state.orders.some(o=>o.id===id),id);
  assert.equal(state.orders.find(o=>o.id==='APP-DEMO-DELIVERY').fulfillment.outbound.milestone,'RELEASED');
  assert.equal(state.orders.find(o=>o.id==='APP-DEMO-ADJUSTMENT').pricing.measuredWeight,22.5);
  assert.equal(state.customers.find((c) => c.id === "c1").walletBalance, 25);
  assert.equal(state.customers.find((c) => c.id === "c1").points, 340);
  const legacy = require(path.join(root, "src/data/mockData.ts")).MOCK_ORDERS;
  for (const o of legacy) assert.ok(state.orders.some((x) => x.id === o.id));
  useAuthStore
    .getState()
    .setUser(
      {
        id: "1",
        name: "Juan",
        email: "cliente@test.com",
        role: "client",
        status: "approved",
        customerId: "c1",
      },
      "demo",
    );
  const fixed = state.catalog.find((c) => c.id === "APP-lp");
  const inbound = businessService.availableSlots(
    "FAC-LEGACY",
    "FACILITY_DROPOFF",
  )[0];
  const outbound = businessService.availableSlots(
    "FAC-LEGACY",
    "FACILITY_PICKUP",
  )[4];
  const address = state.customers.find((c) => c.id === "c1").addresses[0];
  const order = businessService.create({
    requestId: "persisted-request",
    customerId: "c1",
    facilityId: "FAC-LEGACY",
    inbound: "CUSTOMER",
    outbound: "CUSTOMER",
    inboundSlotId: inbound.id,
    outboundSlotId: outbound.id,
    pickupAddress: address,
    deliveryAddress: address,
    items: [
      {
        id: fixed.id,
        name: fixed.name,
        quantity: 3,
        unitPrice: fixed.price,
        category: "PRENDAS",
      },
    ],
    pricingModel: "FIXED",
  });
  await flushBusiness();
  businessService.pay(order.id, "wallet-test", "BILLETERA");
  await flushBusiness();
  const paid = JSON.parse(values.get("laundry_app_business_v3"));
  assert.equal(
    paid.orders.find((x) => x.id === order.id).pricing.paymentStatus,
    "PAID",
  );
  assert.equal(paid.customers.find((c) => c.id === "c1").walletBalance, 20);
  const filename = require.resolve(
    path.join(root, "src/store/useBusinessStore.ts"),
  );
  delete require.cache[filename];
  ({ useBusinessStore: store, businessService, flushBusiness } = require(
    filename,
  ));
  await store.getState().initialize();
  assert.equal(
    store.getState().state.orders.find((x) => x.id === order.id).pricing
      .paymentStatus,
    "PAID",
  );
  assert.equal(
    store.getState().state.customers.find((c) => c.id === "c1").walletBalance,
    20,
  );
  const before = store.getState().state;
  failWrite = true;
  businessService.cancel(
    order.id,
    "Cancelación para probar fallo de almacenamiento",
  );
  await assert.rejects(flushBusiness(), /guardar/);
  failWrite = false;
  assert.equal(store.getState().state, before);
  assert.equal(
    JSON.parse(values.get("laundry_app_business_v3")).orders.find(
      (x) => x.id === order.id,
    ).status,
    "AWAITING_INTAKE",
  );
});

test("App can request rewards but cannot review canjes or sign in as Web staff", async () => {
  const filename = require.resolve(
    path.join(root, "src/store/useBusinessStore.ts"),
  );
  const module = require(filename);
  const {
    useBusinessStore: store,
    redeemReward,
    flushBusiness,
    reservedRewardPoints,
  } = module;
  const { useAuthStore } = require(
    path.join(root, "src/store/useAuthStore.ts"),
  );
  await store.getState().initialize();
  const state = JSON.parse(JSON.stringify(store.getState().state));
  state.rewards.push({
    id: "TEST-REWARD",
    name: "Canje de prueba",
    description: "Demo",
    pointsCost: 200,
    minPurchases: 0,
    minSpend: 0,
    validityDays: 30,
    status: "ACTIVE",
  });
  store.setState({ state });
  const client = {
    id: "1",
    name: "Cliente",
    email: "cliente@test.com",
    role: "client",
    status: "approved",
    customerId: "c1",
  };
  useAuthStore.getState().setUser(client, "demo");
  redeemReward("TEST-REWARD");
  await flushBusiness();
  const pending = store.getState().state.redemptions.at(-1);
  assert.equal(pending.status, "PENDING");
  assert.equal(
    store.getState().state.customers.find((c) => c.id === "c1").points,
    340,
  );
  assert.equal(reservedRewardPoints(store.getState().state, "c1"), 200);
  assert.throws(() => redeemReward("TEST-REWARD"), /requisitos/);
  for (const role of ["admin", "supervisor"])
    assert.throws(
      () => useAuthStore.getState().setUser({ ...client, role }, "demo"),
      /LaundryWeb/,
    );
  for (const method of [
    "reviewReward",
    "updateKyc",
    "createDriverAccount",
    "refreshDemoDriverPositions",
  ])
    assert.equal(module[method], undefined);
  delete require.cache[filename];
  const reloaded = require(filename).useBusinessStore;
  await reloaded.getState().initialize();
  assert.equal(
    reloaded.getState().state.redemptions.find((r) => r.id === pending.id)
      .status,
    "PENDING",
  );
  assert.equal(reservedRewardPoints(reloaded.getState().state, "c1"), 200);
});

test("Old staff sessions are cleared without deleting business data; valid mobile sessions remain", async () => {
  const { useAuthStore } = require(
    path.join(root, "src/store/useAuthStore.ts"),
  );
  const before = values.get("laundry_app_business_v3");
  for (const role of ["admin", "supervisor"]) {
    values.set(
      "laundry_session",
      JSON.stringify({
        state: {
          user: {
            id: "staff",
            name: "Operador",
            email: "staff@test.com",
            role,
            status: "approved",
          },
          token: "old-token",
        },
        version: 0,
      }),
    );
    await useAuthStore.persist.rehydrate();
    assert.equal(useAuthStore.getState().user, null);
    assert.equal(useAuthStore.getState().token, null);
    assert.equal(values.get("laundry_app_business_v3"), before);
  }
  for (const role of ["client", "driver"]) {
    const user = {
      id: "mobile",
      name: "Usuario",
      email: "mobile@test.com",
      role,
      status: "approved",
    };
    values.set(
      "laundry_session",
      JSON.stringify({ state: { user, token: "demo" }, version: 1 }),
    );
    await useAuthStore.persist.rehydrate();
    assert.equal(useAuthStore.getState().user.role, role);
    assert.equal(useAuthStore.getState().token, "demo");
  }
});

test("App map navigates store legs and collected laundry to the facility, and home legs to their independent addresses", () => {
  const { mapDestination } = require(
    path.join(root, "src/components/mvp/mapDestination.ts"),
  );
  const facility = { lat: -2.1, lng: -79.8 },
    pickup = { lat: -2.2, lng: -79.7 },
    delivery = { lat: -2.3, lng: -79.6 };
  for (const mode of ["HOME_HOME", "HOME_STORE", "STORE_HOME", "STORE_STORE"]) {
    const order = {
      customerAddress: { coordinates: pickup },
      deliveryAddress: { coordinates: delivery },
      fulfillment: {
        inbound: {
          method: mode.startsWith("HOME") ? "DRIVER" : "CUSTOMER",
          milestone: "ASSIGNED",
        },
        outbound: {
          method: mode.endsWith("HOME") ? "DRIVER" : "CUSTOMER",
          milestone: "ASSIGNED",
        },
      },
    };
    assert.deepEqual(
      mapDestination(order, "inbound", facility),
      mode.startsWith("HOME") ? pickup : facility,
    );
    assert.deepEqual(
      mapDestination(order, "outbound", facility),
      mode.endsWith("HOME") ? delivery : facility,
    );
    order.fulfillment.inbound.milestone = "COLLECTED";
    assert.deepEqual(mapDestination(order, "inbound", facility), facility);
  }
});

test('Prepared mobile examples respect occupied slots and never overwrite existing data',()=>{
 const demo=JSON.parse(fs.readFileSync(path.join(root,'src/domain/demo.json'),'utf8'));const state={...demo.workflow,facilities:demo.facilities,catalog:demo.catalog,promotions:demo.promotions,rewards:demo.rewards,redemptions:[],accounts:[],paymentMethods:{}};for(const slot of state.timeSlots)slot.reservedCount=slot.capacity;const before=JSON.stringify(state);require(path.join(root,'src/data/prepareMobileDemo.ts')).prepareMobileDemo(state);assert.equal(JSON.stringify(state),before);
});
