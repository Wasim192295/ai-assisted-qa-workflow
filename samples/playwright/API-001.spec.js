import { test, expect } from '@playwright/test';

// Mock-provider draft; human review required.
// Requirements: AC-01, AC-05
test("API-001: Log in with valid credentials", async ({ request }) => {
  const response = await request.post("/api/login", { data: {"username":"qa.user","password":"DemoPass123!"} });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ message: "Welcome, qa.user!" });
});
