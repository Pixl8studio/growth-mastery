/**
 * Authentication Flow E2E Tests
 * Test complete authentication user journey
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
    test("should allow user to sign up and login", async ({ page }) => {
        // Go to homepage
        await page.goto("/");

        // Click sign up
        await page.click('text="Get Started"');

        // Should be on signup page
        await expect(page).toHaveURL(/\/signup/);

        // Fill signup form
        const testEmail = `test-${Date.now()}@example.com`;
        await page.fill('input[name="name"]', "Test User");
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', "password123");
        await page.fill('input[name="confirmPassword"]', "password123");

        // Submit form
        await page.click('button[type="submit"]');

        // Should redirect to funnel builder dashboard
        await expect(page).toHaveURL(/\/funnel-builder/, { timeout: 10000 });

        // Should see dashboard
        await expect(page.locator("h1")).toContainText("AI-Powered");
    });

    test("should show error for invalid credentials", async ({ page }) => {
        await page.goto("/login");

        // Try to login with invalid credentials
        await page.fill('input[name="email"]', "invalid@example.com");
        await page.fill('input[name="password"]', "wrongpassword");
        await page.click('button[type="submit"]');

        // Should show error message
        await expect(page.locator("text=/Failed to sign in/i")).toBeVisible();
    });

    test("should validate password match on signup", async ({ page }) => {
        await page.goto("/signup");

        await page.fill('input[name="email"]', "test@example.com");
        await page.fill('input[name="password"]', "password123");
        await page.fill('input[name="confirmPassword"]', "differentpassword");
        await page.click('button[type="submit"]');

        // Should show passwords don't match error
        await expect(page.locator("text=/Passwords do not match/i")).toBeVisible();
    });
});
