import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadSamplePlan } from './sample-plan';
async function nav(p: Page, name: string) {
  await p.getByRole('navigation').getByRole('link', { name }).click();
  await expect(p.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
}
async function audit(p: Page) {
  await p.waitForTimeout(250);
  const result = await new AxeBuilder({ page: p })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}
test.beforeEach(async ({ page }) => {
  await loadSamplePlan(page);
});

test('accessible editors, keyboard focus trap and discard confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'Assign work', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page);
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
      true,
    );
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await nav(page, 'Work queue');
  await page.getByRole('button', { name: 'Add work', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page);
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Project reference' })
    .fill('Do not save');
  page.once('dialog', (d) => d.dismiss());
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await nav(page, 'Methods & standards');
  await page.getByRole('button', { name: 'Edit method', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  await page
    .getByRole('button', { name: 'Edit / record preparation', exact: true })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page);
  await page.keyboard.press('Escape');
  await nav(page, 'Team planner');
  await page.getByRole('button', { name: 'Reserve time', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Progress', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await audit(page);
  await page.keyboard.press('Escape');
});

test('hourly equipment view, resource filtering and drag proposals', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Filter resources' }).selectOption('p3');
  await expect(page.locator('.assignment-panel tbody tr')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Filter resources' }).selectOption('');
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await expect(page.locator('app-planner')).toContainText('Maintenance');
  await page.getByRole('combobox', { name: 'Filter resources' }).selectOption('e3');
  await expect(page.locator('.assignment-panel tbody tr')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Calendar view' }).selectOption('day');
  await expect(page.locator('app-planner')).toContainText('HPLC-UV sequence');
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByRole('combobox', { name: 'Calendar view' }).selectOption('week');
  const event = page.locator('.scheduler_default_event').filter({ hasText: '08:30 · TPN-2401' });
  await expect(event).toBeVisible();
  const bounds = (await event.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 2.5, bounds.y + bounds.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Maintenance');
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('bns-planner-v2')!).assignments.find(
        (a: any) => a.id === 'a2',
      ).date,
  );
  expect(
    await page.getByRole('dialog').getByRole('textbox', { name: 'Date', exact: true }).inputValue(),
  ).not.toBe(saved);
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('bns-planner-v2')!).assignments.find(
          (a: any) => a.id === 'a2',
        ).date,
    ),
  ).toBe(saved);
});

test('cancellation sheets and old versions remain available', async ({ page }) => {
  const date = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('bns-planner-v2')!).assignments.find(
        (a: any) => a.id === 'a2',
      ).date,
  );
  await nav(page, 'Work sheets');
  await page.getByRole('textbox', { name: 'Work-sheet date', exact: true }).fill(date);
  for (const name of ['Maya Reed', 'Theo Brooks', 'Noah Patel'])
    await page.getByRole('checkbox', { name, exact: true }).uncheck();
  await page.getByRole('button', { name: 'Issue work sheets', exact: true }).click();
  await expect(page.locator('.paper')).toContainText('ISSUED · v1');
  await nav(page, 'Team planner');
  await page
    .getByRole('row')
    .filter({ hasText: 'Ella Chen' })
    .getByRole('button', { name: 'Edit / move' })
    .click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('dialog').getByRole('button', { name: 'Remove assignment' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await nav(page, 'Work sheets');
  await page.getByRole('textbox', { name: 'Work-sheet date', exact: true }).fill(date);
  for (const name of ['Maya Reed', 'Theo Brooks', 'Noah Patel'])
    await page.getByRole('checkbox', { name, exact: true }).uncheck();
  await page.getByRole('button', { name: 'Issue work sheets', exact: true }).click();
  await expect(page.locator('.paper')).toContainText('No work is assigned.');
  await expect(page.locator('.paper')).toContainText('REVISED · v2');
  const old = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bns-planner-v2')!).sheets[0].id,
  );
  await page.getByRole('combobox', { name: 'Earlier copies', exact: true }).selectOption(old);
  await expect(page.locator('.paper')).toContainText('OUTDATED COPY — DO NOT USE.');
  await expect(page.locator('.paper')).toContainText('TPN-2401');
});
