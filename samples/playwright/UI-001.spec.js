import { test, expect } from '@playwright/test';

// Mock-provider draft; human review required.
// Requirements: AC-01
test("UI-001: Log in with valid credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("qa.user");
  await page.getByLabel("Password", { exact: true }).fill("DemoPass123!");
  await page.getByRole('button', { name: "Log in", exact: true }).click();
  await expect(page.getByRole('status')).toHaveText("Welcome, qa.user!");
});
