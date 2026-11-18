import { Page } from '@playwright/test';
import { samplePlan } from '../testing/sample-plan';

// Only tests that exercise existing attempts and clashes need a populated plan.
export async function loadSamplePlan(page: Page) {
  await page.goto('/');
  await page.evaluate(
    (s) => localStorage.setItem('lab-planner-fictional-v1', JSON.stringify(s)),
    samplePlan(),
  );
  await page.reload();
}
