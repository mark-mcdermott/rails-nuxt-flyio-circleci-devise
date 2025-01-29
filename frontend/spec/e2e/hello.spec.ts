// frontend/e2e/hello.spec.ts

import { test, expect } from '@playwright/test';

test('frontend and backend are working', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="frontend-message"]')).toHaveText('Hello from Nuxt!');
  await expect(page.locator('[data-testid="backend-message"]')).toHaveText('Hello from Rails!');
});