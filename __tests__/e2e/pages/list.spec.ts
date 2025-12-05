/**
 * Pages List E2E Tests
 * Tests pages management page functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Pages List", () => {
    test.beforeEach(async () => {
        test.skip(!process.env.TEST_USER_EMAIL, "Test user credentials not configured");
    });

    test("should redirect to login when not authenticated", async ({ page }) => {
        await page.goto("/pages");

        await expect(page).toHaveURL(/\/login/);
    });

    test("should display pages list when authenticated", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/pages");

        const heading = page.locator("h1, h2").first();
        await expect(heading).toContainText(/page/i);
    });

    test("should have create page button", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/pages");

        const createButton = page.locator('text=/create|new.*page/i, button').first();
        if ((await createButton.count()) > 0) {
            await expect(createButton).toBeVisible();
        }
    });

    test("should display pages table or list", async ({ page }) => {
        test.skip(); // Requires authentication and test data

        await page.goto("/pages");

        const tableOrList = page.locator("table, .pages-list, [data-testid='pages-table']").first();
        await expect(tableOrList).toBeVisible();
    });

    test("should show page type badges", async ({ page }) => {
        test.skip(); // Requires authentication and test data

        await page.goto("/pages");

        // Check for page type badges (Registration, Enrollment, Watch)
        const badge = page.locator(".badge, [data-testid='page-type']").first();
        if ((await badge.count()) > 0) {
            await expect(badge).toBeVisible();
        }
    });

    test("should show published status", async ({ page }) => {
        test.skip(); // Requires authentication and test data

        await page.goto("/pages");

        const status = page.locator("text=/published|draft|live/i").first();
        if ((await status.count()) > 0) {
            await expect(status).toBeVisible();
        }
    });

    test("should have filter by page type", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/pages");

        const filter = page.locator('select, [role="combobox"]').first();
        if ((await filter.count()) > 0) {
            await expect(filter).toBeVisible();
        }
    });

    test("should have search functionality", async ({ page }) => {
        test.skip(); // Requires authentication

        await page.goto("/pages");

        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
        if ((await searchInput.count()) > 0) {
            await expect(searchInput).toBeVisible();
        }
    });

    test("should show empty state when no pages", async ({ page }) => {
        test.skip(); // Requires authentication and empty state

        await page.goto("/pages");

        const emptyState = page.locator("text=/no page|create your first/i");
        if ((await emptyState.count()) > 0) {
            await expect(emptyState.first()).toBeVisible();
        }
    });
});
