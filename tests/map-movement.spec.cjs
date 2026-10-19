const { test, expect } = require("@playwright/test");
test.use({ viewport: { width: 1440, height: 1000 } });
test("movement controls pause and resume only the local journey", async ({
  page,
}) => {
  await page.route("**/api.mapbox.com/**", (route) => route.abort());
  await page.goto("/operations/orders/SOL-HOME-001");
  await page
    .getByRole("button", { name: "Asignar chofer de recogida", exact: true })
    .click();
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "Confirmar asignación", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Iniciar recogida", exact: true })
    .click();
  const saved = () =>
    page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("lw_workflow_v2"));
      const order = state.orders.find((order) => order.id === "SOL-HOME-001");
      const driver = state.drivers.find(
        (driver) => driver.id === order.pickup.driverId,
      );
      return {
        driverId: driver.id,
        status: order.status,
        point: [driver.location.lat, driver.location.lng],
      };
    });
  const before = await saved();
  await page.goto("/logistics/map");
  await page.getByLabel("Chofer en el mapa").selectOption(before.driverId);
  await page
    .getByRole("button", { name: "Pausar simulación", exact: true })
    .click();
  const paused = await saved();
  await page.waitForTimeout(3400);
  expect((await saved()).point).toEqual(paused.point);
  await page
    .getByRole("button", { name: "Reanudar simulación", exact: true })
    .click();
  await expect
    .poll(async () => (await saved()).point)
    .not.toEqual(paused.point);
  await page
    .getByRole("button", { name: "Seguir ubicación", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dejar de seguir", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Reiniciar recorrido", exact: true })
    .click();
  expect((await saved()).status).toBe(before.status);
});
