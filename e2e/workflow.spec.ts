import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadSamplePlan } from './sample-plan';
const dialog = (p: Page) => p.getByRole('dialog');
async function nav(p: Page, name: string) {
  await p.getByRole('navigation').getByRole('link', { name, exact: false }).click();
  await expect(p.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
}
async function state(p: Page) {
  return p.evaluate(() => JSON.parse(localStorage.getItem('lab-planner-fictional-v1')!));
}
async function save(p: Page) {
  const ack = dialog(p).getByRole('checkbox', { name: 'I have reviewed these warnings.' });
  if (await ack.count()) await ack.check();
  await dialog(p).getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog(p)).toHaveCount(0);
}
function plus(date: string, n: number) {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
async function reset(p: Page) {
  p.once('dialog', (d) => d.accept());
  await p.getByRole('button', { name: 'Reset demo', exact: false }).click();
}
test.beforeEach(async ({ page }) => {
  await loadSamplePlan(page);
});

test('complete team-leader workflow: create, assign, split, move, issue, revise, progress and repeat', async ({
  page,
}) => {
  const monday = (await state(page)).week,
    wed = plus(monday, 2),
    thu = plus(monday, 3),
    fri = plus(monday, 4);
  await nav(page, 'Work queue');
  await page.getByRole('button', { name: 'Add work', exact: true }).click();
  await dialog(page)
    .getByRole('textbox', { name: 'Project reference', exact: true })
    .fill('TPN-DEMO');
  await dialog(page).getByRole('textbox', { name: 'Client', exact: true }).fill('Demo Research');
  await dialog(page)
    .getByRole('textbox', { name: 'Products, batch, timepoint and samples' })
    .fill('Batch DEMO · 3-month · D01–D04');
  await dialog(page).getByRole('textbox', { name: 'Samples available from' }).fill(monday);
  await dialog(page).getByRole('textbox', { name: 'Testing target', exact: true }).fill(fri);
  await dialog(page)
    .getByRole('textbox', { name: 'Reporting deadline', exact: true })
    .fill(plus(monday, 7));
  await save(page);
  let row = page.getByRole('row').filter({ hasText: 'TPN-DEMO' });
  await expect(row).toContainText('12 unassigned');
  await row.getByRole('button', { name: 'Assign work', exact: true }).click();
  await dialog(page).getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p2');
  await dialog(page).getByRole('spinbutton', { name: 'Replicates', exact: true }).fill('6');
  await dialog(page).getByLabel('Assigned sample / replicate IDs').fill('D01–D02 / replicates 1–3');
  await dialog(page).getByRole('textbox', { name: 'Date', exact: true }).fill(thu);
  await dialog(page).getByRole('textbox', { name: 'Start time', exact: true }).fill('09:00');
  await save(page);
  await expect(row).toContainText('6 unassigned');
  await expect(row).toContainText('0 valid output');
  await nav(page, 'Team planner');
  let assigned = page.getByRole('row').filter({ hasText: 'TPN-DEMO' });
  await assigned.getByRole('button', { name: 'Split', exact: true }).click();
  await dialog(page).getByRole('spinbutton', { name: 'Replicates', exact: true }).fill('2');
  await dialog(page).getByLabel('Assigned sample / replicate IDs').fill('D01 / replicates 2–3');
  await dialog(page)
    .getByLabel('Sample / replicate IDs kept on the original assignment')
    .fill('D01 / replicate 1; D02 / replicates 1–3');
  await dialog(page).getByRole('textbox', { name: 'Date', exact: true }).fill(fri);
  await dialog(page)
    .getByRole('textbox', { name: 'Reason for changing the plan' })
    .fill('Split the remaining work across days');
  await save(page);
  await expect(page.getByRole('row').filter({ hasText: 'TPN-DEMO' })).toHaveCount(2);
  assigned = page
    .getByRole('row')
    .filter({ hasText: 'TPN-DEMO' })
    .filter({ hasText: '4 assigned' });
  await assigned.getByRole('button', { name: 'Edit / move', exact: true }).click();
  await dialog(page).getByRole('textbox', { name: 'Date', exact: true }).fill(wed);
  await dialog(page).getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p1');
  await dialog(page)
    .getByRole('textbox', { name: 'Reason for changing the plan' })
    .fill('Cover the earlier slot');
  await save(page);
  await nav(page, 'Work sheets');
  await page.getByRole('textbox', { name: 'Work-sheet date', exact: true }).fill(wed);
  for (const name of ['Theo Brooks', 'Ella Chen', 'Noah Patel'])
    await page.getByRole('checkbox', { name, exact: true }).uncheck();
  await page.waitForTimeout(150);
  const issueAck = page.getByRole('checkbox', { name: 'I have reviewed the warnings' });
  if (await issueAck.isVisible()) await issueAck.check();
  await page.getByRole('button', { name: 'Issue work sheets', exact: true }).click();
  await expect(page.locator('.paper')).toContainText('ISSUED · v1');
  const old = structuredClone((await state(page)).sheets);
  await nav(page, 'Team planner');
  assigned = page.getByRole('row').filter({ hasText: 'TPN-DEMO' }).filter({ hasText: 'Maya Reed' });
  await assigned.getByRole('button', { name: 'Edit / move', exact: true }).click();
  await dialog(page)
    .getByRole('textbox', { name: 'Instructions and handover' })
    .fill('Revised: confirm D01 labels with the team leader.');
  await dialog(page)
    .getByRole('textbox', { name: 'Reason for changing the plan' })
    .fill('Updated handover');
  await save(page);
  await expect(page.getByText('1 issued sheet(s) need replacing.', { exact: true })).toBeVisible();
  expect((await state(page)).sheets).toEqual(old);
  await nav(page, 'Work sheets');
  await page.getByRole('textbox', { name: 'Work-sheet date', exact: true }).fill(wed);
  for (const name of ['Theo Brooks', 'Ella Chen', 'Noah Patel'])
    await page.getByRole('checkbox', { name, exact: true }).uncheck();
  await page.waitForTimeout(150);
  if (await issueAck.isVisible()) await issueAck.check();
  await page.getByRole('button', { name: 'Issue work sheets', exact: true }).click();
  await expect(page.locator('.paper')).toContainText('REVISED · v2');
  await expect(page.locator('.paper')).toContainText('Replace all earlier copies');
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset['printed'] = 'yes';
    };
  });
  await page.getByRole('button', { name: 'Print work sheets', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes');
  await nav(page, 'Team planner');
  assigned = page.getByRole('row').filter({ hasText: 'TPN-DEMO' }).filter({ hasText: 'Maya Reed' });
  await assigned.getByRole('button', { name: 'Progress', exact: true }).click();
  await dialog(page).getByRole('spinbutton', { name: 'Valid output', exact: true }).fill('3');
  await dialog(page).getByRole('spinbutton', { name: 'Failed attempts', exact: true }).fill('1');
  await dialog(page)
    .getByRole('textbox', { name: 'Sample and replicate IDs' })
    .fill('D02 / replicate 2');
  await dialog(page)
    .getByRole('textbox', { name: 'Progress or problem', exact: true })
    .fill('Instrument stopped during the run');
  await dialog(page).getByRole('button', { name: 'Record progress', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await nav(page, 'Problems & repeats');
  const repeat = page.locator('.repeat-card').filter({ hasText: 'TPN-DEMO' });
  await expect(repeat).toContainText('D02 / replicate 2');
  await repeat.getByRole('button', { name: 'Assign repeat', exact: true }).click();
  await dialog(page).getByLabel('Assigned sample / replicate IDs').fill('D02 / replicate 2');
  await dialog(page).getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p1');
  await dialog(page).getByRole('textbox', { name: 'Date', exact: true }).fill(fri);
  await save(page);
  await nav(page, 'Team planner');
  const repeatRow = page
    .getByRole('row')
    .filter({ hasText: 'TPN-DEMO' })
    .filter({ hasText: 'Repeat' });
  await repeatRow.getByRole('button', { name: 'Progress', exact: true }).click();
  await dialog(page).getByRole('spinbutton', { name: 'Valid output', exact: true }).fill('1');
  await dialog(page).getByRole('button', { name: 'Record progress', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.reload();
  await nav(page, 'Work queue');
  row = page.getByRole('row').filter({ hasText: 'TPN-DEMO' });
  await expect(row).toContainText('12 required');
  await expect(row).toContainText('4 valid output');
  await expect(row).toContainText('6 unassigned · 2 pending');
  const s = await state(page);
  expect(s.sheets[0]).toEqual(old[0]);
  expect(
    s.repeats.filter((r: any) => r.workId === s.work.find((w: any) => w.project === 'TPN-DEMO').id),
  ).toHaveLength(1);
});

test('invalid input, warnings, empty results and reset', async ({ page }) => {
  await nav(page, 'Work queue');
  await page.getByRole('searchbox', { name: 'Search work' }).fill('does-not-exist');
  await expect(page.getByText('No work matches')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  const row = page.getByRole('row').filter({ hasText: 'TPN-2402' });
  await row.getByRole('button', { name: 'Assign work', exact: true }).click();
  await dialog(page).getByLabel('Assigned sample / replicate IDs').fill('C01–C08 / replicates 1–3');
  await dialog(page).getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p3');
  await dialog(page)
    .getByRole('textbox', { name: 'Date', exact: true })
    .fill(plus((await state(page)).week, 2));
  await expect(dialog(page)).toContainText('Annual leave');
  await expect(dialog(page)).toContainText('Samples are not marked ready');
  await dialog(page).getByRole('spinbutton', { name: 'Replicates', exact: true }).fill('100');
  await expect(dialog(page)).toContainText('This quantity is already assigned');
  await dialog(page).getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog(page).getByRole('alert')).toContainText('Resolve the blocked items');
  page.once('dialog', (d) => d.accept());
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await nav(page, 'Team planner');
  await page
    .getByRole('row')
    .filter({ hasText: 'Maya Reed' })
    .first()
    .getByRole('button', { name: 'Progress', exact: true })
    .click();
  await dialog(page).getByRole('spinbutton', { name: 'Valid output', exact: true }).fill('2');
  await dialog(page).getByRole('spinbutton', { name: 'Failed attempts', exact: true }).fill('2');
  await dialog(page).getByRole('textbox', { name: 'Sample and replicate IDs' }).fill('M03 / R1');
  await dialog(page).getByRole('textbox', { name: 'Progress or problem' }).fill('Failed run');
  await dialog(page).getByRole('button', { name: 'Record progress', exact: true }).click();
  await expect(dialog(page).getByRole('alert')).toContainText(
    'no more than the replicates without a recorded attempt',
  );
  page.once('dialog', (d) => d.accept());
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await reset(page);
  expect((await state(page)).work).toHaveLength(0);
  expect((await state(page)).assignments).toHaveLength(0);
  expect((await state(page)).progress).toHaveLength(0);
});

test('definition editing, standard readiness and manually reserved maintenance', async ({
  page,
}) => {
  await nav(page, 'Methods & standards');
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  await page
    .getByRole('button', { name: 'Edit / record preparation', exact: true })
    .first()
    .click();
  await dialog(page)
    .getByRole('spinbutton', { name: 'Shelf life (hours)', exact: true })
    .fill('96');
  await dialog(page)
    .getByRole('textbox', { name: 'Last preparation completed' })
    .fill((await state(page)).week + 'T07:30');
  await save(page);
  await expect(page.getByText('L2 · 96 hour shelf life', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Test methods', exact: true }).click();
  await page.getByRole('button', { name: 'Edit method', exact: true }).first().click();
  await dialog(page).getByRole('button', { name: 'Add step', exact: true }).click();
  const step = dialog(page).getByRole('group', { name: 'Step 5', exact: true });
  await step.getByRole('textbox', { name: 'Step name' }).fill('Handover to checking');
  await step.getByRole('spinbutton', { name: 'Total time (min)' }).fill('15');
  await step.getByRole('spinbutton', { name: 'Hands-on time (min)' }).fill('15');
  await save(page);
  await expect(page.getByText('Handover to checking', { exact: true })).toBeVisible();
  await nav(page, 'Team planner');
  await page.getByRole('button', { name: 'Reserve time', exact: true }).click();
  await dialog(page).getByRole('combobox', { name: 'Person or equipment' }).selectOption('e1');
  await dialog(page)
    .getByRole('textbox', { name: 'What is the time for?' })
    .fill('Unplanned maintenance');
  await save(page);
  await nav(page, 'Problems & repeats');
  await expect(page.locator('.warning-list').last()).toContainText('Unplanned maintenance');
  await page.reload();
  expect((await state(page)).methods[0].steps).toHaveLength(5);
  expect((await state(page)).standards[0].shelfHours).toBe(96);
});

test('all screens, responsive layout, accessibility and print rendering', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const name of [
    'Team planner',
    'Work queue',
    'Problems & repeats',
    'Methods & standards',
    'Work sheets',
    'Tutorials',
    'Activity & guide',
  ]) {
    await nav(page, name);
    await page.waitForTimeout(250);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
      name,
    ).toEqual([]);
  }
  await nav(page, 'Work sheets');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.paper').first()).toBeVisible();
  await page.pdf({
    path: testInfo.outputPath('work-sheets.pdf'),
    format: 'A4',
    printBackground: true,
  });
  await page.screenshot({ path: testInfo.outputPath('print-preview.png'), fullPage: true });
  await page.emulateMedia({ media: 'screen' });
  for (const width of [1600, 1366, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await nav(page, 'Team planner');
    await page.waitForTimeout(350);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`planner-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Assign work', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});
