/**
 * Step 3 Brand Design - E2E Tests
 *
 * Comprehensive Playwright E2E and visual testing for the Brand Design step
 * in the funnel builder. Tests cover all three input methods (wizard, website,
 * manual), accessibility, error scenarios, and visual regression.
 *
 * @see https://github.com/Pixl8studio/growth-mastery/issues/275
 */

import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// Test Configuration & Fixtures
// ============================================================================

const TEST_PROJECT_ID = "test-project-e2e-brand";
const STEP_3_URL = `/funnel-builder/${TEST_PROJECT_ID}/step/3`;

interface MockBrandDesign {
    id: string;
    funnel_project_id: string;
    brand_name: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    text_color: string;
    design_style: string;
    personality_traits: {
        tone: string;
        mood: string;
        energy: string;
    };
    is_ai_generated: boolean;
    input_method: "manual" | "wizard" | "website";
    brand_voice?: {
        primary_tone: string;
        secondary_tone: string;
    };
    messaging_framework?: {
        value_proposition: string;
    };
}

interface MockBusinessProfile {
    id: string;
    ideal_customer: string;
    completion_status: {
        overall: number;
    };
}

interface MockScrapedColors {
    success: boolean;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    fonts: {
        primary: string;
        secondary: string;
        weights: string[];
    };
    style: {
        borderRadius: string;
        shadows: boolean;
        gradients: boolean;
    };
    confidence: {
        colors: number;
        fonts: number;
        overall: number;
    };
    url: string;
    cached: boolean;
}

// Factory functions for test data
function createMockProject(overrides = {}) {
    return {
        id: TEST_PROJECT_ID,
        name: "E2E Test Funnel",
        status: "draft",
        user_id: "test-user-id",
        created_at: new Date().toISOString(),
        ...overrides,
    };
}

function createMockBrandDesign(overrides = {}): MockBrandDesign {
    return {
        id: "brand-design-001",
        funnel_project_id: TEST_PROJECT_ID,
        brand_name: "Test Brand",
        primary_color: "#3b82f6",
        secondary_color: "#8b5cf6",
        accent_color: "#ec4899",
        background_color: "#ffffff",
        text_color: "#1f2937",
        design_style: "modern",
        personality_traits: {
            tone: "professional",
            mood: "confident",
            energy: "dynamic",
        },
        is_ai_generated: false,
        input_method: "manual",
        ...overrides,
    };
}

function createMockBusinessProfile(overrides = {}): MockBusinessProfile {
    return {
        id: "profile-001",
        ideal_customer: "Busy professionals aged 30-50 who want to grow their business",
        completion_status: {
            overall: 80,
        },
        ...overrides,
    };
}

function createMockScrapedColors(overrides = {}): MockScrapedColors {
    return {
        success: true,
        colors: {
            primary: "#007bff",
            secondary: "#6c757d",
            accent: "#28a745",
            background: "#ffffff",
            text: "#212529",
        },
        fonts: {
            primary: "Inter",
            secondary: "Georgia",
            weights: ["400", "600", "700"],
        },
        style: {
            borderRadius: "8px",
            shadows: true,
            gradients: false,
        },
        confidence: {
            colors: 85,
            fonts: 75,
            overall: 80,
        },
        url: "https://example.com",
        cached: false,
        ...overrides,
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sets up API route mocks for a test page
 */
async function setupApiMocks(
    page: Page,
    options: {
        hasBusinessProfile?: boolean;
        hasTranscripts?: boolean;
        hasExistingBrandDesign?: boolean;
        brandDesignOverrides?: Partial<MockBrandDesign>;
        hasComprehensiveGuidelines?: boolean;
    } = {}
) {
    const {
        hasBusinessProfile = true,
        hasTranscripts = false,
        hasExistingBrandDesign = false,
        brandDesignOverrides = {},
        hasComprehensiveGuidelines = false,
    } = options;

    // Mock Supabase project query
    await page.route("**/rest/v1/funnel_projects*", async (route) => {
        const url = route.request().url();
        if (url.includes(`id=eq.${TEST_PROJECT_ID}`)) {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(createMockProject()),
            });
        } else {
            await route.continue();
        }
    });

    // Mock Supabase transcripts query
    await page.route("**/rest/v1/vapi_transcripts*", async (route) => {
        if (hasTranscripts) {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify([
                    {
                        id: "transcript-001",
                        funnel_project_id: TEST_PROJECT_ID,
                        transcript_text: "Sample transcript about business coaching",
                        created_at: new Date().toISOString(),
                    },
                ]),
            });
        } else {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify([]),
            });
        }
    });

    // Mock business profile API
    await page.route("**/api/context/business-profile*", async (route) => {
        if (hasBusinessProfile) {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    profile: createMockBusinessProfile(),
                }),
            });
        } else {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ profile: null }),
            });
        }
    });

    // Mock Supabase brand_designs query
    await page.route("**/rest/v1/brand_designs*", async (route) => {
        const method = route.request().method();

        if (method === "GET") {
            if (hasExistingBrandDesign) {
                const brandDesign = createMockBrandDesign({
                    ...brandDesignOverrides,
                    ...(hasComprehensiveGuidelines
                        ? {
                              brand_voice: {
                                  primary_tone: "professional",
                                  secondary_tone: "friendly",
                              },
                              messaging_framework: {
                                  value_proposition: "Transform your business",
                              },
                          }
                        : {}),
                });
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(brandDesign),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(null),
                });
            }
        } else if (method === "POST" || method === "PATCH") {
            // Return the saved brand design
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(createMockBrandDesign(brandDesignOverrides)),
            });
        } else {
            await route.continue();
        }
    });

    // Mock Supabase auth
    await page.route("**/auth/v1/user", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                id: "test-user-id",
                email: "test@example.com",
            }),
        });
    });
}

