const { test, expect } = require('./support/fixtures.cjs');

// Simula sedes y franjas del servidor con estado en memoria y reglas equivalentes a las reales.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guayaquil',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const plus = (days) => {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const ddmm = (ymd) => ymd.split('-').reverse().join('/');

async function mockSlotsApi(page, { failList = false } = {}) {
  const site = { id: 'f1', name: 'Local Samborondón', active: true };
  const state = {
    slots: [
      { id: 's1', facilityId: 'f1', context: 'DRIVER_PICKUP', date: plus(1), startTime: '08:00', endTime: '12:00', capacity: 10, reservedCount: 3, active: true },
      { id: 's2', facilityId: 'f1', context: 'DRIVER_PICKUP', date: plus(1), startTime: '13:00', endTime: '17:00', capacity: 2, reservedCount: 2, active: true },
      { id: 's3', facilityId: 'f1', context: 'DRIVER_DELIVERY', date: plus(2), startTime: '08:00', endTime: '12:00', capacity: 5, reservedCount: 0, active: true },
    ],
  };
  const calls = { gets: [], writes: [] };
  const json = (route, status, body) =>
    route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  const view = (s) => ({ ...s, available: s.active ? Math.max(s.capacity - s.reservedCount, 0) : 0 });

  await page.route(/\/api\/v1\/facilities(\?.*)?$/, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: preflight })
      : json(route, 200, [site]),
  );

  await page.route(/\/api\/v1\/slots(\/[^/?]+)?(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const id = url.pathname.match(/\/slots\/([^/]+)$/)?.[1];
    if (req.method() === 'GET') {
      const q = Object.fromEntries(url.searchParams);
      calls.gets.push(q);
      if (failList) return json(route, 500, { message: 'Error interno del servidor.' });
      const rows = state.slots
        .filter((s) => s.facilityId === q.facilityId && s.context === q.context)
        .filter((s) => (!q.from || s.date >= q.from) && (!q.to || s.date <= q.to))
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
      return json(route, 200, rows.map(view));
    }
    const body = req.postDataJSON();
    calls.writes.push({ method: req.method(), id: id ?? null, body });
    if (req.method() === 'POST') {
      const clash = state.slots.find(
        (s) =>
          s.facilityId === body.facilityId &&
          s.context === body.context &&
          s.date === body.date &&
          body.startTime < s.endTime &&
          s.startTime < body.endTime,
      );
      if (clash)
        return json(route, 409, { message: `Se solapa con la franja ${clash.startTime}-${clash.endTime}.` });
      const row = { id: `n${state.slots.length + 1}`, reservedCount: 0, active: true, ...body };
      state.slots.push(row);
      return json(route, 201, view(row));
    }
    const target = state.slots.find((s) => s.id === id);
    if (body.capacity !== undefined && body.capacity < target.reservedCount)
      return json(route, 409, {
        message: `La capacidad no puede ser menor que los cupos ya reservados (${target.reservedCount}).`,
      });
    Object.assign(target, body);
    return json(route, 200, view(target));
  });

  // Plantilla semanal con la misma generación que el servidor (28 días, sin duplicar ni solapar).
  state.templates = [];
  calls.templates = [];
  const generate = (facilityId) => {
    const r = { created: 0, existing: 0, conflicts: 0, horizonDays: 28, until: plus(27) };
    for (let i = 0; i < 28; i++) {
      const date = plus(i);
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      for (const t of state.templates.filter((x) => x.active && x.weekday === weekday && x.facilityId === facilityId)) {
        const sameDay = state.slots.filter((s) => s.facilityId === t.facilityId && s.context === t.context && s.date === date);
        if (sameDay.some((s) => s.startTime === t.startTime && s.endTime === t.endTime)) r.existing++;
        else if (sameDay.some((s) => t.startTime < s.endTime && s.startTime < t.endTime)) r.conflicts++;
        else {
          state.slots.push({
            id: `g${state.slots.length + 1}`, facilityId: t.facilityId, context: t.context, date,
            startTime: t.startTime, endTime: t.endTime, capacity: t.capacity, reservedCount: 0, active: true,
          });
          r.created++;
        }
      }
    }
    return r;
  };
  await page.route(/\/api\/v1\/slot-templates(\/[^/?]+)?(\?.*)?$/, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const url = new URL(req.url());
    const id = url.pathname.match(/\/slot-templates\/([^/]+)$/)?.[1];
    if (req.method() === 'GET') {
      const q = Object.fromEntries(url.searchParams);
      return json(route, 200, state.templates.filter((t) => t.facilityId === q.facilityId && t.context === q.context));
    }
    const body = req.postDataJSON();
    calls.templates.push({ method: req.method(), id: id ?? null, body });
    if (id === 'generate') return json(route, 201, generate(body.facilityId));
    if (req.method() === 'POST') {
      const clash = state.templates.find(
        (t) => t.facilityId === body.facilityId && t.context === body.context && t.weekday === body.weekday &&
          body.startTime < t.endTime && t.startTime < body.endTime,
      );
      if (clash)
        return json(route, 409, { message: `Se solapa con la franja semanal ${clash.startTime}-${clash.endTime}.` });
      const row = { id: `t${state.templates.length + 1}`, active: true, ...body };
      state.templates.push(row);
      return json(route, 201, { ...row, generated: generate(row.facilityId) });
    }
    const target = state.templates.find((t) => t.id === id);
    Object.assign(target, body);
    return json(route, 200, { ...target, generated: target.active ? generate(target.facilityId) : null });
  });

  // Política vigente: el panel de política se carga en la misma pantalla.
  const policy = {
    id: 'p1', version: 1, active: true, timezone: 'America/Guayaquil', reason: 'Base',
    createdAt: new Date().toISOString(), taxRate: '0.15', pickupFee: '1.5', deliveryFee: '1.5',
    taxIncluded: false, blockNewOrdersOnCharges: false, enforceDriverLimit: false,
    driverMayReorder: false, requireStorePickupSlot: false,
  };
  await page.route(/\/api\/v1\/policy(\/history)?$/, (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: preflight })
      : json(route, 200, route.request().url().endsWith('/history') ? [policy] : policy),
  );
  return calls;
}

