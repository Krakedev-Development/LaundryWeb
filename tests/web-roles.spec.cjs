const { test, expect } = require('./support/fixtures.cjs');

test.describe("Supervisor", () => {
test.use({ role: "SUPERVISOR" });
test("Web Supervisor keeps operational access and cannot create drivers or review rewards", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/logistics/drivers");
  await expect(
    page.getByRole("heading", { name: "Gestión de Choferes y Flota" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Nuevo Chofer/ })).toHaveCount(
    0,
  );
  await page.goto("/operations/handoffs");
  await expect(
    page.getByRole("heading", { name: "Recepción y retiros", exact: true }),
  ).toBeVisible();
  await page.goto("/commercial/rewards");
  await expect(
    page.getByRole("button", { name: "Simular solicitud · MVP", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
});