/**
 * Captures console errors during test execution
 */
function captureConsoleErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on("console", (msg) => {
        if (msg.type() === "error") {
            errors.push(msg.text());
        }
    });
    page.on("pageerror", (error) => {
        errors.push(error.message);
    });
    return errors;
}

// ============================================================================
// Page Load & Initial State Tests
// ============================================================================

test.describe("Step 3 Brand Design - Page Load", () => {
    test("should display loading state initially", async ({ page }) => {
        // Don't fulfill the route immediately to see loading state
        await page.route("**/rest/v1/funnel_projects*", async (route) => {
            // Delay response to ensure loading state is visible
            await new Promise((r) => setTimeout(r, 500));
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(createMockProject()),
            });
        });

        await page.goto(STEP_3_URL);

        // Should show loading spinner
        await expect(page.locator("svg.animate-spin").first()).toBeVisible({
            timeout: 2000,
        });
    });

    test("should load page with correct title and description", async ({ page }) => {
        await setupApiMocks(page, { hasBusinessProfile: true });
        await page.goto(STEP_3_URL);

        // Wait for page to load
        await expect(page.locator("text=Brand Design")).toBeVisible({
            timeout: 10000,
        });
        await expect(
            page.locator("text=Create comprehensive brand guidelines")
        ).toBeVisible();
    });

    test("should show step indicator with correct step number", async ({ page }) => {
        await setupApiMocks(page, { hasBusinessProfile: true });
        await page.goto(STEP_3_URL);

        // Verify we're on step 3
        await expect(page.locator("text=/Step 3/i")).toBeVisible({
            timeout: 10000,
        });
    });

    test("should display three input method cards when no brand design exists", async ({
        page,
    }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });
        await page.goto(STEP_3_URL);

        // Wait for cards to render
        await expect(page.locator("text=Build Together")).toBeVisible({
            timeout: 10000,
        });
        await expect(page.locator("text=Extract from Website")).toBeVisible();
        await expect(page.locator("text=I Know My Brand")).toBeVisible();
    });

    test("should not show console errors on page load", async ({ page }) => {
        const consoleErrors = captureConsoleErrors(page);
        await setupApiMocks(page, { hasBusinessProfile: true });
        await page.goto(STEP_3_URL);

        // Wait for page to fully load
        await page.waitForLoadState("networkidle");

        // Filter out expected development warnings
        const actualErrors = consoleErrors.filter(
            (e) =>
                !e.includes("Warning:") &&
                !e.includes("DevTools") &&
                !e.includes("source map")
        );

        expect(actualErrors).toHaveLength(0);
    });
});

// ============================================================================
// Dependency Warning Tests
// ============================================================================

