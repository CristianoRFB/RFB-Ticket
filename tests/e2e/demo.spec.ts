import { expect, test } from '@playwright/test';

test('visitor can choose a fictitious event and simulate local reservation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Da venda ao/i })).toBeVisible();
  await expect(page.getByText('Sandbox indisponível: configure Firebase e Worker')).toBeVisible();
  await page.getByRole('button', { name: /Festival Horizonte/ }).click();
  await expect(page.getByRole('heading', { name: 'Lotes e disponibilidade' })).toBeVisible();
  await page.getByRole('button', { name: /Entrada geral/ }).click();
  await page.getByLabel('Quantidade demonstrativa').selectOption('2');
  await page.getByRole('button', { name: 'Simular reserva' }).click();
  await expect(page.getByRole('status')).toContainText('2 ingresso(s) reservado(s)');
  await page.getByRole('button', { name: 'Reiniciar simulação' }).click();
  await expect(page.getByRole('status')).toContainText('Simulação zerada');
});

test('synthetic demo mobile layout is responsive without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Da venda ao/i })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test('demo is navigable by keyboard with a visible focus target', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Explorar demonstração' })).toBeFocused();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#conteudo');
});
