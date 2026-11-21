const { test, expect } = require('./support/fixtures.cjs');

// Llegada a planta: la sede valida el código del chofer contra el servidor.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ORDER = 'SOL-HOME-001';
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';

async function mockServer(page, { verifyError, handoffsFailures = 0, conflictOnce = false } = {}) {
  let handoffsLeftToFail = handoffsFailures;
  let conflictPending = conflictOnce;
  const state = {
    order: {
      id: ORDER,
      number: 1001,
      status: 'HEADING_TO_FACILITY',
      mode: 'HOME_HOME',
      facilityId: 'f1',
      paymentStatus: 'PAID',
      pricingStatus: 'ESTIMATED',
      total: '12.50',
      version: 6,
      createdAt: new Date().toISOString(),
      items: [],
      legs: [],
      events: [],
    },
  };
  const verifications = [];
  const json = (route, status, body) =>
    route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route(/\/api\/v1\/orders(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path === `/orders/${ORDER}/handoffs` && req.method() === 'GET' && handoffsLeftToFail > 0) {
      handoffsLeftToFail -= 1;
      return json(route, 429, { message: 'Demasiadas solicitudes. Espera un momento.' });
    }
    if (path === `/orders/${ORDER}/handoffs` && req.method() === 'GET')
      return json(route, 200, [
        { id: 'h1', type: 'CUSTOMER_TO_DRIVER', status: 'USED', generation: 1, expiresAt: null, usedAt: new Date().toISOString(), declaredCount: 7, receivedCount: null },
      ]);
    if (path === `/orders/${ORDER}/handoffs/verify`) {
      verifications.push(req.postDataJSON());
      if (verifyError) return json(route, verifyError.status, { message: verifyError.message });
      if (conflictPending) {
        // Otro dispositivo cambió la solicitud: su versión avanzó.
        conflictPending = false;
        state.order = { ...state.order, version: state.order.version + 1 };
        return json(route, 409, { message: 'La solicitud cambió. Recarga e intenta de nuevo.' });
      }
      state.order = { ...state.order, status: 'AT_FACILITY', version: state.order.version + 1 };
      return json(route, 201, state.order);
    }
    if (path === `/orders/${ORDER}`) return json(route, 200, state.order);
    return json(route, 200, []);
  });
  return verifications;
}

const openOrder = async (page) => {
  await page.goto(`/operations/orders/${ORDER}`, { waitUntil: 'domcontentloaded' });
  return page.getByRole('region', { name: 'Recepción en planta' });
};

test('la sede valida el código del chofer y registra las prendas recibidas', async ({ page }) => {
  const verifications = await mockServer(page);
  const panel = await openOrder(page);
  await expect(panel).toContainText('Prendas declaradas en la recogida: 7');
  const confirm = panel.getByRole('button', { name: 'Confirmar recepción en planta', exact: true });
  await confirm.click();
  await expect(panel.getByText('Escribe el código de 6 dígitos del chofer o escanea su QR.')).toBeVisible();
  await expect(panel.getByText('Ingresa cuántas prendas recibes.')).toBeVisible();

  await panel.getByRole('textbox', { name: 'Código del chofer' }).fill('482910');
  await panel.getByRole('textbox', { name: 'Prendas recibidas' }).fill('6');
  await confirm.click();
  // Si el conteo no coincide con lo declarado, hay que explicarlo.
  await expect(panel.getByText('Recibes 6 y se declararon 7: explica la diferencia.')).toBeVisible();
  expect(verifications).toEqual([]);

  await panel.getByRole('textbox', { name: 'Observaciones' }).fill('Una prenda quedó con el cliente');
  await confirm.click();
  await expect(page.getByRole('status').getByText('Ropa recibida en planta', { exact: true })).toBeVisible();
  expect(verifications).toEqual([
    {
      type: 'DRIVER_TO_FACILITY',
      expectedVersion: 6,
      receivedCount: 6,
      notes: 'Una prenda quedó con el cliente',
      code: '482910',
    },
  ]);
  await expect(panel).toHaveCount(0);
  // Sin recargar, aparece el proceso en planta del servidor y no el atajo local que saltaba al
  // lavado ("No se permite pasar de AT_FACILITY a IN_PROCESS").
  const plant = page.getByRole('region', { name: 'Proceso en planta' });
  await expect(plant.getByRole('button', { name: 'Iniciar inspección', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Iniciar inspección de prendas/ })).toHaveCount(0);
});

