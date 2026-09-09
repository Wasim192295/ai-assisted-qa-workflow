import { test, expect } from '@playwright/test';

// Mock-provider draft; human review required.
// Requirements: AC-04, AC-05
test("API-005: Reject a locked account", async ({ request }) => {
  const response = await request.post("/api/login", { data: {"username":"locked.user","password":"DemoPass123!"} });
  expect(response.status()).toBe(423);
  expect(await response.json()).toEqual({ message: "Account is locked" });
});
