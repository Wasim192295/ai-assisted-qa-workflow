import { test, expect } from '@playwright/test';

// Mock-provider draft; human review required.
// Requirements: AC-03
test("UI-003: Require a username", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("");
  await page.getByLabel("Password", { exact: true }).fill("DemoPass123!");
  await page.getByRole('button', { name: "Log in", exact: true }).click();
  await expect(page.getByRole('status')).toHaveText("Username and password are required");
});