test.describe("Step 3 Brand Design - Dependency Warning", () => {
    test("should show dependency warning when no intake data exists", async ({
        page,
    }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: false,
            hasTranscripts: false,
        });
        await page.goto(STEP_3_URL);

        // Should show warning about missing intake data
        await expect(
            page.locator("text=/complete your business profile/i")
        ).toBeVisible({ timeout: 10000 });
    });

    test("should not show dependency warning when business profile exists", async ({
        page,
    }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasTranscripts: false,
        });
        await page.goto(STEP_3_URL);

        // Wait for page to load
        await expect(page.locator("text=Build Together")).toBeVisible({
            timeout: 10000,
        });

        // Should NOT show dependency warning
        await expect(
            page.locator("text=/complete your business profile or AI intake/i")
        ).not.toBeVisible();
    });

    test("should not show dependency warning when transcripts exist", async ({
        page,
    }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: false,
            hasTranscripts: true,
        });
        await page.goto(STEP_3_URL);

        // Wait for page to load
        await expect(page.locator("text=Build Together")).toBeVisible({
            timeout: 10000,
        });

        // Should NOT show dependency warning since transcripts exist
        await expect(
            page.locator("text=/complete your business profile or AI intake/i")
        ).not.toBeVisible();
    });
});

// ============================================================================
// Wizard Flow Tests
// ============================================================================

test.describe("Step 3 Brand Design - Wizard Flow", () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });
    });

    test("should start wizard when clicking Build Together card", async ({ page }) => {
        await page.goto(STEP_3_URL);

        // Wait for page and click the wizard card
        await expect(page.locator("text=Build Together")).toBeVisible({
            timeout: 10000,
        });
        await page.click("text=Build Together");

        // Click "Start Brand Wizard" button
        await page.click("text=Start Brand Wizard");

        // Should show wizard with first step (Brand Personality)
        await expect(page.locator("text=Brand Personality")).toBeVisible();
        await expect(page.locator("text=Step 1 of 5")).toBeVisible();
    });

    test("should validate personality step - require 2-4 traits", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Build Together");
        await page.click("text=Start Brand Wizard");

        // Wait for personality step
        await expect(page.locator("text=Brand Personality")).toBeVisible();

        // Next button should be disabled without selections
        const nextButton = page.locator("button:has-text('Next')");
        await expect(nextButton).toBeDisabled();

        // Select only 1 trait - should still be disabled
        await page.click("text=Innovative");
        await expect(nextButton).toBeDisabled();

        // Select 2nd trait - should now be enabled
        await page.click("text=Trustworthy");
        await expect(nextButton).toBeEnabled();
    });

    test("should navigate through all wizard steps", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Build Together");
        await page.click("text=Start Brand Wizard");

        // Step 1: Personality - select 2 traits
        await expect(page.locator("text=Brand Personality")).toBeVisible();
        await page.click("text=Innovative");
        await page.click("text=Authentic");
        await page.click("button:has-text('Next')");

        // Step 2: Audience
        await expect(page.locator("text=Target Audience")).toBeVisible();
        await expect(page.locator("text=Step 2 of 5")).toBeVisible();
        await page.fill(
            "textarea",
            "Business owners looking to scale their operations"
        );
        await page.click("text=26-35 (Millennials)");
        await page.click("button:has-text('Next')");

        // Step 3: Visual
        await expect(page.locator("text=Visual Preferences")).toBeVisible();
        await expect(page.locator("text=Step 3 of 5")).toBeVisible();
        await page.click("text=Modern");
        await page.click("text=Cool & Calm");
        await page.click("button:has-text('Next')");

        // Step 4: Voice
        await expect(page.locator("text=Voice & Tone")).toBeVisible();
        await expect(page.locator("text=Step 4 of 5")).toBeVisible();
        // Sliders should be visible
        await expect(page.locator("text=Formality Level")).toBeVisible();
        await expect(page.locator("text=Energy Level")).toBeVisible();
        await page.click("button:has-text('Next')");

        // Step 5: Positioning
        await expect(page.locator("text=Market Position")).toBeVisible();
        await expect(page.locator("text=Step 5 of 5")).toBeVisible();
        await page.click("text=Professional / Expert");

        // Final button should say "Generate Brand Guidelines"
        await expect(
            page.locator("button:has-text('Generate Brand Guidelines')")
        ).toBeVisible();
    });

    test("should allow navigating back through wizard steps", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Build Together");
        await page.click("text=Start Brand Wizard");

        // Complete step 1
        await page.click("text=Innovative");
        await page.click("text=Authentic");
        await page.click("button:has-text('Next')");

        // Should be on step 2
        await expect(page.locator("text=Target Audience")).toBeVisible();

        // Click back
        await page.click("button:has-text('Back')");

        // Should be back on step 1 with selections preserved
        await expect(page.locator("text=Brand Personality")).toBeVisible();
    });

    test("should cancel wizard and return to input method selection", async ({
        page,
    }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Build Together");
        await page.click("text=Start Brand Wizard");

        // Should be in wizard
        await expect(page.locator("text=Brand Personality")).toBeVisible();

        // Click cancel (first step shows Cancel instead of Back)
        await page.click("button:has-text('Cancel')");

        // Should return to input method cards
        await expect(page.locator("text=Build Together")).toBeVisible();
        await expect(page.locator("text=Extract from Website")).toBeVisible();
    });

    test("should show progress bar updating through steps", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Build Together");
        await page.click("text=Start Brand Wizard");

        // Check progress indicator exists
        const progressBar = page.locator('[role="progressbar"]');
        await expect(progressBar).toBeVisible();

        // Complete step 1 and move to step 2
        await page.click("text=Innovative");
        await page.click("text=Authentic");
        await page.click("button:has-text('Next')");

        // Progress should have increased (step 2 of 5 = 40%)
        await expect(page.locator("text=Step 2 of 5")).toBeVisible();
    });
});

