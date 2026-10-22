const { test, expect } = require("@playwright/test");
test("Expo app renders local fixtures, weight QR and four-mode wizard without generic pictures", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("http://127.0.0.1:8083");
  await page.getByText("Cliente demo", { exact: true }).click();
  await page.getByText("Entrar", { exact: true }).click();
  await expect(
    page.getByText("Tu próxima acción", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("tab", { name: /Pedidos/ }).click();
  await page.getByText("SOL-WEIGHT-001", { exact: true }).click();
  await expect(
    page.getByText("Importe pendiente de pesaje · PENDING_AMOUNT", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Presenta este código.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator("svg")).not.toHaveCount(0);
  await page
    .getByText("Volver", { exact: true })
    .count()
    .then(async (count) => {
      if (count) await page.getByText("Volver", { exact: true }).click();
      else await page.goBack();
    });
  await page
    .getByRole("button", { name: "Nueva solicitud", exact: true })
    .click();
  await expect(
    page.getByText("Modelo del servicio", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

const visible = (page, text) =>
  page.getByText(text, { exact: true }).filter({ visible: true });
const appState = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("laundry_app_business_v3")),
  );
async function loginDemo(page, role) {
  await visible(page, role + " demo").click();
  await visible(page, "Entrar").click();
}
test("Expo login has only mobile profiles; legacy staff session returns to login and preserves local orders", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "laundry_session",
      JSON.stringify({
        state: {
          user: {
            id: "admin",
            name: "Admin",
            email: "admin@test.com",
            role: "admin",
            status: "approved",
          },
          token: "old",
        },
        version: 0,
      }),
    ),
  );
  await page.goto("/");
  await expect(visible(page, "Cliente demo")).toBeVisible();
  await expect(visible(page, "Chofer demo")).toBeVisible();
  await expect(visible(page, "Administrador demo")).toHaveCount(0);
  await expect(visible(page, "Supervisor demo")).toHaveCount(0);
  await loginDemo(page, "Cliente");
  await page.getByRole("tab", { name: /Pedidos/ }).click();
  await visible(page, "APP-DEMO-ADJUSTMENT").click();
  await expect(
    page.getByRole("button", { name: "Aceptar ajuste", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar peso LB", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Aceptar ajuste", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pagar con tarjeta · Demo", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await appState(page)).orders.find(
          (o) => o.id === "APP-DEMO-ADJUSTMENT",
        ).pricing.paymentStatus,
    )
    .toBe("PAID");
});

test("Expo driver has prepared pickups, deliveries and map with no staff controls", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await loginDemo(page, "Chofer");
  await expect(visible(page, "Mi ruta y solicitudes")).toBeVisible();
  await visible(page, "APP-DEMO-PICKUP").click();
  await page.getByRole("button", { name: "Iniciar ruta", exact: true }).click();
  await page
    .getByRole("button", { name: "Marcar llegada", exact: true })
    .click();
  const state = await appState(page),
    h = state.handoffs.find(
      (h) => h.orderId === "APP-DEMO-PICKUP" && h.type === "CUSTOMER_TO_DRIVER",
    );
  await page.getByLabel("Código de transferencia").fill(h.fallbackCode);
  await page
    .getByRole("button", { name: "Verificar código", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar entrega física", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await appState(page)).orders.find((o) => o.id === "APP-DEMO-PICKUP")
          .fulfillment.inbound.milestone,
    )
    .toBe("COLLECTED");
  await expect(
    page.getByRole("button", { name: "Registrar peso LB", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ver mapa del pedido", exact: true })
    .click();
  await expect(visible(page, "Ruta del chofer")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Expo five-step fixed checkout creates one store order with an exact quote and a single reservation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await loginDemo(page, "Cliente");
  await visible(page, "Nueva solicitud").click();
  await visible(page, "Agregar prenda").click();
  await visible(page, "Agregar").click();
  await visible(page, "Continuar").click();
  await visible(page, "Continuar").click();
  await visible(page, "Ingreso y retiro en sede").click();
  await page
    .getByText(/^\d{4}-\d{2}-\d{2} · /)
    .filter({ visible: true })
    .first()
    .click();
  await visible(page, "Continuar").click();
  await visible(page, "Continuar").click();
  await expect(visible(page, "Total: $5.00")).toBeVisible();
  const before = (await appState(page)).orders.map((o) => o.id);
  await page
    .getByRole("button", { name: "Confirmar y pagar · Demo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ver mapa del pedido", exact: true }),
  ).toBeVisible();
  const state = await appState(page),
    created = state.orders.filter((o) => !before.includes(o.id));
  expect(created).toHaveLength(1);
  expect(created[0].fulfillment.mode).toBe("STORE_STORE");
  expect(created[0].pricing.paymentStatus).toBe("PAID");
  expect(created[0].pricing.total).toBe(5);
  expect(
    state.reservations.filter((r) => r.orderId === created[0].id && r.active),
  ).toHaveLength(1);
  await page
    .getByRole("button", { name: "Ver mapa del pedido", exact: true })
    .click();
  await expect(visible(page, "Cómo llegar a la sede")).toBeVisible();
  expect(errors).toEqual([]);
});
