const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 1440, height: 900 } });
test.setTimeout(45000);

async function openOrders(page, mini = false) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  if (mini)
    await page.addInitScript(() =>
      localStorage.setItem('cfl.sidebar.collapsed', 'true'),
    );
  await page.goto('/operations/orders', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Solicitudes', exact: true }),
  ).toBeVisible();
  return errors;
}

test('pinned and mini synchronize the content margin and persist the selected mode', async ({
  page,
}) => {
  const errors = await openOrders(page);
  const sidebar = page.locator('#app-sidebar');
  const main = page.locator('main');
  await expect(sidebar).toHaveAttribute('data-mode', 'pinned');
  await expect(sidebar).toHaveCSS('width', '260px');
  await expect(main).toHaveCSS('margin-left', '260px');
  await expect(
    sidebar.getByRole('button', { name: 'OPERACIONES', exact: true }),
  ).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Usar menú compacto' }).click();
  await page.mouse.move(800, 100);
  await page.keyboard.press('Escape');
  await expect(sidebar).toHaveAttribute('data-mode', 'mini');
  await expect(sidebar).toHaveCSS('width', '60px');
  await expect(main).toHaveCSS('margin-left', '60px');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(sidebar).toHaveAttribute('data-mode', 'mini');
  await expect(
    sidebar.getByAltText('CFL: lavadora con hoja verde'),
  ).toBeVisible();
  await expect(
    sidebar.getByRole('button', { name: 'OPERACIONES', exact: true }),
  ).toHaveAttribute('title', 'OPERACIONES');
  await expect(
    sidebar.getByRole('button', { name: 'OPERACIONES', exact: true }),
  ).toHaveCSS('width', '40px');
  await page.screenshot({ path: 'test-results/sidebar-mini.png' });
  await page.getByRole('button', { name: 'Fijar menú expandido' }).click();
  await expect(sidebar).toHaveAttribute('data-mode', 'pinned');
  await expect(main).toHaveCSS('margin-left', '260px');
  await expect(sidebar.getByAltText('CFL LAUNDRY CLEAN FRESH')).toBeVisible();
  await expect(sidebar.getByAltText('CFL LAUNDRY CLEAN FRESH')).toHaveAttribute(
    'src',
    /logo-laundry-white\.png/,
  );
  await page.screenshot({ path: 'test-results/sidebar-pinned.png' });
  expect(errors).toEqual([]);
});

test('hover and keyboard preview overlay the content, debounce exit, and Escape closes immediately', async ({
  page,
}) => {
  const errors = await openOrders(page, true);
  const sidebar = page.locator('#app-sidebar');
  await page.clock.install();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.mouse.move(30, 180);
  await page.clock.runFor(220);
  await expect(sidebar).toHaveAttribute('data-mode', 'preview');
  await expect(sidebar).toHaveCSS('width', '260px');
  await expect(page.locator('main')).toHaveCSS('margin-left', '60px');
  await page.mouse.move(800, 300);
  await page.clock.runFor(100);
  await expect(sidebar).toHaveAttribute('data-mode', 'preview');
  await page.mouse.move(30, 180);
  await page.clock.runFor(200);
  await expect(sidebar).toHaveAttribute('data-mode', 'preview');
  await page.mouse.move(800, 300);
  await page.clock.runFor(151);
  await expect(sidebar).toHaveAttribute('data-mode', 'mini');
  await sidebar
    .getByRole('button', { name: 'OPERACIONES', exact: true })
    .focus();
  await page.clock.runFor(220);
  await expect(sidebar).toHaveAttribute('data-mode', 'preview');
  await sidebar
    .getByRole('link', { name: 'Recepción y retiros', exact: true })
    .focus();
  await page.keyboard.press('Escape');
  await expect(sidebar).toHaveAttribute('data-mode', 'mini');
  await expect(
    sidebar.getByRole('button', { name: 'OPERACIONES', exact: true }),
  ).toBeFocused();
  await expect(page.locator('main')).toHaveCSS('margin-left', '60px');
  expect(errors).toEqual([]);
});

