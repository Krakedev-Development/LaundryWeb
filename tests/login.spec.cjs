const { test, expect } = require('@playwright/test');

test('original login layout preserves demo access for both roles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Acceso a la plataforma' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Carlos Mendoza/ }),
  ).toBeVisible();
  await expect(page.locator('input[type="email"]')).toHaveValue(
    'admin@laundryweb.com',
  );
  await page.locator('input[type="password"]').fill('demo-password');
  await page.screenshot({
    path: 'test-results/login-original-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.locator('#app-sidebar').getByText('Administrador', { exact: true }),
  ).toBeVisible();
  await page
    .locator('#app-sidebar')
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await page.getByRole('button', { name: /Elena Rostova/ }).click();
  await expect(page.locator('input[type="email"]')).toHaveValue(
    'supervisor@laundryweb.com',
  );
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.locator('#app-sidebar').getByText('Supervisor', { exact: true }),
  ).toBeVisible();
});

test('login keeps all fields usable without horizontal overflow on mobile and tablet', async ({
  page,
}) => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 820, height: 1180 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await page.getByLabel('Recordarme en este equipo', { exact: true }).uncheck();
    await expect(
      page.getByLabel('Recordarme en este equipo', { exact: true }),
    ).not.toBeChecked();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/login-${viewport.width}.png`,
      fullPage: true,
    });
  }
});
