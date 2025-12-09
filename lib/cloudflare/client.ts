/**
 * Cloudflare Stream Client
 * Wrapper around Cloudflare Stream API for video upload and hosting
 */

import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type {
    UploadUrlResponse,
    CloudflareVideo,
    CloudflareApiResponse,
    ProcessingStatus,
} from "./types";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

/**
 * Generate a direct upload URL for video upload
 */
export async function generateUploadUrl(metadata?: {
    name?: string;
    requireSignedURLs?: boolean;
}): Promise<UploadUrlResponse> {
    const requestLogger = logger.child({ handler: "cloudflare-generate-upload-url" });

    try {
        requestLogger.info({ metadata }, "Generating Cloudflare upload URL");

        const accountId = env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN;

        if (!accountId || !apiToken) {
            throw new Error(
                "Cloudflare credentials not configured. Check CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN environment variables."
            );
        }

        // Build the meta object with only metadata fields (not API parameters)
        const meta: Record<string, string> = {};
        if (metadata?.name) {
            meta.name = metadata.name;
        }

        const response = await fetch(
            `${CLOUDFLARE_API_BASE}/accounts/${accountId}/stream/direct_upload`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    maxDurationSeconds: 3600, // 1 hour max
                    meta,
                    requireSignedURLs: metadata?.requireSignedURLs ?? false,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            requestLogger.error(
                {
                    status: response.status,
                    statusText: response.statusText,
                    errorText,
                },
                "Cloudflare API error"
            );
            throw new Error(`Cloudflare API error (${response.status}): ${errorText}`);
        }

        const data: CloudflareApiResponse<{ uploadURL: string; uid: string }> =
            await response.json();

        if (!data.success) {
            throw new Error(
                `Cloudflare API failed: ${data.errors.map((e) => e.message).join(", ")}`
            );
        }

        requestLogger.info(
            { videoId: data.result.uid },
            "Upload URL generated successfully"
        );

        return {
            uploadUrl: data.result.uploadURL,
            videoId: data.result.uid,
        };
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate upload URL");

        Sentry.captureException(error, {
            tags: {
                service: "cloudflare",
                operation: "generate_upload_url",
            },
            extra: {
                metadata,
            },
        });

        throw new Error(
            `Failed to generate upload URL: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Get video details and status
 */
export async function getVideo(videoId: string): Promise<CloudflareVideo> {
    const requestLogger = logger.child({ handler: "cloudflare-get-video", videoId });

    try {
        requestLogger.info("Fetching video details");

        const accountId = env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN;

        if (!accountId || !apiToken) {
            throw new Error("Cloudflare credentials not configured");
        }

        const response = await fetch(
            `${CLOUDFLARE_API_BASE}/accounts/${accountId}/stream/${videoId}`,
            {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Cloudflare API error: ${error}`);
        }

        const data: CloudflareApiResponse<CloudflareVideo> = await response.json();

        if (!data.success) {
            throw new Error(
                `Cloudflare API failed: ${data.errors.map((e) => e.message).join(", ")}`
            );
        }

        requestLogger.info(
            { videoId, status: data.result.status.state },
            "Video details fetched"
        );

        return data.result;
    } catch (error) {
        requestLogger.error({ error, videoId }, "Failed to fetch video");

        Sentry.captureException(error, {
            tags: {
                service: "cloudflare",
                operation: "get_video",
            },
            extra: {
                videoId,
            },
        });

        throw new Error(
            `Failed to fetch video: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Get video processing status
 */
export async function getVideoStatus(videoId: string): Promise<{
    status: ProcessingStatus;
    readyToStream: boolean;
    thumbnailUrl?: string;
    duration?: number;
}> {
    try {
        const video = await getVideo(videoId);

        return {
            status: video.status.state,
            readyToStream: video.readyToStream,
            thumbnailUrl: video.thumbnail,
            duration: video.duration,
        };
    } catch (error) {
        logger.error({ error, videoId }, "Failed to get video status");

        Sentry.captureException(error, {
            tags: {
                service: "cloudflare",
                operation: "get_video_status",
            },
            extra: {
                videoId,
            },
        });

        throw error;
    }
}

/**
 * Get video embed URL (HLS)
 */
export function getEmbedUrl(videoId: string): string {
    return `https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
}

/**
 * Get video thumbnail URL
 */
export function getThumbnailUrl(videoId: string, time?: number): string {
    const timeParam = time ? `?time=${time}s` : "";
    return `https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg${timeParam}`;
}

/**
 * Get video iframe embed code
 */
export function getIframeEmbedCode(
    videoId: string,
    options?: {
        autoplay?: boolean;
        muted?: boolean;
        loop?: boolean;
        controls?: boolean;
    }
): string {
    const params = new URLSearchParams({
        autoplay: options?.autoplay ? "true" : "false",
        muted: options?.muted ? "true" : "false",
        loop: options?.loop ? "true" : "false",
        controls: options?.controls !== false ? "true" : "false",
    });

    return `<iframe src="https://customer-${env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${videoId}/iframe?${params}" style="border: none; position: absolute; top: 0; left: 0; height: 100%; width: 100%;" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen="true"></iframe>`;
}

/**
 * Delete a video
 */
export async function deleteVideo(videoId: string): Promise<void> {
    const requestLogger = logger.child({ handler: "cloudflare-delete-video", videoId });

    try {
        requestLogger.info("Deleting video");

        const accountId = env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN;

        if (!accountId || !apiToken) {
            throw new Error("Cloudflare credentials not configured");
        }

        const response = await fetch(
            `${CLOUDFLARE_API_BASE}/accounts/${accountId}/stream/${videoId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Cloudflare API error: ${error}`);
        }

        requestLogger.info({ videoId }, "Video deleted successfully");
    } catch (error) {
        requestLogger.error({ error, videoId }, "Failed to delete video");

        Sentry.captureException(error, {
            tags: {
                service: "cloudflare",
                operation: "delete_video",
            },
            extra: {
                videoId,
            },
        });

        throw new Error(
            `Failed to delete video: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}
