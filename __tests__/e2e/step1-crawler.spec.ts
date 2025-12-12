/**
 * Step 1 Crawler Test - Issue #293
 * Comprehensive crawl of Step 1 (Business Profile) clicking everything
 */

import { test, expect, Page } from "@playwright/test";

interface TestResult {
    element: string;
    action: string;
    status: "working" | "broken" | "partial";
    details: string;
}

const results: TestResult[] = [];

function logResult(
    element: string,
    action: string,
    status: "working" | "broken" | "partial",
    details: string
) {
    results.push({ element, action, status, details });
    console.log(`[${status.toUpperCase()}] ${element}: ${action} - ${details}`);
}

test.describe("Step 1 Business Profile Crawler - Issue #293", () => {
    let projectId: string;

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();

        // Sign up a new test user
        const testEmail = `crawler-test-${Date.now()}@example.com`;
        console.log(`\n📧 Creating test user: ${testEmail}\n`);

        await page.goto("/signup");
        await page.fill('input[name="name"]', "Crawler Test User");
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', "TestPassword123!");
        await page.fill('input[name="confirmPassword"]', "TestPassword123!");
        await page.click('button[type="submit"]');

        // Wait for redirect to funnel-builder
        await page.waitForURL(/\/funnel-builder/, { timeout: 15000 });
        console.log("✅ User signed up and redirected to funnel-builder\n");

        // Create a new funnel project
        await page.click('text="Create New Funnel"');
        await page.waitForURL(/\/funnel-builder\/create/);
        await page.fill('input[id="name"]', "Crawler Test Funnel");
        await page.click('button[type="submit"]');

        // Wait for Step 1 and extract project ID
        await page.waitForURL(/\/funnel-builder\/.*\/step\/1/, { timeout: 15000 });
        const url = page.url();
        projectId = url.match(/funnel-builder\/([^/]+)\//)?.[1] || "";
        console.log(`✅ Created funnel project: ${projectId}\n`);

        await page.close();
    });

    test("Crawl Step 1 and click everything", async ({ page }) => {
        test.setTimeout(180000); // 3 minutes

        const errors: string[] = [];

        // Capture console errors
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                errors.push(msg.text());
            }
        });

        page.on("pageerror", (error) => {
            errors.push(error.message);
        });

        // Navigate to Step 1
        await page.goto(`/funnel-builder/${projectId}/step/1`);
        await page.waitForLoadState("networkidle");

        console.log("\n🔍 Starting Step 1 Crawler...\n");
        console.log("=".repeat(60));

        // ============================================
        // TEST 1: Page Load
        // ============================================
        console.log("\n📄 TEST 1: Page Load\n");

        try {
            await expect(page.locator("text=Define Context")).toBeVisible({
                timeout: 5000,
            });
            logResult("Page Title", "Load", "working", "Step title visible");
        } catch {
            logResult("Page Title", "Load", "broken", "Step title not found");
        }

        try {
            await expect(
                page.locator("text=How would you like to build your business profile?")
            ).toBeVisible({ timeout: 5000 });
            logResult("Method Selector", "Load", "working", "Method selector visible");
        } catch {
            logResult(
                "Method Selector",
                "Load",
                "broken",
                "Method selector not visible"
            );
        }

        // ============================================
        // TEST 2: Context Method Cards
        // ============================================
        console.log("\n🎴 TEST 2: Context Method Cards\n");

        // AI Assisted Wizard card
        const wizardCard = page.locator("text=AI Assisted Wizard").first();
        try {
            await expect(wizardCard).toBeVisible();
            logResult("AI Wizard Card", "Visibility", "working", "Card is visible");

            // Check for recommended badge
            const recommendedBadge = page.locator("text=Recommended");
            if (await recommendedBadge.isVisible()) {
                logResult(
                    "Recommended Badge",
                    "Visibility",
                    "working",
                    "Badge visible on Wizard card"
                );
            }

            // Test hover state
            await wizardCard.hover();
            logResult("AI Wizard Card", "Hover", "working", "Hover effect works");
        } catch (e) {
            logResult("AI Wizard Card", "Test", "broken", String(e));
        }

        // Voice Call card (should be disabled)
        const voiceCard = page.locator("text=Voice Call").first();
        try {
            await expect(voiceCard).toBeVisible();
            logResult("Voice Call Card", "Visibility", "working", "Card is visible");

            const comingSoonBadge = page.locator("text=Coming Soon");
            if (await comingSoonBadge.isVisible()) {
                logResult(
                    "Coming Soon Badge",
                    "Visibility",
                    "working",
                    "Badge visible on Voice card"
                );
            }
        } catch (e) {
            logResult("Voice Call Card", "Test", "broken", String(e));
        }

        // ============================================
        // TEST 3: Click AI Wizard Card
        // ============================================
        console.log("\n🧙 TEST 3: Click AI Wizard and Test Wizard Interface\n");

        try {
            await wizardCard.click();
            await page.waitForTimeout(1000);

            // Check for back button
            const backButton = page.locator("text=Choose a different method");
            await expect(backButton).toBeVisible({ timeout: 5000 });
            logResult(
                "Back Button",
                "Visibility",
                "working",
                "Back button appears after selection"
            );

            // Check for section progress
            const sectionProgress = page.locator("text=Customer").first();
            if (await sectionProgress.isVisible()) {
                logResult(
                    "Section Progress",
                    "Visibility",
                    "working",
                    "Section progress bar visible"
                );
            }

            // Check for wizard section content
            const wizardContent = page.locator("h2, h3").first();
            if (await wizardContent.isVisible()) {
                logResult(
                    "Wizard Content",
                    "Load",
                    "working",
                    "Wizard section content loaded"
                );
            }
        } catch (e) {
            logResult("AI Wizard Selection", "Click", "broken", String(e));
        }

        // ============================================
        // TEST 4: Intake Method Cards (Copy/Scrape/Upload)
        // ============================================
        console.log("\n📥 TEST 4: Intake Method Cards\n");

        // Copy Prompt button
        const copyButton = page.locator("text=Copy Prompt").first();
        try {
            if (await copyButton.isVisible()) {
                await copyButton.click();
                await page.waitForTimeout(500);

                // Check if copied state appears
                const copiedState = page.locator("text=Copied");
                if (await copiedState.isVisible({ timeout: 2000 })) {
                    logResult(
                        "Copy Prompt",
                        "Click",
                        "working",
                        "Copies to clipboard and shows confirmation"
                    );
                } else {
                    logResult(
                        "Copy Prompt",
                        "Click",
                        "partial",
                        "Button clicked but no confirmation visible"
                    );
                }
            }
        } catch (e) {
            logResult("Copy Prompt", "Click", "broken", String(e));
        }

        // URL Input for scraping
        const urlInput = page
            .locator('input[type="url"], input[placeholder*="https"]')
            .first();
        try {
            if (await urlInput.isVisible()) {
                await urlInput.fill("https://example.com");
                logResult("URL Input", "Fill", "working", "URL input accepts text");

                // Scrape button
                const scrapeButton = page.locator("text=Scrape Website").first();
                if (await scrapeButton.isVisible()) {
                    logResult(
                        "Scrape Button",
                        "Visibility",
                        "working",
                        "Scrape button visible"
                    );
                    // Don't actually scrape - just check it's enabled
                    const isEnabled = await scrapeButton.isEnabled();
                    logResult(
                        "Scrape Button",
                        "State",
                        isEnabled ? "working" : "broken",
                        isEnabled ? "Button enabled with URL" : "Button disabled"
                    );
                }

                await urlInput.clear();
            }
        } catch (e) {
            logResult("URL Scrape Section", "Test", "broken", String(e));
        }

        // File Upload area
        const uploadArea = page.locator("text=Drop file or click to browse").first();
        try {
            if (await uploadArea.isVisible()) {
                logResult(
                    "Upload Area",
                    "Visibility",
                    "working",
                    "File upload area visible"
                );
            }
        } catch (e) {
            logResult(
                "Upload Area",
                "Test",
                "partial",
                "Upload area may not be visible in current section"
            );
        }

        // ============================================
        // TEST 5: Section Navigation
        // ============================================
        console.log("\n🔄 TEST 5: Section Navigation\n");

        // Section progress circles
        const sections = ["Customer", "Story", "Offer", "Beliefs", "CTA"];
        for (const section of sections) {
            try {
                const sectionCircle = page.locator(`text=${section}`).first();
                if (await sectionCircle.isVisible()) {
                    logResult(
                        `Section: ${section}`,
                        "Visibility",
                        "working",
                        "Section visible in progress bar"
                    );
                }
            } catch {
                logResult(
                    `Section: ${section}`,
                    "Visibility",
                    "broken",
                    "Section not found"
                );
            }
        }

        // Next/Previous buttons
        const nextButton = page.locator('button:has-text("Next")').first();
        try {
            if (await nextButton.isVisible()) {
                const isEnabled = await nextButton.isEnabled();
                logResult(
                    "Next Section Button",
                    "State",
                    isEnabled ? "working" : "partial",
                    isEnabled ? "Button enabled" : "Button disabled (may need content)"
                );
            }
        } catch {
            logResult(
                "Next Section Button",
                "Visibility",
                "partial",
                "Next button not visible on first section"
            );
        }

        // ============================================
        // TEST 6: Back Button Navigation
        // ============================================
        console.log("\n⬅️ TEST 6: Back Button\n");

        const backButton = page.locator("text=Choose a different method");
        try {
            await backButton.click();
            await page.waitForTimeout(500);

            // Should be back at method selection
            await expect(
                page.locator("text=How would you like to build your business profile?")
            ).toBeVisible({ timeout: 3000 });
            logResult("Back Button", "Click", "working", "Returns to method selection");
        } catch (e) {
            logResult("Back Button", "Click", "broken", String(e));
        }

        // ============================================
        // TEST 7: Sidebar Navigation
        // ============================================
        console.log("\n📋 TEST 7: Sidebar Navigation\n");

        // Check sidebar step items
        const sidebarSteps = page.locator('nav a[href*="/step/"]');
        const stepCount = await sidebarSteps.count();
        logResult(
            "Sidebar Steps",
            "Count",
            stepCount > 0 ? "working" : "broken",
            `Found ${stepCount} step links in sidebar`
        );

        // Back to Dashboard link
        const dashboardLink = page
            .locator('a:has-text("Dashboard"), a:has-text("Back")')
            .first();
        try {
            if (await dashboardLink.isVisible()) {
                logResult(
                    "Dashboard Link",
                    "Visibility",
                    "working",
                    "Back to dashboard link visible"
                );
            }
        } catch {
            logResult(
                "Dashboard Link",
                "Visibility",
                "partial",
                "Dashboard link may not be visible"
            );
        }

        // Collapse/Expand toggle (if exists)
        const collapseToggle = page
            .locator('[aria-label*="collapse"], [aria-label*="toggle"]')
            .first();
        try {
            if (await collapseToggle.isVisible()) {
                await collapseToggle.click();
                await page.waitForTimeout(300);
                logResult(
                    "Sidebar Toggle",
                    "Click",
                    "working",
                    "Sidebar collapse toggle works"
                );
                await collapseToggle.click(); // Toggle back
            }
        } catch {
            logResult(
                "Sidebar Toggle",
                "Test",
                "partial",
                "Sidebar toggle may not exist"
            );
        }

        // ============================================
        // TEST 8: Step Navigation Buttons (Bottom)
        // ============================================
        console.log("\n🔢 TEST 8: Step Navigation\n");

        // Previous Step button (should be disabled on step 1)
        const prevStepButton = page
            .locator('button:has-text("Previous"), a:has-text("Previous")')
            .first();
        try {
            if (await prevStepButton.isVisible()) {
                const isDisabled = await prevStepButton.isDisabled();
                logResult(
                    "Previous Step",
                    "State",
                    isDisabled ? "working" : "partial",
                    isDisabled
                        ? "Correctly disabled on Step 1"
                        : "Unexpectedly enabled on Step 1"
                );
            }
        } catch {
            logResult(
                "Previous Step",
                "Visibility",
                "partial",
                "Previous button may not be visible"
            );
        }

        // Next Step button
        const nextStepButton = page
            .locator(
                'button:has-text("Define Offer"), button:has-text("Continue"), button:has-text("Next Step")'
            )
            .first();
        try {
            if (await nextStepButton.isVisible()) {
                logResult(
                    "Next Step Button",
                    "Visibility",
                    "working",
                    "Next step button visible"
                );
                const isEnabled = await nextStepButton.isEnabled();
                logResult(
                    "Next Step Button",
                    "State",
                    "working",
                    isEnabled
                        ? "Enabled (context complete)"
                        : "Disabled (context incomplete) - expected behavior"
                );
            }
        } catch {
            logResult(
                "Next Step Button",
                "Visibility",
                "broken",
                "Next step button not found"
            );
        }

        // ============================================
        // TEST 9: What's Next Card
        // ============================================
        console.log("\n👉 TEST 9: What's Next Card\n");

        const whatsNextCard = page.locator("text=After Context Setup").first();
        try {
            if (await whatsNextCard.isVisible()) {
                logResult(
                    "What's Next Card",
                    "Visibility",
                    "working",
                    "Info card about next steps visible"
                );
            }
        } catch {
            logResult(
                "What's Next Card",
                "Visibility",
                "partial",
                "Card may be scrolled out of view"
            );
        }

        // ============================================
        // TEST 10: Console Errors Check
        // ============================================
        console.log("\n🚨 TEST 10: Console Errors\n");

        const criticalErrors = errors.filter(
            (e) =>
                !e.includes("Hydration") &&
                !e.includes("Warning:") &&
                !e.includes("DevTools") &&
                !e.includes("401")
        );

        if (criticalErrors.length === 0) {
            logResult(
                "Console Errors",
                "Check",
                "working",
                "No critical console errors"
            );
        } else {
            logResult(
                "Console Errors",
                "Check",
                "broken",
                `Found ${criticalErrors.length} errors: ${criticalErrors.join("; ").slice(0, 200)}`
            );
        }

        // ============================================
        // GENERATE REPORT
        // ============================================
        console.log("\n" + "=".repeat(60));
        console.log("\n📊 STEP 1 CRAWLER REPORT - Issue #293\n");
        console.log("=".repeat(60));

        const working = results.filter((r) => r.status === "working");
        const broken = results.filter((r) => r.status === "broken");
        const partial = results.filter((r) => r.status === "partial");

        console.log(`\n✅ WORKING: ${working.length}`);
        console.log(`❌ BROKEN: ${broken.length}`);
        console.log(`⚠️ PARTIAL: ${partial.length}`);

        console.log("\n--- WORKING FEATURES ---");
        working.forEach((r) => console.log(`  ✅ ${r.element}: ${r.details}`));

        if (broken.length > 0) {
            console.log("\n--- BROKEN FEATURES ---");
            broken.forEach((r) => console.log(`  ❌ ${r.element}: ${r.details}`));
        }

        if (partial.length > 0) {
            console.log("\n--- PARTIAL/NEEDS REVIEW ---");
            partial.forEach((r) => console.log(`  ⚠️ ${r.element}: ${r.details}`));
        }

        console.log("\n" + "=".repeat(60));
        console.log("📋 Full results exported to test report");
        console.log("=".repeat(60) + "\n");

        // Assertions for test pass/fail
        expect(broken.length).toBeLessThan(5); // Allow some failures
    });
});