const rows = (page) => page.getByRole('table', { name: 'Franjas horarias' }).locator('tbody tr');
const openSettings = (page) => page.goto('/settings', { waitUntil: 'domcontentloaded' });

test('lista las franjas del servidor con cupos, reservas y disponibles', async ({ page }) => {
  const calls = await mockSlotsApi(page);
  await openSettings(page);
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).first()).toContainText(ddmm(plus(1)));
  await expect(rows(page).first()).toContainText('08:00 - 12:00');
  await expect(rows(page).first()).toContainText('Activa');
  await expect(rows(page).nth(1)).toContainText('Completa');
  await expect(page.getByText('2 franjas · 12 cupos activos · 5 reservados · 7 disponibles')).toBeVisible();
  // El personal pide todas las franjas, también las llenas, del rango visible.
  expect(calls.gets[0]).toEqual({
    facilityId: 'f1',
    context: 'DRIVER_PICKUP',
    onlyAvailable: 'false',
    from: today,
    to: plus(13),
  });

  await page.getByLabel('Tipo de tramo').selectOption('DRIVER_DELIVERY');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText(ddmm(plus(2)));
});

test('crear una franja valida los campos y la guarda en el servidor', async ({ page }) => {
  const calls = await mockSlotsApi(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'Nueva franja', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nueva franja', exact: true });
  await dialog.getByLabel('Hora de inicio', { exact: true }).fill('14:00');
  await dialog.getByLabel('Hora de fin', { exact: true }).fill('12:00');
  await dialog.getByRole('button', { name: 'Crear franja' }).click();
  await expect(dialog.getByText('Debe ser posterior a la hora de inicio.')).toBeVisible();
  await expect(dialog.getByText('Los cupos deben ser un número entero mayor a cero.')).toBeVisible();
  expect(calls.writes).toEqual([]);

  await dialog.getByLabel('Fecha', { exact: true }).fill(plus(3));
  await dialog.getByLabel('Hora de inicio', { exact: true }).fill('17:00');
  await dialog.getByLabel('Hora de fin', { exact: true }).fill('20:00');
  await dialog.getByLabel('Cupos por franja', { exact: true }).fill('8');
  await dialog.getByRole('button', { name: 'Crear franja' }).click();
  await expect(dialog).toHaveCount(0);
  expect(calls.writes).toEqual([
    {
      method: 'POST',
      id: null,
      body: { facilityId: 'f1', context: 'DRIVER_PICKUP', date: plus(3), startTime: '17:00', endTime: '20:00', capacity: 8 },
    },
  ]);
  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).nth(2)).toContainText('17:00 - 20:00');
});

