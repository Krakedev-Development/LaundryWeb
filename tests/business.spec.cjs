const { test, expect } = require('./support/fixtures.cjs');
test('only two modes are selectable in list and configuration retains review values', async ({
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
  await expect(
    page.getByRole('heading', { name: 'Políticas y agenda' }),
  ).toBeVisible();
  await expect(page.getByLabel('IVA (fracción: 0.15 = 15%)')).toHaveValue('');
  await expect(
    page.getByText('Decisiones en revisión', { exact: true }),
  ).toBeVisible();
});
