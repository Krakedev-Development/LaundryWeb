const { test, expect } = require('./support/fixtures.cjs');

// Incidencias contra el servidor: la lista, la resolución que libera la solicitud y el registro
// desde el detalle salen de /incidents; nada se resuelve solo en el navegador.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ORDER = 'SOL-HOME-001';

const json = (route, status, body) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

const held = () => ({
  id: 'inc-held',
  orderId: ORDER,
  driverId: null,
  type: 'PRENDA_DANADA',
  severity: 'HIGH',
  status: 'OPEN',
  description: 'Camisa con rotura en la manga',
  previousStatus: 'IN_PROCESS',
  evidenceRefs: [],
  createdAt: '2026-11-19T15:00:00.000Z',
});
const failedPickup = () => ({
  id: 'inc-pickup',
  orderId: ORDER,
  driverId: 'driver-1',
  type: 'FAILED_PICKUP',
  severity: 'MEDIUM',
  status: 'OPEN',
  description: 'Cliente ausente: tocó el timbre 3 veces',
  previousStatus: 'CONFIRMED',
  evidenceRefs: [],
  createdAt: '2026-11-19T14:00:00.000Z',
});

/** Simula /incidents. `mode.list` decide la respuesta del listado; los POST se registran. */
async function mockIncidents(page, rows, mode = { list: 'ok' }) {
  const calls = [];
  await page.route(/\/api\/v1\/incidents(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (req.method() === 'GET') {
      if (mode.list === 'fail') return json(route, 500, { message: 'Base de datos no disponible.' });
      return json(route, 200, rows);
    }
    const body = req.postDataJSON();
    calls.push([req.method(), path, body]);
    if (path === '/incidents') {
      if (mode.create === 'reject')
        return json(route, 409, { message: 'Un pedido en DELIVERED no puede retenerse.' });
      const created = {
        ...body,
        id: 'inc-new',
        status: 'OPEN',
        previousStatus: body.holdOrder ? 'QUALITY_CONTROL' : null,
        evidenceRefs: [],
        createdAt: new Date().toISOString(),
      };
      rows.unshift(created);
      return json(route, 201, created);
    }
    const match = path.match(/^\/incidents\/([^/]+)\/status$/);
    const row = match && rows.find((r) => r.id === match[1]);
    if (!row) return json(route, 404, { message: 'La incidencia no existe.' });
    Object.assign(row, {
      status: body.status,
      resolution: body.resolution ?? row.resolution,
      resolvedAt: body.status === 'RESOLVED' ? new Date().toISOString() : row.resolvedAt,
    });
    return json(route, 201, row);
  });
  return calls;
}

async function orderRef(page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  return page.evaluate((id) => {
    const raw = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    const o = (raw.orders || []).find((x) => x.id === id);
    return { tracking: o?.trackingNumber || id, customer: o?.customerName };
  }, ORDER);
}

test('las incidencias salen del servidor y resolver una retención libera la solicitud', async ({ page }) => {
  const ref = await orderRef(page);
  const calls = await mockIncidents(page, [held(), failedPickup()]);
  await page.goto('/operations/incidents');

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText(ref.tracking);
  await expect(rows.first()).toContainText('Prenda dañada');
  await expect(rows.nth(1)).toContainText('Recogida fallida');
  await expect(page.locator('#app-sidebar').getByRole('link', { name: /^Incidencias/ })).toContainText('2');

  // La recogida fallida reportada por el chofer se resuelve desde el detalle de la solicitud.
  await rows.nth(1).getByRole('button', { name: 'Gestionar' }).click();
  let modal = page.getByRole('dialog');
  await expect(modal).toContainText('Reportada por el chofer');
  await expect(modal).toContainText('se resuelve desde el detalle de la solicitud');
  await expect(modal.getByRole('button', { name: 'Resolver incidencia' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await rows.first().getByRole('button', { name: 'Gestionar' }).click();
  modal = page.getByRole('dialog');
  await expect(modal.getByRole('heading', { name: new RegExp(`Incidencia en ${ref.tracking}`) })).toBeVisible();
  await expect(modal).toContainText('Retenida. Al resolver vuelve a: En ciclo de lavado y tratamiento.');
  await modal.getByRole('button', { name: 'Resolver incidencia' }).click();
  await expect(modal.getByRole('button', { name: 'Confirmar resolución' })).toBeDisabled();
  await modal.getByLabel('Resolución del caso').fill('Cliente aceptó el arreglo de la manga');
  await modal.getByRole('button', { name: 'Confirmar resolución' }).click();

  await expect(page.getByText(/vuelve a: En ciclo de lavado y tratamiento/).first()).toBeVisible();
  expect(calls).toEqual([
    ['POST', '/incidents/inc-held/status', { status: 'RESOLVED', resolution: 'Cliente aceptó el arreglo de la manga' }],
  ]);
  await expect(modal).toContainText('Liberada. Volvió a: En ciclo de lavado y tratamiento.');
  await expect(modal.getByRole('button', { name: 'Cerrar caso' })).toBeVisible();
  await expect(page.locator('#app-sidebar').getByRole('link', { name: /^Incidencias/ })).toContainText('1');
});

test('si el servidor falla se muestra el error y no datos locales', async ({ page }) => {
  const mode = { list: 'fail' };
  await mockIncidents(page, [held()], mode);
  await page.goto('/operations/incidents');
  const alert = page.getByRole('alert').filter({ hasText: 'No se pudieron cargar las incidencias' });
  await expect(alert).toContainText('Base de datos no disponible.');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  mode.list = 'ok';
  await alert.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(alert).toHaveCount(0);
});

test('el detalle registra la incidencia en el servidor y puede retener la solicitud', async ({ page }) => {
  const mode = { list: 'ok', create: 'reject' };
  const calls = await mockIncidents(page, [], mode);
  await page.goto(`/operations/orders/${ORDER}`);
  await page.getByRole('button', { name: /^Actividad/ }).click();
  await page.getByRole('button', { name: '+ Registrar' }).click();

  const modal = page.getByRole('dialog', { name: 'Registrar incidencia operacional' });
  await modal.getByLabel('Tipo de incidencia *').selectOption('PERDIDA_PARCIAL');
  await modal.getByLabel('Severidad *').selectOption('HIGH');
  await modal.getByLabel('Descripción del caso *').fill('Faltan 2 prendas frente a lo declarado');
  await modal.getByRole('checkbox', { name: /Retener la solicitud/ }).check();

  // El rechazo del servidor se muestra y el formulario sigue abierto.
  await modal.getByRole('button', { name: 'Abrir incidencia' }).click();
  await expect(modal.getByRole('alert')).toHaveText('Un pedido en DELIVERED no puede retenerse.');

  mode.create = 'ok';
  await modal.getByRole('button', { name: 'Abrir incidencia' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText(/queda retenida hasta resolver la incidencia/)).toBeVisible();
  const expected = {
    orderId: ORDER,
    type: 'PERDIDA_PARCIAL',
    severity: 'HIGH',
    description: 'Faltan 2 prendas frente a lo declarado',
    holdOrder: true,
  };
  expect(calls).toEqual([
    ['POST', '/incidents', expected],
    ['POST', '/incidents', expected],
  ]);
  // La incidencia nueva aparece en la actividad de la solicitud.
  await expect(page.getByText('Faltan 2 prendas frente a lo declarado')).toBeVisible();
  await expect(page.getByText('Abierta · Solicitud retenida')).toBeVisible();
});
