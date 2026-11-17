const { test, expect } = require('./support/fixtures.cjs');

// Proceso en planta contra un servidor simulado que avanza los estados como el real.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ORDER = 'SOL-HOME-001';

async function mockServer(page, { pricingModel = 'PER_WEIGHT', status = 'AT_FACILITY', amountDue = '0', paymentMethodKind = 'WALLET' } = {}) {
  const state = {
    order: {
      id: ORDER, number: 1001, status, mode: 'HOME_HOME', facilityId: 'f1', paymentStatus: amountDue === '0' ? 'PAID' : 'PENDING',
      pricingStatus: 'ESTIMATED', pricingModel, estimatedWeightLb: '10', total: '22.00', amountPaid: '22.00', amountDue,
      paymentMethodKind, version: 10, createdAt: new Date().toISOString(), items: [], legs: [], events: [],
    },
    adjustments: [],
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
    if (path === `/orders/${ORDER}/adjustments` && req.method() === 'GET') return json(route, 200, state.adjustments);
    if (path === `/orders/${ORDER}/transitions`) return json(route, 201, bump({ status: body.to }));
    if (path === `/orders/${ORDER}/weight`) return json(route, 201, bump({ status: 'INSPECTION' }));
    if (path === `/orders/${ORDER}/adjustments`) {
      const a = {
        id: `adj-${state.adjustments.length + 1}`, type: body.type, internalReason: body.internalReason,
        customerMessage: body.customerMessage, amountDifference: String(body.amountDifference),
        requiresCustomerApproval: body.amountDifference > 0,
        status: body.amountDifference > 0 ? 'PENDING_CUSTOMER' : 'APPROVED', createdAt: new Date().toISOString(),
      };
      state.adjustments.push(a);
      bump({});
      return json(route, 201, a);
    }
    if (path === `/orders/${ORDER}/pricing/resolve`) {
      const pending = state.adjustments.some((a) => a.status === 'PENDING_CUSTOMER');
      return json(route, 201, bump({ status: pending ? 'CUSTOMER_APPROVAL_PENDING' : 'IN_PROCESS' }));
    }
    if (path === `/orders/${ORDER}/confirm-payment`) return json(route, 201, bump({ paymentStatus: 'PAID', amountDue: '0' }));
    if (path === `/orders/${ORDER}`) return json(route, 200, state.order);
    return json(route, 200, []);
  });
  return { state, calls };
}

const panelOf = async (page) => {
  await page.goto(`/operations/orders/${ORDER}`, { waitUntil: 'domcontentloaded' });
  return page.getByRole('region', { name: 'Proceso en planta' });
};

test('servicio por peso: pesaje, ajuste con aprobación del cliente, precio, lavado y lista para entrega', async ({ page }) => {
  const { state, calls } = await mockServer(page);
  const panel = await panelOf(page);
  await expect(panel).toContainText('Por peso');
  await panel.getByRole('button', { name: 'Iniciar pesaje', exact: true }).click();

  const weight = panel.getByRole('textbox', { name: 'Peso real (lb)' });
  await panel.getByRole('button', { name: 'Registrar peso', exact: true }).click();
  await expect(panel.getByText('Ingresa el peso en libras, mayor a cero.')).toBeVisible();
  await weight.fill('12.5');
  await panel.getByRole('button', { name: 'Registrar peso', exact: true }).click();
  await expect(panel).toContainText('Inspección');

  // Ajuste que sube el precio: requiere aprobación del cliente.
  await panel.getByRole('button', { name: 'Agregar ajuste', exact: true }).click();
  await expect(panel.getByText('Escribe el mensaje que verá el cliente.')).toBeVisible();
  await panel.getByRole('textbox', { name: 'Monto ($)' }).fill('2.50');
  await panel.getByRole('textbox', { name: 'Mensaje para el cliente' }).fill('Tratamiento de mancha');
  await panel.getByRole('textbox', { name: 'Motivo interno' }).fill('Mancha de vino en camisa');
  await panel.getByRole('button', { name: 'Agregar ajuste', exact: true }).click();
  await expect(panel.getByRole('list', { name: 'Ajustes de precio' })).toContainText('+$2.50 · Esperando al cliente');

  await panel.getByRole('button', { name: 'Pasar a cálculo del precio', exact: true }).click();
  await panel.getByRole('button', { name: 'Fijar precio', exact: true }).click();
  await expect(panel).toContainText('Esperando la decisión del cliente sobre un ajuste.');
  await expect(panel.getByRole('button', { name: 'Fijar precio', exact: true })).toBeDisabled();

  // El cliente aprueba desde su app; la sede recarga y fija el precio.
  state.adjustments[0].status = 'APPROVED';
  await page.reload();
  await panel.getByRole('button', { name: 'Fijar precio', exact: true }).click();
  await panel.getByRole('button', { name: 'Pasar a control de calidad', exact: true }).click();
  await panel.getByRole('button', { name: 'Marcar lista para entrega', exact: true }).click();
  await expect(panel).toHaveCount(0);

  expect(calls.map(([p, b]) => [p, b.to ?? null])).toEqual([
    ['/transitions', 'WEIGHING'],
    ['/weight', null],
    ['/adjustments', null],
    ['/transitions', 'PRICING_PENDING'],
    ['/pricing/resolve', null],
    ['/pricing/resolve', null],
    ['/transitions', 'QUALITY_CONTROL'],
    ['/transitions', 'READY_FOR_DELIVERY'],
  ]);
  // 12.5 lb en gramos.
  expect(calls[1][1]).toMatchObject({ weightGrams: 5670 });
  expect(calls[2][1]).toMatchObject({
    type: 'EXTRA_ITEM', amountDifference: 2.5, customerMessage: 'Tratamiento de mancha', internalReason: 'Mancha de vino en camisa',
  });
});

test('servicio por prenda: no se pesa, pasa directo a la inspección', async ({ page }) => {
  const { calls } = await mockServer(page, { pricingModel: 'FIXED' });
  const panel = await panelOf(page);
  await expect(panel).toContainText('Por prenda');
  await expect(panel.getByRole('button', { name: 'Iniciar pesaje', exact: true })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Iniciar inspección', exact: true }).click();
  await expect(panel).toContainText('Inspección');
  expect(calls).toEqual([['/transitions', expect.objectContaining({ to: 'INSPECTION' })]]);
});

test('con saldo pendiente por transferencia, la sede confirma el pago', async ({ page }) => {
  const { calls } = await mockServer(page, { status: 'IN_PROCESS', amountDue: '5.34', paymentMethodKind: 'TRANSFER' });
  const panel = await panelOf(page);
  await expect(panel).toContainText('$5.34');
  await panel.getByRole('button', { name: 'Confirmar pago por transferencia', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Confirmar pago por transferencia', exact: true })).toHaveCount(0);
  expect(calls[0][0]).toBe('/confirm-payment');
});
