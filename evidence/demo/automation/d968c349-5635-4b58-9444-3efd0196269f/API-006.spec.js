import { test, expect } from '@playwright/test';

// Mock-provider draft; human review required.
// Requirements: AC-03, AC-05
test("API-006: Reject API login when both credentials are empty", async ({ request }) => {
  const response = await request.post("/api/login", { data: {"username":"","password":""} });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ message: "Username and password are required" });
});
