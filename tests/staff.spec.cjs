const { test, expect } = require('./support/fixtures.cjs');

// Simula la API de personal y sedes con estado en memoria; el producto no trae datos.
const cors = { 'access-control-allow-origin': '*' };
const preflight = {
  ...cors,
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

const member = (id, name, status, extra = {}) => ({
  id,
  name,
  email: `${name.split(' ')[0].toLowerCase()}@correo.test`,
  phone: '+593991234567',
  role: 'SUPERVISOR',
  status,
  facility: { id: 'f-norte', name: 'Sede Norte' },
  createdAt: '2026-11-10T13:00:00.000Z',
  lastLoginAt: null,
  ...extra,
});

async function mockStaffApi(page, { failList = false, failActivity = false } = {}) {
  const state = {
    staff: [
      member('u-admin', 'Carla Admin', 'ACTIVE', { role: 'ADMIN', facility: null }),
      member('u-sara', 'Sara Ruiz', 'ACTIVE', { lastLoginAt: '2026-11-11T15:30:00.000Z' }),
      member('u-leo', 'Leo Paz', 'SUSPENDED', {
        facility: { id: 'f-sur', name: 'Sede Sur' },
      }),
    ],
  };
  const calls = { created: [], status: [], resets: [], activity: [] };
  const json = (route, status, body) =>
    route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('**/api/v1/facilities', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: preflight })
      : json(route, 200, [
          { id: 'f-norte', name: 'Sede Norte', address: 'Av. 1', latitude: 0, longitude: 0, active: true },
          { id: 'f-sur', name: 'Sede Sur', address: 'Av. 2', latitude: 0, longitude: 0, active: true },
          { id: 'f-old', name: 'Sede Cerrada', address: 'Av. 3', latitude: 0, longitude: 0, active: false },
        ]),
  );

  await page.route('**/api/v1/users/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/users/staff' && req.method() === 'GET') {
      if (failList) return json(route, 500, { message: 'Error interno del servidor.' });
      return json(route, 200, state.staff);
    }
    if (path === '/users/staff' && req.method() === 'POST') {
      const body = req.postDataJSON();
      calls.created.push(body);
      if (state.staff.some((m) => m.email === body.email))
        return json(route, 409, { message: 'El correo ya tiene una cuenta.' });
      state.staff.push(
        member(`u-${calls.created.length}`, body.name, 'PASSWORD_CHANGE_REQUIRED', {
          email: body.email,
          facility: { id: body.facilityId, name: body.facilityId === 'f-sur' ? 'Sede Sur' : 'Sede Norte' },
        }),
      );
      return json(route, 201, { id: `u-${calls.created.length}` });
    }
    const status = path.match(/^\/users\/([^/]+)\/status$/);
    if (status) {
      const body = req.postDataJSON();
      calls.status.push({ id: status[1], ...body });
      const target = state.staff.find((m) => m.id === status[1]);
      target.status = body.status;
      return json(route, 200, { status: body.status });
    }
    const activity = path.match(/^\/users\/([^/]+)\/activity$/);
    if (activity) {
      const query = new URL(req.url()).searchParams;
      const page = Number(query.get('page'));
      const pageSize = Number(query.get('pageSize'));
      calls.activity.push({ id: activity[1], from: query.get('from'), to: query.get('to'), page, pageSize });
      if (failActivity) return json(route, 500, { message: 'Error interno del servidor.' });
      const target = state.staff.find((m) => m.id === activity[1]);
      const days = Math.round((Date.parse(query.get('to')) - Date.parse(query.get('from'))) / 86400000);
      // 5 registros representativos seguidos de 18 ingresos: 23 en total, 3 páginas de 10.
      const all =
        days <= 7
          ? []
          : [
              { id: 'a1', source: 'ORDER', action: 'ORDER_IN_PROCESS', entity: 'Order', entityId: 'o1', orderNumber: 12, detail: 'Pedido en proceso de lavado', createdAt: '2026-11-11T16:00:00.000Z' },
              { id: 'a2', source: 'HANDOFF', action: 'HANDOFF_VERIFIED', entity: 'Order', entityId: 'o1', orderNumber: 12, detail: 'PICKUP', createdAt: '2026-11-11T15:45:00.000Z' },
              { id: 'a3', source: 'AUDIT', action: 'SLOT_CREATED', entity: 'TimeSlot', entityId: 's1', orderNumber: null, detail: null, createdAt: '2026-11-11T15:40:00.000Z' },
              { id: 'a4', source: 'AUDIT', action: 'LOGIN', entity: 'User', entityId: target.id, orderNumber: null, detail: null, createdAt: '2026-11-11T15:30:00.000Z' },
              { id: 'a5', source: 'AUDIT', action: 'ALGO_NUEVO', entity: 'X', entityId: null, orderNumber: null, detail: null, createdAt: '2026-11-10T15:30:00.000Z' },
              ...Array.from({ length: 18 }, (_, i) => ({
                id: `l${i}`, source: 'AUDIT', action: 'LOGIN', entity: 'User', entityId: target.id, orderNumber: null, detail: null,
                createdAt: new Date(Date.parse('2026-11-09T12:00:00.000Z') - i * 3600000).toISOString(),
              })),
            ];
      return json(route, 200, {
        user: target,
        range: { from: query.get('from'), to: query.get('to') },
        summary: {
          logins: all.filter((i) => i.action === 'LOGIN').length,
          actions: all.filter((i) => i.action !== 'LOGIN').length,
          lastLoginAt: target.lastLoginAt,
          lastActivityAt: all[0]?.createdAt ?? null,
        },
        items: all.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        total: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
      });
    }
    const reset = path.match(/^\/users\/([^/]+)\/reset-password$/);
    if (reset) {
      const body = req.postDataJSON();
      calls.resets.push({ id: reset[1], ...body });
      state.staff.find((m) => m.id === reset[1]).status = 'PASSWORD_CHANGE_REQUIRED';
      return json(route, 201, { status: 'PASSWORD_CHANGE_REQUIRED' });
    }
    return json(route, 404, { message: 'No encontrado.' });
  });
  return calls;
}

