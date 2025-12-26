import { test, expect } from '@playwright/test';

test('hello world functionality', async ({ page }) => {
    await page.goto('/'); // Uses baseURL from playwright.config.ts
    const helloWorldText = await page.textContent('h1'); // Adjust the selector as needed
    expect(helloWorldText).toBe('Hello World');
});