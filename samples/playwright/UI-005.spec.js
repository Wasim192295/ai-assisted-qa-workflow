import { test, expect } from '@playwright/test';

// Mock-provider draft; human review required.
// Requirements: AC-04
test("UI-005: Reject a locked account", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("locked.user");
  await page.getByLabel("Password", { exact: true }).fill("DemoPass123!");
  await page.getByRole('button', { name: "Log in", exact: true }).click();
  await expect(page.getByRole('status')).toHaveText("Account is locked");
});
