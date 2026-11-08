const { test, expect } = require('./support/fixtures.cjs');

// Estas pruebas abren la aplicación sin sesión y simulan solo la API de autenticación.
test.use({ signedIn: false });

const submit = (page) =>
  page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();

test('login arranca vacío, sin presets de demostración ni credenciales precargadas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Acceso a la plataforma' }),
  ).toBeVisible();
  await expect(page.locator('input[type="email"]')).toHaveValue('');
  await expect(page.locator('input[type="password"]')).toHaveValue('');
  await expect(page.getByText(/demostración|demo/i)).toHaveCount(0);
  await expect(page.getByText('Carlos Mendoza')).toHaveCount(0);
  await expect(page.getByText('Elena Rostova')).toHaveCount(0);
});

test('un acceso válido entra al panel y cerrar sesión devuelve al login', async ({
  page,
}) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('admin@laundryweb.com');
  await page.locator('input[type="password"]').fill('una-clave-valida-1');
  await submit(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.locator('#app-sidebar').getByText('Administrador', { exact: true }),
  ).toBeVisible();
  await page
    .locator('#app-sidebar')
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  // Sin sesión no se entra a rutas internas.
  await page.goto('/operations/orders', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login$/);
});

test('credenciales incorrectas muestran el error y no abren el panel', async ({
  page,
}) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('admin@laundryweb.com');
  await page.locator('input[type="password"]').fill('incorrecta');
  await submit(page);
  await expect(page.getByRole('alert')).toContainText(
    'Correo o contraseña incorrectos.',
  );
  await expect(page).toHaveURL(/\/login$/);
});

test('una contraseña temporal obliga a definir una nueva antes de entrar', async ({
  page,
}) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('temporal@laundryweb.com');
  await page.locator('input[type="password"]').fill('temporal-1234567');
  await submit(page);
  await expect(
    page.getByRole('heading', { name: 'Define tu contraseña' }),
  ).toBeVisible();
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('corta1');
  await page.getByLabel('Confirma la contraseña', { exact: true }).fill('corta1');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(page.getByRole('alert')).toContainText('entre 10 y 72');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('nueva-clave-segura1');
  await page.getByLabel('Confirma la contraseña', { exact: true }).fill('otra-clave-segura1');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(page.getByRole('alert')).toContainText('no coinciden');
  await page.getByLabel('Confirma la contraseña', { exact: true }).fill('nueva-clave-segura1');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('una cuenta que no es de la plataforma web es rechazada', async ({
  page,
}) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill('cliente@laundryweb.com');
  await page.locator('input[type="password"]').fill('una-clave-valida-1');
  await submit(page);
  await expect(page.getByRole('alert')).toContainText('no tiene acceso');
  await expect(page).toHaveURL(/\/login$/);
});

test('el login mantiene todos los campos usables sin desbordes en móvil y tableta', async ({
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
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
  }
});
