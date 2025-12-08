/**
 * E2E Tests for Video Upload Flow
 * Tests Step 8: Upload Presentation Video
 */

import { test, expect } from "@playwright/test";

test.describe("Video Upload Flow", () => {
    test.beforeEach(async ({ page }) => {
        // Note: In actual implementation, you'll need to:
        // 1. Login with test credentials
        // 2. Create or use an existing test project
        // 3. Navigate to step 8
        // For now, this is a template showing what needs to be tested
        // await page.goto('/login');
        // await page.fill('input[type="email"]', 'test@example.com');
        // await page.fill('input[type="password"]', 'testpassword');
        // await page.click('button[type="submit"]');
        // await page.goto('/funnel-builder/test-project-id/step/8');
    });

    test("displays recording instructions", async ({ page }) => {
        await page.goto("/funnel-builder/test-project-id/step/8");

        await expect(page.getByText("How to Record Your Presentation")).toBeVisible();
        await expect(page.getByText("Open a Zoom meeting alone")).toBeVisible();
        await expect(page.getByText("Share your presentation deck")).toBeVisible();
        await expect(page.getByText("Record to computer")).toBeVisible();
        await expect(
            page.getByText("Speak through the AI-generated Talk Track")
        ).toBeVisible();
        await expect(page.getByText("Upload the finished MP4 here")).toBeVisible();
    });

    test("shows file requirements", async ({ page }) => {
        await page.goto("/funnel-builder/test-project-id/step/8");

        await expect(page.getByText("Accepted formats:")).toBeVisible();
        await expect(page.getByText("MP4, MOV, AVI, WebM")).toBeVisible();
        await expect(page.getByText("File size limit:")).toBeVisible();
        await expect(page.getByText("Maximum 1GB per video")).toBeVisible();
        await expect(
            page.getByText(/Record at 1080p resolution for best quality/)
        ).toBeVisible();
    });

    test("rejects files over 1GB", async ({ page }) => {
        await page.goto("/funnel-builder/test-project-id/step/8");

        // Mock a large file (browsers can't actually create 1GB+ files in tests)
        await page.evaluate(() => {
            const dataTransfer = new DataTransfer();
            const file = new File(["x".repeat(1100000000)], "large.mp4", {
                type: "video/mp4",
            });
            Object.defineProperty(file, "size", { value: 1100000000 });
            dataTransfer.items.add(file);

            const input = document.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;
            if (input) {
                input.files = dataTransfer.files;
                input.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });

        await expect(page.getByText(/File too large/)).toBeVisible({ timeout: 5000 });
    });

    test("uploads video successfully with progress tracking", async ({ page }) => {
        await page.goto("/funnel-builder/test-project-id/step/8");

        // Mock Cloudflare API responses
        await page.route("**/api/cloudflare/upload-url", (route) => {
            route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    success: true,
                    uploadUrl: "https://upload.cloudflare.com/test",
                    videoId: "test-video-id-123",
                }),
            });
        });

        await page.route("https://upload.cloudflare.com/test", (route) => {
            route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ success: true }),
            });
        });

        await page.route("**/api/cloudflare/video/test-video-id-123", (route) => {
            route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    success: true,
                    readyToStream: true,
                    duration: 120,
                    thumbnail: "https://cloudflare.com/thumbnail.jpg",
                    status: "ready",
                }),
            });
        });

        // Upload a small test video (use a small file for testing)
        const input = page.locator('input[type="file"]');
        await input.setInputFiles({
            name: "test-video.mp4",
            mimeType: "video/mp4",
            buffer: Buffer.from("fake video content"),
        });

        // Wait for upload progress to appear
        await expect(page.getByText("Uploading...")).toBeVisible({ timeout: 3000 });

        // Wait for progress to complete
        await expect(page.getByText("100%")).toBeVisible({ timeout: 10000 });

        // Verify video appears in the list
        await expect(page.getByText("Presentation Video")).toBeVisible({
            timeout: 5000,
        });
    });

    test("retries failed uploads automatically", async ({ page }) => {
        await page.goto("/funnel-builder/test-project-id/step/8");

        let attempts = 0;

        await page.route("**/api/cloudflare/upload-url", (route) => {
            attempts++;
            if (attempts < 3) {
                // Fail first 2 attempts
                route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({ error: "Internal server error" }),
                });
            } else {
                // Succeed on 3rd attempt
                route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        success: true,
                        uploadUrl: "https://upload.cloudflare.com/test",
                        videoId: "test-video-retry-id",
                    }),
                });
            }
        });

        await page.route("https://upload.cloudflare.com/test", (route) => {
            route.fulfill({ status: 200 });
        });

        await page.route("**/api/cloudflare/video/test-video-retry-id", (route) => {
            route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    success: true,
                    readyToStream: true,
                    duration: 120,
                    thumbnail: "https://cloudflare.com/thumbnail.jpg",
                }),
            });
        });

        const input = page.locator('input[type="file"]');
        await input.setInputFiles({
            name: "test-video-retry.mp4",
            mimeType: "video/mp4",
            buffer: Buffer.from("fake video content"),
        });

        // Should eventually succeed after retries
        await expect(page.getByText("100%")).toBeVisible({ timeout: 15000 });
        expect(attempts).toBeGreaterThanOrEqual(3);
    });

    test("shows manual retry button after max auto-retries", async ({ page }) => {
        await page.goto("/funnel-builder/test-project-id/step/8");

        // Always fail to trigger max retries
        await page.route("**/api/cloudflare/upload-url", (route) => {
            route.fulfill({
                status: 500,
                contentType: "application/json",
                body: JSON.stringify({ error: "Internal server error" }),
            });
        });

        const input = page.locator('input[type="file"]');
        await input.setInputFiles({
            name: "test-video-fail.mp4",
            mimeType: "video/mp4",
            buffer: Buffer.from("fake video content"),
        });

        // Wait for auto-retries to exhaust
        await expect(page.getByText("Upload Failed")).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/Automatic retry failed/)).toBeVisible();
        await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();
    });

    test("manual retry button re-attempts upload", async ({ page }) => {
        await page.goto("/funnel-builder/test-project-id/step/8");

        let attemptCount = 0;

        await page.route("**/api/cloudflare/upload-url", (route) => {
            attemptCount++;
            if (attemptCount <= 4) {
                // Fail first 4 attempts (3 auto + 1st manual)
                route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({ error: "Internal server error" }),
                });
            } else {
                // Succeed after manual retry
                route.fulfill({
                    status: 200,
                    contentType: "application/json",
                    body: JSON.stringify({
                        success: true,
                        uploadUrl: "https://upload.cloudflare.com/test",
                        videoId: "test-video-manual-retry",
                    }),
                });
            }
        });

        await page.route("https://upload.cloudflare.com/test", (route) => {
            route.fulfill({ status: 200 });
        });

        await page.route("**/api/cloudflare/video/test-video-manual-retry", (route) => {
            route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    success: true,
                    readyToStream: true,
                    duration: 120,
                    thumbnail: "https://cloudflare.com/thumbnail.jpg",
                }),
            });
        });

        const input = page.locator('input[type="file"]');
        await input.setInputFiles({
            name: "test-video-manual.mp4",
            mimeType: "video/mp4",
            buffer: Buffer.from("fake video content"),
        });

        // Wait for initial failure
        await expect(page.getByText("Upload Failed")).toBeVisible({ timeout: 15000 });

        // Click Try Again
        await page.getByRole("button", { name: "Try Again" }).click();

        // Should succeed after manual retry
        await expect(page.getByText("100%")).toBeVisible({ timeout: 15000 });
    });

    test("displays uploaded videos in list", async ({ page }) => {
        await page.goto("/funnel-builder/test-project-id/step/8");

        // Mock existing videos
        await page.route("**/api/supabase/pitch_videos**", (route) => {
            route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    data: [
                        {
                            id: "video-1",
                            video_url: "https://iframe.videodelivery.net/video1",
                            thumbnail_url: "https://cloudflare.com/thumb1.jpg",
                            video_duration: 120,
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: "video-2",
                            video_url: "https://iframe.videodelivery.net/video2",
                            thumbnail_url: "https://cloudflare.com/thumb2.jpg",
                            video_duration: 180,
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });
        });

        await expect(page.getByText("Your Videos")).toBeVisible();
        await expect(page.getByText("2 uploaded")).toBeVisible();
    });
});
