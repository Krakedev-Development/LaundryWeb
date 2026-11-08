const { defineConfig } = require('@playwright/test');
// Si el puerto 3000 está ocupado, apuntar a otra instancia: PLAYWRIGHT_BASE_URL=http://localhost:3001
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.cjs',
  testIgnore: '**/app-flow.spec.cjs',
  timeout: 240000,
  workers: 1,
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
