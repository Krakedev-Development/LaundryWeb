const { test, expect } = require('./support/fixtures.cjs');
const { mockServerOrder, serverOrder } = require('./support/serverOrder.cjs');

// Paso 3 (UI): accesibilidad con teclado y lectores de pantalla en Operaciones. No cambia el flujo.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const json = (route, status, body) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

test('el menú Acciones anuncia su estado, enfoca la primera opción y se cierra con Escape', async ({ page }) => {
  await mockServerOrder(page, serverOrder('SOL-HOME-001', 'CONFIRMED'));
  await page.goto('/operations/orders/SOL-HOME-001');
  const trigger = page.getByRole('button', { name: /^Acciones/ });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const group = page.getByRole('group', { name: 'Acciones de la solicitud' });
  await expect(group.getByRole('button', { name: 'Copiar identificador' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(group).toHaveCount(0);
  await expect(trigger).toBeFocused();
  // Un clic fuera también lo cierra.
  await trigger.click();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(group).toHaveCount(0);
});

test('registrar incidencia abre un diálogo nativo: el foco queda dentro y Escape lo cierra', async ({ page }) => {
  await mockServerOrder(page, serverOrder('SOL-HOME-001', 'CONFIRMED'));
  await page.goto('/operations/orders/SOL-HOME-001');
  const open = page.getByRole('button', { name: 'Registrar incidencia' });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Registrar incidencia operacional' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Tipo de incidencia *')).toBeVisible();
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
});

test('la búsqueda y los filtros de Solicitudes tienen nombre accesible', async ({ page }) => {
  await page.route(/\/api\/v1\/orders(\/[^?]*)?(\?.*)?$/, (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path !== '/orders') return json(route, 404, { message: 'No existe.' });
    return json(route, 200, { page: 1, pageSize: 50, total: 0, data: [] });
  });
  await page.goto('/operations/orders');
  await expect(page.getByRole('searchbox', { name: 'Buscar solicitudes' })).toBeVisible();
  const toggle = page.getByRole('button', { name: /Filtros avanzados/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('combobox', { name: 'Estado' })).toBeVisible();
});

test('en Entregas se elige una fila con el teclado y la selección se anuncia', async ({ page }) => {
  const row = (id, number, status, name) => ({
    id, number, status, mode: 'HOME_HOME', facilityId: 'f1', paymentStatus: 'PAID', pricingStatus: 'FINAL',
    total: '22.00', version: 3, createdAt: '2026-11-19T10:00:00.000Z', items: [], events: [],
    customer: { user: { name, phone: '099' } },
    legs: [{ id: `${id}-out`, orderId: id, kind: 'OUTBOUND', method: 'DRIVER', status: 'SCHEDULED', addressText: 'Av. 1',
      latitude: -2.1, longitude: -79.9, scheduledDate: '2026-11-19', slotId: 's1',
      slot: { id: 's1', date: '2026-11-19', startTime: '16:00', endTime: '18:00', capacity: 5, reservedCount: 1 },
      driverId: null, driver: null }],
  });
  const orders = [row('d-1', 41, 'READY_FOR_DELIVERY', 'Ana Ruiz'), row('d-2', 42, 'READY_FOR_DELIVERY', 'Luis Mora')];
  await page.route(/\/api\/v1\/(orders|drivers)(\/[^?]*)?(\?.*)?$/, (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/drivers') return json(route, 200, []);
    if (path === '/orders') {
      const data = orders.filter((o) => o.status === url.searchParams.get('status'));
      return json(route, 200, { page: 1, pageSize: 100, total: data.length, data });
    }
    const found = orders.find((o) => path === `/orders/${o.id}`);
    return found ? json(route, 200, found) : json(route, 200, []);
  });
  await page.goto('/operations/deliveries');
  const rowButtons = page.getByRole('button', { name: /^Seleccionar entrega/ });
  await expect(rowButtons).toHaveCount(2);
  // Una sola fila seleccionada al cargar; se elige la otra con Enter.
  await expect(page.locator('button[aria-pressed="true"][aria-label^="Seleccionar entrega"]')).toHaveCount(1);
  const other = page.locator('button[aria-pressed="false"][aria-label^="Seleccionar entrega"]');
  const otherLabel = (await other.getAttribute('aria-label')).replace('Seleccionar entrega ', '');
  await other.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: `Seleccionar entrega ${otherLabel}` })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: otherLabel })).toBeVisible();
});

test('un aviso de error no desaparece solo y se cierra con su botón', async ({ page }) => {
  const order = {
    id: 'd-1', number: 41, status: 'READY_FOR_DELIVERY', mode: 'HOME_HOME', facilityId: 'f1', paymentStatus: 'PAID',
    pricingStatus: 'FINAL', total: '22.00', version: 3, createdAt: '2026-11-19T10:00:00.000Z', items: [], events: [],
    customer: { user: { name: 'Ana Ruiz', phone: '099' } },
    legs: [{ id: 'd-1-out', orderId: 'd-1', kind: 'OUTBOUND', method: 'DRIVER', status: 'SCHEDULED', addressText: 'Av. 1',
      latitude: -2.1, longitude: -79.9, scheduledDate: '2026-11-19', slotId: 's1',
      slot: { id: 's1', date: '2026-11-19', startTime: '16:00', endTime: '18:00', capacity: 5, reservedCount: 1 },
      driverId: null, driver: null }],
  };
  const driver = { id: 'drv-1', userId: 'u1', name: 'Carlos Pérez', email: 'c@test.example', phone: '099', status: 'AVAILABLE',
    vehicle: 'VAN', plate: 'GSE-1', facilityId: 'f1', facilityName: 'Sede', latitude: -2.1, longitude: -79.9, locationAt: null, activeLegsCount: 0 };
  await page.route(/\/api\/v1\/(orders|drivers)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/drivers') return json(route, 200, [driver]);
    if (path === '/orders') {
      const data = url.searchParams.get('status') === 'READY_FOR_DELIVERY' ? [order] : [];
      return json(route, 200, { page: 1, pageSize: 100, total: data.length, data });
    }
    if (path === '/orders/d-1/assign') return json(route, 409, { message: 'La solicitud cambió. Recarga e intenta de nuevo.' });
    return json(route, 200, order);
  });
  await page.goto('/operations/deliveries');
  await page.getByLabel('Chofer de entrega').selectOption('drv-1');
  await page.getByRole('button', { name: 'Asignar chofer en servidor' }).click();
  const toast = page.getByRole('alert').filter({ hasText: 'No se pudo asignar' });
  await expect(toast).toBeVisible();
  // Los avisos de éxito se van a los 4,5 s; el de error sigue ahí.
  await page.waitForTimeout(5500);
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: /^Cerrar aviso/ }).click();
  await expect(toast).toHaveCount(0);
});
