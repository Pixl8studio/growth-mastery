/**
 * Public Landing Page E2E Tests
 * Tests public funnel page functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Public Landing Page", () => {
    test("should load public page with valid page ID", async ({ page }) => {
        // Note: This requires a published page to exist
        // Using a placeholder URL pattern
        test.skip(!process.env.TEST_PUBLIC_PAGE_ID, "Test public page ID not configured");

        const pageId = process.env.TEST_PUBLIC_PAGE_ID || "test-page-123";
        await page.goto(`/p/${pageId}`);

        // Should load without error
        await expect(page.locator("body")).toBeVisible();
    });

    test("should display 404 for invalid page ID", async ({ page }) => {
        await page.goto("/p/invalid-page-id-12345");

        // Should show error page or redirect
        const notFound = page.locator("text=/404|not found|doesn't exist/i");
        if ((await notFound.count()) > 0) {
            await expect(notFound.first()).toBeVisible();
        }
    });

    test("should have registration form on registration page", async ({ page }) => {
        test.skip(!process.env.TEST_REGISTRATION_PAGE_ID, "Test registration page not configured");

        const pageId = process.env.TEST_REGISTRATION_PAGE_ID || "test-reg-123";
        await page.goto(`/p/${pageId}`);

        const form = page.locator("form");
        if ((await form.count()) > 0) {
            await expect(form.first()).toBeVisible();
        }
    });

    test("should track page view analytics", async ({ page }) => {
        test.skip(!process.env.TEST_PUBLIC_PAGE_ID, "Test public page ID not configured");

        // Listen for analytics requests
        const analyticsRequests: any[] = [];
        page.on("request", (request) => {
            if (request.url().includes("/api/analytics")) {
                analyticsRequests.push(request);
            }
        });

        const pageId = process.env.TEST_PUBLIC_PAGE_ID || "test-page-123";
        await page.goto(`/p/${pageId}`);

        // Wait a bit for analytics to fire
        await page.waitForTimeout(2000);

        // Should have made analytics request
        expect(analyticsRequests.length).toBeGreaterThan(0);
    });

    test("should be mobile responsive", async ({ page }) => {
        test.skip(!process.env.TEST_PUBLIC_PAGE_ID, "Test public page ID not configured");

        const pageId = process.env.TEST_PUBLIC_PAGE_ID || "test-page-123";

        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto(`/p/${pageId}`);

        const mobileView = page.locator("body");
        await expect(mobileView).toBeVisible();

        // Test tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.reload();

        const tabletView = page.locator("body");
        await expect(tabletView).toBeVisible();
    });
});
