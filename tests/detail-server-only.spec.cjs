const { test, expect } = require('./support/fixtures.cjs');

// El detalle no ofrece acciones que solo cambiarían el navegador: lo que confirma el chofer se
// muestra como información, no hay "Override" local y el cierre queda en su panel del servidor.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ORDER = 'SOL-HOME-001';
const json = (route, status, body) =>
  route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });

async function mockOrder(page, status, extra = {}) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const facilityId = await page.evaluate((id) => {
    const raw = JSON.parse(localStorage.getItem('lw_workflow_v2') || '{}');
    return (raw.orders || []).find((o) => o.id === id)?.facilityId ?? 'f1';
  }, ORDER);
  const order = {
    id: ORDER, number: 3001, status, mode: 'HOME_HOME', facilityId, paymentStatus: 'PAID',
    pricingStatus: 'ESTIMATED', total: '15.00', version: 5, createdAt: '2026-11-19T13:00:00.000Z',
    items: [], legs: [], events: [], incidents: [], ...extra,
  };
  await page.route(/\/api\/v1\/(orders|incidents)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path === `/orders/${ORDER}`) return json(route, 200, order);
    if (path === '/incidents') return json(route, 200, []);
    if (req.method() !== 'GET') return route.abort('internetdisconnected');
    return json(route, 200, []);
  });
}

test('en etapas del chofer el detalle solo informa y no hay cambio de estado local', async ({ page }) => {
  await mockOrder(page, 'HEADING_TO_PICKUP');
  await page.goto(`/operations/orders/${ORDER}`);
  await expect(page.getByRole('heading', { name: 'Conductor en camino a recoger' })).toBeVisible();
  await expect(page.getByText(/Lo registra el chofer desde su app/)).toBeVisible();
  for (const local of [
    'Marcar llegada al domicilio',
    'Iniciar recorrido de recogida',
    'Confirmar prendas recogidas',
    'Trasladar a planta',
  ])
    await expect(page.getByRole('button', { name: local })).toHaveCount(0);

  await page.getByRole('button', { name: /^Acciones/ }).click();
  await expect(page.getByRole('button', { name: 'Retener para revisión técnica' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Override Admin' })).toHaveCount(0);
});

test('en planta y en el cierre el detalle no repite los pasos de los paneles del servidor', async ({ page }) => {
  await mockOrder(page, 'DELIVERED');
  await page.goto(`/operations/orders/${ORDER}`);
  await expect(page.getByRole('heading', { name: 'Pedido entregado' })).toBeVisible();
  // El cierre lo hace el panel "Cierre de la solicitud" contra el servidor, no un botón local.
  await expect(page.getByRole('region', { name: 'Cierre de la solicitud' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar solicitud' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Confirmar entrega completada' })).toHaveCount(0);
});

test('la agenda en Logística es de solo lectura: no hay reprogramación local', async ({ page }) => {
  await mockOrder(page, 'CONFIRMED');
  await page.goto(`/operations/orders/${ORDER}`);
  await expect(page.getByRole('heading', { name: 'Recogida pendiente de asignación' })).toBeVisible();
  await page.getByRole('button', { name: 'Logística', exact: true }).click();
  const agenda = page.getByRole('region', { name: 'Agenda y horarios' });
  await expect(agenda).toBeVisible();
  await expect(agenda.getByText('La reprogramación por el personal aún no está disponible.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Reprogramar fecha/ })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

// T-07: en planta el detalle no gestiona el proceso ni retiene; enlaza a Planta.
test('en planta el detalle muestra la fase y enlaza a Planta, sin botones de proceso ni retención', async ({ page }) => {
  await mockOrder(page, 'INSPECTION');
  await page.goto(`/operations/orders/${ORDER}`);
  await expect(page.getByRole('heading', { name: 'Pedido en planta' })).toBeVisible();
  const href = `/operations/plant?pedido=${ORDER}&seccion=proceso`;
  await expect(page.getByRole('link', { name: 'Gestionar en Planta' })).toHaveAttribute('href', href);
  await expect(page.getByRole('region', { name: 'Proceso en planta' })).toHaveCount(0);
  for (const action of ['Iniciar inspección', 'Registrar peso', 'Proponer ajuste', 'Confirmar precio', 'Pasar a control de calidad'])
    await expect(page.getByRole('button', { name: new RegExp(action) })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retener para revisión técnica' })).toHaveCount(0);

  // Acciones: retener se hace en Planta.
  await page.getByRole('button', { name: /^Acciones/ }).click();
  await expect(page.getByRole('link', { name: 'Retener en Planta' })).toHaveAttribute('href', href);
  await page.getByRole('button', { name: /^Acciones/ }).click();

  // Registrar incidencia sigue disponible, pero sin la casilla de retención.
  await page.getByRole('button', { name: 'Registrar incidencia' }).click();
  const modal = page.getByRole('dialog', { name: 'Registrar incidencia operacional' });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('checkbox', { name: /Retener la solicitud/ })).toHaveCount(0);
});

test('en lavado el detalle tampoco ofrece retener: el enlace lleva a Planta', async ({ page }) => {
  await mockOrder(page, 'IN_PROCESS');
  await page.goto(`/operations/orders/${ORDER}`);
  await expect(page.getByRole('heading', { name: 'En ciclo de lavado y cuidado' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Gestionar en Planta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retener para revisión técnica' })).toHaveCount(0);
});

// T-09b: el pago se confirma solo en Pedido (decisión P-3); Operación avisa y enlaza.
test('una transferencia pendiente se avisa en Operación y se confirma solo en Pedido', async ({ page }) => {
  await mockOrder(page, 'IN_PROCESS', { paymentMethodKind: 'TRANSFER', paymentStatus: 'PENDING' });
  await page.goto(`/operations/orders/${ORDER}`);
  const notice = page.getByRole('status', { name: 'Transferencia pendiente' });
  await expect(notice).toContainText('pago por transferencia');
  await expect(page.getByText('Transferencia · PENDIENTE')).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirmar transferencia/ })).toHaveCount(0);
  await notice.getByRole('button', { name: 'Confirmar en la pestaña Pedido' }).click();
  await expect(page.getByText('Forma de pago registrada')).toBeVisible();
  await expect(page.getByText('Transferencia', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirmar pago verificado/ })).toBeVisible();
});

test('sin método informado por el servidor se muestra "Sin definir" y no hay aviso de transferencia', async ({ page }) => {
  await mockOrder(page, 'IN_PROCESS', { paymentStatus: 'PENDING' });
  await page.goto(`/operations/orders/${ORDER}`);
  await expect(page.getByText('Sin definir · PENDIENTE')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Transferencia pendiente' })).toHaveCount(0);
});

// T-11 (contrato 4): sin respuesta del servidor no se muestran datos guardados en el equipo.
test('con el servidor caído el detalle muestra el error con Reintentar y ninguna acción', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  let down = true;
  const order = {
    id: ORDER, number: 3001, status: 'CONFIRMED', mode: 'HOME_HOME', facilityId: 'f1', paymentStatus: 'PAID',
    pricingStatus: 'ESTIMATED', total: '15.00', version: 5, createdAt: '2026-11-19T13:00:00.000Z',
    items: [], legs: [], events: [], incidents: [],
  };
  await page.route(/\/api\/v1\/(orders|incidents)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    if (down) return route.abort('internetdisconnected');
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path === `/orders/${ORDER}`) return json(route, 200, order);
    return json(route, 200, []);
  });
  await page.goto(`/operations/orders/${ORDER}`);
  const alert = page.getByRole('alert').filter({ hasText: 'No se pudo cargar la solicitud desde el servidor' });
  await expect(alert).toContainText('No se pudo conectar con el servidor.');
  await expect(alert).toContainText('No se muestran datos guardados en este equipo');
  // Aunque la solicitud esté guardada en el equipo, no se ofrece ninguna acción sobre ella.
  for (const name of ['Registrar incidencia', 'Acciones', 'Logística'])
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Asignar en Despacho' })).toHaveCount(0);

  down = false;
  await alert.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: 'Recogida pendiente de asignación' })).toBeVisible();
  await expect(alert).toHaveCount(0);
});

test('si el servidor responde que no existe se muestra "Solicitud no encontrada"', async ({ page }) => {
  await page.route(/\/api\/v1\/(orders|incidents)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path.startsWith('/orders/')) return json(route, 404, { message: 'Solicitud no encontrada.' });
    return json(route, 200, []);
  });
  await page.goto(`/operations/orders/${ORDER}`);
  await expect(page.getByRole('heading', { name: 'Solicitud no encontrada' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar incidencia' })).toHaveCount(0);
});

test('con el servidor caído la lista de Solicitudes no muestra datos guardados en el equipo', async ({ page }) => {
  let down = true;
  await page.route(/\/api\/v1\/orders(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    if (down) return json(route, 503, { message: 'Servidor en mantenimiento.' });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path !== '/orders') return json(route, 404, { message: 'No existe.' });
    const data = [{ id: ORDER, number: 3001, status: 'CONFIRMED', mode: 'HOME_HOME', facilityId: 'f1', paymentStatus: 'PAID', pricingStatus: 'ESTIMATED', total: '15.00', version: 1, createdAt: '2026-11-19T13:00:00.000Z' }];
    return json(route, 200, { page: 1, pageSize: 50, total: 1, data });
  });
  await page.goto('/operations/orders');
  const alert = page.getByRole('alert').filter({ hasText: 'No se pudieron cargar las solicitudes del servidor' });
  await expect(alert).toContainText('Servidor en mantenimiento.');
  await expect(page.getByRole('table')).toHaveCount(0);

  down = false;
  await alert.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  // Solo la solicitud que devolvió el servidor; ninguna otra guardada en el equipo.
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('table')).toContainText('SOL-3001');
});

