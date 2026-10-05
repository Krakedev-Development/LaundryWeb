const { test, expect } = require('@playwright/test');

test('reference login layout preserves demo access for both roles and password visibility', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Iniciar sesión' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Administrador', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Correo', { exact: true })).toHaveValue(
    'admin@laundryweb.com',
  );
  await page.getByLabel('Contraseña', { exact: true }).fill('demo-password');
  await page
    .getByRole('button', { name: 'Mostrar contraseña', exact: true })
    .click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute(
    'type',
    'text',
  );
  await page
    .getByRole('button', { name: 'Ocultar contraseña', exact: true })
    .click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute(
    'type',
    'password',
  );
  await page.screenshot({
    path: 'test-results/login-reference-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.locator('#app-sidebar').getByText('Administrador', { exact: true }),
  ).toBeVisible();
  await page
    .locator('#app-sidebar')
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await page.getByRole('button', { name: 'Supervisor', exact: true }).click();
  await expect(page.getByLabel('Correo', { exact: true })).toHaveValue(
    'supervisor@laundryweb.com',
  );
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
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
    await expect(page.getByLabel('Correo', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await page.getByLabel('Recordarme', { exact: true }).uncheck();
    await expect(
      page.getByLabel('Recordarme', { exact: true }),
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
