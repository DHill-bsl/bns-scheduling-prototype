import { test, expect, Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadSamplePlan } from './sample-plan';

async function aligned(controls: Locator) {
  const boxes = await controls.evaluateAll((elements) =>
    elements
      .map((el) => {
        const box = el.getBoundingClientRect();
        return { text: el.textContent?.trim(), height: box.height, center: box.y + box.height / 2 };
      })
      .filter((box) => box.height > 0),
  );
  if (boxes.length < 2) return;
  for (const box of boxes) {
    expect(Math.abs(box.height - boxes[0].height), JSON.stringify(boxes)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.center - boxes[0].center), JSON.stringify(boxes)).toBeLessThanOrEqual(1);
  }
}
async function nav(page: Page, name: string) {
  await page.getByRole('navigation').getByRole('link', { name }).click();
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
}

test.beforeEach(async ({ page }) => {
  await loadSamplePlan(page);
});

test('Broughton assets and aligned controls across desktop, tablet and mobile screens', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1600, 1366, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of [
      'Team planner',
      'Work queue',
      'Problems & repeats',
      'Methods & standards',
      'Work sheets',
      'Tutorials',
      'Activity & guide',
    ]) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await nav(page, name);
      if (name === 'Team planner')
        await expect(page.locator('.scheduler_default_main')).toBeVisible();
      if (name === 'Work sheets') await expect(page.locator('.sheet-toolbar')).toBeVisible();
      const dropdowns = await page.locator('select:visible').evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            label: element.getAttribute('aria-label'),
            appearance: style.appearance,
            image: style.backgroundImage,
            inset: style.backgroundPositionX,
            padding: parseFloat(style.paddingRight),
          };
        }),
      );
      for (const dropdown of dropdowns) {
        expect(dropdown.appearance).toBe('none');
        expect(dropdown.image).toContain('data:image/svg+xml');
        expect(dropdown.inset).toContain('12px');
        expect(dropdown.padding).toBeGreaterThanOrEqual(38);
      }
      await expect(page.locator('.brand img')).toHaveJSProperty('complete', true);
      expect(
        await page.locator('.brand img').evaluate((image: HTMLImageElement) => image.naturalWidth),
      ).toBeGreaterThan(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${name} at ${width}px`,
      ).toBeTruthy();
      await aligned(page.locator('.heading-actions button'));
      await aligned(page.locator('.sheet-actions button'));
      for (const actions of await page
        .locator('.queue-card-actions,.assignment-panel .table-actions,.repeat-card .table-actions')
        .all())
        await aligned(actions.locator('button'));
      const clipped = await page.locator('main button.mat-mdc-button-base').evaluateAll((buttons) =>
        buttons.flatMap((button) => {
          const label = button.querySelector('.mdc-button__label');
          if (!label) return [];
          const b = button.getBoundingClientRect(),
            l = label.getBoundingClientRect();
          return l.width > b.width + 1 || l.height > b.height + 1
            ? [button.textContent?.trim()]
            : [];
        }),
      );
      expect(clipped, `${name} at ${width}px`).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`${name.toLowerCase().replaceAll(/[^a-z]+/g, '-')}-${width}.png`),
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.fonts.check('600 14px Montserrat'))).toBeTruthy();
});

test('editor errors stay visible, footer buttons align, and method step actions align with fields', async ({
  page,
}, info) => {
  await nav(page, 'Work queue');
  await page.getByRole('button', { name: 'Add work', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await aligned(dialog.locator('mat-dialog-actions button'));
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Check the highlighted fields.');
  await expect(dialog.getByRole('alert')).toBeFocused();
  await expect(dialog.getByLabel('Project reference')).toHaveClass(/ng-touched/);
  expect(await dialog.locator('mat-dialog-content').evaluate((el) => el.scrollTop)).toBe(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await nav(page, 'Methods & standards');
  await page.getByRole('button', { name: 'Edit method', exact: true }).first().click();
  const step = dialog.locator('fieldset').first();
  const label = step.getByLabel('Equipment');
  const action = step.getByRole('button', { name: 'Remove step' });
  await action.scrollIntoViewIfNeeded();
  const selectBox = await label.boundingBox();
  const buttonBox = await action.boundingBox();
  expect(
    Math.abs(selectBox!.y + selectBox!.height - (buttonBox!.y + buttonBox!.height)),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath('method-editor-1600.png') });
  await dialog.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  await page
    .getByRole('button', { name: 'Edit / record preparation', exact: true })
    .first()
    .click();
  await expect(dialog.getByLabel('Shelf life (hours)')).toBeVisible();
  for (const width of [1600, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await aligned(dialog.locator('mat-dialog-actions button'));
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) })),
    ).toEqual([]);
    await page.screenshot({ path: info.outputPath(`standard-editor-${width}.png`) });
  }
});

test('section descriptions explain actions and dropdowns retain keyboard and high-contrast support', async ({
  page,
}, info) => {
  const descriptions = {
    'Team planner': 'Assign work to analysts and equipment.',
    'Work queue': 'View required quantities, sample readiness and deadlines.',
    'Problems & repeats': 'Assign repeats for failed attempts',
    'Methods & standards': 'Set up method steps, equipment and prerequisites.',
    'Work sheets': 'Preview assignments by date and analyst.',
    Tutorials: 'Choose a task and follow the steps.',
    'Activity & guide': 'View recorded changes, instructions for using the app',
  };
  for (const [name, description] of Object.entries(descriptions)) {
    await nav(page, name);
    await expect(page.locator('.page-heading p')).toContainText(description);
  }
  await nav(page, 'Team planner');
  const resources = page.getByRole('combobox', { name: 'Filter resources' });
  await resources.focus();
  await resources.press('ArrowDown');
  await resources.press('Enter');
  await expect(resources).toHaveValue('p1');
  await expect(
    page.locator('.scheduler_default_rowheader').filter({ hasText: 'Maya Reed' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Assign work', exact: true }).click();
  const analyst = page.getByRole('dialog').getByRole('combobox', { name: 'Analyst', exact: true });
  await analyst.focus();
  await analyst.press('ArrowDown');
  await analyst.press('Enter');
  await expect(analyst).toHaveValue('p1');
  for (const width of [1600, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await analyst.evaluate((element) => getComputedStyle(element).backgroundPositionX),
    ).toContain('12px');
    await page.screenshot({ path: info.outputPath(`assignment-dropdowns-${width}.png`) });
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(analyst).toHaveCSS('appearance', 'auto');
  await expect(analyst).toHaveCSS('background-image', 'none');
  await analyst.focus();
  await analyst.press('ArrowDown');
  await analyst.press('Enter');
  await expect(analyst).toHaveValue('p2');
});