test('el QR leído con lector o cámara se envía como token; un QR de otra solicitud se rechaza', async ({ page }) => {
  const verifications = await mockServer(page);
  const panel = await openOrder(page);
  const codeField = panel.getByRole('textbox', { name: 'Código del chofer' });
  await panel.getByRole('textbox', { name: 'Prendas recibidas' }).fill('7');
  await codeField.fill(`LDH1:otra-solicitud:DRIVER_TO_FACILITY:${TOKEN}`);
  await panel.getByRole('button', { name: 'Confirmar recepción en planta', exact: true }).click();
  await expect(panel.getByText('Este QR pertenece a otra solicitud.')).toBeVisible();
  expect(verifications).toEqual([]);

  // Un lector USB escribe el contenido del QR completo en el campo.
  await codeField.fill(`LDH1:${ORDER}:DRIVER_TO_FACILITY:${TOKEN}`);
  await expect(panel.getByText('QR del chofer leído')).toBeVisible();
  await panel.getByRole('button', { name: 'Confirmar recepción en planta', exact: true }).click();
  await expect.poll(() => verifications.length).toBe(1);
  expect(verifications[0]).toMatchObject({ type: 'DRIVER_TO_FACILITY', qrToken: TOKEN, receivedCount: 7 });
  expect('code' in verifications[0]).toBe(false);
});

test('el mensaje del servidor sobre el código se muestra en el formulario', async ({ page }) => {
  await mockServer(page, { verifyError: { status: 422, message: 'Código incorrecto. Intentos restantes: 2.' } });
  const panel = await openOrder(page);
  await panel.getByRole('textbox', { name: 'Código del chofer' }).fill('111111');
  await panel.getByRole('textbox', { name: 'Prendas recibidas' }).fill('7');
  await panel.getByRole('button', { name: 'Confirmar recepción en planta', exact: true }).click();
  await expect(panel.getByText('Código incorrecto. Intentos restantes: 2.')).toBeVisible();
  await expect(panel).toBeVisible();
});

// R-HO-3: sin el conteo declarado no se puede comparar, así que no se confirma.
test('si no se obtiene el conteo declarado no se puede confirmar y Reintentar lo vuelve a consultar', async ({ page }) => {
  const verifications = await mockServer(page, { handoffsFailures: 1 });
  const panel = await openOrder(page);
  const alert = panel.getByRole('alert');
  await expect(alert).toContainText('No se pudo obtener el conteo declarado en la recogida.');
  await expect(alert).toContainText('Demasiadas solicitudes. Espera un momento.');
  const confirm = panel.getByRole('button', { name: 'Confirmar recepción en planta', exact: true });
  await panel.getByRole('textbox', { name: 'Código del chofer' }).fill('482910');
  await panel.getByRole('textbox', { name: 'Prendas recibidas' }).fill('7');
  await expect(confirm).toBeDisabled();
  expect(verifications).toEqual([]);

  await alert.getByRole('button', { name: 'Reintentar' }).click();
  await expect(panel).toContainText('Prendas declaradas en la recogida: 7');
  await expect(panel.getByRole('alert')).toHaveCount(0);
  await expect(confirm).toBeEnabled();
});

// Contrato 4: un 423 no se arregla reintentando el mismo código.
test('con el traspaso bloqueado (423) se pide un código nuevo al chofer', async ({ page }) => {
  await mockServer(page, { verifyError: { status: 423, message: 'El código está bloqueado por demasiados intentos.' } });
  const panel = await openOrder(page);
  await panel.getByRole('textbox', { name: 'Código del chofer' }).fill('111111');
  await panel.getByRole('textbox', { name: 'Prendas recibidas' }).fill('7');
  await panel.getByRole('button', { name: 'Confirmar recepción en planta', exact: true }).click();
  await expect(
    panel.getByText(
      'El código está bloqueado por demasiados intentos. Pide al chofer que genere un código nuevo en su app.',
    ),
  ).toBeVisible();
});

// R-HO-4: si la versión cambió, se vuelve a consultar y la siguiente confirmación usa la vigente.
test('ante un conflicto de versión se recarga y se confirma con la versión vigente', async ({ page }) => {
  const verifications = await mockServer(page, { conflictOnce: true });
  const panel = await openOrder(page);
  await expect(panel).toContainText('Prendas declaradas en la recogida: 7');
  await panel.getByRole('textbox', { name: 'Código del chofer' }).fill('482910');
  await panel.getByRole('textbox', { name: 'Prendas recibidas' }).fill('7');
  const confirm = panel.getByRole('button', { name: 'Confirmar recepción en planta', exact: true });
  await confirm.click();
  await expect(panel.getByText(/La solicitud cambió mientras validabas/)).toBeVisible();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole('status').getByText('Ropa recibida en planta', { exact: true })).toBeVisible();
  expect(verifications.map((v) => v.expectedVersion)).toEqual([6, 7]);
});