const rowOf = (page, name) => page.locator('tbody tr').filter({ hasText: name });

test('el menú de Gestión lleva a Personal y la lista muestra solo supervisores', async ({ page }) => {
  await mockStaffApi(page);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const sidebar = page.locator('#app-sidebar');
  await sidebar.getByRole('button', { name: 'GESTIÓN', exact: true }).click();
  await sidebar.getByRole('link', { name: 'Personal', exact: true }).click();
  await expect(page).toHaveURL(/\/management\/staff$/);
  await expect(page.locator('main > header').getByRole('heading', { level: 1, name: 'Personal' })).toBeVisible();

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rowOf(page, 'Carla Admin')).toHaveCount(0);
  await expect(rowOf(page, 'Sara Ruiz')).toContainText('Sede Norte');
  await expect(rowOf(page, 'Sara Ruiz')).toContainText('Activa');
  await expect(rowOf(page, 'Leo Paz')).toContainText('Suspendida');
  await expect(rowOf(page, 'Leo Paz')).toContainText('Nunca');
});

test('el buscador y el filtro de estado reducen la lista', async ({ page }) => {
  await mockStaffApi(page);
  await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Buscar supervisores' }).fill('  sede sur ');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Leo Paz');
  await page.getByRole('textbox', { name: 'Buscar supervisores' }).fill('');
  await page.getByRole('combobox', { name: 'Filtrar por estado de la cuenta' }).selectOption('ACTIVE');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Sara Ruiz');
});

test('crear un supervisor exige sede y contraseña válida, y lo envía al servidor', async ({ page }) => {
  const calls = await mockStaffApi(page);
  await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Crear supervisor' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear supervisor' });
  // Solo se ofrecen sedes activas.
  await expect(dialog.getByRole('option', { name: 'Sede Cerrada' })).toHaveCount(0);
  await dialog.getByLabel('Nombre completo').fill('  Ines Mora ');
  await dialog.getByLabel('Correo').fill('ines@correo.test');
  await dialog.getByLabel('Teléfono').fill('0997654321');
  await dialog.getByLabel('Sede').selectOption('f-sur');
  await dialog.getByLabel('Contraseña temporal').fill('solotexto');
  await dialog.getByRole('button', { name: 'Crear supervisor' }).click();
  await expect(dialog.getByLabel('Contraseña temporal')).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.getByText('Debe incluir al menos una letra y un número.')).toBeVisible();
  expect(calls.created).toEqual([]);

  await dialog.getByLabel('Contraseña temporal').fill('Temporal2026');
  await dialog.getByRole('button', { name: 'Crear supervisor' }).click();
  await expect(dialog).toHaveCount(0);
  expect(calls.created).toEqual([
    {
      name: 'Ines Mora',
      email: 'ines@correo.test',
      phone: '0997654321',
      facilityId: 'f-sur',
      temporaryPassword: 'Temporal2026',
      role: 'SUPERVISOR',
    },
  ]);
  await expect(rowOf(page, 'Ines Mora')).toContainText('Debe cambiar contraseña');
});

test('un correo repetido muestra el error del servidor', async ({ page }) => {
  await mockStaffApi(page);
  await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Crear supervisor' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear supervisor' });
  await dialog.getByLabel('Nombre completo').fill('Otra Sara');
  await dialog.getByLabel('Correo').fill('sara@correo.test');
  await dialog.getByLabel('Teléfono').fill('0991234567');
  await dialog.getByLabel('Sede').selectOption('f-norte');
  await dialog.getByLabel('Contraseña temporal').fill('Temporal2026');
  await dialog.getByRole('button', { name: 'Crear supervisor' }).click();
  await expect(dialog.getByRole('alert')).toContainText('El correo ya tiene una cuenta.');
});

