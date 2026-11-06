const { test, expect } = require('@playwright/test');

const identificacion = process.env.E2E_IDENTIFICACION || '900001';
const password = process.env.E2E_PASSWORD || 'Prueba123!';
const suffix = Date.now();
const razonSocial = `Editorial Playwright ${suffix}`;
const nit = `PW-${suffix}`;
const factura = `PW-F-${suffix}`;

test('Angular usa Express para CRUD de compras y detalles', async ({ page }) => {
  page.on('response', (response) => {
    if (response.url().includes(':4000/api/')) {
      console.log(`Express ${response.request().method()} ${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes(':4000/api/')) {
      console.log(`Express request failed ${request.url()} ${request.failure()?.errorText || ''}`);
    }
  });
  await page.goto('/login');
  await page.locator('#modoDemo').uncheck();
  await page.selectOption('#rol', 'Administrador');
  await page.fill('#identificacion', identificacion);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'ACEPTAR' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const expressRequests = [];
  page.on('request', (request) => {
    if (request.url().includes(':4000/api/')) expressRequests.push(request);
  });

  await page.goto('/admin/proveedores');
  await page.getByRole('button', { name: 'Nuevo proveedor' }).click();
  await page.locator('input[name="razon_social"]').fill(razonSocial);
  await page.locator('input[name="nit"]').fill(nit);
  await page.locator('input[name="email"]').fill('playwright@example.com');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByText(razonSocial)).toBeVisible();

  await page.goto('/admin/compras');
  const proveedor = page.locator('select[name="proveedor_id"]');
  await expect(proveedor.locator('option', { hasText: razonSocial })).toBeAttached();
  await proveedor.selectOption({ label: razonSocial });
  await page.locator('input[name="numero_factura"]').fill(factura);
  await page.getByRole('button', { name: 'Crear compra' }).click();
  await expect(page.getByText(factura).first()).toBeVisible();

  const compra = page.locator('tr', { hasText: factura });
  await compra.getByRole('button', { name: 'Detalles' }).click();
  await page.locator('input[name="descripcion"]').fill('Detalle Playwright');
  await page.locator('input[name="cantidad"]').fill('2');
  await page.locator('input[name="precio"]').fill('100');
  await page.getByRole('button', { name: 'Agregar detalle' }).click();
  await expect(page.getByText('Detalle Playwright')).toBeVisible();

  await page.getByRole('button', { name: 'Editar' }).click();
  await page.locator('input[name="descripcion"]').fill('Detalle Playwright actualizado');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Detalle Playwright actualizado')).toBeVisible();

  expect(expressRequests.some((request) => request.method() === 'POST' && request.url().includes('/api/proveedores'))).toBeTruthy();
  expect(expressRequests.some((request) => request.method() === 'POST' && request.url().includes('/api/compras'))).toBeTruthy();
  expect(expressRequests.some((request) => request.method() === 'PUT' && request.url().includes('/api/detalles/'))).toBeTruthy();
});
