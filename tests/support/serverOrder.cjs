// El detalle y la lista de Solicitudes solo muestran datos del servidor (T-11). Las pruebas que
// los abren simulan aquí la respuesta del servidor para una solicitud.
const cors = { 'access-control-allow-origin': '*' };
const preflight = { ...cors, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

/** Solicitud tal como la devuelve GET /orders/:id. */
const serverOrder = (id, status = 'CONFIRMED', extra = {}) => ({
  id,
  number: 3001,
  status,
  mode: 'HOME_HOME',
  facilityId: 'f1',
  paymentStatus: 'PAID',
  pricingStatus: 'ESTIMATED',
  total: '15.00',
  version: 3,
  createdAt: '2026-11-19T13:00:00.000Z',
  items: [],
  legs: [],
  events: [],
  incidents: [],
  ...extra,
});

/** Responde GET /orders/<id> (y sus subrutas de consulta) con la solicitud dada. */
async function mockServerOrder(page, order) {
  await page.route(new RegExp(`/api/v1/orders/${order.id}(/handoffs)?$`), (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: preflight });
    if (req.method() !== 'GET') return route.fallback();
    const body = req.url().endsWith('/handoffs') ? [] : order;
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

module.exports = { serverOrder, mockServerOrder };