test('suspender pide confirmación y reactivar devuelve la cuenta', async ({ page }) => {
  const calls = await mockStaffApi(page);
  await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Suspender a Sara Ruiz' }).click();
  const dialog = page.getByRole('dialog', { name: 'Suspender cuenta' });
  await dialog.getByLabel('Motivo (opcional)').fill('Fin de contrato');
  await dialog.getByRole('button', { name: 'Suspender cuenta' }).click();
  await expect(rowOf(page, 'Sara Ruiz')).toContainText('Suspendida');

  await page.getByRole('button', { name: 'Reactivar a Leo Paz' }).click();
  await expect(rowOf(page, 'Leo Paz')).toContainText('Activa');
  expect(calls.status).toEqual([
    { id: 'u-sara', status: 'SUSPENDED', reason: 'Fin de contrato' },
    { id: 'u-leo', status: 'ACTIVE' },
  ]);
});

test('restablecer la contraseña valida la regla y deja la cuenta pendiente de cambio', async ({ page }) => {
  const calls = await mockStaffApi(page);
  await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Restablecer contraseña de Sara Ruiz' }).click();
  const dialog = page.getByRole('dialog', { name: 'Restablecer contraseña' });
  await dialog.getByLabel('Nueva contraseña temporal').fill('corta1');
  await dialog.getByRole('button', { name: 'Restablecer contraseña' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Contraseña temporal inválida');
  await dialog.getByLabel('Nueva contraseña temporal').fill('Nueva2026tm');
  await dialog.getByRole('button', { name: 'Restablecer contraseña' }).click();
  await expect(rowOf(page, 'Sara Ruiz')).toContainText('Debe cambiar contraseña');
  expect(calls.resets).toEqual([{ id: 'u-sara', temporaryPassword: 'Nueva2026tm' }]);
});

test('el formulario valida cada campo antes de enviar', async ({ page }) => {
  const calls = await mockStaffApi(page);
  await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Crear supervisor' }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear supervisor' });
  const submit = () => dialog.getByRole('button', { name: 'Crear supervisor' }).click();

  // Vacío: cada campo explica qué falta.
  await submit();
  await expect(dialog.getByText('Escribe el nombre completo.')).toBeVisible();
  await expect(dialog.getByText('Escribe el correo.')).toBeVisible();
  await expect(dialog.getByText(/Debe tener 10 dígitos y empezar por 0/)).toBeVisible();
  await expect(dialog.getByText('Selecciona la sede.')).toBeVisible();
  await expect(dialog.getByText('Escribe una contraseña temporal.')).toBeVisible();

  // Límites en los propios campos.
  const name = dialog.getByLabel('Nombre completo');
  await name.fill('N'.repeat(60));
  await expect(name).toHaveValue('N'.repeat(50));
  const email = dialog.getByLabel('Correo');
  await email.fill(`${'a'.repeat(60)}@x.com`);
  expect((await email.inputValue()).length).toBe(50);
  const phone = dialog.getByLabel('Teléfono');
  await phone.fill('099-123 45678');
  await expect(phone).toHaveValue('0991234567');
  const password = dialog.getByLabel('Contraseña temporal');
  await password.fill('Abcdef123456789');
  await expect(password).toHaveValue('Abcdef123456');

  // Formatos.
  await email.fill('sin-arroba.com');
  await expect(dialog.getByText(/Ingresa un correo válido/)).toBeVisible();
  await phone.fill('1991234567');
  await expect(dialog.getByText(/Debe tener 10 dígitos y empezar por 0/)).toBeVisible();
  await phone.fill('099123');
  await expect(dialog.getByText(/Debe tener 10 dígitos y empezar por 0/)).toBeVisible();
  await password.fill('123456789');
  await expect(dialog.getByText('Debe incluir al menos una letra y un número.')).toBeVisible();
  await password.fill('Ab1');
  await expect(dialog.getByText('Debe tener entre 8 y 12 caracteres.')).toBeVisible();
  expect(calls.created).toEqual([]);

  // Corregido, se envía.
  await name.fill('Jefe Samborondon');
  await email.fill('jefesambo@correo.test');
  await phone.fill('0999999999');
  await dialog.getByLabel('Sede').selectOption('f-norte');
  await password.fill('Sambo2026');
  await expect(dialog.locator('[aria-invalid="true"]')).toHaveCount(0);
  await submit();
  await expect(dialog).toHaveCount(0);
  expect(calls.created).toHaveLength(1);
  expect(calls.created[0]).toMatchObject({ phone: '0999999999', temporaryPassword: 'Sambo2026' });
});