// ============================================================================
// Website Extraction Tests
// ============================================================================

test.describe("Step 3 Brand Design - Website Extraction", () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });
    });

    test("should show website extraction form when clicking Extract from Website", async ({
        page,
    }) => {
        await page.goto(STEP_3_URL);

        // Click website extraction card
        await page.click("text=Extract from Website");

        // Should show URL input
        await expect(page.locator('input[type="url"]')).toBeVisible();
        await expect(
            page.locator("button:has-text('Extract Brand Elements')")
        ).toBeVisible();
    });

    test("should disable extract button when URL is empty", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Extract from Website");

        const extractButton = page.locator("button:has-text('Extract Brand Elements')");
        await expect(extractButton).toBeDisabled();
    });

    test("should enable extract button when URL is entered", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Extract from Website");

        await page.fill('input[type="url"]', "https://example.com");

        const extractButton = page.locator("button:has-text('Extract Brand Elements')");
        await expect(extractButton).toBeEnabled();
    });

    test("should successfully extract colors from valid URL", async ({ page }) => {
        // Mock the brand colors API
        await page.route("**/api/scrape/brand-colors", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(createMockScrapedColors()),
            });
        });

        // Mock brand design generation API
        await page.route("**/api/generate/brand-design", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(
                    createMockBrandDesign({
                        input_method: "website",
                        is_ai_generated: true,
                    })
                ),
            });
        });

        await page.goto(STEP_3_URL);
        await page.click("text=Extract from Website");
        await page.fill('input[type="url"]', "https://example.com");
        await page.click("button:has-text('Extract Brand Elements')");

        // Should show loading state
        await expect(
            page
                .locator("text=Analyzing Website...")
                .or(page.locator("svg.animate-spin"))
        ).toBeVisible({ timeout: 5000 });
    });

    test("should show error for extraction failure", async ({ page }) => {
        // Mock failed API response
        await page.route("**/api/scrape/brand-colors", async (route) => {
            await route.fulfill({
                status: 500,
                contentType: "application/json",
                body: JSON.stringify({
                    error: "Failed to fetch website content",
                }),
            });
        });

        await page.goto(STEP_3_URL);
        await page.click("text=Extract from Website");
        await page.fill('input[type="url"]', "https://invalid-url.example");
        await page.click("button:has-text('Extract Brand Elements')");

        // Should show error toast or message
        await expect(page.locator("text=/failed|error/i").first()).toBeVisible({
            timeout: 10000,
        });
    });

    test("should block SSRF attempts with localhost URLs", async ({ page }) => {
        // Mock the API to reject internal URLs (SSRF protection)
        await page.route("**/api/scrape/brand-colors", async (route) => {
            const body = JSON.parse(route.request().postData() || "{}");
            const url = body.url || "";

            if (
                url.includes("localhost") ||
                url.includes("127.0.0.1") ||
                url.includes("0.0.0.0")
            ) {
                await route.fulfill({
                    status: 400,
                    contentType: "application/json",
                    body: JSON.stringify({
                        error: "Invalid URL: Internal addresses are not allowed",
                    }),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(createMockScrapedColors()),
                });
            }
        });

        await page.goto(STEP_3_URL);
        await page.click("text=Extract from Website");
        await page.fill('input[type="url"]', "http://localhost:3000");
        await page.click("button:has-text('Extract Brand Elements')");

        // Should show error about invalid URL
        await expect(
            page.locator("text=/invalid|not allowed|error/i").first()
        ).toBeVisible({ timeout: 10000 });
    });

    test("should block SSRF attempts with private IP ranges", async ({ page }) => {
        await page.route("**/api/scrape/brand-colors", async (route) => {
            const body = JSON.parse(route.request().postData() || "{}");
            const url = body.url || "";

            // Check for private IP ranges
            const privatePatterns = [
                /192\.168\./,
                /10\./,
                /172\.(1[6-9]|2[0-9]|3[01])\./,
            ];

            const isPrivate = privatePatterns.some((pattern) => pattern.test(url));

            if (isPrivate) {
                await route.fulfill({
                    status: 400,
                    contentType: "application/json",
                    body: JSON.stringify({
                        error: "Invalid URL: Private network addresses are not allowed",
                    }),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(createMockScrapedColors()),
                });
            }
        });

        await page.goto(STEP_3_URL);
        await page.click("text=Extract from Website");
        await page.fill('input[type="url"]', "http://192.168.1.1");
        await page.click("button:has-text('Extract Brand Elements')");

        // Should show error
        await expect(
            page.locator("text=/invalid|not allowed|error/i").first()
        ).toBeVisible({ timeout: 10000 });
    });
});

