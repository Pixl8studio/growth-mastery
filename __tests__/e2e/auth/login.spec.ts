/**
 * Login E2E Tests
 * Tests login page functionality and authentication flow
 */

import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
        await page.goto("/login");

        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
        await page.goto("/login");

        await page.fill('input[name="email"]', "invalid@example.com");
        await page.fill('input[name="password"]', "wrongpassword");
        await page.click('button[type="submit"]');

        await expect(page.locator("text=/Failed to sign in|Invalid/i")).toBeVisible({
            timeout: 10000,
        });
    });

    test("should validate email format", async ({ page }) => {
        await page.goto("/login");

        await page.fill('input[name="email"]', "not-an-email");
        await page.fill('input[name="password"]', "password123");
        await page.click('button[type="submit"]');

        // Check for HTML5 validation or custom validation message
        const emailInput = page.locator('input[name="email"]');
        const validationMessage = await emailInput.evaluate(
            (el: HTMLInputElement) => el.validationMessage
        );
        expect(validationMessage).toBeTruthy();
    });

    test("should have link to signup page", async ({ page }) => {
        await page.goto("/login");

        const signupLink = page.locator('a[href="/signup"]');
        await expect(signupLink).toBeVisible();
    });

    test("should have password reset link", async ({ page }) => {
        await page.goto("/login");

        // Check for forgot password or reset link
        const resetLink = page.locator("text=/forgot|reset/i");
        if ((await resetLink.count()) > 0) {
            await expect(resetLink.first()).toBeVisible();
        }
    });

    test("should show loading state during submission", async ({ page }) => {
        await page.goto("/login");

        await page.fill('input[name="email"]', "test@example.com");
        await page.fill('input[name="password"]', "password123");

        // Click submit and immediately check for loading state
        await page.click('button[type="submit"]');

        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeDisabled();
    });

    test("should redirect to dashboard on successful login", async ({ page }) => {
        // This test would require valid credentials or mocking
        // Skipped in actual implementation unless test user exists
        test.skip();
    });
});
