import { test, expect } from '@playwright/test';
import { noCookieBanner, expectIslandsHydrated, expectNoHorizontalOverflow } from './helpers';

test.beforeEach(async ({ page }) => { await noCookieBanner(page); });

test('полные профессии показывают состав без неподтверждённой цены', async ({ page }) => {
  await page.goto('/courses-page/visualization');
  await expectIslandsHydrated(page);
  for (const [id, courses, gift] of [
    ['int', ['/interiorpro'], 'Marvelous'],
    ['ext', ['/exteriorpro', '/residential_complex'], 'Forest Pack'],
    ['stock', ['/3dstock'], 'Marvelous'],
  ] as const) {
    await page.locator(`[data-viz-profession="${id}"]`).click();
    const panel = page.locator(`#viz-panel-${id}`);
    const offer = panel.locator('[data-bundle-pending]');
    await expect(offer).toBeVisible();
    for (const href of [...courses, '/materialspro', '/azbukaps', '/artrender']) {
      await expect(offer.locator(`a[href="${href}"]`)).toHaveCount(1);
    }
    await expect(offer).toContainText('База уже включена');
    await expect(offer).toContainText(gift);
    await expect(offer.locator('[data-bundle-price]')).toHaveText('Стоимость уточняется');
    await expect(offer.locator('[data-cart-bundle]')).toHaveCount(0);
    await expect(offer.getByRole('link', { name: 'Уточнить стоимость набора' })).toHaveAttribute('href', '#consult');
    const offersAfterCourses = await panel.evaluate(el => {
      const offers = el.querySelector('.profession-offers')!;
      return Boolean(offers.compareDocumentPosition(el.querySelector('.prototype-addon-grid')!) & Node.DOCUMENT_POSITION_PRECEDING);
    });
    expect(offersAfterCourses).toBe(true);
    await expectNoHorizontalOverflow(page);
  }
  await page.goto('/courses-page/visualization#base-offer-title-stock');
  await expect(page.locator('[data-viz-profession="stock"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#base-offer-title-stock')).toBeVisible();
});

test('база добавляется один раз, цена карточки следует формату корзины', async ({ page }) => {
  await page.goto('/courses-page/visualization#base');
  await expectIslandsHydrated(page);
  const base = page.locator('#viz-panel-int [data-bundle-offer="baza"]');
  const button = base.locator('[data-cart-bundle]');
  await expect(base.locator('[data-bundle-price]')).toHaveText(/44\s900/);
  await button.click();
  const dialog = page.locator('[data-cart-dialog]');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: 'Самостоятельный', exact: true }).check();
  await dialog.getByRole('button', { name: 'Продолжить выбор' }).click();
  await expect(base.locator('[data-bundle-price]')).toHaveText(/29\s900/);
  await expect(base.locator('[data-bundle-support]')).toHaveText('Самостоятельно');
  await expect(button).toHaveText('В корзине');
  await button.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Убрать База 3D-визуализатора', exact: true })).toHaveCount(1);
  await expect(page.locator('[data-site-cart]')).toContainText(/29\s900/);
});

test('постобработка без цены не объявляется бесплатной и не продаётся', async ({ page }) => {
  await page.goto('/artrender');
  await expect(page.locator('#course-price')).toContainText('Стоимость уточняется');
  await expect(page.locator('#course-price')).not.toContainText('Бесплатно');
  await expect(page.locator('[data-cart-add="artrender"]')).toHaveCount(0);
  const prices = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(prices.join('')).not.toMatch(/"price"\s*:\s*"?0"?/);
  const llms = await (await page.request.get('/llms.txt')).text();
  const postprocessing = llms.split('\n').find(line => line.includes('/artrender'));
  expect(postprocessing).toContain('стоимость уточняется');
  expect(postprocessing).not.toContain('бесплатно');
  await page.goto('/courses?type=course');
  const card = page.locator('[data-course][data-price-pending]');
  await expect(card).toContainText('Стоимость уточняется');
  await expect(card).not.toContainText('Бесплатно');
  await expect(card.locator('[data-cart-add], [data-cart-select]')).toHaveCount(0);
  await page.locator('[data-sort]').selectOption('asc');
  const visible = page.locator('[data-grid] [data-course]:visible');
  await expect(visible.last()).toHaveAttribute('data-price-pending', 'true');
});
