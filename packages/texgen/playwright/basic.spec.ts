import { test, expect } from '@playwright/test';
import { PLAYWRIGHT_HOST, SCREENSHOTS } from './location';

test('has title', async ({ page }) => {
  await page.goto(PLAYWRIGHT_HOST);
  await page.getByTestId('tester-vis-app');
  await expect(page).toHaveTitle('Tester');
  await page.screenshot({ path: `${SCREENSHOTS}/start.png` });
});
