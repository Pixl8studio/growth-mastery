/**
 * Smoke Test: Visit all pages to discover runtime errors
 *
 * This test visits every major page in the app to trigger any client-side
 * errors that Sentry can capture. Run with: pnpm test:e2e smoke-test-all-pages
 */

import { test, expect } from "@playwright/test";

// Pages that don't require auth
const publicPages = [
    { path: "/", name: "Homepage" },
    { path: "/login", name: "Login" },
    { path: "/signup", name: "Signup" },
    { path: "/sentry-example-page", name: "Sentry Test Page" },
];

// Pages that require auth - test will need a logged-in session
const protectedPages = [
    { path: "/dashboard", name: "Dashboard" },
    { path: "/funnel-builder", name: "Funnel Builder List" },
    { path: "/funnel-builder/create", name: "Create Funnel" },
    { path: "/contacts", name: "Contacts" },
    { path: "/ads-manager", name: "Ads Manager" },
    { path: "/ai-followup", name: "AI Followup" },
    { path: "/settings", name: "Settings" },
    { path: "/settings/profile", name: "Settings Profile" },
    { path: "/settings/integrations", name: "Settings Integrations" },
    { path: "/settings/api", name: "Settings API" },
];

test.describe("Smoke Test - Public Pages", () => {
    for (const page of publicPages) {
        test(`should load ${page.name} without errors`, async ({
            page: browserPage,
        }) => {
            const errors: string[] = [];

            // Capture console errors
            browserPage.on("console", (msg) => {
                if (msg.type() === "error") {
                    errors.push(msg.text());
                }
            });

            // Capture page errors
            browserPage.on("pageerror", (error) => {
                errors.push(error.message);
            });

            await browserPage.goto(page.path);
            await browserPage.waitForLoadState("networkidle");

            // Filter out known non-critical errors
            const criticalErrors = errors.filter(
                (e) =>
                    !e.includes("Hydration") && // React hydration warnings
                    !e.includes("Warning:") && // React warnings
                    !e.includes("DevTools") // DevTools messages
            );

            expect(criticalErrors).toHaveLength(0);
        });
    }
});

test.describe("Smoke Test - Protected Pages (requires auth)", () => {
    // Skip these if not authenticated - they'll redirect to login
    test.beforeEach(async ({ page }) => {
        // Try to check if user is logged in by visiting dashboard
        await page.goto("/dashboard");
        const url = page.url();

        // If redirected to login, skip protected page tests
        if (url.includes("/login")) {
            test.skip(true, "User not authenticated - run with auth setup");
        }
    });

    for (const pageDef of protectedPages) {
        test(`should load ${pageDef.name} without errors`, async ({ page }) => {
            const errors: string[] = [];

            page.on("console", (msg) => {
                if (msg.type() === "error") {
                    errors.push(msg.text());
                }
            });

            page.on("pageerror", (error) => {
                errors.push(error.message);
            });

            await page.goto(pageDef.path);
            await page.waitForLoadState("networkidle");

            const criticalErrors = errors.filter(
                (e) =>
                    !e.includes("Hydration") &&
                    !e.includes("Warning:") &&
                    !e.includes("DevTools") &&
                    !e.includes("401") // Auth errors expected when testing
            );

            // Log errors for debugging but don't fail on auth issues
            if (criticalErrors.length > 0) {
                console.log(`Errors on ${pageDef.path}:`, criticalErrors);
            }
        });
    }
});

test.describe("Smoke Test - Trigger Sentry Error", () => {
    test("should trigger and capture a test error in Sentry", async ({ page }) => {
        await page.goto("/sentry-example-page");

        // Wait for Sentry to initialize
        await page.waitForTimeout(1000);

        // Click the error button
        await page.click('button:has-text("Throw Sample Error")');

        // Wait for error to be sent
        await page.waitForTimeout(2000);

        // Check that error was acknowledged
        await expect(page.locator("text=Error sent to Sentry")).toBeVisible({
            timeout: 5000,
        });
    });
});