test('si falla la consulta de la custodia de salida se muestra el error con Reintentar', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  let detailServed = false;
  let failing = true;
  const order = {
    id: ORDER, number: 3001, status: 'DELIVERY_ASSIGNED', mode: 'HOME_HOME', facilityId: 'f1', paymentStatus: 'PAID',
    pricingStatus: 'FINAL', total: '15.00', version: 5, createdAt: '2026-11-19T13:00:00.000Z',
    items: [], legs: [], events: [], incidents: [],
  };
  await page.route(/\/api\/v1\/(orders|incidents)(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    if (path === `/orders/${ORDER}`) {
      // La primera consulta (la del detalle) responde; las siguientes (el panel de custodia)
      // fallan hasta que la prueba lo desactiva.
      if (detailServed && failing) return json(route, 503, { message: 'Servidor ocupado.' });
      detailServed = true;
      return json(route, 200, order);
    }
    return json(route, 200, []);
  });
  await page.goto(`/operations/orders/${ORDER}`);
  const panel = page.getByRole('region', { name: 'Custodia de salida' });
  await expect(panel).toContainText('No se pudo consultar la custodia de salida en el servidor.');
  await expect(panel).toContainText('Servidor ocupado.');
  failing = false;
  await panel.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('region', { name: 'Entrega al chofer para reparto' })).toBeVisible();
});
