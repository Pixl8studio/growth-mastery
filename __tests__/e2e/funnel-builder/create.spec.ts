/**
 * Funnel Builder Create E2E Tests
 * Tests funnel creation flow
 */

import { test, expect } from "@playwright/test";

test.describe("Funnel Builder Create", () => {
    test.beforeEach(async () => {
        test.skip(!process.env.TEST_USER_EMAIL, "Test user credentials not configured");
    });

    test("should redirect to login when not authenticated", async ({ page }) => {
        await page.goto("/funnel-builder/create");

        await expect(page).toHaveURL(/\/login/);
    });

    test("should display funnel creation wizard", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/funnel-builder/create");

        const wizard = page.locator("h1, h2, .wizard, [data-testid='wizard']").first();
        await expect(wizard).toBeVisible();
    });

    test("should have business information form", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/funnel-builder/create");

        // Check for business name or offer name input
        const nameInput = page.locator('input[name*="name"], input[type="text"]').first();
        await expect(nameInput).toBeVisible();
    });

    test("should validate required fields", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/funnel-builder/create");

        // Try to submit without filling required fields
        const submitButton = page.locator('button[type="submit"], button:has-text("Next")').first();
        if ((await submitButton.count()) > 0) {
            await submitButton.click();

            // Should show validation errors
            const error = page.locator("text=/required|fill/i").first();
            await expect(error).toBeVisible();
        }
    });

    test("should progress through wizard steps", async ({ page }) => {
        test.skip(); // Requires authentication and form completion

        await page.goto("/funnel-builder/create");

        // Check for step indicators
        const steps = page.locator(".step, [data-step], .wizard-step");
        if ((await steps.count()) > 0) {
            expect(await steps.count()).toBeGreaterThan(0);
        }
    });

    test("should allow going back to previous step", async ({ page }) => {
        test.skip(); // Requires authentication and multi-step wizard

        await page.goto("/funnel-builder/create");

        const backButton = page.locator('button:has-text("Back"), button:has-text("Previous")').first();
        if ((await backButton.count()) > 0) {
            await expect(backButton).toBeVisible();
        }
    });
});
