/**
 * Unit Tests: Cloudflare Client
 * Tests for lib/cloudflare/client.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    generateUploadUrl,
    getVideo,
    getVideoStatus,
    getEmbedUrl,
    getThumbnailUrl,
    getIframeEmbedCode,
    deleteVideo,
} from "@/lib/cloudflare/client";

// Mock dependencies
vi.mock("@/lib/env", () => ({
    env: {
        CLOUDFLARE_ACCOUNT_ID: "test-account-id",
        CLOUDFLARE_STREAM_API_TOKEN: "test-api-token",
    },
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
        })),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

global.fetch = vi.fn();

describe("Cloudflare Client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateUploadUrl", () => {
        it("should generate an upload URL successfully", async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    result: {
                        uploadURL: "https://upload.cloudflare.com/test",
                        uid: "video-123",
                    },
                    errors: [],
                    messages: [],
                }),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            const result = await generateUploadUrl({
                name: "test-video.mp4",
            });

            expect(result).toEqual({
                uploadUrl: "https://upload.cloudflare.com/test",
                videoId: "video-123",
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/accounts/test-account-id/stream/direct_upload"),
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        Authorization: "Bearer test-api-token",
                    }),
                })
            );
        });

        it("should throw error when credentials are missing", async () => {
            vi.doMock("@/lib/env", () => ({
                env: {
                    CLOUDFLARE_ACCOUNT_ID: undefined,
                    CLOUDFLARE_STREAM_API_TOKEN: undefined,
                },
            }));

            const { generateUploadUrl: generate } = await import(
                "@/lib/cloudflare/client"
            );

            await expect(generate()).rejects.toThrow(
                "Cloudflare credentials not configured"
            );
        });

        it("should handle API errors", async () => {
            const mockResponse = {
                ok: false,
                status: 401,
                statusText: "Unauthorized",
                text: vi.fn().mockResolvedValue("Invalid credentials"),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            await expect(generateUploadUrl()).rejects.toThrow(
                "Cloudflare API error"
            );
        });

        it("should handle API failures", async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: false,
                    errors: [{ code: 1000, message: "Failed to generate URL" }],
                }),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            await expect(generateUploadUrl()).rejects.toThrow("Cloudflare API failed");
        });
    });

    describe("getVideo", () => {
        it("should fetch video details successfully", async () => {
            const mockVideo = {
                uid: "video-123",
                thumbnail: "https://cloudflare.com/thumb.jpg",
                readyToStream: true,
                status: { state: "ready", pctComplete: "100" },
                duration: 120,
            };

            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    result: mockVideo,
                    errors: [],
                }),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            const result = await getVideo("video-123");

            expect(result).toEqual(mockVideo);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/stream/video-123"),
                expect.any(Object)
            );
        });

        it("should throw error for non-existent video", async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                text: vi.fn().mockResolvedValue("Video not found"),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            await expect(getVideo("invalid-id")).rejects.toThrow(
                "Cloudflare API error"
            );
        });
    });

    describe("getVideoStatus", () => {
        it("should return video processing status", async () => {
            const mockVideo = {
                uid: "video-123",
                thumbnail: "https://cloudflare.com/thumb.jpg",
                readyToStream: true,
                status: { state: "ready", pctComplete: "100" },
                duration: 120,
            };

            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    result: mockVideo,
                    errors: [],
                }),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            const status = await getVideoStatus("video-123");

            expect(status).toEqual({
                status: "ready",
                readyToStream: true,
                thumbnailUrl: "https://cloudflare.com/thumb.jpg",
                duration: 120,
            });
        });
    });

    describe("getEmbedUrl", () => {
        it("should generate correct HLS embed URL", () => {
            const url = getEmbedUrl("video-123");

            expect(url).toBe(
                "https://customer-test-account-id.cloudflarestream.com/video-123/manifest/video.m3u8"
            );
        });
    });

    describe("getThumbnailUrl", () => {
        it("should generate thumbnail URL without time parameter", () => {
            const url = getThumbnailUrl("video-123");

            expect(url).toBe(
                "https://customer-test-account-id.cloudflarestream.com/video-123/thumbnails/thumbnail.jpg"
            );
        });

        it("should generate thumbnail URL with time parameter", () => {
            const url = getThumbnailUrl("video-123", 30);

            expect(url).toBe(
                "https://customer-test-account-id.cloudflarestream.com/video-123/thumbnails/thumbnail.jpg?time=30s"
            );
        });
    });

    describe("getIframeEmbedCode", () => {
        it("should generate iframe embed code with default options", () => {
            const code = getIframeEmbedCode("video-123");

            expect(code).toContain("iframe");
            expect(code).toContain("video-123");
            expect(code).toContain("controls=true");
            expect(code).toContain("autoplay=false");
        });

        it("should generate iframe embed code with custom options", () => {
            const code = getIframeEmbedCode("video-123", {
                autoplay: true,
                muted: true,
                loop: true,
                controls: false,
            });

            expect(code).toContain("autoplay=true");
            expect(code).toContain("muted=true");
            expect(code).toContain("loop=true");
            expect(code).toContain("controls=false");
        });
    });

    describe("deleteVideo", () => {
        it("should delete video successfully", async () => {
            const mockResponse = {
                ok: true,
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            await expect(deleteVideo("video-123")).resolves.toBeUndefined();

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/stream/video-123"),
                expect.objectContaining({
                    method: "DELETE",
                })
            );
        });

        it("should throw error when deletion fails", async () => {
            const mockResponse = {
                ok: false,
                text: vi.fn().mockResolvedValue("Cannot delete video"),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            await expect(deleteVideo("video-123")).rejects.toThrow(
                "Failed to delete video"
            );
        });
    });
});
