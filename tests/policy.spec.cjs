const { test, expect } = require('./support/fixtures.cjs');

// Simula la política del servidor: vigente, historial y publicación de nuevas versiones.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function mockPolicyApi(page, { empty = false } = {}) {
  const versions = empty
    ? []
    : [
        {
          id: 'p1', version: 1, active: true, timezone: 'America/Guayaquil', reason: 'Politica comercial base',
          createdAt: '2026-11-16T15:00:00.000Z', taxRate: '0.1500', taxIncluded: false, pickupFee: '1.50',
          deliveryFee: '1.50', pricePerPound: '0.8000', cutoffMinutes: 120, lateCancellationFee: '3.00',
          noShowFee: '3.00', failedPickupFee: '3.00', minimumOrderAmount: '5.00', driverLimit: null,
          kycMaxResubmissions: 3, handoffMaxAttempts: 3, handoffTtlMinutes: 60, pointsPerCurrencyUnit: '1.00',
          walletTopUpMin: '5.00', walletTopUpMax: '500.00', blockNewOrdersOnCharges: false,
          enforceDriverLimit: false, driverMayReorder: false, requireStorePickupSlot: false,
        },
      ];
  const posts = [];
  const json = (route, status, body) =>
    route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  // El resto de Configuración (sedes y franjas) responde vacío.
  await page.route(/\/api\/v1\/(facilities|slots|slot-templates)(\?.*)?$/, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: preflight })
      : json(route, 200, []),
  );
  await page.route(/\/api\/v1\/policy(\/history)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    if (req.method() === 'GET') {
      if (req.url().endsWith('/history')) return json(route, 200, [...versions].reverse());
      const active = versions.find((v) => v.active);
      return active
        ? json(route, 200, active)
        : json(route, 404, { message: 'No hay política configurada.' });
    }
    const body = req.postDataJSON();
    posts.push(body);
    versions.forEach((v) => (v.active = false));
    const created = {
      ...body,
      id: `p${versions.length + 1}`,
      version: versions.length + 1,
      active: true,
      createdAt: new Date().toISOString(),
    };
    versions.push(created);
    return json(route, 201, created);
  });
  return posts;
}

const openSettings = (page) => page.goto('/settings', { waitUntil: 'domcontentloaded' });
const historyRows = (page) =>
  page.getByRole('table', { name: 'Historial de la política de negocio' }).locator('tbody tr');

test('muestra la política vigente con el IVA en porcentaje y su historial', async ({ page }) => {
  await mockPolicyApi(page);
  await openSettings(page);
  await expect(page.getByText(/Vigente: versión 1/)).toBeVisible();
  await expect(page.getByLabel('IVA (%)', { exact: true })).toHaveValue('15');
  await expect(page.getByLabel('Cargo de recogida ($)', { exact: true })).toHaveValue('1.5');
  await expect(
    page.getByLabel('Anticipación para cambios y cancelaciones (minutos)', { exact: true }),
  ).toHaveValue('120');
  await expect(historyRows(page)).toHaveCount(1);
  await expect(historyRows(page).first()).toContainText('Vigente');
});

test('publicar valida los datos y crea una versión nueva en el servidor', async ({ page }) => {
  const posts = await mockPolicyApi(page);
  await openSettings(page);
  await page.getByLabel('IVA (%)', { exact: true }).fill('150');
  await page.getByLabel('Cargo de entrega a domicilio ($)', { exact: true }).fill('2.555');
  await page.getByLabel('Recarga mínima de billetera ($)', { exact: true }).fill('600');
  await page.getByRole('checkbox', { name: 'Aplicar el límite de carga del chofer' }).check();
  await page.getByRole('button', { name: 'Publicar nueva versión' }).click();
  await expect(page.getByText('El IVA no puede superar el 100 %.')).toBeVisible();
  await expect(page.getByText('Usa hasta 2 decimales.')).toBeVisible();
  await expect(page.getByText('La recarga máxima no puede ser menor que la mínima.')).toBeVisible();
  await expect(page.getByText('Define el límite para poder exigirlo.')).toBeVisible();
  await expect(page.getByText('Explica el motivo del cambio.')).toBeVisible();
  expect(posts).toEqual([]);

  await page.getByLabel('IVA (%)', { exact: true }).fill('12');
  await page.getByLabel('Cargo de entrega a domicilio ($)', { exact: true }).fill('2.50');
  await page.getByLabel('Recarga mínima de billetera ($)', { exact: true }).fill('10');
  await page.getByLabel('Límite de carga por chofer (solicitudes)', { exact: true }).fill('6');
  await page.getByLabel('Motivo del cambio', { exact: true }).fill('Nueva tarifa de entrega');
  await page.getByRole('button', { name: 'Publicar nueva versión' }).click();
  await expect(page.getByText('Política publicada: versión 2')).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({
    timezone: 'America/Guayaquil',
    reason: 'Nueva tarifa de entrega',
    taxRate: 0.12,
    deliveryFee: 2.5,
    pickupFee: 1.5,
    walletTopUpMin: 10,
    walletTopUpMax: 500,
    driverLimit: 6,
    enforceDriverLimit: true,
    taxIncluded: false,
    // Se conserva el valor que el formulario no muestra.
    pricePerPound: 0.8,
  });
  await expect(page.getByText(/Vigente: versión 2/)).toBeVisible();
  await expect(page.getByLabel('Motivo del cambio', { exact: true })).toHaveValue('');
  await expect(historyRows(page)).toHaveCount(2);
});

test('sin política publicada se avisa y se puede publicar la primera', async ({ page }) => {
  const posts = await mockPolicyApi(page, { empty: true });
  await openSettings(page);
  await expect(page.getByText(/Todavía no hay una política publicada/)).toBeVisible();
  await expect(page.getByLabel('Zona horaria', { exact: true })).toHaveValue('America/Guayaquil');
  await page.getByLabel('Zona horaria', { exact: true }).fill('Marte/Base');
  await page.getByLabel('Motivo del cambio', { exact: true }).fill('Inicio de operación');
  await page.getByRole('button', { name: 'Publicar política' }).click();
  await expect(page.getByText('Zona horaria inválida. Ej: America/Guayaquil.')).toBeVisible();
  await page.getByLabel('Zona horaria', { exact: true }).fill('America/Guayaquil');
  await page.getByLabel('IVA (%)', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Publicar política' }).click();
  await expect(page.getByText('Política publicada: versión 1')).toBeVisible();
  expect(posts[0]).toEqual({
    timezone: 'America/Guayaquil',
    reason: 'Inicio de operación',
    taxRate: 0.15,
    taxIncluded: false,
    blockNewOrdersOnCharges: false,
    enforceDriverLimit: false,
    driverMayReorder: false,
    requireStorePickupSlot: false,
  });
  // Faltan los cargos: se advierte que no se pueden crear solicitudes.
  await expect(page.getByText(/Falta configurar: Cargo de recogida, Cargo de entrega/)).toBeVisible();
});
