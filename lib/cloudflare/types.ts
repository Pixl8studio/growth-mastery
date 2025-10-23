/**
 * Cloudflare Stream Types
 * Type definitions for Cloudflare Stream video hosting
 */

// Upload URL response
export interface UploadUrlResponse {
    uploadUrl: string;
    videoId: string;
}

// Video metadata
export interface CloudflareVideo {
    uid: string;
    thumbnail: string;
    thumbnailTimestampPct: number;
    readyToStream: boolean;
    status: {
        state: "queued" | "inprogress" | "ready" | "error";
        pctComplete: string;
        errorReasonCode?: string;
        errorReasonText?: string;
    };
    meta: {
        name?: string;
        downloadedFrom?: string;
    };
    created: string;
    modified: string;
    size: number;
    preview: string;
    allowedOrigins: string[];
    requireSignedURLs: boolean;
    uploaded: string;
    uploadExpiry: string | null;
    maxSizeBytes: number;
    maxDurationSeconds: number;
    duration: number;
    input: {
        width: number;
        height: number;
    };
    playback: {
        hls: string;
        dash: string;
    };
    watermark?: {
        uid: string;
    };
}

// Upload progress event
export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

// Video processing status
export type ProcessingStatus = "queued" | "inprogress" | "ready" | "error";

// Cloudflare API response
export interface CloudflareApiResponse<T> {
    result: T;
    success: boolean;
    errors: Array<{
        code: number;
        message: string;
    }>;
    messages: string[];
}
