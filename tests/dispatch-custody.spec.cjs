const { test, expect } = require('./support/fixtures.cjs');

// Salida a reparto, retiro en sede y cierre contra un servidor simulado.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ORDER = 'SOL-HOME-001';
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';

async function mockServer(page, { status, mode = 'HOME_HOME', amountDue = '0', verifyError } = {}) {
  const state = {
    order: {
      id: ORDER, number: 1001, status, mode, facilityId: 'f1', paymentStatus: amountDue === '0' ? 'PAID' : 'PENDING',
      pricingStatus: 'FINAL', pricingModel: 'FIXED', total: '22.00', amountPaid: '22.00', amountDue,
      itemsSubtotal: '15', discount: '0', extrasTotal: '0', logisticsFee: '5', tax: '2',
      version: 20, createdAt: new Date().toISOString(), items: [], legs: [], events: [],
    },
  };
  const calls = [];
  const json = (route, code, body) =>
    route.fulfill({ status: code, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  const bump = (patch) => (state.order = { ...state.order, ...patch, version: state.order.version + 1 });
  await page.route(/\/api\/v1\/orders(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    const body = req.method() === 'GET' ? undefined : req.postDataJSON();
    if (req.method() !== 'GET') calls.push([path.replace(`/orders/${ORDER}`, ''), body]);
    if (path === `/orders/${ORDER}/handoffs/verify`) {
      if (verifyError) return json(route, verifyError.status, { message: verifyError.message });
      return json(route, 201, bump({ status: body.type === 'FACILITY_TO_DRIVER' ? 'OUT_FOR_DELIVERY' : 'DELIVERED' }));
    }
    if (path === `/orders/${ORDER}/complete`) return json(route, 201, bump({ status: 'COMPLETED' }));
    if (path === `/orders/${ORDER}`) return json(route, 200, state.order);
    return json(route, 200, []);
  });
  return calls;
}
const open = (page) => page.goto(`/operations/orders/${ORDER}`, { waitUntil: 'domcontentloaded' });

test('la sede valida el código del chofer para la salida a reparto', async ({ page }) => {
  const calls = await mockServer(page, { status: 'DELIVERY_ASSIGNED' });
  await open(page);
  const panel = page.getByRole('region', { name: 'Entrega al chofer para reparto' });
  await panel.getByRole('button', { name: 'Confirmar salida a reparto', exact: true }).click();
  await expect(panel.getByText('Escribe el código de 6 dígitos del chofer o escanea su QR.')).toBeVisible();
  await panel.getByRole('textbox', { name: 'Código del chofer' }).fill(`LDH1:${ORDER}:FACILITY_TO_DRIVER:${TOKEN}`);
  await expect(panel.getByText('QR leído')).toBeVisible();
  await panel.getByRole('button', { name: 'Confirmar salida a reparto', exact: true }).click();
  await expect(page.getByRole('status').getByText('El chofer salió a entregar la ropa', { exact: true })).toBeVisible();
  expect(calls).toEqual([
    ['/handoffs/verify', { type: 'FACILITY_TO_DRIVER', expectedVersion: 20, qrToken: TOKEN }],
  ]);
  await expect(panel).toHaveCount(0);
});

test('retiro en sede: exige el código del cliente y quién retira', async ({ page }) => {
  const calls = await mockServer(page, { status: 'READY_FOR_PICKUP', mode: 'HOME_STORE' });
  await open(page);
  const panel = page.getByRole('region', { name: 'Retiro en sede' });
  await panel.getByRole('button', { name: 'Confirmar retiro', exact: true }).click();
  await expect(panel.getByText('Escribe el código de 6 dígitos del cliente o escanea su QR.')).toBeVisible();
  await expect(panel.getByText('Escribe el nombre de quien retira.')).toBeVisible();
  await expect(panel.getByText('Indica la relación con el cliente.')).toBeVisible();
  expect(calls).toEqual([]);
  await panel.getByRole('textbox', { name: 'Código del cliente' }).fill('482910');
  await panel.getByRole('textbox', { name: 'Quién retira' }).fill('Ana Torres');
  await panel.getByRole('textbox', { name: 'Relación con el cliente' }).fill('Familiar');
  await panel.getByRole('button', { name: 'Confirmar retiro', exact: true }).click();
  await expect(page.getByRole('status').getByText('Ropa entregada al cliente', { exact: true })).toBeVisible();
  expect(calls).toEqual([
    [
      '/handoffs/verify',
      { type: 'FACILITY_TO_CUSTOMER', expectedVersion: 20, recipientName: 'Ana Torres', recipientRelationship: 'Familiar', code: '482910' },
    ],
  ]);
});

test('una solicitud entregada se cierra solo sin saldo pendiente', async ({ page }) => {
  let calls = await mockServer(page, { status: 'DELIVERED', amountDue: '5.34' });
  await open(page);
  const panel = page.getByRole('region', { name: 'Cierre de la solicitud' });
  await expect(panel).toContainText('Queda un saldo de $5.34');
  await expect(panel.getByRole('button', { name: 'Cerrar solicitud', exact: true })).toHaveCount(0);

  await page.unroute(/\/api\/v1\/orders(\/[^?]*)?(\?.*)?$/);
  calls = await mockServer(page, { status: 'DELIVERED' });
  await open(page);
  await panel.getByRole('button', { name: 'Cerrar solicitud', exact: true }).click();
  await expect(page.getByRole('status').getByText('Solicitud cerrada', { exact: true })).toBeVisible();
  expect(calls).toEqual([['/complete', { expectedVersion: 20 }]]);
});

test('el mensaje del servidor sobre el código se muestra en el formulario', async ({ page }) => {
  await mockServer(page, { status: 'DELIVERY_ASSIGNED', verifyError: { status: 410, message: 'El código venció; solicita uno nuevo.' } });
  await open(page);
  const panel = page.getByRole('region', { name: 'Entrega al chofer para reparto' });
  await panel.getByRole('textbox', { name: 'Código del chofer' }).fill('111111');
  await panel.getByRole('button', { name: 'Confirmar salida a reparto', exact: true }).click();
  await expect(panel.getByText('El código venció; solicita uno nuevo.')).toBeVisible();
});

// R-HO-1: el código elegido en otra columna de "Recepción y retiros" no se usa aquí.
test('un código traído para otra etapa se descarta y se pide el de esta etapa', async ({ page }) => {
  const calls = await mockServer(page, { status: 'DELIVERY_ASSIGNED' });
  await page.goto(`/operations/orders/${ORDER}?custodia=482910&traspaso=FACILITY_TO_CUSTOMER`, {
    waitUntil: 'domcontentloaded',
  });
  const panel = page.getByRole('region', { name: 'Entrega al chofer para reparto' });
  await expect(panel.getByRole('textbox', { name: 'Código del chofer' })).toHaveValue('');
  await expect(panel.getByText(/era para otra etapa/)).toBeVisible();
  await expect(page).toHaveURL((url) => url.search === '');
  expect(calls).toEqual([]);
});

test('el código traído para esta etapa queda cargado y la URL se limpia', async ({ page }) => {
  await mockServer(page, { status: 'DELIVERY_ASSIGNED' });
  await page.goto(`/operations/orders/${ORDER}?custodia=482910&traspaso=FACILITY_TO_DRIVER`, {
    waitUntil: 'domcontentloaded',
  });
  const panel = page.getByRole('region', { name: 'Entrega al chofer para reparto' });
  await expect(panel.getByRole('textbox', { name: 'Código del chofer' })).toHaveValue('482910');
  await expect(page).toHaveURL((url) => url.search === '');
});

test('con el traspaso bloqueado (423) se pide un código nuevo al cliente', async ({ page }) => {
  await mockServer(page, {
    status: 'READY_FOR_PICKUP',
    mode: 'HOME_STORE',
    verifyError: { status: 423, message: 'Código incorrecto. El traspaso quedó bloqueado.' },
  });
  await open(page);
  const panel = page.getByRole('region', { name: 'Retiro en sede' });
  await panel.getByRole('textbox', { name: 'Código del cliente' }).fill('111111');
  await panel.getByRole('textbox', { name: 'Quién retira' }).fill('Ana Torres');
  await panel.getByRole('textbox', { name: 'Relación con el cliente' }).fill('Titular');
  await panel.getByRole('button', { name: 'Confirmar retiro', exact: true }).click();
  await expect(
    panel.getByText('Código incorrecto. El traspaso quedó bloqueado. Pide al cliente que genere un código nuevo en su app.'),
  ).toBeVisible();
});

// T-12: el campo de código y el lector QR son los mismos en todos los paneles de custodia.
test('el campo de código compartido permite descartar un QR leído y avisa si no hay cámara', async ({ page }) => {
  await mockServer(page, { status: 'DELIVERY_ASSIGNED' });
  await open(page);
  const panel = page.getByRole('region', { name: 'Entrega al chofer para reparto' });
  const field = panel.getByRole('textbox', { name: 'Código del chofer' });
  await field.fill(`LDH1:${ORDER}:FACILITY_TO_DRIVER:${TOKEN}`);
  await expect(panel.getByText('QR leído')).toBeVisible();
  await panel.getByRole('button', { name: 'Usar otro código' }).click();
  await expect(field).toHaveValue('');
  await expect(panel.getByRole('button', { name: 'Usar otro código' })).toHaveCount(0);

  // El navegador de prueba no tiene cámara: se avisa en el campo y el botón vuelve a su estado.
  await panel.getByRole('button', { name: 'Escanear QR' }).click();
  await expect(panel.getByText('No se pudo abrir la cámara. Escribe el código o usa el lector de QR.')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Escanear QR' })).toBeVisible();
});
