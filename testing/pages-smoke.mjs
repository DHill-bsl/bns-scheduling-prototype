import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const basePath = '/bns-scheduling-prototype/';
const output = fileURLToPath(new URL('../dist/lab-planner/browser/', import.meta.url));
const remote = process.argv[2];
let server;
let browser;

try {
  let target = remote;
  if (!target) {
    const types = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.woff2': 'font/woff2',
    };
    server = createServer(async (request, response) => {
      try {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        if (!pathname.startsWith(basePath)) throw Error('Not found');
        const name = decodeURIComponent(pathname.slice(basePath.length)) || 'index.html';
        const path = resolve(output, name);
        if (!path.startsWith(resolve(output) + sep)) throw Error('Not found');
        const content = await readFile(path);
        response.writeHead(200, {
          'Content-Type': types[extname(path)] || 'application/octet-stream',
        });
        response.end(content);
      } catch {
        response.writeHead(404);
        response.end('Not found');
      }
    });
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    target = `http://127.0.0.1:${server.address().port}${basePath}`;
  }
  const url = new URL(target);
  assert.equal(
    url.pathname,
    basePath,
    'Use the repository Pages URL, including its trailing slash',
  );
  assert.ok(['http:', 'https:'].includes(url.protocol));

  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) =>
    errors.push(request.failure()?.errorText + ' ' + request.url()),
  );
  const response = await page.goto(target);
  assert.equal(response.status(), 200);
  await expect(
    page.getByRole('heading', { name: 'Start with one job', exact: true }),
  ).toBeVisible();
  assert.equal(await page.locator('base').getAttribute('href'), basePath);
  await expect(page.locator('.brand img')).toHaveJSProperty('complete', true);
  assert.ok(await page.locator('.brand img').evaluate((image) => image.naturalWidth > 0));
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.fonts.check('600 14px Montserrat')));

  const nav = async (name) => {
    await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
  };
  await nav('Methods & standards');
  await expect(page.getByRole('heading', { name: 'Coating check', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Colour screening', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('Fictional demonstration only.');
  await page.getByRole('button', { name: 'Standards', exact: true }).click();
  await expect(page.getByText('L2 · 72 hour shelf life', { exact: true })).toBeVisible();
  await expect(page.getByText('L3 · 240 hour shelf life', { exact: true })).toBeVisible();

  await page.goto(target + '#tutorials');
  await expect(page.locator('details.tutorial')).toHaveCount(13);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tutorials', level: 1 })).toBeVisible();
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Open tutorials in a new tab', exact: true }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole('heading', { name: 'Tutorials', level: 1 })).toBeVisible();
  assert.equal(new URL(popup.url()).pathname, basePath);
  await popup.close();

  await nav('Team planner');
  await page.getByRole('button', { name: 'Add your first work' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Project reference').fill('JOB-PAGES-DEMO');
  await dialog.getByLabel('Client', { exact: true }).fill('Fictional client');
  await dialog
    .getByLabel('Products, batch, timepoint and samples')
    .fill('Demo panels / S01 / replicates 1–2');
  await dialog.getByLabel('Required replicates').fill('2');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Assign work', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Analyst', exact: true }).selectOption('p2');
  await dialog.getByLabel('Assigned sample / replicate IDs').fill('S01 / replicates 1–2');
  const acknowledgement = dialog.getByRole('checkbox', { name: 'I have reviewed these warnings.' });
  if (await acknowledgement.count()) await acknowledgement.check();
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.assignment-panel')).toContainText('JOB-PAGES-DEMO');
  await nav('Work sheets');
  await expect(page.locator('.paper')).toContainText('JOB-PAGES-DEMO');
  await expect(page.locator('.paper')).toContainText(
    'made-up work, recipes, timings and shelf lives',
  );
  await page.reload();
  await expect(page.locator('.paper')).toContainText('JOB-PAGES-DEMO');

  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mkdir('test-results', { recursive: true });
  await page.screenshot({
    path: `test-results/pages-${remote ? 'live' : 'local'}.png`,
    fullPage: true,
  });
  assert.deepEqual(errors, [], 'Browser, request and HTTP errors');
  console.log(
    `Pages smoke check passed: ${target} (assets, fictional defaults, hash refresh, tutorials, work, assignment, sheets and persistence)`,
  );
} finally {
  await browser?.close();
  if (server) await new Promise((done) => server.close(done));
}
