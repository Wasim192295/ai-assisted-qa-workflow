import { test, expect } from '@playwright/test';

// Mock-provider draft; human review required.
// Requirements: AC-02
test("UI-002: Reject invalid credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("qa.user");
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword!");
  await page.getByRole('button', { name: "Log in", exact: true }).click();
  await expect(page.getByRole('status')).toHaveText("Invalid credentials");
});
