const { randomUUID } = require('node:crypto');
const { test, expect } = require('./support/fixtures.cjs');
test.use({ viewport: { width: 1440, height: 1000 } });

// Servidor simulado de zonas y sedes con estado en memoria y las mismas validaciones
// que la API real: así la prueba comprueba que lo guardado sobrevive a la recarga.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const UUID = /^[0-9a-f-]{36}$/i;

async function mockGeoApi(page, { expireFirstZonesCall = false } = {}) {
  const state = { zones: [], facilities: [] };
  const calls = { zones: [], facilities: [], zoneLists: 0 };
  const json = (route, status, body) =>
    route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(/\/api\/v1\/zones(\/[^/?]+)?(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const id = new URL(req.url()).pathname.split('/zones/')[1];
    if (req.method() === 'GET') {
      calls.zoneLists += 1;
      if (expireFirstZonesCall && calls.zoneLists === 1)
        return json(route, 401, { message: 'Unauthorized' });
      return json(route, 200, state.zones);
    }
    const body = req.postDataJSON();
    calls.zones.push({ method: req.method(), id, body });
    if (req.method() === 'POST') {
      const zone = { id: randomUUID(), name: body.name, polygon: body.polygon, active: true };
      state.zones.push(zone);
      return json(route, 201, zone);
    }
    const zone = state.zones.find((z) => z.id === id);
    if (!zone) return json(route, 404, { message: 'La zona no existe.' });
    Object.assign(zone, body);
    return json(route, 200, zone);
  });

  await page.route(/\/api\/v1\/facilities(\/[^/?]+)?(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    if (req.method() === 'GET') return json(route, 200, state.facilities);
    const body = req.postDataJSON();
    calls.facilities.push(body);
    if (!UUID.test(body.zoneId ?? ''))
      return json(route, 400, { message: ['Selecciona una zona válida.'] });
    if (!(body.dailyCapacity >= 1))
      return json(route, 400, { message: ['La capacidad diaria debe ser de al menos 1 kg.'] });
    const facility = { id: randomUUID(), active: true, ...body };
    state.facilities.push(facility);
    return json(route, 201, facility);
  });
  return { state, calls };
}

// El mapa es Leaflet: los clics los recibe su contenedor, no la capa SVG superpuesta.
async function clickMap(dialog, x, y) {
  const map = dialog.locator('.leaflet-container');
  await expect(map).toBeVisible();
  const box = await map.boundingBox();
  await map.click({ position: { x: box.width * x, y: box.height * y } });
}

// Sin teselas reales: la prueba no depende de la red ni de un servicio externo.
test.beforeEach(async ({ page }) => {
  await page.route('**/tile.openstreetmap.org/**', (route) => route.abort());
});

