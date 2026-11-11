const { test, expect } = require('./support/fixtures.cjs');

// Estas pruebas simulan la API de verificación de identidad; el producto no trae datos.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const cors = { 'access-control-allow-origin': '*' };

const request = (id, name, status, extra = {}) => ({
  id,
  kycStatus: status,
  kycDocumentType: 'CEDULA',
  kycDocumentNumber: '0912345675',
  kycSubmissions: 1,
  kycRejectionReason: null,
  kycReviewedAt: null,
  updatedAt: '2026-11-10T14:00:00.000Z',
  user: {
    name,
    email: `${name.split(' ')[0].toLowerCase()}@correo.test`,
    phone: '+593991234567',
    createdAt: '2026-11-10T13:00:00.000Z',
  },
  ...extra,
});

const DOCUMENTS = ['SELFIE', 'ID_FRONT', 'ID_BACK'].map((type) => ({
  type,
  mimeType: 'image/png',
  sizeBytes: PIXEL_PNG.length,
  createdAt: '2026-11-10T14:00:00.000Z',
}));

// API de KYC con estado en memoria: aprobar o rechazar mueve la solicitud de lista.
async function mockKycApi(page, { failList = false } = {}) {
  const state = {
    PENDING: [request('c-ana', 'Ana Pérez', 'PENDING'), request('c-luis', 'Luis Mora', 'PENDING')],
    APPROVED: [request('c-eva', 'Eva Soto', 'APPROVED')],
    REJECTED: [
      request('c-rita', 'Rita Paz', 'REJECTED', { kycRejectionReason: 'Foto borrosa' }),
    ],
  };
  const calls = { reviews: [], documents: [], lists: 0 };
  await page.route('**/api/v1/kyc**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const json = (status, body) =>
      route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (path === '/kyc' && req.method() === 'GET') {
      calls.lists += 1;
      if (failList) return json(500, { message: 'Error interno del servidor.' });
      return json(200, state[url.searchParams.get('status')] ?? []);
    }
    const doc = path.match(/^\/kyc\/([^/]+)\/documents\/(\w+)$/);
    if (doc) {
      calls.documents.push(`${doc[1]}:${doc[2]}`);
      return route.fulfill({ status: 200, headers: { ...cors, 'cache-control': 'no-store' }, contentType: 'image/png', body: PIXEL_PNG });
    }
    const review = path.match(/^\/kyc\/([^/]+)\/review$/);
    if (review && req.method() === 'POST') {
      const body = req.postDataJSON();
      calls.reviews.push({ id: review[1], ...body });
      const from = ['PENDING', 'APPROVED', 'REJECTED'].find((s) => state[s].some((r) => r.id === review[1]));
      const item = state[from].find((r) => r.id === review[1]);
      state[from] = state[from].filter((r) => r.id !== review[1]);
      const to = body.approve ? 'APPROVED' : 'REJECTED';
      state[to].push({ ...item, kycStatus: to, kycRejectionReason: body.reason ?? null });
      return json(201, { customerId: review[1], status: to });
    }
    const one = path.match(/^\/kyc\/([^/]+)$/);
    if (one) {
      const item = Object.values(state).flat().find((r) => r.id === one[1]);
      return item ? json(200, { ...item, documents: DOCUMENTS }) : json(404, { message: 'Verificación no encontrada.' });
    }
    return json(404, { message: 'No encontrado.' });
  });
  return calls;
}

