import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { samplePlan } from '../testing/sample-plan';

const state = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('lab-planner-fictional-v1')!));
const dialog = (page: Page) => page.getByRole('dialog');
async function nav(page: Page, name: string) {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
}
async function save(page: Page) {
  const ack = dialog(page).getByRole('checkbox', { name: 'I have reviewed these warnings.' });
  if (await ack.count()) await ack.check();
  await dialog(page).getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
}

test('empty start is clear on desktop and mobile, and every setup editor works without work', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Start with one job' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add your first work' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign work', exact: true })).toHaveCount(0);
  await expect(page.locator('.stats-grid')).toHaveCount(0);
  await expect(page.locator('.scheduler_default_event')).toHaveCount(0);
  await page.locator('app-planner .scheduler_default_cell').first().click();
  await expect(dialog(page).getByRole('heading', { name: 'Add work', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  for (const width of [1600, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const screen of ['Team planner', 'Work queue', 'Problems & repeats', 'Work sheets']) {
      await nav(page, screen);
      const audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(audit.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: info.outputPath(`${screen.replaceAll(' ', '-')}-${width}.png`),
        fullPage: true,
      });
    }
  }
  await nav(page, 'Work queue');
  await expect(page.getByRole('heading', { name: 'No work yet' })).toBeVisible();
  await expect(page.getByText('All work has an assignment.', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add work', exact: true }).click();
  await expect(dialog(page).getByRole('heading', { name: 'Add work', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await nav(page, 'Methods & standards');
  await page.getByRole('button', { name: 'Add method', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  await page.getByRole('button', { name: 'Add standard', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Plan preparation time' }).first().click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p2');
  await save(page);
  expect((await state(page)).work).toEqual([]);
  expect((await state(page)).reservations).toHaveLength(3);
  expect((await state(page)).standards.every((st: any) => !st.preparedAt)).toBe(true);
  await nav(page, 'Team planner');
  await page.getByRole('button', { name: 'Reserve time', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('user creates the first work and schedule; reload keeps it, reset empties it, old data stays untouched', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const legacy = samplePlan();
  legacy.methods[0].name = 'Legacy-only example';
  legacy.assignments[0].methodSnapshot = structuredClone(legacy.methods[0]);
  const old = JSON.stringify(legacy);
  await page.evaluate((raw) => {
    localStorage.setItem('bns-planner-v1', raw);
    localStorage.setItem('bns-planner-v2', raw);
  }, old);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Add your first work' })).toBeVisible();
  await nav(page, 'Methods & standards');
  await expect(page.getByRole('heading', { name: 'Coating check', exact: true })).toBeVisible();
  await expect(page.getByText('Legacy-only example')).toHaveCount(0);
  await expect(page.locator('main')).toContainText('Fictional demonstration only.');
  await nav(page, 'Team planner');
  await page.getByRole('button', { name: 'Add your first work' }).click();
  await dialog(page).getByLabel('Project reference').fill('TPN-FIRST');
  await dialog(page).getByLabel('Client', { exact: true }).fill('Fictional client');
  await dialog(page)
    .getByLabel('Products, batch, timepoint and samples')
    .fill('Batch A / M01–M04 / replicates 1–3');
  await save(page);
  const created = await state(page);
  expect(created.work).toHaveLength(1);
  expect(created.assignments).toEqual([]);
  expect(created.reservations).toEqual([]);
  expect(created.progress).toEqual([]);
  await expect(page.getByText('Ready to schedule.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Start with one job' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Assign work', exact: true }).click();
  await dialog(page).getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p2');
  await dialog(page).getByLabel('Assigned sample / replicate IDs').fill('M01–M04 / replicates 1–3');
  await expect(dialog(page)).toContainText('preparation has not been recorded');
  await save(page);
  expect((await state(page)).assignments).toHaveLength(1);
  expect((await state(page)).progress).toEqual([]);
  await expect(page.getByText('Ready to schedule.', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.assignment-panel')).toContainText('TPN-FIRST');
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await expect(page.locator('app-planner')).toContainText('TPN-FIRST');
  await nav(page, 'Work queue');
  await expect(page.getByRole('row').filter({ hasText: 'TPN-FIRST' })).toContainText('12 pending');
  await expect(page.getByRole('row').filter({ hasText: 'TPN-FIRST' })).toContainText(
    '0 valid output',
  );
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  expect((await state(page)).work).toHaveLength(1);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  const reset = await state(page);
  for (const key of [
    'work',
    'assignments',
    'reservations',
    'progress',
    'rejections',
    'repeats',
    'sheets',
    'audit',
  ])
    expect(reset[key], key).toEqual([]);
  expect(reset.methods).toHaveLength(2);
  expect(reset.equipment).toHaveLength(8);
  expect(reset.people).toHaveLength(4);
  expect(reset.standards.every((st: any) => !st.preparedAt)).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No work yet' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('bns-planner-v1'))).toBe(old);
  expect(await page.evaluate(() => localStorage.getItem('bns-planner-v2'))).toBe(old);
  expect(JSON.stringify(reset)).not.toContain('Legacy-only example');
  expect(errors).toEqual([]);
});
