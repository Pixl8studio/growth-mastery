/**
 * E2E Test: Flow Setup and Publishing
 * Tests the complete flow of creating pages, publishing them, and automatic flow creation
 */

import { test, expect } from "@playwright/test";

test.describe("Flow Setup - Prerequisites and Publishing", () => {
    test.skip("Complete flow setup workflow", async ({ page }) => {
        // This test is skipped by default as it requires full setup
        // Run with: npm run test:e2e -- --grep "flow setup"

        // Step 1: Login (adjust based on your auth setup)
        await page.goto("/login");
        await page.fill('input[type="email"]', "test@example.com");
        await page.fill('input[type="password"]', "testpassword");
        await page.click('button[type="submit"]');
        await page.waitForURL("/");

        // Step 2: Create new project
        await page.goto("/funnel-builder/new");
        await page.fill('input[name="name"]', "E2E Test Funnel");
        await page.click('button:has-text("Create Project")');
        await page.waitForURL(/\/funnel-builder\/.*\/step\/1/);

        // Extract project ID from URL
        const url = page.url();
        const projectId = url.match(/funnel-builder\/([^/]+)\//)?.[1];
        expect(projectId).toBeTruthy();

        // Step 3: Navigate to Step 5 (Enrollment Page)
        await page.goto(`/funnel-builder/${projectId}/step/5`);

        // Check for dependency warning
        await expect(
            page.locator("text=You need to create an offer first")
        ).toBeVisible();

        // Step 4: Create prerequisites (simplified - adjust based on actual flow)
        // Skip to Step 9 for registration page creation
        await page.goto(`/funnel-builder/${projectId}/step/9`);

        // Create registration page
        await page.click('button:has-text("Create New Registration Page")');
        await page.fill('input[name="headline"]', "Join Our Masterclass");
        await page.click('button:has-text("Create Page")');

        // Wait for page to be created
        await expect(page.locator("text=Join Our Masterclass")).toBeVisible();

        // Step 5: Verify green check appears in sidebar
        await expect(
            page.locator('nav a[href$="/step/9"] svg.text-green-600')
        ).toBeVisible();

        // Step 6: Navigate to Step 10 (Flow Setup)
        await page.goto(`/funnel-builder/${projectId}/step/10`);

        // Step 7: Verify prerequisite detection
        // Should show all pages as created but potentially missing
        await expect(page.locator("h2:has-text('Funnel Flow Setup')")).toBeVisible();

        // Check connection map
        await expect(page.locator("text=Registration Page")).toBeVisible();
        await expect(page.locator("text=Watch Page")).toBeVisible();
        await expect(page.locator("text=Enrollment Page")).toBeVisible();

        // Step 8: Test tooltip on hover
        await page.hover("text=Registration Page");
        await expect(
            page.locator("text=Captures leads and collects contact information")
        ).toBeVisible();

        // Step 9: Navigate back to publish pages
        await page.goto(`/funnel-builder/${projectId}/step/9`);

        // Find and toggle publish switch
        const publishSwitch = page.locator('button[role="switch"]').first();
        await publishSwitch.click();

        // Verify status changed to "Live"
        await expect(page.locator("text=Live").first()).toBeVisible();

        // Step 10: Return to Flow Setup
        await page.goto(`/funnel-builder/${projectId}/step/10`);

        // Step 11: Verify flow auto-creation happens
        // Should show "Creating Your Flow..." or "Funnel Flow Connected!"
        await expect(
            page.locator("text=Funnel Flow Connected!,text=Creating Your Flow...")
        ).toBeVisible({ timeout: 10000 });

        // Step 12: Verify connection map shows published status
        const regPageCard = page.locator("text=Registration Page").locator("..");
        await expect(regPageCard.locator("text=Live")).toBeVisible();

        // Step 13: Verify sidebar shows persistent green checks
        await expect(
            page.locator('nav a[href$="/step/9"] svg[class*="text-green"]')
        ).toBeVisible();
    });

    test("Prerequisite detection - missing pages", async ({ page: _page }) => {
        // Mock test without actual page creation
        test.skip();
    });

    test("Publish toggle functionality", async ({ page: _page }) => {
        // Test publish/unpublish toggle
        test.skip();
    });

    test("Connection map tooltips", async ({ page: _page }) => {
        // Test tooltip display on hover
        test.skip();
    });

    test("Automatic flow creation on all pages published", async ({ page: _page }) => {
        // Test that flow auto-creates when conditions met
        test.skip();
    });
});

test.describe("Flow Setup - Visual Indicators", () => {
    test("Green check icons persist in sidebar", async ({ page: _page }) => {
        test.skip();
    });

    test("Connection map shows correct publish status", async ({ page: _page }) => {
        test.skip();
    });

    test("Dependency warnings show specific missing pages", async ({ page: _page }) => {
        test.skip();
    });
});
