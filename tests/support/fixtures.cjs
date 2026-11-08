// Fixture de Playwright para las pruebas de interfaz: simula únicamente la API de
// autenticación y siembra el espacio de trabajo con datos de prueba. El producto no trae datos.
const base = require('@playwright/test');
const { seedSnapshot } = require('./seedSnapshot.cjs');

const json = (route, status, body) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

const tokens = {
  accessToken: 'test-access',
  refreshToken: 'test-refresh',
  expiresIn: 900,
};
const apiUser = (user, status = 'ACTIVE') => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  status,
  facilityId: user.facilityId ?? null,
});

// Estimaciones deterministas para el mapa: solo existen en las pruebas.
const meters = (a, b) =>
  Math.hypot((a[1] - b[1]) * 111000, (a[0] - b[0]) * 111000);
const lngLat = (text) => text.split(';').map((p) => p.split(',').map(Number));
const routeOf = (points) => {
  const distance = points
    .slice(1)
    .reduce((sum, point, i) => sum + meters(point, points[i]), 0);
  return { distance, duration: Math.max(60, distance / 8) };
};

// Simula únicamente búsqueda, ruta y matriz de Mapbox; estilos y teselas siguen su curso.
async function mockMapbox(context) {
  // Las peticiones son entre orígenes: sin estas cabeceras el navegador las bloquea.
  const cors = { 'access-control-allow-origin': '*' };
  const json = (route, status, body) =>
    route.fulfill({
      status,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  await context.route('https://api.mapbox.com/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.startsWith('/directions-matrix/')) {
      const points = lngLat(decodeURIComponent(path.split('/').pop()));
      const list = (name) => (url.searchParams.get(name) ?? '').split(';').map(Number);
      const sources = list('sources');
      const destinations = list('destinations');
      const grid = (pick) =>
        sources.map((s) =>
          destinations.map((d) => pick(routeOf([points[s], points[d]]))),
        );
      return json(route, 200, {
        code: 'Ok',
        durations: grid((r) => r.duration),
        distances: grid((r) => r.distance),
      });
    }
    if (path.startsWith('/directions/')) {
      const points = lngLat(decodeURIComponent(path.split('/').pop()));
      const { distance, duration } = routeOf(points);
      return json(route, 200, {
        code: 'Ok',
        routes: [
          { distance, duration, geometry: { type: 'LineString', coordinates: points } },
        ],
      });
    }
    if (path.startsWith('/search/geocode/v6/')) {
      const lng = Number(url.searchParams.get('longitude') ?? 0);
      const lat = Number(url.searchParams.get('latitude') ?? 0);
      return json(route, 200, {
        features: path.endsWith('/reverse')
          ? [
              {
                id: 'test-place',
                geometry: { coordinates: [lng, lat] },
                properties: { name: 'Ubicación seleccionada', full_address: 'Ubicación seleccionada' },
              },
            ]
          : [],
      });
    }
    return route.continue();
  });
}

exports.expect = base.expect;
exports.test = base.test.extend({
  // Rol de la cuenta con sesión; `signedIn: false` abre la aplicación sin sesión.
  role: ['ADMIN', { option: true }],
  signedIn: [true, { option: true }],
  seeded: [true, { option: true }],
  context: async ({ context, role, signedIn, seeded }, use) => {
    const { entries, user, users } = seedSnapshot(role);
    await mockMapbox(context);
    await context.route('**/api/v1/auth/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/login')) {
        const { email, password } = route.request().postDataJSON();
        if (password === 'incorrecta')
          return json(route, 401, { message: 'Correo o contraseña incorrectos.' });
        if (email === 'temporal@laundryweb.com')
          return json(route, 200, {
            user: apiUser(user, 'PASSWORD_CHANGE_REQUIRED'),
            tokens,
          });
        if (email === 'cliente@laundryweb.com')
          return json(route, 200, {
            user: { ...apiUser(user), role: 'CLIENT' },
            tokens,
          });
        const account = users.find((u) => u.email === email) ?? user;
        return json(route, 200, { user: apiUser(account), tokens });
      }
      if (path.endsWith('/auth/refresh')) return json(route, 200, tokens);
      if (path.endsWith('/auth/change-password')) return json(route, 200, tokens);
      if (path.endsWith('/auth/me')) return json(route, 200, apiUser(user));
      if (path.endsWith('/auth/logout')) return route.fulfill({ status: 204 });
      return json(route, 404, { message: 'No encontrado.' });
    });
    await context.addInitScript(
      ({ entries, signedIn, seeded }) => {
        if (seeded && !localStorage.getItem('lw_workflow_v2'))
          for (const [key, value] of Object.entries(entries))
            localStorage.setItem(key, value);
        // Los choferes reportan posición en vivo: se mantiene reciente en cada carga.
        const fresh = new Date().toISOString();
        for (const key of ['lw_drivers', 'lw_workflow_v2']) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const data = JSON.parse(raw);
          const drivers = Array.isArray(data) ? data : data.drivers;
          if (!drivers) continue;
          drivers.forEach((d) => {
            // Un chofer fuera de línea conserva su última posición, ya vencida.
            if (d.location && d.status !== 'OFFLINE') d.location.lastUpdated = fresh;
          });
          localStorage.setItem(key, JSON.stringify(data));
        }
        // La sesión se inicia una sola vez por pestaña: tras cerrar sesión no se repone.
        if (!sessionStorage.getItem('__session_seeded')) {
          sessionStorage.setItem('__session_seeded', '1');
          if (signedIn) sessionStorage.setItem('lw_refresh_token', 'test-refresh');
        }
      },
      { entries, signedIn, seeded },
    );
    await use(context);
  },
});
