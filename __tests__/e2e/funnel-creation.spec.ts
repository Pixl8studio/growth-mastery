/**
 * Funnel Creation Flow E2E Tests
 * Test complete funnel creation journey
 */

import { test, expect } from "@playwright/test";

test.describe("Funnel Creation Flow", () => {
    test.beforeEach(async ({ page }) => {
        // Assume user is logged in
        // In a real test, you'd authenticate here
        await page.goto("/funnel-builder");
    });

    test("should create a new funnel project", async ({ page }) => {
        // Click create funnel
        await page.click('text="Create New Funnel"');

        // Should be on create page
        await expect(page).toHaveURL(/\/funnel-builder\/create/);

        // Fill form
        await page.fill('input[name="name"]', "Test Funnel Project");
        await page.fill('textarea[name="description"]', "This is a test funnel");
        await page.fill('input[name="targetAudience"]', "Entrepreneurs");
        await page.fill('input[name="businessNiche"]', "Business Coaching");

        // Submit
        await page.click('button[type="submit"]');

        // Should redirect to step 1
        await expect(page).toHaveURL(/\/funnel-builder\/.*\/step\/1/, {
            timeout: 10000,
        });

        // Should see step 1 title
        await expect(page.locator("text=/AI Intake Call/i")).toBeVisible();
    });

    test("should navigate through funnel steps", async ({ page }) => {
        // Assume we're on a funnel project page
        await page.goto("/funnel-builder");

        // If there's a project, click it
        const continueButton = page.locator('button:has-text("Continue")').first();

        if (await continueButton.isVisible()) {
            await continueButton.click();

            // Should be on a step page
            await expect(page).toHaveURL(/\/step\/\d+/);

            // Test next button navigation
            const nextButton = page.locator('button:has-text("Continue")');

            if (await nextButton.isEnabled()) {
                await nextButton.click();
                // Should progress to next step
                await expect(page).toHaveURL(/\/step\/\d+/);
            }
        }
    });

    test("should show progress indicator on step pages", async ({ page }) => {
        // Navigate to any step page (we'll go to step 1)
        // In real test, use actual project ID
        const projectId = "test-project-id";
        await page.goto(`/funnel-builder/${projectId}/step/1`);

        // Should show progress bar
        await expect(page.locator("text=/Step 1 of 11/i")).toBeVisible();

        // Should show percentage
        await expect(page.locator("text=/9%/i")).toBeVisible();
    });
});
