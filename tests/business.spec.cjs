const { test, expect } = require('./support/fixtures.cjs');
test('only two modes are selectable in list and configuration shows the server-backed panels', async ({
  page,
}) => {
  await page.goto('/operations/orders');
  await expect(
    page.getByLabel('Modalidad', { exact: true }).locator('option'),
  ).toHaveCount(3);
  await page
    .getByLabel('Modalidad', { exact: true })
    .selectOption('HOME_STORE');
  await expect(
    page
      .getByRole('button', { name: /SOL-HS-001/ })
      .or(page.getByText('SOL-HS-001', { exact: true }))
      .first(),
  ).toBeVisible();
  await page.goto('/settings');
  // La política y la agenda viven en el servidor (detalle en policy.spec y time-slots.spec).
  await expect(
    page.getByRole('heading', { name: 'Política de negocio', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Franjas horarias y cupos', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Decisiones en revisión', { exact: true })).toHaveCount(0);
});
