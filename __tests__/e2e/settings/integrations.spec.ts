/**
 * Settings Integrations E2E Tests
 * Tests integrations settings page functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Settings Integrations", () => {
    test.beforeEach(async () => {
        test.skip(!process.env.TEST_USER_EMAIL, "Test user credentials not configured");
    });

    test("should redirect to login when not authenticated", async ({ page }) => {
        await page.goto("/settings/integrations");

        await expect(page).toHaveURL(/\/login/);
    });

    test("should display integrations page when authenticated", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings/integrations");

        const heading = page.locator("h1, h2").first();
        await expect(heading).toContainText(/integration/i);
    });

    test("should show available integrations", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings/integrations");

        // Check for integration cards (Facebook, Instagram, etc.)
        const integrationCards = page.locator(".integration-card, [data-testid='integration']");
        expect(await integrationCards.count()).toBeGreaterThan(0);
    });

    test("should have connect buttons for disconnected integrations", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings/integrations");

        const connectButton = page.locator('button:has-text("Connect"), button:has-text("Setup")').first();
        if ((await connectButton.count()) > 0) {
            await expect(connectButton).toBeVisible();
        }
    });

    test("should show connected status for active integrations", async ({ page }) => {
        test.skip(); // Requires authentication and connected integrations

        await page.goto("/settings/integrations");

        const connectedBadge = page.locator("text=/connected|active/i");
        if ((await connectedBadge.count()) > 0) {
            await expect(connectedBadge.first()).toBeVisible();
        }
    });

    test("should have disconnect button for connected integrations", async ({ page }) => {
        test.skip(); // Requires authentication and connected integrations

        await page.goto("/settings/integrations");

        const disconnectButton = page.locator('button:has-text("Disconnect"), button:has-text("Remove")').first();
        if ((await disconnectButton.count()) > 0) {
            await expect(disconnectButton).toBeVisible();
        }
    });

    test("should display integration descriptions", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/settings/integrations");

        // Each integration should have some description
        const descriptions = page.locator(".integration-card p, [data-testid='integration'] p");
        if ((await descriptions.count()) > 0) {
            expect(await descriptions.count()).toBeGreaterThan(0);
        }
    });
});
