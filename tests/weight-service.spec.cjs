const { test, expect } = require('./support/fixtures.cjs');

// Simula bolsas y restricciones del servicio por peso con estado en memoria.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function mockWeightApi(page, { failList = false } = {}) {
  const state = {
    tiers: [
      { id: 't2', name: '2 bolsas', estimatedWeightLb: '20', pricePerPound: '2', sortOrder: 2, active: true },
      { id: 't1', name: '1 bolsa', estimatedWeightLb: '10', pricePerPound: '2.2', sortOrder: 1, active: true },
    ],
    rules: [
      { id: 'r1', text: 'NO aplica para edredones gruesos o plumones.', sortOrder: 1, active: true },
    ],
  };
  const calls = { tiers: [], rules: [] };
  const json = (route, status, body) =>
    route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  const sorted = (rows) => [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  // El resto del catálogo responde vacío para no depender de un servidor real.
  await page.route(/\/api\/v1\/catalog\/(garments|services|extras)(\?.*)?$/, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: preflight })
      : json(route, 200, []),
  );

  await page.route(/\/api\/v1\/catalog\/weight-(tiers|restrictions)(\/[^/?]+)?(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const [, kind, idPart] = new URL(req.url()).pathname.match(/weight-(tiers|restrictions)(?:\/([^/]+))?$/);
    const rows = kind === 'tiers' ? state.tiers : state.rules;
    if (req.method() === 'GET') {
      if (failList) return json(route, 500, { message: 'Error interno del servidor.' });
      return json(route, 200, sorted(rows));
    }
    const body = req.postDataJSON();
    calls[kind === 'tiers' ? 'tiers' : 'rules'].push({ method: req.method(), id: idPart ?? null, body });
    if (req.method() === 'POST') {
      if (kind === 'tiers' && rows.some((r) => r.name === body.name))
        return json(route, 409, { message: 'Ya existe un registro con ese nombre o código.' });
      const row = { id: `${kind}-${rows.length + 1}`, active: true, ...body };
      if (kind === 'tiers') {
        row.estimatedWeightLb = String(body.estimatedWeightLb);
        row.pricePerPound = String(body.pricePerPound);
      }
      rows.push(row);
      return json(route, 201, row);
    }
    const target = rows.find((r) => r.id === idPart);
    Object.assign(target, body);
    if (kind === 'tiers' && body.pricePerPound !== undefined) target.pricePerPound = String(body.pricePerPound);
    return json(route, 200, target);
  });
  return calls;
}