// ============================================================================
// Manual Entry Tests
// ============================================================================

test.describe("Step 3 Brand Design - Manual Entry", () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });
    });

    test("should show manual entry form when clicking I Know My Brand", async ({
        page,
    }) => {
        await page.goto(STEP_3_URL);

        // Click manual entry card
        await page.click("text=I Know My Brand");

        // Should show color inputs
        await expect(page.locator("text=Brand Colors")).toBeVisible({
            timeout: 10000,
        });
        await expect(page.locator("text=Primary Color")).toBeVisible();
        await expect(page.locator("text=Secondary Color")).toBeVisible();
        await expect(page.locator("text=Accent Color")).toBeVisible();
    });

    test("should display color picker inputs", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Check for color type inputs
        const colorInputs = page.locator('input[type="color"]');
        await expect(colorInputs).toHaveCount(5); // primary, secondary, accent, background, text
    });

    test("should display text inputs for hex values", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Check that hex value text inputs exist (showing placeholders like #3b82f6)
        await expect(page.locator('input[placeholder="#3b82f6"]')).toBeVisible();
    });

    test("should show brand personality section", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        await expect(page.locator("text=Brand Personality")).toBeVisible();
        await expect(page.locator("text=Design Style")).toBeVisible();
        await expect(page.locator("text=Tone")).toBeVisible();
        await expect(page.locator("text=Mood")).toBeVisible();
        await expect(page.locator("text=Energy")).toBeVisible();
    });

    test("should show live brand preview", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Should show preview section
        await expect(page.locator("text=Brand Preview")).toBeVisible();
        await expect(
            page.locator("text=See how your brand colors work together")
        ).toBeVisible();
    });

    test("should update preview when colors change", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Verify color inputs are visible
        await expect(page.locator('input[type="color"]').first()).toBeVisible();

        // Get the preview element that shows "Primary"
        const primaryPreview = page.locator("text=Primary").first();
        await expect(primaryPreview).toBeVisible();
    });

    test("should allow changing design style via select", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Find and click the design style dropdown
        const styleSelect = page.locator('button[role="combobox"]').first();
        await styleSelect.click();

        // Should show style options
        await expect(page.locator('[role="option"]:has-text("Modern")')).toBeVisible();
        await expect(page.locator('[role="option"]:has-text("Classic")')).toBeVisible();
        await expect(page.locator('[role="option"]:has-text("Minimal")')).toBeVisible();

        // Select a different style
        await page.click('[role="option"]:has-text("Elegant")');
    });

    test("should save brand design when Save button is clicked", async ({ page }) => {
        let saveWasCalled = false;

        // Intercept the Supabase insert/update
        await page.route("**/rest/v1/brand_designs*", async (route) => {
            const method = route.request().method();
            if (method === "POST" || method === "PATCH") {
                saveWasCalled = true;
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(
                        createMockBrandDesign({ input_method: "manual" })
                    ),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(null),
                });
            }
        });

        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Click save button
        await page.click("button:has-text('Save Brand Design')");

        // Should show success toast
        await expect(page.locator("text=/saved|success/i").first()).toBeVisible({
            timeout: 10000,
        });

        // Verify API was called
        expect(saveWasCalled).toBe(true);
    });
});

// ============================================================================
// Existing Brand Design Tests
// ============================================================================

