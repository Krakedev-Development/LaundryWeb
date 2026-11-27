const { test, expect } = require('./support/fixtures.cjs');

const cors = { 'access-control-allow-origin': '*' };
const preflight = {
  ...cors,
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

test('order detail chat loads and sends messages, and topbar marks notifications read', async ({
  page,
}) => {
  const orderId = '11111111-1111-4111-8111-111111111111';
  const messages = [
    {
      id: 'msg-1',
      orderId,
      senderId: 'cust-user-1',
      senderName: 'Lucia Cliente',
      senderRole: 'CLIENT',
      text: 'Hola, el portero tiene las bolsas.',
      createdAt: '2026-11-27T10:00:00.000Z',
    },
  ];
  const notifications = [
    {
      id: 'notif-1',
      orderId,
      category: 'CHAT',
      title: 'Nuevo mensaje · Pedido #101',
      body: 'Lucia Cliente: Hola, el portero tiene las bolsas.',
      readAt: null,
      createdAt: '2026-11-27T10:00:05.000Z',
    },
  ];
  let unread = 1;
  let readCalled = false;

  const json = (route, code, body) =>
    route.fulfill({
      status: code,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

  await page.route(
    /\/api\/v1\/(orders\/[^/]+(\/messages)?|notifications(\/[^?]*)?|incidents)(\?.*)?$/,
    (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: preflight });
      }
      const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');

      if (path === '/incidents') return json(route, 200, []);

      if (path === `/orders/${orderId}` && req.method() === 'GET') {
        return json(route, 200, {
          id: orderId,
          number: 101,
          status: 'CONFIRMED',
          mode: 'HOME_HOME',
          pricingModel: 'FIXED',
          pricingStatus: 'CALCULATED',
          paymentStatus: 'PAID',
          facilityId: 'fac-1',
          customerId: 'cust-1',
          customerName: 'Lucia Cliente',
          customerEmail: 'lucia@example.com',
          itemsSubtotal: 20,
          extrasTotal: 0,
          discount: 0,
          membershipDiscount: 0,
          logisticsFee: 3,
          tax: 0,
          total: 23,
          version: 1,
          createdAt: '2026-11-27T09:50:00.000Z',
          updatedAt: '2026-11-27T09:50:00.000Z',
          items: [],
          extras: [],
          legs: [],
          events: [],
          handoffs: [],
          adjustments: [],
        });
      }

      if (path === `/orders/${orderId}/messages` && req.method() === 'GET') {
        return json(route, 200, messages);
      }

      if (path === `/orders/${orderId}/messages` && req.method() === 'POST') {
        const body = req.postDataJSON();
        const created = {
          id: 'msg-2',
          orderId,
          senderId: 'admin-1',
          senderName: 'Admin Sede',
          senderRole: 'ADMIN',
          text: body.text,
          createdAt: '2026-11-27T10:01:00.000Z',
        };
        messages.push(created);
        return json(route, 201, created);
      }

      if (path === '/notifications' && req.method() === 'GET') {
        return json(route, 200, {
          page: 1,
          pageSize: 20,
          total: notifications.length,
          unread,
          data: notifications,
        });
      }

      if (path === '/notifications/notif-1/read' && req.method() === 'POST') {
        readCalled = true;
        unread = 0;
        notifications[0].readAt = '2026-11-27T10:02:00.000Z';
        return json(route, 201, { id: 'notif-1', read: true });
      }

      return json(route, 404, { message: 'Not found' });
    },
  );

  await page.goto(`/operations/orders/${orderId}`, {
    waitUntil: 'domcontentloaded',
  });

  // TopBar muestra la notificación del servidor y al hacer clic la marca leída y abre tab Chat.
  await page.getByRole('button', { name: 'Notificaciones' }).click();
  await expect(page.getByText('Nuevo mensaje · Pedido #101')).toBeVisible();
  await page.getByText('Nuevo mensaje · Pedido #101').click();
  await expect.poll(() => readCalled).toBe(true);

  await expect(page.getByText('Hola, el portero tiene las bolsas.')).toBeVisible();
  await page
    .getByLabel('Mensaje para el pedido')
    .fill('Perfecto, el chofer pasará en 10 minutos.');
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(
    page.getByText('Perfecto, el chofer pasará en 10 minutos.'),
  ).toBeVisible();
});