const openWeightTab = async (page) => {
  await page.goto('/commercial/catalog', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Servicio por Peso' }).click();
};
const tierRows = (page) => page.getByRole('table', { name: 'Bolsas del servicio por peso' }).locator('tbody tr');
const ruleRows = (page) => page.getByRole('table', { name: 'Restricciones del servicio por peso' }).locator('tbody tr');

test('lista las bolsas en orden con su precio por libra y el monto estimado', async ({ page }) => {
  await mockWeightApi(page);
  await openWeightTab(page);
  await expect(tierRows(page)).toHaveCount(2);
  await expect(tierRows(page).first()).toContainText('1 bolsa');
  await expect(tierRows(page).first()).toContainText('~10 lb');
  await expect(tierRows(page).first()).toContainText('$2.20 / lb');
  await expect(tierRows(page).first()).toContainText('$22.00');
  await expect(tierRows(page).nth(1)).toContainText('$40.00');
  await expect(ruleRows(page)).toHaveCount(1);
  // El botón general de nuevo ítem no aplica a esta pestaña.
  await expect(page.getByRole('button', { name: /Nuevo Ítem/ })).toHaveCount(0);
});

test('crear una bolsa valida los campos y envía números al servidor', async ({ page }) => {
  const calls = await mockWeightApi(page);
  await openWeightTab(page);
  await page.getByRole('button', { name: 'Nueva bolsa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nueva bolsa' });
  await expect(dialog.getByLabel('Orden en la app')).toHaveValue('3');
  await dialog.getByRole('button', { name: 'Crear bolsa' }).click();
  await expect(dialog.getByText('Escribe el nombre de la bolsa.')).toBeVisible();
  await expect(dialog.getByText('Ingresa las libras estimadas, mayores a cero.')).toBeVisible();
  await expect(dialog.getByText('Ingresa el precio por libra, mayor a cero.')).toBeVisible();
  await dialog.getByLabel('Nombre que verá el cliente').fill(' 3+ bolsas ');
  await dialog.getByLabel('Libras estimadas').fill('35');
  await dialog.getByLabel('Precio por libra ($)').fill('1.12345');
  await dialog.getByRole('button', { name: 'Crear bolsa' }).click();
  await expect(dialog.getByText('Usa hasta 4 decimales.')).toBeVisible();
  expect(calls.tiers).toEqual([]);
  await dialog.getByLabel('Precio por libra ($)').fill('1.8');
  await dialog.getByRole('button', { name: 'Crear bolsa' }).click();
  await expect(dialog).toHaveCount(0);
  expect(calls.tiers).toEqual([
    { method: 'POST', id: null, body: { name: '3+ bolsas', estimatedWeightLb: 35, pricePerPound: 1.8, sortOrder: 3 } },
  ]);
  await expect(tierRows(page)).toHaveCount(3);
  await expect(tierRows(page).nth(2)).toContainText('$63.00');
});

test('un nombre repetido muestra el error del servidor y deja el formulario abierto', async ({ page }) => {
  await mockWeightApi(page);
  await openWeightTab(page);
  await page.getByRole('button', { name: 'Nueva bolsa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nueva bolsa' });
  await dialog.getByLabel('Nombre que verá el cliente').fill('1 bolsa');
  await dialog.getByLabel('Libras estimadas').fill('12');
  await dialog.getByLabel('Precio por libra ($)').fill('2');
  await dialog.getByRole('button', { name: 'Crear bolsa' }).click();
  await expect(page.getByText('Ya existe un registro con ese nombre o código.')).toBeVisible();
  await expect(dialog).toBeVisible();
});

test('editar el precio de una bolsa y desactivarla', async ({ page }) => {
  const calls = await mockWeightApi(page);
  await openWeightTab(page);
  await page.getByRole('button', { name: 'Editar 2 bolsas' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar bolsa: 2 bolsas' });
  await expect(dialog.getByLabel('Precio por libra ($)')).toHaveValue('2');
  await dialog.getByLabel('Precio por libra ($)').fill('1.9');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(tierRows(page).nth(1)).toContainText('$1.90 / lb');
  await page.getByRole('button', { name: 'Desactivar 2 bolsas' }).click();
  await expect(tierRows(page).nth(1)).toContainText('Inactiva');
  expect(calls.tiers.map((c) => [c.method, c.id, c.body])).toEqual([
    ['PATCH', 't2', { name: '2 bolsas', estimatedWeightLb: 20, pricePerPound: 1.9, sortOrder: 2 }],
    ['PATCH', 't2', { active: false }],
  ]);
});

test('las restricciones se agregan, editan y desactivan desde la web', async ({ page }) => {
  const calls = await mockWeightApi(page);
  await openWeightTab(page);
  await page.getByRole('button', { name: 'Nueva restricción' }).click();
  let dialog = page.getByRole('dialog', { name: 'Nueva restricción' });
  await dialog.getByRole('button', { name: 'Agregar restricción' }).click();
  await expect(dialog.getByText('Escribe la restricción.')).toBeVisible();
  await dialog.getByLabel('Restricción').fill('NO aplica para trajes de paño formal.');
  await dialog.getByRole('button', { name: 'Agregar restricción' }).click();
  await expect(ruleRows(page)).toHaveCount(2);
  await expect(ruleRows(page).nth(1)).toContainText('trajes de paño formal');

  await page.getByRole('button', { name: 'Editar restricción 1' }).click();
  dialog = page.getByRole('dialog', { name: 'Editar restricción' });
  await dialog.getByLabel('Restricción').fill('NO aplica para edredones o plumones.');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(ruleRows(page).first()).toContainText('NO aplica para edredones o plumones.');

  await page.getByRole('button', { name: 'Desactivar restricción 1' }).click();
  await expect(ruleRows(page).first()).toContainText('Inactiva');
  expect(calls.rules.map((c) => [c.method, c.id, c.body])).toEqual([
    ['POST', null, { text: 'NO aplica para trajes de paño formal.', sortOrder: 2 }],
    ['PATCH', 'r1', { text: 'NO aplica para edredones o plumones.', sortOrder: 1 }],
    ['PATCH', 'r1', { active: false }],
  ]);
});

test('si el servidor falla se informa y se puede reintentar', async ({ page }) => {
  await mockWeightApi(page, { failList: true });
  await openWeightTab(page);
  await expect(page.getByRole('alert').filter({ hasText: 'No se pudo cargar el servicio por peso.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});