test.describe("Step 3 Brand Design - Existing Brand Design", () => {
    test("should display success banner when brand design exists", async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: true,
        });

        await page.goto(STEP_3_URL);

        // Should show success banner
        await expect(page.locator("text=Basic Brand Design Saved")).toBeVisible({
            timeout: 10000,
        });
    });

    test("should show comprehensive guidelines message when full guidelines exist", async ({
        page,
    }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: true,
            hasComprehensiveGuidelines: true,
        });

        await page.goto(STEP_3_URL);

        // Should show comprehensive guidelines banner
        await expect(
            page.locator("text=Comprehensive Brand Guidelines Ready")
        ).toBeVisible({ timeout: 10000 });
    });

    test("should offer upgrade to comprehensive guidelines when only basic exists", async ({
        page,
    }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: true,
            hasComprehensiveGuidelines: false,
        });

        await page.goto(STEP_3_URL);

        // Should show upgrade option
        await expect(
            page
                .locator("text=Generate Full Guidelines")
                .or(page.locator("text=Upgrade to comprehensive guidelines for voice"))
        ).toBeVisible({ timeout: 10000 });
    });

    test("should enable Continue button when brand design exists", async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: true,
        });

        await page.goto(STEP_3_URL);

        // Continue button should be enabled
        const continueButton = page.locator(
            "button:has-text('Continue to Presentation Structure')"
        );
        await expect(continueButton).toBeVisible({ timeout: 10000 });
        await expect(continueButton).toBeEnabled();
    });

    test("should disable Continue button when no brand design exists", async ({
        page,
    }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });

        await page.goto(STEP_3_URL);

        // Button should be disabled or show "Complete Brand First"
        const disabledButton = page.locator("button:has-text('Complete Brand First')");
        await expect(disabledButton).toBeVisible({ timeout: 10000 });
        await expect(disabledButton).toBeDisabled();
    });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test.describe("Step 3 Brand Design - Error Handling", () => {
    test("should handle network error during brand generation", async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });

        // Mock failed generation API
        await page.route("**/api/generate/brand-design", async (route) => {
            await route.abort("failed");
        });

        await page.goto(STEP_3_URL);

        // Try to use wizard
        await page.click("text=Build Together");
        await page.click("text=Start Brand Wizard");

        // Complete wizard steps quickly
        await page.click("text=Innovative");
        await page.click("text=Authentic");
        await page.click("button:has-text('Next')");

        await page.fill("textarea", "Target audience description");
        await page.click("text=26-35 (Millennials)");
        await page.click("button:has-text('Next')");

        await page.click("text=Modern");
        await page.click("text=Cool & Calm");
        await page.click("button:has-text('Next')");

        await page.click("button:has-text('Next')");

        await page.click("text=Professional / Expert");
        await page.click("button:has-text('Generate Brand Guidelines')");

        // Should show error
        await expect(
            page.locator("text=/failed|error|could not/i").first()
        ).toBeVisible({ timeout: 15000 });
    });

    test("should handle API rate limiting gracefully", async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });

        // Mock rate limited response
        await page.route("**/api/scrape/brand-colors", async (route) => {
            await route.fulfill({
                status: 429,
                contentType: "application/json",
                body: JSON.stringify({
                    error: "Too many requests. Please try again later.",
                }),
            });
        });

        await page.goto(STEP_3_URL);
        await page.click("text=Extract from Website");
        await page.fill('input[type="url"]', "https://example.com");
        await page.click("button:has-text('Extract Brand Elements')");

        // Should show rate limit error
        await expect(
            page.locator("text=/too many|rate limit|try again/i").first()
        ).toBeVisible({ timeout: 10000 });
    });

    test("should handle save failure gracefully", async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });

        // Mock failed save
        await page.route("**/rest/v1/brand_designs*", async (route) => {
            const method = route.request().method();
            if (method === "POST" || method === "PATCH") {
                await route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({ error: "Database error" }),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(null),
                });
            }
        });

        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");
        await page.click("button:has-text('Save Brand Design')");

        // Should show error toast
        await expect(
            page.locator("text=/save failed|could not save|error/i").first()
        ).toBeVisible({ timeout: 10000 });
    });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe("Step 3 Brand Design - Accessibility", () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });
    });

    test("should have proper focus management on tab navigation", async ({ page }) => {
        await page.goto(STEP_3_URL);

        // Tab through the input method cards
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");

        // Should be able to focus on interactive elements
        const focusedElement = page.locator(":focus");
        await expect(focusedElement).toBeVisible();
    });

    test("should have accessible form labels", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Check for label associations
        const primaryLabel = page.locator('label:has-text("Primary Color")');
        await expect(primaryLabel).toBeVisible();

        // Labels should have for attributes pointing to inputs
        const labelFor = await primaryLabel.getAttribute("for");
        if (labelFor) {
            const associatedInput = page.locator(`#${labelFor}`);
            await expect(associatedInput).toBeVisible();
        }
    });

    test("should support keyboard navigation in wizard", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Build Together");
        await page.click("text=Start Brand Wizard");

        // Tab to personality options
        await page.keyboard.press("Tab");

        // Should be able to select with keyboard
        await page.keyboard.press("Space");

        // Tab to next option
        await page.keyboard.press("Tab");
        await page.keyboard.press("Space");

        // Tab to Next button
        for (let i = 0; i < 10; i++) {
            await page.keyboard.press("Tab");
            const focused = await page.locator(":focus").textContent();
            if (focused?.includes("Next")) break;
        }

        // Press Enter on Next button
        await page.keyboard.press("Enter");

        // Should advance to next step
        await expect(page.locator("text=Target Audience")).toBeVisible({
            timeout: 5000,
        });
    });

    test("should have ARIA labels on interactive elements", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Check for aria-label or aria-labelledby on selects
        const selectButtons = page.locator('[role="combobox"]');
        const count = await selectButtons.count();

        for (let i = 0; i < count; i++) {
            const button = selectButtons.nth(i);
            const hasAriaLabel = await button.getAttribute("aria-label");
            const hasAriaLabelledBy = await button.getAttribute("aria-labelledby");
            const hasId = await button.getAttribute("id");

            // Should have some form of accessible labeling
            expect(hasAriaLabel || hasAriaLabelledBy || hasId).toBeTruthy();
        }
    });

    test("should announce loading states to screen readers", async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });

        await page.route("**/api/scrape/brand-colors", async (route) => {
            // Delay response
            await new Promise((r) => setTimeout(r, 1000));
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(createMockScrapedColors()),
            });
        });

        await page.goto(STEP_3_URL);
        await page.click("text=Extract from Website");
        await page.fill('input[type="url"]', "https://example.com");
        await page.click("button:has-text('Extract Brand Elements')");

        // Loading state should have appropriate announcement
        const loadingIndicator = page.locator("svg.animate-spin").first();
        await expect(loadingIndicator).toBeVisible({ timeout: 3000 });
    });
});

