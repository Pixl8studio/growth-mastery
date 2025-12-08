/**
 * Unit Tests: Cloudflare Types
 * Tests for lib/cloudflare/types.ts
 */

import { describe, it, expect } from "vitest";
import type {
    UploadUrlResponse,
    CloudflareVideo,
    UploadProgress,
    ProcessingStatus,
    CloudflareApiResponse,
} from "@/lib/cloudflare/types";

describe("Cloudflare Types", () => {
    describe("UploadUrlResponse", () => {
        it("should have correct structure", () => {
            const response: UploadUrlResponse = {
                uploadUrl: "https://upload.cloudflare.com/test",
                videoId: "video-123",
            };

            expect(response).toHaveProperty("uploadUrl");
            expect(response).toHaveProperty("videoId");
            expect(typeof response.uploadUrl).toBe("string");
            expect(typeof response.videoId).toBe("string");
        });
    });

    describe("CloudflareVideo", () => {
        it("should have correct structure for a complete video object", () => {
            const video: CloudflareVideo = {
                uid: "video-123",
                thumbnail: "https://cloudflare.com/thumb.jpg",
                thumbnailTimestampPct: 0.5,
                readyToStream: true,
                status: {
                    state: "ready",
                    pctComplete: "100",
                },
                meta: {
                    name: "test-video.mp4",
                },
                created: "2025-01-01T00:00:00Z",
                modified: "2025-01-01T00:00:00Z",
                size: 1024000,
                preview: "https://cloudflare.com/preview.jpg",
                allowedOrigins: ["https://example.com"],
                requireSignedURLs: false,
                uploaded: "2025-01-01T00:00:00Z",
                uploadExpiry: null,
                maxSizeBytes: 5000000000,
                maxDurationSeconds: 3600,
                duration: 120,
                input: {
                    width: 1920,
                    height: 1080,
                },
                playback: {
                    hls: "https://cloudflare.com/video.m3u8",
                    dash: "https://cloudflare.com/video.mpd",
                },
            };

            expect(video).toHaveProperty("uid");
            expect(video).toHaveProperty("status");
            expect(video.status).toHaveProperty("state");
            expect(["queued", "inprogress", "ready", "error"]).toContain(
                video.status.state
            );
        });

        it("should handle video with error status", () => {
            const video: CloudflareVideo = {
                uid: "video-error",
                thumbnail: "",
                thumbnailTimestampPct: 0,
                readyToStream: false,
                status: {
                    state: "error",
                    pctComplete: "0",
                    errorReasonCode: "ERR_CODEC_UNSUPPORTED",
                    errorReasonText: "Unsupported video codec",
                },
                meta: {},
                created: "2025-01-01T00:00:00Z",
                modified: "2025-01-01T00:00:00Z",
                size: 0,
                preview: "",
                allowedOrigins: [],
                requireSignedURLs: false,
                uploaded: "",
                uploadExpiry: null,
                maxSizeBytes: 5000000000,
                maxDurationSeconds: 3600,
                duration: 0,
                input: { width: 0, height: 0 },
                playback: { hls: "", dash: "" },
            };

            expect(video.status.state).toBe("error");
            expect(video.status.errorReasonCode).toBeDefined();
            expect(video.status.errorReasonText).toBeDefined();
        });

        it("should handle video with watermark", () => {
            const video: Partial<CloudflareVideo> = {
                uid: "video-123",
                watermark: {
                    uid: "watermark-123",
                },
            };

            expect(video.watermark).toBeDefined();
            expect(video.watermark?.uid).toBe("watermark-123");
        });
    });

    describe("UploadProgress", () => {
        it("should track upload progress correctly", () => {
            const progress: UploadProgress = {
                loaded: 5000000,
                total: 10000000,
                percentage: 50,
            };

            expect(progress.percentage).toBe((progress.loaded / progress.total) * 100);
        });

        it("should handle zero total bytes", () => {
            const progress: UploadProgress = {
                loaded: 0,
                total: 0,
                percentage: 0,
            };

            expect(progress.percentage).toBe(0);
        });

        it("should handle complete upload", () => {
            const progress: UploadProgress = {
                loaded: 10000000,
                total: 10000000,
                percentage: 100,
            };

            expect(progress.percentage).toBe(100);
        });
    });

    describe("ProcessingStatus", () => {
        it("should accept valid status values", () => {
            const statuses: ProcessingStatus[] = [
                "queued",
                "inprogress",
                "ready",
                "error",
            ];

            statuses.forEach((status) => {
                expect(["queued", "inprogress", "ready", "error"]).toContain(status);
            });
        });
    });

    describe("CloudflareApiResponse", () => {
        it("should have correct structure for success response", () => {
            const response: CloudflareApiResponse<{ uid: string }> = {
                result: { uid: "video-123" },
                success: true,
                errors: [],
                messages: ["Video created successfully"],
            };

            expect(response.success).toBe(true);
            expect(response.errors).toHaveLength(0);
            expect(response.result).toBeDefined();
        });

        it("should have correct structure for error response", () => {
            const response: CloudflareApiResponse<null> = {
                result: null as any,
                success: false,
                errors: [
                    {
                        code: 1000,
                        message: "Invalid request",
                    },
                ],
                messages: [],
            };

            expect(response.success).toBe(false);
            expect(response.errors).toHaveLength(1);
            expect(response.errors[0].code).toBe(1000);
        });

        it("should handle multiple errors", () => {
            const response: CloudflareApiResponse<null> = {
                result: null as any,
                success: false,
                errors: [
                    { code: 1000, message: "Error 1" },
                    { code: 1001, message: "Error 2" },
                    { code: 1002, message: "Error 3" },
                ],
                messages: [],
            };

            expect(response.errors).toHaveLength(3);
        });
    });
});
