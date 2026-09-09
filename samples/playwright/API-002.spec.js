import { test, expect } from '@playwright/test';

// Mock-provider draft; human review required.
// Requirements: AC-02, AC-05
test("API-002: Reject invalid credentials", async ({ request }) => {
  const response = await request.post("/api/login", { data: {"username":"qa.user","password":"WrongPassword!"} });
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ message: "Invalid credentials" });
});