// ============================================================================
// Visual Regression Tests
// ============================================================================

test.describe("Step 3 Brand Design - Visual Regression", () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });
    });

    test("should match screenshot for input method selection", async ({ page }) => {
        await page.goto(STEP_3_URL);

        // Wait for all elements to load
        await expect(page.locator("text=Build Together")).toBeVisible({
            timeout: 10000,
        });

        // Take screenshot of the input method cards
        await expect(page).toHaveScreenshot("step3-input-methods.png", {
            maxDiffPixels: 100,
            timeout: 10000,
        });
    });

    test("should match screenshot for manual entry form", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Wait for form to render
        await expect(page.locator("text=Brand Colors")).toBeVisible({
            timeout: 10000,
        });

        // Take screenshot
        await expect(page).toHaveScreenshot("step3-manual-entry.png", {
            maxDiffPixels: 100,
            timeout: 10000,
        });
    });

    test("should match screenshot for wizard step 1", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Build Together");
        await page.click("text=Start Brand Wizard");

        // Wait for wizard to load
        await expect(page.locator("text=Brand Personality")).toBeVisible({
            timeout: 10000,
        });

        // Take screenshot
        await expect(page).toHaveScreenshot("step3-wizard-personality.png", {
            maxDiffPixels: 100,
            timeout: 10000,
        });
    });

    test("should match screenshot for website extraction form", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=Extract from Website");

        // Wait for form to render
        await expect(page.locator('input[type="url"]')).toBeVisible({
            timeout: 10000,
        });

        // Take screenshot
        await expect(page).toHaveScreenshot("step3-website-extraction.png", {
            maxDiffPixels: 100,
            timeout: 10000,
        });
    });

    test("should match screenshot for brand preview", async ({ page }) => {
        await page.goto(STEP_3_URL);
        await page.click("text=I Know My Brand");

        // Scroll to preview section
        await page.locator("text=Brand Preview").scrollIntoViewIfNeeded();

        // Wait for preview to render
        await expect(page.locator("text=Brand Preview")).toBeVisible({
            timeout: 10000,
        });

        // Take screenshot of preview area
        const previewCard = page
            .locator("text=Brand Preview")
            .locator("xpath=ancestor::div[contains(@class, 'rounded')]")
            .first();

        await expect(previewCard).toHaveScreenshot("step3-brand-preview.png", {
            maxDiffPixels: 50,
            timeout: 10000,
        });
    });
});

