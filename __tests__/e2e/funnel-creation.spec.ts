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

        // Verify only one input field (name) exists
        const nameInput = page.locator('input[id="name"]');
        await expect(nameInput).toBeVisible();

        // Verify Create button is disabled when name is empty
        const createButton = page.locator('button[type="submit"]');
        await expect(createButton).toBeDisabled();

        // Fill form with funnel name
        await page.fill('input[id="name"]', "Test Funnel Project");

        // Verify Create button is enabled when name is filled
        await expect(createButton).toBeEnabled();

        // Submit
        await createButton.click();

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
        await expect(page.locator("text=/Step 1 of 12/i")).toBeVisible();

        // Should show percentage
        await expect(page.locator("text=/8%/i")).toBeVisible();
    });
});
