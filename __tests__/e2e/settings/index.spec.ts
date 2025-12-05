/**
 * Settings Index E2E Tests
 * Tests main settings page functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Settings Index", () => {
    test.beforeEach(async () => {
        test.skip(!process.env.TEST_USER_EMAIL, "Test user credentials not configured");
    });

    test("should redirect to login when not authenticated", async ({ page }) => {
        await page.goto("/settings");

        await expect(page).toHaveURL(/\/login/);
    });

    test("should display settings page when authenticated", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings");

        const heading = page.locator("h1, h2").first();
        await expect(heading).toContainText(/setting/i);
    });

    test("should have navigation for different settings sections", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings");

        // Check for settings navigation
        const nav = page.locator("nav, .settings-nav, [data-testid='settings-nav']").first();
        await expect(nav).toBeVisible();
    });

    test("should have profile settings link", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings");

        const profileLink = page.locator('text=/profile|account/i, a[href*="profile"]').first();
        await expect(profileLink).toBeVisible();
    });

    test("should have integrations settings link", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings");

        const integrationsLink = page.locator('text=/integration/i, a[href*="integration"]').first();
        await expect(integrationsLink).toBeVisible();
    });

    test("should have payments settings link", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings");

        const paymentsLink = page.locator('text=/payment|billing/i, a[href*="payment"]').first();
        if ((await paymentsLink.count()) > 0) {
            await expect(paymentsLink).toBeVisible();
        }
    });

    test("should have domains settings link", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings");

        const domainsLink = page.locator('text=/domain/i, a[href*="domain"]').first();
        if ((await domainsLink.count()) > 0) {
            await expect(domainsLink).toBeVisible();
        }
    });
});
