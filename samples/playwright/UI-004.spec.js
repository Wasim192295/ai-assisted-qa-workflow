import { test, expect } from '@playwright/test';

// Mock-provider draft; human review required.
// Requirements: AC-03
test("UI-004: Require a password", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("qa.user");
  await page.getByLabel("Password", { exact: true }).fill("");
  await page.getByRole('button', { name: "Log in", exact: true }).click();
  await expect(page.getByRole('status')).toHaveText("Username and password are required");
});