test('la actividad del supervisor muestra resumen y acciones legibles por período', async ({ page }) => {
  const calls = await mockStaffApi(page);
  await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ver actividad de Sara Ruiz' }).click();
  const dialog = page.getByRole('dialog', { name: 'Actividad de Sara Ruiz' });
  await expect(dialog).toContainText('Sede Norte');
  await expect(dialog).toContainText('Ingresos en el período');
  const list = dialog.getByRole('list', { name: 'Actividad registrada' });
  const items = list.getByRole('listitem');
  const prev = dialog.getByRole('button', { name: 'Página anterior de la actividad' });
  const next = dialog.getByRole('button', { name: 'Página siguiente de la actividad' });

  // Página 1: como máximo 10 registros, con textos en lenguaje claro.
  await expect(items).toHaveCount(10);
  await expect(items.nth(0)).toContainText('Pedido en proceso de lavado');
  await expect(items.nth(0)).toContainText('Solicitud SOL-0012');
  await expect(items.nth(1)).toContainText('Verificó una entrega');
  await expect(items.nth(2)).toContainText('Creó un horario');
  await expect(items.nth(3)).toContainText('Inició sesión');
  await expect(items.nth(4)).toContainText('Realizó una acción en el sistema');
  await expect(dialog.getByText(/ORDER_IN_PROCESS|HANDOFF_VERIFIED|SLOT_CREATED|ALGO_NUEVO/)).toHaveCount(0);
  await expect(dialog.getByText('1–10 de 23 registros')).toBeVisible();
  await expect(dialog.getByText('Página 1 de 3')).toBeVisible();
  await expect(prev).toBeDisabled();
  expect(calls.activity[0]).toMatchObject({ id: 'u-sara', page: 1, pageSize: 10 });
  const span = Date.parse(calls.activity[0].to) - Date.parse(calls.activity[0].from);
  expect(Math.round(span / 86400000)).toBe(30);

  // Páginas siguientes, con el mismo período fijo.
  await next.click();
  await expect(dialog.getByText('Página 2 de 3')).toBeVisible();
  await expect(dialog.getByText('11–20 de 23 registros')).toBeVisible();
  await expect(items).toHaveCount(10);
  await next.click();
  await expect(dialog.getByText('Página 3 de 3')).toBeVisible();
  await expect(dialog.getByText('21–23 de 23 registros')).toBeVisible();
  await expect(items).toHaveCount(3);
  await expect(next).toBeDisabled();
  expect(new Set(calls.activity.map((c) => `${c.from}|${c.to}`)).size).toBe(1);
  await prev.click();
  await expect(dialog.getByText('Página 2 de 3')).toBeVisible();

  // Cambiar el período vuelve a la página 1 de ese período.
  await dialog.getByRole('combobox', { name: 'Período de la actividad' }).selectOption('90');
  await expect(dialog.getByText('Página 1 de 3')).toBeVisible();
  const ninety = calls.activity.at(-1);
  expect(ninety.page).toBe(1);
  expect(Math.round((Date.parse(ninety.to) - Date.parse(ninety.from)) / 86400000)).toBe(90);
  await dialog.getByRole('combobox', { name: 'Período de la actividad' }).selectOption('7');
  await expect(dialog.getByText('Sin actividad registrada en este período.')).toBeVisible();
});

test('un error al cargar la actividad se informa y permite reintentar', async ({ page }) => {
  const calls = await mockStaffApi(page, { failActivity: true });
  await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ver actividad de Leo Paz' }).click();
  const dialog = page.getByRole('dialog', { name: 'Actividad de Leo Paz' });
  await expect(dialog.getByRole('alert')).toContainText('Error interno del servidor.');
  await dialog.getByRole('button', { name: 'Reintentar' }).click();
  await expect.poll(() => calls.activity.length).toBe(2);
});

test('un error al cargar se informa y permite reintentar', async ({ page }) => {
  await mockStaffApi(page, { failList: true });
  await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('alert').filter({ hasText: 'Error interno del servidor.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});

test.describe('Supervisor', () => {
  test.use({ role: 'SUPERVISOR' });
  test('no ve Personal en el menú ni puede gestionar cuentas', async ({ page }) => {
    const calls = await mockStaffApi(page);
    let listed = 0;
    page.on('request', (r) => {
      if (r.url().includes('/api/v1/users/staff')) listed += 1;
    });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const sidebar = page.locator('#app-sidebar');
    await sidebar.getByRole('button', { name: 'GESTIÓN', exact: true }).click();
    await expect(sidebar.getByRole('link', { name: 'Reportes', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Personal', exact: true })).toHaveCount(0);

    await page.goto('/management/staff', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('La gestión de personal está disponible para el Administrador.')).toBeVisible();
    expect(listed).toBe(0);
    expect(calls.created).toEqual([]);
  });
});