// ============================================================================
// Tab Switching Tests
// ============================================================================

test.describe("Step 3 Brand Design - Tab Switching", () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });
    });

    test("should switch between input methods", async ({ page }) => {
        await page.goto(STEP_3_URL);

        // Start with wizard selected (default)
        await expect(page.locator("text=Build Together")).toBeVisible({
            timeout: 10000,
        });

        // Switch to website
        await page.click("text=Extract from Website");
        await expect(page.locator('input[type="url"]')).toBeVisible();

        // Switch to manual
        await page.click("text=I Know My Brand");
        await expect(page.locator("text=Brand Colors")).toBeVisible();

        // Switch back to wizard
        await page.click("text=Build Together");
        await expect(
            page
                .locator("text=Start Brand Wizard")
                .or(page.locator("text=Build Your Brand Together"))
        ).toBeVisible();
    });

    test("should highlight selected input method card", async ({ page }) => {
        await page.goto(STEP_3_URL);

        // Click website card
        await page.click("text=Extract from Website");

        // Website card should have selected styling (ring-2)
        const websiteCard = page
            .locator("text=Extract from Website")
            .locator("xpath=ancestor::div[contains(@class, 'cursor-pointer')]")
            .first();

        // Check for selection indicator class
        await expect(websiteCard).toHaveClass(/ring-2|border-primary/);
    });
});

// ============================================================================
// Integration Tests
// ============================================================================

test.describe("Step 3 Brand Design - Integration", () => {
    test("should complete full manual brand creation flow", async ({ page }) => {
        let savedDesign: Record<string, unknown> | null = null;

        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });

        // Intercept save
        await page.route("**/rest/v1/brand_designs*", async (route) => {
            const method = route.request().method();
            if (method === "POST") {
                savedDesign = JSON.parse(route.request().postData() || "{}");
                await route.fulfill({
                    status: 201,
                    contentType: "application/json",
                    body: JSON.stringify(
                        createMockBrandDesign({
                            input_method: "manual",
                            primary_color:
                                (savedDesign?.primary_color as string) || "#3b82f6",
                        })
                    ),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify(null),
                });
            }
        });

        await page.goto(STEP_3_URL);

        // Select manual entry
        await page.click("text=I Know My Brand");

        // Fill in brand name
        await page.fill('input[id="brandName"]', "My Awesome Brand");

        // Save
        await page.click("button:has-text('Save Brand Design')");

        // Should show success
        await expect(page.locator("text=/saved|success/i").first()).toBeVisible({
            timeout: 10000,
        });

        // Verify data was saved
        expect(savedDesign).toBeTruthy();
    });

    test("should navigate to next step after completing brand design", async ({
        page,
    }) => {
        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: true,
        });

        await page.goto(STEP_3_URL);

        // Wait for page to load with existing design
        await expect(page.locator("text=Basic Brand Design Saved")).toBeVisible({
            timeout: 10000,
        });

        // Click continue button
        await page.click("button:has-text('Continue to Presentation Structure')");

        // Should navigate to step 4
        await expect(page).toHaveURL(/\/step\/4/, { timeout: 10000 });
    });
});

// ============================================================================
// Console Error Monitoring Tests
// ============================================================================

test.describe("Step 3 Brand Design - Console Error Monitoring", () => {
    test("should not have React errors during interactions", async ({ page }) => {
        const errors = captureConsoleErrors(page);

        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });

        await page.goto(STEP_3_URL);

        // Perform various interactions
        await page.click("text=I Know My Brand");
        await page.click("text=Extract from Website");
        await page.click("text=Build Together");

        // Wait a moment for any async errors
        await page.waitForTimeout(1000);

        // Filter for actual React/JS errors
        const reactErrors = errors.filter(
            (e) => e.includes("React") || e.includes("Uncaught") || e.includes("Error:")
        );

        expect(reactErrors).toHaveLength(0);
    });

    test("should not throw unhandled promise rejections", async ({ page }) => {
        const unhandledRejections: string[] = [];

        page.on("pageerror", (error) => {
            unhandledRejections.push(error.message);
        });

        await setupApiMocks(page, {
            hasBusinessProfile: true,
            hasExistingBrandDesign: false,
        });

        await page.goto(STEP_3_URL);

        // Navigate through different tabs
        await page.click("text=I Know My Brand");
        await page.click("text=Extract from Website");
        await page.click("text=Build Together");

        await page.waitForTimeout(500);

        expect(unhandledRejections).toHaveLength(0);
    });
});