async function createZone(page, name) {
  await page.getByRole('button', { name: 'Crear zona', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Crear zona', exact: true });
  await editor.getByLabel('Nombre de la zona').fill(name);
  await clickMap(editor, 0.25, 0.35);
  await clickMap(editor, 0.55, 0.35);
  await clickMap(editor, 0.55, 0.7);
  await clickMap(editor, 0.25, 0.7);
  await editor.getByText('Cerrar polígono', { exact: true }).click();
  await editor.getByRole('button', { name: 'Guardar zona', exact: true }).click();
  await expect(editor).toHaveCount(0);
}

async function fillFacility(page, index, capacity) {
  await page.getByRole('button', { name: 'Agregar sede', exact: true }).last().click();
  const picker = page.getByRole('dialog', { name: 'Ubicar nueva sede' });
  await clickMap(picker, 0.45 + index * 0.02, 0.5);
  const form = page.getByRole('dialog', { name: 'Registrar Nueva Sede' });
  await expect(form).toBeVisible();
  await form.locator('input[type=text]').nth(0).fill(`Sede de prueba ${index}`);
  await form.getByLabel('Codigo de la sede').fill(`TEST-${index}`);
  await form.locator('input[type=text]').nth(2).fill(`Direccion real ${index}`);
  await form.getByLabel('Ciudad de la sede').fill('Samborondon');
  if (capacity !== undefined) await form.getByLabel('Capacidad diaria de la sede').fill(capacity);
  return form;
}

test('la zona y sus sedes se guardan en el servidor y siguen ahí tras recargar', async ({ page }) => {
  await page.route('**/api.mapbox.com/**', (route) => route.abort());
  const { state, calls } = await mockGeoApi(page);
  await page.goto('/logistics/facilities');
  await createZone(page, 'Zona de prueba');
  expect(state.zones).toHaveLength(1);
  const zoneId = state.zones[0].id;

  for (const index of [1, 2]) {
    const form = await fillFacility(page, index, '500');
    await form.getByRole('button', { name: 'Registrar Sede', exact: true }).click();
    await expect(form).toHaveCount(0);
  }
  // Las sedes viajan con el identificador real de la zona y una capacidad válida.
  expect(calls.facilities.map((f) => [f.zoneId, f.dailyCapacity])).toEqual([
    [zoneId, 500],
    [zoneId, 500],
  ]);
  await expect(page.getByText('2 sedes', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText('2 sedes', { exact: true })).toBeVisible();
  const storedZone = await page.evaluate(
    () => JSON.parse(localStorage.getItem('lw_zones_v1')).zones.find((z) => z.name === 'Zona de prueba')?.id,
  );
  expect(storedZone).toBe(zoneId);

  await page.goto('/logistics/map');
  await page.getByLabel('Zona', { exact: true }).selectOption(zoneId);
  await expect(
    page.getByRole('region', { name: 'Ubicaciones operativas' }).getByRole('button', { name: /^Ver detalle de/ }),
  ).toHaveCount(2);

  await page.goto('/logistics/facilities');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sedes Operativas y Plantas de Lavado' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('sin capacidad diaria la sede no se envía y se explica el motivo', async ({ page }) => {
  await page.route('**/api.mapbox.com/**', (route) => route.abort());
  const { calls } = await mockGeoApi(page);
  await page.goto('/logistics/facilities');
  await createZone(page, 'Zona sin capacidad');
  const form = await fillFacility(page, 1);
  await form.getByRole('button', { name: 'Registrar Sede', exact: true }).click();
  // El navegador bloquea el envío del campo obligatorio vacío.
  await expect(form).toBeVisible();
  expect(
    await form.getByLabel('Capacidad diaria de la sede').evaluate((el) => el.validity.valueMissing),
  ).toBe(true);
  expect(calls.facilities).toEqual([]);
});

test('si el servidor rechaza la zona, el editor sigue abierto con el motivo y no queda una zona local', async ({ page }) => {
  await page.route('**/api.mapbox.com/**', (route) => route.abort());
  await mockGeoApi(page);
  // Esta ruta se registra después y tiene prioridad: el alta de zonas falla.
  await page.route(/\/api\/v1\/zones$/, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 409,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Ya existe una zona con ese nombre.' }),
        })
      : route.fallback(),
  );
  await page.goto('/logistics/facilities');
  await page.getByRole('button', { name: 'Crear zona', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Crear zona', exact: true });
  await editor.getByLabel('Nombre de la zona').fill('Zona repetida');
  await clickMap(editor, 0.25, 0.35);
  await clickMap(editor, 0.55, 0.35);
  await clickMap(editor, 0.55, 0.7);
  await editor.getByText('Cerrar polígono', { exact: true }).click();
  await editor.getByRole('button', { name: 'Guardar zona', exact: true }).click();
  await expect(editor.getByRole('alert')).toHaveText('Ya existe una zona con ese nombre.');
  await expect(editor).toBeVisible();
  const local = await page.evaluate(() =>
    (JSON.parse(localStorage.getItem('lw_zones_v1') ?? '{"zones":[]}').zones ?? []).map((z) => z.name),
  );
  expect(local).not.toContain('Zona repetida');
});

test('con la sesión vencida se renueva el token y la petición se repite sola', async ({ page }) => {
  await page.route('**/api.mapbox.com/**', (route) => route.abort());
  const { calls } = await mockGeoApi(page, { expireFirstZonesCall: true });
  const refreshes = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/v1/auth/refresh')) refreshes.push(r.url());
  });
  await page.goto('/logistics/facilities');
  await createZone(page, 'Zona tras renovar');
  await expect(page.getByText('Zona tras renovar').first()).toBeVisible();
  expect(calls.zoneLists).toBeGreaterThanOrEqual(2);
  // Una renovación al abrir la sesión y otra por el 401.
  expect(refreshes.length).toBeGreaterThanOrEqual(2);
  expect(calls.zones).toHaveLength(1);
});
