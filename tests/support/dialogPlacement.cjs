// Verifica dónde se abre un diálogo de `Modal`: centrado (variant "modal") o como panel lateral
// pegado al borde derecho (variant "drawer", rediseño 2026-11). En ambos casos debe caber en la
// pantalla. Espera a que termine la animación de entrada antes de medir.
const { expect } = require('@playwright/test');

async function expectDialogPlacement(page, dialog, { width, height }) {
  await expect(dialog).toBeVisible();
  const variant = (await dialog.getAttribute('data-variant')) ?? 'modal';
  if (variant === 'drawer') {
    // El panel entra deslizándose desde la derecha: se mide cuando ya llegó al borde.
    await expect
      .poll(async () => {
        const b = await dialog.boundingBox();
        return Math.abs(b.x + b.width - width);
      })
      .toBeLessThan(3);
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.width).toBeLessThanOrEqual(width + 1);
    expect(box.height).toBeLessThanOrEqual(height + 1);
  } else {
    await expect
      .poll(async () => {
        const b = await dialog.boundingBox();
        return Math.abs(b.x + b.width / 2 - width / 2);
      })
      .toBeLessThan(3);
    const box = await dialog.boundingBox();
    expect(box.y).toBeGreaterThan(0);
    expect(box.height).toBeLessThanOrEqual(height * 0.9);
  }
  return variant;
}

module.exports = { expectDialogPlacement };
