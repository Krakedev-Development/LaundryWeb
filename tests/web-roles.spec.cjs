const { test, expect } = require("@playwright/test");

test("Web Admin simulates, reviews and delivers canjes with a required reason and one point debit", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/commercial/rewards");
  await page.getByRole('button',{name:'Nueva Recompensa',exact:true}).click();
  await page.getByPlaceholder('Ej: Lavado de Edredón Gratis').fill('Canje de interfaz');
  await page.getByLabel('Costo en puntos',{exact:true}).fill('200');
  await page.getByLabel('Compras previas mínimas',{exact:true}).fill('0');
  await page.getByLabel('Gasto previo acumulado',{exact:true}).fill('0');
  await page.getByRole('button',{name:'Crear Recompensa',exact:true}).click();
  await page.getByRole("button", { name: /Solicitudes de Canje/ }).click();
  await page.getByLabel("Cliente del canje demo").selectOption("CUST-001");
  await page.getByLabel("Recompensa del canje demo").selectOption({label:"Canje de interfaz"});
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("lw_workflow_v2")).customers.find(
        (c) => c.id === "CUST-001",
      ).points,
  );
  await page
    .getByRole("button", { name: "Simular solicitud · MVP", exact: true })
    .click();
  const red = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lw_workflow_v2")).redemptions.at(-1),
  );
  expect(red.status).toBe("PENDING");
  expect(red.pointsReserved).toBe(true);
  const row = page
    .locator("tr")
    .filter({ has: page.getByLabel("Motivo del canje " + red.id) });
  await row.getByRole("button", { name: "Aprobar", exact: true }).click();
  await expect(
    page.getByText("Escribe el motivo de la revisión o entrega.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Motivo del canje " + red.id)
    .fill("Requisitos comprobados");
  await row.getByRole("button", { name: "Aprobar", exact: true }).click();
  await page
    .getByLabel("Motivo del canje " + red.id)
    .fill("Beneficio entregado en sede");
  await row
    .getByRole("button", { name: "Marcar Entregado", exact: true })
    .click();
  await page.reload();
  const saved = await page.evaluate((id) => {
    const s = JSON.parse(localStorage.getItem("lw_workflow_v2"));
    return {
      status: s.redemptions.find((r) => r.id === id).status,
      points: s.customers.find((c) => c.id === "CUST-001").points,
      debits: s.pointsLedger.filter((p) => p.id === id).length,
    };
  }, red.id);
  expect(saved).toEqual({
    status: "DELIVERED",
    points: before - red.pointsSpent,
    debits: 1,
  });
  expect(errors).toEqual([]);
});

test("Web Supervisor keeps operational access and cannot create drivers or review rewards", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login");
  await page.getByRole("button", { name: /Elena Rostova/ }).click();
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
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
