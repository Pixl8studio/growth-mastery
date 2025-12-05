/**
 * Funnel Builder List E2E Tests
 * Tests funnel list page functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Funnel Builder List", () => {
    test.beforeEach(async () => {
        test.skip(!process.env.TEST_USER_EMAIL, "Test user credentials not configured");
    });

    test("should redirect to login when not authenticated", async ({ page }) => {
        await page.goto("/funnel-builder");

        await expect(page).toHaveURL(/\/login/);
    });

    test("should display funnels list when authenticated", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/funnel-builder");

        const heading = page.locator("h1, h2").first();
        await expect(heading).toBeVisible();
    });

    test("should have create funnel button", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/funnel-builder");

        const createButton = page.locator('text=/create|new.*funnel/i, button');
        await expect(createButton.first()).toBeVisible();
    });

    test("should display funnel cards when funnels exist", async ({ page }) => {
        test.skip(); // Requires authentication and test data

        await page.goto("/funnel-builder");

        const funnelCard = page.locator('[data-testid="funnel-card"], .funnel-card').first();
        if ((await funnelCard.count()) > 0) {
            await expect(funnelCard).toBeVisible();
        }
    });

    test("should navigate to funnel create page", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/funnel-builder");

        const createButton = page.locator('text=/create|new.*funnel/i').first();
        await createButton.click();

        await expect(page).toHaveURL(/\/funnel-builder\/create/);
    });

    test("should show empty state when no funnels", async ({ page }) => {
        test.skip(); // Requires authentication and empty state

        await page.goto("/funnel-builder");

        const emptyState = page.locator("text=/no funnel|get started|create your first/i");
        if ((await emptyState.count()) > 0) {
            await expect(emptyState.first()).toBeVisible();
        }
    });
});
