const { test, expect } = require('./support/fixtures.cjs');
const routes = [
  '/dashboard',
  '/operations/orders',
  '/operations/handoffs',
  '/operations/dispatch',
  '/operations/plant',
  '/operations/deliveries',
  '/operations/incidents',
  '/customers',
  '/customers/kyc',
  '/commercial/catalog',
  '/commercial/promotions',
  '/commercial/rewards',
  '/commercial/memberships',
  '/logistics/drivers',
  '/logistics/facilities',
  '/logistics/map',
  '/reports',
  '/management/staff',
  '/settings',
];
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`existing screens stay usable at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of routes) {
      await page.goto(path);
      await expect(page.locator('.lw-page')).toBeVisible();
      await expect(page.locator('main h1')).toBeVisible();
      await page.screenshot({
        path: `.tmp/design-review/${viewport.width}-${path.slice(1).replaceAll('/', '-')}.png`,
        fullPage: true,
      });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      expect(overflow, `${path} has horizontal overflow`).toBeLessThanOrEqual(
        1,
      );
    }
    expect(errors).toEqual([]);
  });
}
test('route transitions keep the shell and browser history, with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/operations/orders');
  await expect(page.locator('.lw-page')).toBeVisible();
  const shell = await page.locator('#app-sidebar').elementHandle();
  await page
    .locator('#app-sidebar')
    .getByRole('link', { name: 'INICIO', exact: true })
    .click();
  await expect(page).toHaveURL(/dashboard/);
  expect(await shell.evaluate((el) => el.isConnected)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/operations\/orders/);
  await expect(page.locator('.lw-page:not([inert])')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/dashboard/);
});
