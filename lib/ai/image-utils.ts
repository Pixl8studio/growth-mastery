/**
 * Image Utilities
 * Helper functions for processing AI-generated images from different providers
 */

/**
 * Valid image MIME types that we expect from AI image generation providers
 */
const VALID_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Decode a base64 data URL to an ArrayBuffer
 * Used for processing Gemini image generation responses
 *
 * @param dataUrl - Base64 data URL in format "data:image/...;base64,..."
 * @returns ArrayBuffer containing the image data
 * @throws Error if the data URL format is invalid
 */
export function decodeBase64DataUrl(dataUrl: string): ArrayBuffer {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match || !match[2]) {
        throw new Error(
            "Invalid base64 data URL format. Expected 'data:image/...;base64,...'"
        );
    }

    const mimeType = match[1];
    if (mimeType && !VALID_IMAGE_MIME_TYPES.includes(mimeType)) {
        throw new Error(
            `Unexpected MIME type: ${mimeType}. Expected image format (png, jpeg, or webp).`
        );
    }

    const base64Data = match[2];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Download an image from a URL and return as ArrayBuffer
 * Used for processing OpenAI DALL-E image generation responses
 *
 * @param url - HTTP(S) URL of the image to download
 * @returns ArrayBuffer containing the image data
 * @throws Error if the download fails
 */
export async function downloadImageAsBuffer(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: HTTP ${response.status}`);
    }
    const blob = await response.blob();
    return blob.arrayBuffer();
}

/**
 * Convert a GeneratedImage to an ArrayBuffer
 * Handles both base64 data URLs (Gemini) and HTTP URLs (OpenAI)
 *
 * @param url - Either a base64 data URL or HTTP URL
 * @param isBase64 - True if the URL is a base64 data URL
 * @returns ArrayBuffer containing the image data
 */
export async function imageToBuffer(
    url: string,
    isBase64?: boolean
): Promise<ArrayBuffer> {
    if (isBase64) {
        return decodeBase64DataUrl(url);
    }
    return downloadImageAsBuffer(url);
}
