import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadSamplePlan } from './sample-plan';
const dialog = (p: Page) => p.getByRole('dialog');
async function nav(p: Page, name: string) {
  await p.getByRole('navigation').getByRole('link', { name }).click();
  await expect(p.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
}
async function state(p: Page) {
  return p.evaluate(() => JSON.parse(localStorage.getItem('lab-planner-fictional-v1')!));
}
function plus(date: string, n: number) {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
async function save(p: Page) {
  const ack = dialog(p).getByRole('checkbox', { name: 'I have reviewed these warnings.' });
  if (await ack.count()) await ack.check();
  await dialog(p).getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog(p)).toHaveCount(0);
}
async function workAssignments(p: Page, project: string) {
  await nav(p, 'Work queue');
  await p
    .getByRole('row')
    .filter({ hasText: project })
    .getByRole('button', { name: 'Assignments / progress', exact: true })
    .click();
  await expect(p.getByRole('region', { name: 'Work assignments' })).toBeFocused();
  return p.getByRole('region', { name: 'Work assignments' });
}
async function oneSheet(p: Page, date: string, name: string) {
  await nav(p, 'Work sheets');
  await p.getByRole('textbox', { name: 'Work-sheet date', exact: true }).fill(date);
  for (const person of ['Maya Reed', 'Theo Brooks', 'Ella Chen', 'Noah Patel'])
    await p.getByRole('checkbox', { name: person, exact: true }).setChecked(person === name);
}
async function issue(p: Page) {
  const ack = p.getByRole('checkbox', { name: 'I have reviewed the warnings' });
  if (await ack.count()) await ack.check();
  await p.getByRole('button', { name: 'Issue work sheets', exact: true }).click();
  await expect(p.locator('.paper')).toContainText(/ISSUED|REVISED/);
}
async function audit(p: Page) {
  const result = await new AxeBuilder({ page: p })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
  ).toEqual([]);
}
test.beforeEach(async ({ page }) => {
  await loadSamplePlan(page);
});

test('handover: split unfinished work with exact subsets and replace issued paper', async ({
  page,
}, info) => {
  const week = (await state(page)).week,
    friday = plus(week, 4);
  await oneSheet(page, week, 'Maya Reed');
  await expect(page.locator('.paper')).toContainText(
    '8 valid · 2 failed / later rejected · 2 not yet attempted',
  );
  await issue(page);
  const original = structuredClone((await state(page)).sheets[0]);
  const panel = await workAssignments(page, 'TPN-2401');
  await panel
    .locator('article')
    .filter({ hasText: 'Maya Reed' })
    .getByRole('button', { name: 'Split', exact: true })
    .click();
  await dialog(page).getByLabel('Replicates', { exact: true }).fill('2');
  await dialog(page).getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p2');
  await dialog(page).getByLabel('Date', { exact: true }).fill(friday);
  await dialog(page).getByLabel('Assigned sample / replicate IDs').fill('M04 / replicates 2–3');
  await dialog(page)
    .getByLabel('Sample / replicate IDs kept on the original assignment')
    .fill('M01–M03 / replicates 1–3; M04 / replicate 1');
  await dialog(page)
    .getByLabel('Reason for changing the plan')
    .fill('Finish the two unattempted replicates on Friday');
  await save(page);
  await expect(page.getByText('1 issued sheet(s) need replacing.', { exact: true })).toBeVisible();
  expect((await state(page)).sheets[0]).toEqual(original);
  await oneSheet(page, friday, 'Theo Brooks');
  await expect(page.locator('.paper')).toContainText(
    'Assigned samples / replicates: M04 / replicates 2–3',
  );
  await expect(page.locator('.paper')).toContainText(
    '0 valid · 0 failed / later rejected · 2 not yet attempted',
  );
  await issue(page);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: info.outputPath('precise-handover.pdf'),
    format: 'A4',
    printBackground: true,
  });
  await page.emulateMedia({ media: 'screen' });
  await oneSheet(page, week, 'Maya Reed');
  await issue(page);
  await expect(page.locator('.paper')).toContainText('REVISED · v2');
  await expect(page.locator('.paper')).toContainText('0 not yet attempted');
  await page
    .getByRole('combobox', { name: 'Earlier copies', exact: true })
    .selectOption(original.id);
  await expect(page.locator('.paper')).toContainText('OUTDATED COPY');
  await expect(page.locator('.paper')).toContainText('2 not yet attempted');
});

