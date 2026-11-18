const { test, expect } = require('./support/fixtures.cjs');

// "Recepción y retiros" es la entrada del mostrador: lista desde el servidor las solicitudes que
// esperan un traspaso en la sede y abre su detalle, donde se valida el código.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ORDER = 'SOL-HOME-001';
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';

const summary = (id, number, status, name) => ({
  id,
  number,
  status,
  mode: 'HOME_HOME',
  facilityId: 'f1',
  paymentStatus: 'PAID',
  pricingStatus: 'ESTIMATED',
  total: '12.50',
  version: 6,
  createdAt: new Date().toISOString(),
  customer: { id: `c-${number}`, user: { name } },
});

async function mockServer(page) {
  const order = { ...summary(ORDER, 1001, 'HEADING_TO_FACILITY', 'Ana Torres'), items: [], legs: [], events: [] };
  const queues = {
    HEADING_TO_FACILITY: [summary(ORDER, 1001, 'HEADING_TO_FACILITY', 'Ana Torres')],
    DELIVERY_ASSIGNED: [summary('o-2', 1002, 'DELIVERY_ASSIGNED', 'Luis Mora')],
    READY_FOR_PICKUP: [],
  };
  const json = (route, status, body) =>
    route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route(/\/api\/v1\/(orders|facilities)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/facilities') return json(route, 200, [{ id: 'f1', name: 'Sede Norte', address: 'Av. 1' }]);
    if (path === '/orders') {
      const data = queues[url.searchParams.get('status')] ?? [];
      return json(route, 200, { page: 1, pageSize: 100, total: data.length, data });
    }
    if (path === `/orders/${ORDER}`) return json(route, 200, order);
    return json(route, 200, []);
  });
}

test('la cola muestra las solicitudes del servidor por etapa y no verifica nada por su cuenta', async ({ page }) => {
  await mockServer(page);
  await page.goto('/operations/handoffs', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Recepción y retiros', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Llegan a planta' })).toContainText('SOL-1001');
  await expect(page.getByRole('region', { name: 'Llegan a planta' })).toContainText('Ana Torres');
  await expect(page.getByRole('region', { name: 'Salen a reparto' })).toContainText('SOL-1002');
  await expect(page.getByRole('region', { name: 'Retiro en sede' })).toContainText('No hay solicitudes en esta etapa.');
  // La confirmación del traspaso solo existe en el detalle de la solicitud.
  await expect(page.getByRole('button', { name: /Confirmar transferencia|Verificar código/ })).toHaveCount(0);
});

test('un QR abre la solicitud con el código ya cargado en su panel', async ({ page }) => {
  await mockServer(page);
  await page.goto('/operations/handoffs', { waitUntil: 'domcontentloaded' });
  const scan = page.getByRole('textbox', { name: 'QR o código de 6 dígitos' });
  // Un QR que valida el chofer en su app no corresponde al mostrador.
  await scan.fill(`LDH1:${ORDER}:CUSTOMER_TO_DRIVER:${TOKEN}`);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Este QR no es de un traspaso en la sede: lo valida el chofer en su app.')).toBeVisible();
  await scan.fill('hola');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText(/No es un código válido/)).toBeVisible();

  const qr = `LDH1:${ORDER}:DRIVER_TO_FACILITY:${TOKEN}`;
  await scan.fill(qr);
  await scan.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/operations/orders/${ORDER}\\?custodia=`));
  const panel = page.getByRole('region', { name: 'Recepción en planta' });
  await expect(panel.getByRole('textbox', { name: 'Código del chofer' })).toHaveValue(qr);
  await expect(panel.getByText('QR del chofer leído')).toBeVisible();
});

test('con el código de 6 dígitos se elige la solicitud y el código llega al detalle', async ({ page }) => {
  await mockServer(page);
  await page.goto('/operations/handoffs', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'QR o código de 6 dígitos' }).fill('482910');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Código 482910 listo' })).toBeVisible();
  await page.getByRole('button', { name: 'Validar SOL-1001', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/operations/orders/${ORDER}\\?custodia=482910`));
  const panel = page.getByRole('region', { name: 'Recepción en planta' });
  await expect(panel.getByRole('textbox', { name: 'Código del chofer' })).toHaveValue('482910');
});

test('en móvil la pantalla no se desborda', async ({ page }) => {
  await mockServer(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/operations/handoffs', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: 'Llegan a planta' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