test('mobile drawer traps focus, closes on Escape, backdrop and route change, and respects the 1024px boundary', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const errors = await openOrders(page, true);
  const sidebar = page.locator('#app-sidebar');
  const trigger = page.getByRole('button', { name: 'Abrir menú', exact: true });
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('main')).toHaveCSS('margin-left', '0px');
  const bell = page.getByRole('button', {
    name: 'Notificaciones',
    exact: true,
  });
  await bell.click();
  const noticeBounds = await page
    .getByRole('region', { name: 'Notificaciones operativas' })
    .boundingBox();
  expect(noticeBounds.x).toBeGreaterThanOrEqual(0);
  expect(noticeBounds.x + noticeBounds.width).toBeLessThanOrEqual(375);
  await page.keyboard.press('Escape');
  await trigger.click();
  await expect(
    page.getByRole('dialog', { name: 'Menú de navegación' }),
  ).toBeVisible();
  await expect(sidebar).toHaveCSS('width', '260px');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expect(
    sidebar.getByRole('button', { name: 'Cerrar menú', exact: true }),
  ).toBeFocused();
  await sidebar
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .focus();
  await page.keyboard.press('Tab');
  await expect(
    sidebar.getByRole('link', {
      name: 'CFL LAUNDRY CLEAN FRESH · Inicio',
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    sidebar.getByRole('button', { name: 'Cerrar sesión', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await trigger.click();
  await page.screenshot({ path: 'test-results/sidebar-mobile.png' });
  await page
    .getByTestId('sidebar-backdrop')
    .click({ position: { x: 340, y: 400 } });
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await trigger.click();
  await sidebar.getByRole('link', { name: /^Incidencias/ }).click();
  await expect(page).toHaveURL(/\/operations\/incidents$/);
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await trigger.click();
  await page.setViewportSize({ width: 1024, height: 812 });
  await expect(sidebar).toHaveAttribute('data-mode', 'mini');
  await expect(page.locator('main')).toHaveCSS('margin-left', '60px');
  await expect(page.getByTestId('sidebar-backdrop')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await page.setViewportSize({ width: 1023, height: 812 });
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('main')).toHaveCSS('margin-left', '0px');
  expect(errors).toEqual([]);
});

test('nested routes select only the closest leaf and role changes filter the navigation', async ({
  page,
}) => {
  const errors = await openOrders(page);
  const sidebar = page.locator('#app-sidebar');
  await sidebar.getByRole('button', { name: 'CLIENTES', exact: true }).click();
  await sidebar.getByRole('link', { name: /^Validaciones KYC/ }).click();
  await expect(page).toHaveURL(/\/customers\/kyc$/);
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveCount(1);
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveAttribute(
    'href',
    '/customers/kyc',
  );
  await expect(
    sidebar.getByRole('button', { name: 'CLIENTES', exact: true }),
  ).toHaveAttribute('aria-expanded', 'true');
  await page.goto('/customers/CUST-001', { waitUntil: 'domcontentloaded' });
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveAttribute(
    'href',
    '/customers',
  );
  await sidebar
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await page.getByRole('button', { name: /Elena Rostova/ }).click();
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click();
  await expect(
    sidebar.getByRole('button', { name: 'COMERCIAL', exact: true }),
  ).toHaveCount(0);
  await expect(
    sidebar.getByRole('link', { name: /^Validaciones KYC/ }),
  ).toHaveCount(0);
  await sidebar.getByRole('button', { name: 'GESTIÓN', exact: true }).click();
  await expect(
    sidebar.getByRole('link', { name: 'Configuración', exact: true }),
  ).toHaveCount(0);
  await expect(
    sidebar.getByRole('link', { name: 'Reportes', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('blue sidebar appearance, accessible notifications, keyboard search and sidebar logout remain functional', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const errors = await openOrders(page);
  await expect(page.locator('#app-sidebar')).toHaveCSS(
    'background-color',
    'rgb(10, 54, 96)',
  );
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  const bell = page.getByRole('button', {
    name: 'Notificaciones',
    exact: true,
  });
  await bell.click();
  await expect(
    page.getByRole('region', { name: 'Notificaciones operativas' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Notificaciones operativas' })
      .getByRole('button')
      .first(),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(bell).toBeFocused();
  await expect(bell).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Control+k');
  await expect(
    page.getByPlaceholder(
      'Buscar por SOL-4587, cliente María Torres, INC-0187, chofer Carlos...',
    ),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByPlaceholder(
      'Buscar por SOL-4587, cliente María Torres, INC-0187, chofer Carlos...',
    ),
  ).toHaveCount(0);
  await page
    .locator('#app-sidebar')
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByAltText('CFL LAUNDRY CLEAN FRESH')).toBeVisible();
  expect(errors).toEqual([]);
});

test('navigation still works when saving the sidebar preference is denied', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'cfl.sidebar.collapsed')
        throw new DOMException('Blocked preference', 'SecurityError');
      return setItem.call(this, key, value);
    };
  });
  const errors = await openOrders(page);
  await page.getByRole('button', { name: 'Usar menú compacto' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('main')).toHaveCSS('margin-left', '60px');
  await page.getByRole('button', { name: 'Fijar menú expandido' }).click();
  await expect(page.locator('main')).toHaveCSS('margin-left', '260px');
  expect(errors).toEqual([]);
});

test('profile appears only in the sidebar and the MVP header control restores demo data', async ({
  page,
}) => {
  await openOrders(page);
  const sidebar = page.locator('#app-sidebar');
  const header = page.locator('header');
  await expect(
    sidebar.getByText('Carlos Mendoza', { exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByText('Administrador', { exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByText('admin@laundryweb.com', { exact: true }),
  ).toBeVisible();
  await expect(header.getByText('Carlos Mendoza', { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: 'Perfil y opciones de sesión' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Cerrar sesión', exact: true }),
  ).toHaveCount(1);
  await page.evaluate(() => {
    for (const key of ['lw_drivers', 'lw_workflow_v2']) {
      const data = JSON.parse(localStorage.getItem(key));
      const drivers = Array.isArray(data) ? data : data.drivers;
      drivers[0].name = 'Conductor modificado';
      localStorage.setItem(key, JSON.stringify(data));
    }
  });
  await page.goto('/logistics/drivers');
  await expect(
    page.locator('main').getByText('Conductor modificado', { exact: true }),
  ).toBeVisible();
  await header
    .getByRole('button', { name: 'Restablecer datos demo', exact: true })
    .click();
  await expect(
    page.locator('main').getByText('Conductor modificado', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('main').getByText('Carlos Ruiz', { exact: true }),
  ).toBeVisible();
});

test('brand stays bounded throughout repeated expand and collapse transitions', async ({
  page,
}) => {
  await openOrders(page);
  await page.mouse.move(800, 100);
  const samples = await page.evaluate(async () => {
    const sidebar = document.querySelector('#app-sidebar');
    const brand = sidebar.querySelector('.sidebar-brand');
    const images = [...brand.querySelectorAll('img')];
    await Promise.all(images.map((img) => img.decode()));
    const frames = [];
    for (const label of [
      'Usar menú compacto',
      'Fijar menú expandido',
      'Usar menú compacto',
      'Fijar menú expandido',
    ]) {
      sidebar.querySelector(`button[aria-label="${label}"]`).click();
      const start = performance.now();
      await new Promise((resolve) => {
        const sample = () => {
          const header = brand.parentElement.getBoundingClientRect();
          frames.push(
            images.map((img) => {
              const rect = img.getBoundingClientRect();
              return {
                width: rect.width,
                height: rect.height,
                insideHeader:
                  rect.top >= header.top && rect.bottom <= header.bottom,
              };
            }),
          );
          if (performance.now() - start < 350) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
    }
    return frames;
  });
  expect(samples.length).toBeGreaterThan(4);
  for (const [icon, full] of samples) {
    expect(icon).toEqual({ width: 32, height: 48, insideHeader: true });
    expect(full).toEqual({ width: 224, height: 80, insideHeader: true });
  }
});

test('focusing a destination preloads its page before navigating', async ({
  page,
}) => {
  const errors = await openOrders(page);
  const sidebar = page.locator('#app-sidebar');
  await sidebar.getByRole('button', { name: 'COMERCIAL', exact: true }).click();
  const preloaded = page.waitForResponse(
    (response) =>
      response.url().includes('/src/features/commercial/PromotionsPage.tsx') &&
      response.ok(),
  );
  await sidebar.getByRole('link', { name: 'Promociones', exact: true }).focus();
  await preloaded;
  await expect(page).toHaveURL(/\/operations\/orders$/);
  await sidebar.getByRole('link', { name: 'Promociones', exact: true }).click();
  await expect(page).toHaveURL(/\/commercial\/promotions$/);
  expect(errors).toEqual([]);
});
