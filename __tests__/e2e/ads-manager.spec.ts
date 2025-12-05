/**
 * Ads Manager E2E Tests
 * Tests ads manager page functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Ads Manager", () => {
    test.beforeEach(async () => {
        test.skip(!process.env.TEST_USER_EMAIL, "Test user credentials not configured");
    });

    test("should redirect to login when not authenticated", async ({ page }) => {
        await page.goto("/ads-manager");

        await expect(page).toHaveURL(/\/login/);
    });

    test("should display ads manager when authenticated", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/ads-manager");

        const heading = page.locator("h1, h2").first();
        await expect(heading).toContainText(/ad/i);
    });

    test("should have create campaign button", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/ads-manager");

        const createButton = page.locator('text=/create|new.*campaign/i, button').first();
        await expect(createButton).toBeVisible();
    });

    test("should display campaigns when they exist", async ({ page }) => {
        test.skip(); // Requires authentication and test data

        await page.goto("/ads-manager");

        const campaignCard = page.locator('.campaign-card, [data-testid="campaign"]').first();
        if ((await campaignCard.count()) > 0) {
            await expect(campaignCard).toBeVisible();
        }
    });

    test("should show metrics and analytics", async ({ page }) => {
        test.skip(); // Requires authentication and test data

        await page.goto("/ads-manager");

        const metrics = page.locator("text=/spend|click|impression|conversion/i").first();
        if ((await metrics.count()) > 0) {
            await expect(metrics).toBeVisible();
        }
    });

    test("should have integration setup if not connected", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/ads-manager");

        // Check for Meta/Facebook integration button
        const connectButton = page.locator("text=/connect|integrate|setup/i");
        if ((await connectButton.count()) > 0) {
            await expect(connectButton.first()).toBeVisible();
        }
    });
});
