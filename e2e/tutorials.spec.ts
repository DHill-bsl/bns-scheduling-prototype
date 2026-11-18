import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function tutorials(page: Page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Tutorials', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Tutorials', exact: true }),
  ).toBeVisible();
  await expect(page.locator('app-tutorials details.tutorial')).toHaveCount(13);
}
async function openFromTopic(page: Page, id: string) {
  await tutorials(page);
  const topic = page.locator('#tutorial-' + id);
  await topic.locator(':scope > summary').click();
  await topic.getByRole('button').click();
}
const dialog = (page: Page) => page.getByRole('dialog');
async function save(page: Page) {
  await dialog(page).getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
}
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('bns-planner-v2'));
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
});

test('tutorials support keyboard reading, direct entry, refresh and accessible mobile layouts', async ({
  page,
}, info) => {
  const before = await stored(page),
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await tutorials(page);
  const topic = page.locator('#tutorial-add-method');
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link').first(),
  ).toHaveText('Tutorials');
  await topic.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(topic).toHaveAttribute('open', '');
  await expect(topic).toContainText('Can be zero; cannot exceed total time');
  await topic.locator('.tutorial-fields summary').focus();
  await page.keyboard.press('Enter');
  await expect(topic.locator('.tutorial-fields')).toHaveAttribute('open', '');
  await expect(topic.locator('dl')).toContainText('not a particular asset');
  await expect(topic).toContainText('09:00–11:00');
  for (const width of [1600, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await topic.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`tutorials-${width}.png`), fullPage: true });
  }
  await topic.locator(':scope > summary').focus();
  await page.keyboard.press('Space');
  await expect(topic).not.toHaveAttribute('open', '');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Tutorials' })).toBeVisible();
  await expect(page.locator('app-tutorials details.tutorial')).toHaveCount(13);
  expect(await stored(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('every tutorial opens the correct screen or definitions tab without changing the plan', async ({
  page,
}) => {
  const before = await stored(page);
  const destinations = [
    ['add-work', 'Work queue', ''],
    ['add-method', 'Methods & standards', 'Add method'],
    ['add-standard', 'Methods & standards', 'Add standard'],
    ['assign-work', 'Work queue', ''],
    ['calendar', 'Team planner', ''],
    ['preparation', 'Methods & standards', 'Add standard'],
    ['reserve-time', 'Team planner', ''],
    ['move-split', 'Work queue', ''],
    ['work-sheets', 'Work sheets', ''],
    ['progress', 'Work queue', ''],
    ['rejection', 'Work queue', ''],
    ['follow-up', 'Work queue', ''],
    ['safe-demo', 'Activity & guide', 'Reset saved demo'],
  ];
  for (const [id, screen, action] of destinations) {
    await openFromTopic(page, id);
    await expect(page.getByRole('heading', { level: 1, name: screen, exact: true })).toBeVisible();
    await expect(page.locator('main')).toBeFocused();
    if (action) await expect(page.getByRole('button', { name: action, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Open Tutorials', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tutorials' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Activity & guide' })).toBeVisible();
  expect(await stored(page)).toBe(before);
});

test('a separate tutorial tab stays readable while one working tab saves, without bypassing stale-tab protection', async ({
  page,
  context,
}) => {
  await tutorials(page);
  const before = await stored(page);
  const link = page.getByRole('link', { name: 'Open tutorials in a new tab', exact: true });
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener');
  const popupPromise = context.waitForEvent('page');
  await link.click();
  const reader = await popupPromise;
  await expect(reader.getByRole('heading', { level: 1, name: 'Tutorials' })).toBeVisible();
  expect(await reader.evaluate(() => window.opener === null)).toBe(true);
  await reader.locator('#tutorial-add-work > summary').click();
  await reader.locator('#tutorial-add-work .tutorial-fields summary').click();
  expect(await stored(page)).toBe(before);

  await page.getByRole('navigation').getByRole('link', { name: 'Work queue', exact: true }).click();
  await page.getByRole('button', { name: 'Add work', exact: true }).click();
  await dialog(page).getByLabel('Project reference').fill('TPN-TWO-TABS');
  await dialog(page).getByLabel('Client', { exact: true }).fill('Fictional client');
  await dialog(page)
    .getByLabel('Products, batch, timepoint and samples')
    .fill('Demo batch / T01–T04 / replicates 1–3');
  await save(page);
  const saved = await stored(page);
  expect(JSON.parse(saved!).revision).toBe(JSON.parse(before!).revision + 1);
  await expect(
    reader.getByRole('status').filter({ hasText: 'You can keep reading these tutorials.' }),
  ).toBeVisible();
  await expect(reader.getByRole('alert')).toHaveCount(0);
  await expect(reader.locator('#tutorial-add-work .tutorial-fields')).toHaveAttribute('open', '');
  await expect(reader.locator('#tutorial-add-work dl')).toContainText('TPN');
  await reader
    .locator('#tutorial-add-work')
    .getByRole('button', { name: 'Open Work queue' })
    .click();
  await expect(reader.getByRole('alert')).toContainText('Reload before saving');
  expect(await stored(reader)).toBe(saved);
  await reader.reload();
  await expect(reader.getByRole('alert')).toHaveCount(0);
  await expect(reader.getByRole('row').filter({ hasText: 'TPN-TWO-TABS' })).toBeVisible();
  await reader.close();
});

test('follow the tutorials to add a method, standard, work and an analyst assignment', async ({
  page,
}) => {
  await openFromTopic(page, 'add-method');
  await page.getByRole('button', { name: 'Add method', exact: true }).click();
  await dialog(page).getByLabel('Name', { exact: true }).fill('Tutorial method');
  await dialog(page).getByLabel('Method code').fill('DEMO-TUTORIAL');
  await dialog(page).getByLabel('Prerequisites').fill('Fictional samples and standard ready');
  await dialog(page)
    .getByLabel('Source and assumptions')
    .fill('Tutorial example only; timings unverified.');
  await dialog(page).getByLabel('Step name').fill('Prepare fictional samples');
  await dialog(page).getByLabel('Total time (min)').fill('30');
  await dialog(page).getByLabel('Hands-on time (min)').fill('15');
  await dialog(page).getByRole('combobox', { name: 'Equipment type' }).selectOption('Balance');
  await dialog(page).getByRole('button', { name: 'Add step', exact: true }).click();
  const second = dialog(page).getByRole('group', { name: 'Step 2', exact: true });
  await second.getByLabel('Step name').fill('Wait');
  await second.getByLabel('Total time (min)').fill('15');
  await second.getByLabel('Hands-on time (min)').fill('0');
  await save(page);
  await expect(page.getByRole('heading', { name: 'Tutorial method', exact: true })).toBeVisible();

  await openFromTopic(page, 'add-standard');
  await page.getByRole('button', { name: 'Add standard', exact: true }).click();
  await dialog(page).getByLabel('Name', { exact: true }).fill('Tutorial standard');
  await dialog(page).getByLabel('Shelf life (hours)').fill('24');
  await dialog(page)
    .getByLabel('Storage conditions, source and assumptions')
    .fill('Fictional example; confirm storage before use.');
  await dialog(page).getByLabel('Step name').fill('Prepare fictional standard');
  await save(page);

  await openFromTopic(page, 'add-work');
  await page.getByRole('button', { name: 'Add work', exact: true }).click();
  await dialog(page).getByLabel('Project reference').fill('TPN-TUTORIAL');
  await dialog(page).getByLabel('Client', { exact: true }).fill('Fictional client');
  await dialog(page)
    .getByLabel('Products, batch, timepoint and samples')
    .fill('Demo batch, initial, T01–T02 / replicates 1–2');
  await dialog(page)
    .getByRole('combobox', { name: 'Method', exact: true })
    .selectOption('DEMO-TUTORIAL');
  await dialog(page).getByLabel('Required replicates').fill('4');
  await dialog(page)
    .getByRole('combobox', { name: 'Required standard', exact: true })
    .selectOption({ label: 'Tutorial standard' });
  await save(page);

  await openFromTopic(page, 'assign-work');
  const row = page.getByRole('row').filter({ hasText: 'TPN-TUTORIAL' });
  await row.getByRole('button', { name: 'Assign work', exact: true }).click();
  await dialog(page)
    .getByRole('combobox', { name: 'Analyst', exact: true })
    .selectOption({ label: 'Theo Brooks' });
  await dialog(page).getByLabel('Replicates', { exact: true }).fill('2');
  await dialog(page).getByLabel('Assigned sample / replicate IDs').fill('T01 / replicates 1–2');
  await dialog(page)
    .getByRole('combobox', { name: 'Balance', exact: true })
    .selectOption({ label: 'Balance B' });
  await expect(dialog(page)).toContainText('preparation has not been recorded');
  await expect(dialog(page)).toContainText('method qualification is not confirmed');
  await dialog(page).getByRole('checkbox', { name: 'I have reviewed these warnings.' }).check();
  await save(page);
  await expect(row).toContainText('4 required');
  await expect(row).toContainText('2 unassigned · 2 pending');
  await expect(row).toContainText('0 valid output');
  await row.getByRole('button', { name: 'Assignments / progress' }).click();
  await expect(page.getByRole('region', { name: 'Work assignments' })).toContainText('Theo Brooks');
  await page.reload();
  const saved = JSON.parse((await stored(page))!);
  expect(saved.methods.find((m: any) => m.id === 'DEMO-TUTORIAL').steps).toHaveLength(2);
  expect(saved.work.find((w: any) => w.project === 'TPN-TUTORIAL').quantity).toBe(4);
});
