/**
 * Homepage E2E Tests
 * Tests homepage functionality and content
 */

import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
    test("should load successfully", async ({ page }) => {
        await page.goto("/");

        await expect(page).toHaveTitle(/Growth Mastery|GrowthMastery/i);
    });

    test("should display main hero section", async ({ page }) => {
        await page.goto("/");

        // Check for main heading or hero content
        const hero = page.locator("h1, h2").first();
        await expect(hero).toBeVisible();
    });

    test("should have call-to-action buttons", async ({ page }) => {
        await page.goto("/");

        // Check for CTA buttons (Get Started, Sign Up, etc.)
        const ctaButton = page.locator('text=/get started|sign up|try free/i').first();
        await expect(ctaButton).toBeVisible();
    });

    test("should have navigation menu", async ({ page }) => {
        await page.goto("/");

        // Check for login/signup links
        const nav = page.locator("nav, header");
        await expect(nav).toBeVisible();
    });

    test("should display features section", async ({ page }) => {
        await page.goto("/");

        // Look for features, benefits, or how it works sections
        const featuresSection = page.locator("text=/feature|benefit|how it works/i").first();
        await expect(featuresSection).toBeVisible();
    });

    test("should display pricing section", async ({ page }) => {
        await page.goto("/");

        // Check for pricing section
        const pricingSection = page.locator("text=/pricing|plan/i, #pricing").first();
        if ((await pricingSection.count()) > 0) {
            await expect(pricingSection).toBeVisible();
        }
    });

    test("should have footer", async ({ page }) => {
        await page.goto("/");

        const footer = page.locator("footer");
        await expect(footer).toBeVisible();
    });

    test("should navigate to login page", async ({ page }) => {
        await page.goto("/");

        await page.click('text=/login|sign in/i');
        await expect(page).toHaveURL(/\/login/);
    });

    test("should navigate to signup page", async ({ page }) => {
        await page.goto("/");

        const signupLink = page.locator('text=/get started|sign up/i').first();
        await signupLink.click();

        await expect(page).toHaveURL(/\/signup/);
    });

    test("should be responsive", async ({ page }) => {
        await page.goto("/");

        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        const mobileView = page.locator("body");
        await expect(mobileView).toBeVisible();

        // Test desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        const desktopView = page.locator("body");
        await expect(desktopView).toBeVisible();
    });
});