test('repetir una franja crea un día por fecha e informa los días que chocan', async ({ page }) => {
  const calls = await mockSlotsApi(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'Nueva franja', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nueva franja', exact: true });
  await dialog.getByLabel('Fecha', { exact: true }).fill(plus(1));
  await dialog.getByLabel('Repetir hasta (opcional)', { exact: true }).fill(plus(3));
  await dialog.getByLabel('Hora de inicio', { exact: true }).fill('09:00');
  await dialog.getByLabel('Hora de fin', { exact: true }).fill('11:00');
  await dialog.getByLabel('Cupos por franja', { exact: true }).fill('4');
  await dialog.getByRole('button', { name: 'Crear 3 franjas' }).click();
  // El primer día choca con la franja de 08:00 a 12:00; los otros dos se crean.
  await expect(dialog.getByRole('alert')).toContainText('Una franja no se creó:');
  await expect(dialog.getByRole('alert')).toContainText('Se solapa con la franja 08:00-12:00.');
  expect(calls.writes.map((w) => w.body.date)).toEqual([plus(1), plus(2), plus(3)]);
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(rows(page)).toHaveCount(4);
});

test('los cupos se editan sin bajar de lo reservado y la franja se puede desactivar', async ({ page }) => {
  const calls = await mockSlotsApi(page);
  await openSettings(page);
  await page.getByRole('button', { name: `Editar cupos ${plus(1)} 08:00 - 12:00` }).click();
  const dialog = page.getByRole('dialog', { name: /^Cupos:/ });
  await dialog.getByLabel('Cupos de la franja', { exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'Guardar cupos' }).click();
  await expect(dialog.getByText('No puede ser menor que los cupos ya reservados (3).')).toBeVisible();
  await dialog.getByLabel('Cupos de la franja', { exact: true }).fill('15');
  await dialog.getByRole('button', { name: 'Guardar cupos' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(rows(page).first()).toContainText('12');

  await page.getByRole('button', { name: `Desactivar ${plus(1)} 08:00 - 12:00` }).click();
  await expect(rows(page).first()).toContainText('Inactiva');
  expect(calls.writes.map((w) => [w.method, w.id, w.body])).toEqual([
    ['PATCH', 's1', { capacity: 15 }],
    ['PATCH', 's1', { active: false }],
  ]);
});

test('sin franjas se avisa lo que verá el cliente y un error de carga se puede reintentar', async ({ page }) => {
  await mockSlotsApi(page, { failList: true });
  await openSettings(page);
  await expect(page.getByRole('alert').filter({ hasText: 'No se pudieron cargar las franjas.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});

test('una sede sin franjas muestra el aviso de que el cliente no verá horarios', async ({ page }) => {
  await mockSlotsApi(page);
  await openSettings(page);
  await page.getByLabel('Tipo de tramo').selectOption('FACILITY_PICKUP');
  await expect(rows(page).first()).toContainText('No hay franjas de retiro en sede en Local Samborondón');
});

const templateRows = (page) => page.getByRole('table', { name: 'Plantilla semanal' }).locator('tbody tr');
const weekdayName = (ymd) =>
  ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(`${ymd}T00:00:00Z`).getUTCDay()];

test('la plantilla semanal crea las franjas de los próximos días y las muestra en la agenda', async ({ page }) => {
  const calls = await mockSlotsApi(page);
  await openSettings(page);
  await expect(templateRows(page).first()).toContainText('Sin plantilla');
  await page.getByRole('button', { name: 'Nueva franja semanal', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nueva franja semanal' });
  await dialog.getByRole('button', { name: 'Guardar franja semanal' }).click();
  await expect(dialog.getByText('Elige al menos un día.')).toBeVisible();
  expect(calls.templates).toEqual([]);

  // El día de pasado mañana, a una hora libre: aparece 4 veces en los próximos 28 días.
  await dialog.getByLabel(weekdayName(plus(2)), { exact: true }).check();
  await dialog.getByLabel('Hora de inicio', { exact: true }).fill('18:00');
  await dialog.getByLabel('Hora de fin', { exact: true }).fill('20:00');
  await dialog.getByLabel('Cupos por franja', { exact: true }).fill('7');
  await dialog.getByRole('button', { name: 'Guardar franja semanal' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('4 franjas creadas en la agenda.')).toBeVisible();
  expect(calls.templates[0].body).toEqual({
    facilityId: 'f1',
    context: 'DRIVER_PICKUP',
    weekday: new Date(`${plus(2)}T00:00:00Z`).getUTCDay(),
    startTime: '18:00',
    endTime: '20:00',
    capacity: 7,
  });
  await expect(templateRows(page)).toHaveCount(1);
  await expect(templateRows(page).first()).toContainText(weekdayName(plus(2)));
  await expect(templateRows(page).first()).toContainText('18:00 - 20:00');
  // La agenda (próximos 14 días) muestra las 2 nuevas que caen en el rango.
  await expect(rows(page)).toHaveCount(4);
  await expect(rows(page).filter({ hasText: '18:00 - 20:00' })).toHaveCount(2);

  // Generar otra vez no duplica.
  await page.getByRole('button', { name: 'Generar ahora' }).click();
  await expect(page.getByText('0 franjas creadas')).toBeVisible();
  await expect(rows(page)).toHaveCount(4);
});

test('varios días a la vez: informa el día que choca y desactivar no borra la agenda', async ({ page }) => {
  const calls = await mockSlotsApi(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'Nueva franja semanal', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Nueva franja semanal' });
  await dialog.getByRole('button', { name: 'Lunes a viernes' }).click();
  await dialog.getByLabel('Hora de inicio', { exact: true }).fill('06:00');
  await dialog.getByLabel('Hora de fin', { exact: true }).fill('07:00');
  await dialog.getByLabel('Cupos por franja', { exact: true }).fill('3');
  await dialog.getByRole('button', { name: 'Guardar franja semanal' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(templateRows(page)).toHaveCount(5);

  // Repetir el lunes con un horario que se solapa: ese día se informa y los demás se guardan.
  await page.getByRole('button', { name: 'Nueva franja semanal', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Nueva franja semanal' });
  await dialog.getByLabel('Lunes', { exact: true }).check();
  await dialog.getByLabel('Sábado', { exact: true }).check();
  await dialog.getByLabel('Hora de inicio', { exact: true }).fill('06:30');
  await dialog.getByLabel('Hora de fin', { exact: true }).fill('07:30');
  await dialog.getByLabel('Cupos por franja', { exact: true }).fill('3');
  await dialog.getByRole('button', { name: 'Guardar franja semanal' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Lunes: Se solapa con la franja semanal 06:00-07:00.');
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(templateRows(page)).toHaveCount(6);

  const before = await rows(page).count();
  await page.getByRole('button', { name: 'Desactivar semanal Lunes 06:00 - 07:00' }).click();
  await expect(templateRows(page).first()).toContainText('Inactiva');
  await expect(rows(page)).toHaveCount(before);
  expect(calls.templates.at(-1)).toEqual({ method: 'PATCH', id: 't1', body: { active: false } });
});
