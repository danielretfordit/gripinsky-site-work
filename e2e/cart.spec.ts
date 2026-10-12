import { test, expect } from '@playwright/test';
import { noCookieBanner, collectErrors, expectIslandsHydrated, expectNoHorizontalOverflow } from './helpers';
let errors: string[];
test.beforeEach(async ({ page }) => { await noCookieBanner(page); errors = collectErrors(page); });
test.afterEach(async () => { expect(errors).toEqual([]); });

test('корзина: добавление, скидка, сохранение, оформление и удаление', async ({ page }, testInfo) => {
  await page.goto('/courses?type=course');
  await expectIslandsHydrated(page);
  const dialog = page.locator('[data-cart-dialog]');
  await page.locator('[data-cart-add="modeling1"]').click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('[data-site-cart]')).toContainText('10 900');
  await dialog.getByRole('button', { name: 'Продолжить выбор' }).click();
  await page.locator('[data-cart-add="modeling2"]').click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Скидка за курсы 15%');
  await expect(page.locator('[data-site-cart]')).toContainText('19 380');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`cart-${page.viewportSize()!.width}.png`) });
  await dialog.getByRole('button', { name: 'Продолжить выбор' }).click();
  await page.reload();
  await expectIslandsHydrated(page);
  await expect(page.locator('[data-cart-add="modeling1"]')).toHaveText('В корзине');
  await expect(page.locator('[data-site-cart]')).toContainText('19 380');
  await page.goto('/interiorpro');
  await expectIslandsHydrated(page);
  await page.getByRole('button', { name: 'Открыть корзину', exact: true }).click();
  await expect(dialog).toContainText('Скидка за курсы 15%');
  await dialog.getByRole('button', { name: 'Оформить пакет', exact: true }).click();
  await expect(page.locator('[aria-labelledby="checkout-title"]')).toBeVisible();
  await expect(page.locator('[aria-labelledby="checkout-title"]')).toContainText('19 380');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByRole('button', { name: 'Открыть корзину', exact: true }).click();
  await dialog.getByRole('button', { name: /Убрать .*Level 2/ }).click();
  await expect(page.locator('[data-site-cart]')).toContainText('10 900');
  await expect(dialog).not.toContainText('Скидка за курсы');
  await dialog.getByRole('button', { name: /Убрать .*Level 1/ }).click();
  await expect(dialog).toContainText('Корзина пуста');
  await expect(page.locator('[data-site-cart]')).toHaveCount(0);
});

test('база сохраняется, три уровня доступны отдельно, двойной оплаты нет', async ({ page }) => {
  await page.goto('/courses?type=course');
  await expectIslandsHydrated(page);
  for (const id of ['modeling1','modeling2','vizualization3']) await expect(page.locator(`[data-cart-add="${id}"]`)).toBeVisible();
  await expect(page.locator('[data-filter-type="package"]')).toHaveCount(0);
  await expect(page.locator('[data-grid] a[href="/1-2-3lvl"]')).toHaveCount(0);
  await page.locator('[data-cart-add="modeling1"]').click();
  const dialog = page.locator('[data-cart-dialog]');
  await dialog.getByRole('button', { name: 'Продолжить выбор' }).click();
  await page.locator('[data-cart-add="baza"]').click();
  await expect(page.locator('[data-site-cart]')).toContainText('44 900');
  await expect(dialog).toContainText('Уже входят');
  await dialog.getByRole('radio', { name: 'Наставничество', exact: true }).check();
  await expect(page.locator('[data-site-cart]')).toContainText('69 900');
  await dialog.getByRole('radio', { name: 'Самостоятельный', exact: true }).check();
  await expect(page.locator('[data-site-cart]')).toContainText('29 900');
  await dialog.getByRole('button', { name: 'Убрать База 3D-визуализатора', exact: true }).click();
  await expect(page.locator('[data-site-cart]')).toContainText('6 900');
  await expect(dialog).toContainText('Level 1');
});

test('сроки видны в корзине и меняются с форматом обучения', async ({ page }) => {
  await page.goto('/courses?cart=materialspro,blender');
  await expectIslandsHydrated(page);
  await expect(page.locator('[data-course] .course-terms')).toHaveCount(0);
  await page.getByRole('button', { name: 'Открыть корзину', exact: true }).click();
  const dialog = page.locator('[data-cart-dialog]');
  const materials = dialog.locator('[data-cart-terms="materialspro"]');
  const blender = dialog.locator('[data-cart-terms="blender"]');
  await expect(materials).toContainText('Доступ к урокам24 мес.');
  await expect(materials).toContainText('Чат поддержки12 мес.');
  await expect(blender).toContainText('Доступ к урокам12 мес.');
  await expect(blender).toContainText('Чат поддержки9 мес.');
  await dialog.getByRole('radio', { name: 'Самостоятельно', exact: true }).check();
  await expect(materials).toContainText('Без поддержки');
  await expect(blender).toContainText('Без поддержки');
  await expect(materials).not.toContainText('Чат поддержки');
  await expect(materials).toContainText('Доступ к урокам24 мес.');
  await dialog.getByRole('radio', { name: 'С чатом поддержки', exact: true }).check();
  await expect(materials).toContainText('Чат поддержки12 мес.');
  await expectNoHorizontalOverflow(page);

  await page.goto('/courses?cart=baza');
  await expectIslandsHydrated(page);
  await page.getByRole('button', { name: 'Открыть корзину', exact: true }).click();
  const base = dialog.locator('[data-cart-base-terms]');
  await expect(base.locator('[data-cart-terms]')).toHaveCount(3);
  await expect(base.locator('[data-cart-terms="modeling1"]')).toContainText('Доступ к урокам12 мес.');
  await expect(dialog.locator('[data-cart-terms="ai"]')).toHaveCount(1);
  await dialog.getByRole('radio', { name: 'Самостоятельный', exact: true }).check();
  await expect(base.locator('[data-cart-terms="modeling1"]')).toContainText('Без поддержки');
});

test('старые пакеты доступны по URL, но не продаются', async ({ page }) => {
  await page.goto('/1-2-3lvl');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#course-price')).toContainText('больше не продаётся');
  await expect(page.locator('[data-buy]')).toHaveCount(0);
  await expect(page.locator('[data-cart-add="1-2-3lvl"]')).toHaveCount(0);
});

test('страница направления добавляет выбор в общую корзину', async ({ page }) => {
  await page.goto('/courses-page/visualization');
  await expectIslandsHydrated(page);
  await page.locator('[data-cart-select="modeling1"]:visible').check();
  await expect(page.locator('[data-site-cart]')).toContainText('10 900');
  await expect(page.locator('[data-cart-dialog]')).not.toBeVisible();

});

test('API отклоняет пустую корзину, старый пакет и неизвестные позиции', async ({ request, baseURL }) => {
  const customer = { name: 'Проверка', email: 'test@example.invalid', phone: '+70000000000' };
  for (const data of [
    { kind: 'set', selection: { ids: [], support: 'chat' } },
    { kind: 'set', selection: { ids: ['1-2-3lvl'], support: 'chat' } },
    { kind: 'set', selection: { ids: ['constructor'], support: 'chat' } },
    { kind: 'course', selection: { id: '1-2-3lvl' } },
    { kind: 'invalid', selection: {} },
  ]) {
    const response = await request.post('/api/checkout', { headers: { Origin: new URL(baseURL!).origin }, data: { ...data, customer, consent: true } });
    expect(response.status()).toBe(422);
  }
});