test('el administrador ve la cola, las tres imágenes y los datos declarados', async ({ page }) => {
  await mockKycApi(page);
  await page.goto('/customers/kyc', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /Ana Pérez/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Luis Mora/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Pendientes (2)' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Aprobadas (1)' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Rechazadas (1)' })).toBeVisible();

  await page.getByRole('button', { name: /Ana Pérez/ }).click();
  for (const title of ['Selfie de verificación facial', 'Cédula, lado frontal', 'Cédula, lado posterior']) {
    const image = page.getByRole('img', { name: title });
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('src', /^blob:/);
  }
  await expect(page.getByText('0912345675').first()).toBeVisible();
  await expect(page.getByText('ana@correo.test')).toBeVisible();
  // Nada inventado: no hay métricas fijas ni datos de otros módulos.
  await expect(page.getByText(/3\.5 min|Liveness OK/)).toHaveCount(0);
});

test('aprobar exige completar el checklist y mueve al cliente a aprobadas', async ({ page }) => {
  const calls = await mockKycApi(page);
  await page.goto('/customers/kyc', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Ana Pérez/ }).click();
  const approve = page.getByRole('button', { name: 'Aprobar verificación' });
  await expect(approve).toBeDisabled();
  for (const check of await page.getByRole('checkbox').all()) await check.check();
  await expect(approve).toBeEnabled();
  await approve.click();
  await expect(page.getByRole('tab', { name: 'Pendientes (1)' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Aprobadas (2)' })).toBeVisible();
  expect(calls.reviews).toEqual([{ id: 'c-ana', approve: true }]);
});

test('rechazar exige un motivo y lo envía al servidor', async ({ page }) => {
  const calls = await mockKycApi(page);
  await page.goto('/customers/kyc', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Luis Mora/ }).click();
  await page.getByRole('button', { name: /Rechazar \(motivo obligatorio\)/ }).click();
  const confirm = page.getByRole('button', { name: 'Confirmar rechazo' });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Motivo del rechazo *').fill('   ');
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Motivo del rechazo *').fill('La cédula está cortada');
  await confirm.click();
  await expect(page.getByRole('tab', { name: 'Rechazadas (2)' })).toBeVisible();
  expect(calls.reviews).toEqual([
    { id: 'c-luis', approve: false, reason: 'La cédula está cortada' },
  ]);
});

test('una solicitud rechazada muestra su motivo y no ofrece decidir otra vez', async ({ page }) => {
  await mockKycApi(page);
  await page.goto('/customers/kyc', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /Rechazadas/ }).click();
  await page.getByRole('button', { name: /Rita Paz/ }).click();
  await expect(page.getByText('Foto borrosa')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprobar verificación' })).toHaveCount(0);
});

test('un error al cargar la cola se informa y permite reintentar', async ({ page }) => {
  await mockKycApi(page, { failList: true });
  await page.goto('/customers/kyc', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('alert').filter({ hasText: 'Error interno del servidor.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});

test('la insignia del menú cuenta las verificaciones pendientes reales', async ({ page }) => {
  await mockKycApi(page);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const sidebar = page.locator('#app-sidebar');
  await sidebar.getByRole('button', { name: 'CLIENTES', exact: true }).click();
  await expect(sidebar.getByRole('link', { name: /^Validaciones KYC/ })).toContainText('2');
});

test.describe('Supervisor', () => {
  test.use({ role: 'SUPERVISOR' });
  test('no accede a la revisión ni consulta documentos', async ({ page }) => {
    const calls = await mockKycApi(page);
    await page.goto('/customers/kyc', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Acceso No Autorizado')).toBeVisible();
    expect(calls.lists).toBe(0);
    expect(calls.documents).toEqual([]);
  });
});

const directoryEntry = (id, name, plan) => ({
  id,
  name,
  email: `${name.split(' ')[0].toLowerCase()}@correo.test`,
  phone: '+593991234567',
  kycStatus: 'APPROVED',
  membershipPlan: plan,
  kycDocumentType: 'CEDULA',
  kycDocumentNumber: '0912345675',
  kycRejectionReason: null,
  kycReviewedAt: '2026-11-10T14:00:00.000Z',
  addresses: [],
  totalOrders: 0,
  createdAt: '2026-11-10T13:00:00.000Z',
});

test('el directorio muestra solo lo que entrega el servidor y no inventa membresías', async ({ page }) => {
  await page.route('**/api/v1/customers', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
      : route.fulfill({
          status: 200,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify([
            directoryEntry('c-eva', 'Eva Soto', null),
            directoryEntry('c-leo', 'Leo Cruz', { id: 'p-1', name: 'Plan Mensual' }),
          ]),
        }),
  );
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: 'Eva Soto' })).toContainText('Sin membresía');
  await expect(rows.filter({ hasText: 'Leo Cruz' })).toContainText('Plan Mensual');
  await expect(page.getByText('María Torres')).toHaveCount(0);
  await expect(page.getByText(/ESTANDAR|PREMIUM/i)).toHaveCount(0);

  await page.locator('select').selectOption('NONE');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Eva Soto');
});
