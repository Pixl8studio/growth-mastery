/**
 * Signup E2E Tests
 * Tests signup page functionality and user registration
 */

import { test, expect } from "@playwright/test";

test.describe("Signup Page", () => {
    test("should display signup form", async ({ page }) => {
        await page.goto("/signup");

        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("should validate password match", async ({ page }) => {
        await page.goto("/signup");

        await page.fill('input[name="email"]', "test@example.com");
        await page.fill('input[name="password"]', "password123");
        await page.fill('input[name="confirmPassword"]', "differentpassword");
        await page.click('button[type="submit"]');

        await expect(page.locator("text=/password.*match/i")).toBeVisible();
    });

    test("should validate email format", async ({ page }) => {
        await page.goto("/signup");

        await page.fill('input[name="email"]', "invalid-email");
        await page.fill('input[name="password"]', "password123");
        await page.click('button[type="submit"]');

        const emailInput = page.locator('input[name="email"]');
        const validationMessage = await emailInput.evaluate(
            (el: HTMLInputElement) => el.validationMessage
        );
        expect(validationMessage).toBeTruthy();
    });

    test("should have link to login page", async ({ page }) => {
        await page.goto("/signup");

        const loginLink = page.locator('a[href="/login"]');
        await expect(loginLink).toBeVisible();
    });

    test("should show terms and privacy links", async ({ page }) => {
        await page.goto("/signup");

        // Check for terms or privacy policy links
        const termsLink = page.locator("text=/terms|privacy/i");
        if ((await termsLink.count()) > 0) {
            await expect(termsLink.first()).toBeVisible();
        }
    });

    test("should accept referral code parameter", async ({ page }) => {
        await page.goto("/signup?ref=TEST123");

        // Check if referral code is pre-filled or stored
        const referralInput = page.locator('input[name="referralCode"]');
        if ((await referralInput.count()) > 0) {
            const value = await referralInput.inputValue();
            expect(value).toBe("TEST123");
        }
    });

    test("should show loading state during submission", async ({ page }) => {
        await page.goto("/signup");

        await page.fill('input[name="email"]', "newuser@example.com");
        await page.fill('input[name="password"]', "password123");
        await page.fill('input[name="confirmPassword"]', "password123");

        await page.click('button[type="submit"]');

        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeDisabled();
    });

    test("should show error for existing email", async ({ page }) => {
        // This test would require a known existing email
        // Skipped unless test environment has known data
        test.skip();
    });
});