test('handover: reject a later failure, retain evidence and assign only one failed replicate', async ({
  page,
}) => {
  const week = (await state(page)).week;
  const panel = await workAssignments(page, 'TPN-2398');
  await panel.getByRole('button', { name: 'Progress', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Reject recorded output', exact: true }).click();
  await dialog(page).getByLabel('Quantity to reject').fill('2');
  await dialog(page).getByLabel('Affected sample / replicate IDs').fill('V01 / replicates 1–2');
  await dialog(page).getByLabel('Reason for rejection').fill('QC failure found during review');
  await page.setViewportSize({ width: 390, height: 900 });
  await audit(page);
  page.once('dialog', (d) => d.accept());
  await dialog(page).getByRole('button', { name: 'Reject output and create repeat' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.setViewportSize({ width: 1600, height: 1100 });
  await expect(page.getByRole('row').filter({ hasText: 'TPN-2398' })).toContainText(
    '4 valid output',
  );
  await panel.getByRole('button', { name: 'Progress', exact: true }).click();
  await expect(dialog(page)).toContainText('6 originally successful');
  await expect(dialog(page)).toContainText('2 later rejected · 4 valid output now');
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await nav(page, 'Problems & repeats');
  const repeat = page.locator('.repeat-card').filter({ hasText: 'QC failure found during review' });
  await repeat.getByRole('button', { name: 'Assign repeat', exact: true }).click();
  await dialog(page).getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p4');
  await dialog(page).getByLabel('Replicates', { exact: true }).fill('1');
  await dialog(page).getByLabel('Date', { exact: true }).fill(plus(week, 4));
  await dialog(page).getByLabel('Assigned sample / replicate IDs').fill('V01 / replicate 1');
  await save(page);
  await expect(repeat).toContainText('1 unassigned');
  await oneSheet(page, plus(week, 4), 'Noah Patel');
  await expect(page.locator('.paper')).toContainText('Repeat only: V01 / replicate 1');
  await expect(page.locator('.paper')).not.toContainText('Repeat only: V01 / replicates 1–2');
  await issue(page);
  await page.reload();
  expect((await state(page)).rejections).toHaveLength(1);
  expect((await state(page)).progress.find((p: any) => p.id === 'pr2').valid).toBe(6);
});

test('handover: plan preparation from its recipe, check clashes and remove linked bookings', async ({
  page,
}, info) => {
  const before = await state(page),
    week = before.week;
  await nav(page, 'Methods & standards');
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  await expect(page.getByText('L3 · 240 hour shelf life', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Plan preparation time', exact: true }).first().click();
  await dialog(page).getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p2');
  await dialog(page).getByLabel('Date', { exact: true }).fill(week);
  await dialog(page).getByLabel('Start time', { exact: true }).fill('09:00');
  await dialog(page).getByRole('combobox', { name: 'Balance', exact: true }).selectOption('e7');
  await expect(dialog(page)).toContainText('preparation overlaps an existing booking');
  await dialog(page).getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog(page).getByRole('alert')).toContainText('acknowledge');
  await dialog(page).getByLabel('Date', { exact: true }).fill(plus(week, 4));
  await dialog(page).getByLabel('Start time', { exact: true }).fill('08:00');
  for (const width of [1600, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await audit(page);
    await page.screenshot({ path: info.outputPath(`preparation-${width}.png`) });
  }
  await save(page);
  const after = await state(page);
  const linked = after.reservations.filter((r: any) => r.preparationId);
  expect(linked).toHaveLength(3);
  expect(after.standards[0].preparedAt).toBe(before.standards[0].preparedAt);
  await oneSheet(page, plus(week, 4), 'Theo Brooks');
  await expect(page.locator('.paper')).toContainText('Prepare Blue reference set');
  await expect(page.locator('.paper')).toContainText('Balance B');
  await page.setViewportSize({ width: 1600, height: 1100 });
  await nav(page, 'Team planner');
  await page.getByText(/Reserved time ·/).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Remove preparation bookings' }).first().click();
  expect((await state(page)).reservations.filter((r: any) => r.preparationId)).toHaveLength(0);
});

test('handover: find old unfinished assignments and work still awaiting reporting', async ({
  page,
}) => {
  await nav(page, 'Work queue');
  await page.getByLabel('Filter work').selectOption('reporting');
  await expect(page.locator('.work-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.work-table tbody')).toContainText('TPN-2398');
  await page.getByRole('button', { name: 'Assignments / progress' }).click();
  await expect(page.getByRole('region', { name: 'Work assignments' })).toContainText('Noah Patel');
  const oldDate = (await state(page)).assignments.find((a: any) => a.id === 'a6').date;
  await expect(page.getByRole('region', { name: 'Work assignments' })).toContainText(
    '0 not yet attempted',
  );
  expect(oldDate < (await state(page)).week).toBe(true);
  await page.getByRole('button', { name: 'Details / readiness' }).click();
  const before = (await state(page)).week;
  await dialog(page).getByLabel('Testing target', { exact: true }).fill(plus(before, -7));
  await dialog(page).getByLabel('Reporting deadline', { exact: true }).fill(plus(before, -1));
  await save(page);
  await page.getByLabel('Filter work').selectOption('late-report');
  await expect(page.locator('.work-table tbody')).toContainText('Reporting deadline passed');
  await audit(page);
  await nav(page, 'Problems & repeats');
  await expect(
    page.getByRole('heading', { name: 'Unfinished from earlier days', exact: true }),
  ).toBeVisible();
});
