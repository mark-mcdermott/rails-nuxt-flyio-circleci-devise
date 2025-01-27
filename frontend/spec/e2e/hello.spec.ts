// frontend/e2e/hello.spec.ts

import { test, expect } from '@playwright/test';

test('frontend and backend are working', async ({ page }) => {
  // Navigate to the frontend URL
  await page.goto('/');

  // Verify the frontend message
  await expect(page.locator('[data-testid="frontend-message"]')).toHaveText('Hello from Nuxt!');

  // Verify the backend message
  await expect(page.locator('[data-testid="backend-message"]')).toHaveText('Hello from Rails!');
});