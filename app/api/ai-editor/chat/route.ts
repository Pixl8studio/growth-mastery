/**
 * AI Editor - Chat Endpoint
 * POST /api/ai-editor/chat
 * Handles conversational edits to landing pages using Claude Sonnet 4
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    processEditRequest,
    type EditRequestOptions,
} from "@/lib/ai-editor/chat-processor";

// Validation constants
const MAX_MESSAGE_LENGTH = 10000;
const MAX_HTML_SIZE = 500000; // 500KB
const MAX_IMAGE_ATTACHMENTS = 5;

// Zod schema for request validation
const ImageAttachmentSchema = z.object({
    id: z.string().min(1),
    url: z.string().url(),
});

const ChatRequestSchema = z.object({
    pageId: z.string().uuid("Invalid page ID format"),
    message: z
        .string()
        .min(1, "Message cannot be empty")
        .max(
            MAX_MESSAGE_LENGTH,
            `Message must be under ${MAX_MESSAGE_LENGTH} characters`
        ),
    currentHtml: z
        .string()
        .min(1, "HTML content is required")
        .max(MAX_HTML_SIZE, "HTML content too large"),
    conversationHistory: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string(),
            })
        )
        .optional()
        .default([]),
    imageAttachments: z
        .array(ImageAttachmentSchema)
        .max(MAX_IMAGE_ATTACHMENTS, `Maximum ${MAX_IMAGE_ATTACHMENTS} images allowed`)
        .optional()
        .default([]),
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

interface ProcessedImageAttachment {
    id: string;
    url: string;
    base64?: string;
    mediaType?: string;
}

/**
 * Validate URL is safe to fetch (prevents SSRF attacks)
 * Only allows HTTPS URLs from trusted domains
 */
function isAllowedImageUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);

        // Block internal IPs and localhost
        const blockedHostnames = [
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "169.254.169.254", // AWS metadata
            "metadata.google.internal", // GCP metadata
            "100.100.100.200", // Azure metadata
        ];

        if (blockedHostnames.includes(parsedUrl.hostname)) {
            logger.warn(
                { url, hostname: parsedUrl.hostname },
                "Blocked internal hostname"
            );
            return false;
        }

        // Block private IP ranges
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (ipv4Regex.test(parsedUrl.hostname)) {
            const parts = parsedUrl.hostname.split(".").map(Number);
            // 10.x.x.x, 172.16-31.x.x, 192.168.x.x
            if (
                parts[0] === 10 ||
                (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
                (parts[0] === 192 && parts[1] === 168)
            ) {
                logger.warn(
                    { url, hostname: parsedUrl.hostname },
                    "Blocked private IP"
                );
                return false;
            }
        }

        // Only allow HTTPS
        if (parsedUrl.protocol !== "https:") {
            logger.warn({ url, protocol: parsedUrl.protocol }, "Blocked non-HTTPS URL");
            return false;
        }

        // Allow only trusted domains - compare hostname properly to prevent bypass
        // e.g. "https://app.growthmastery.ai.evil.com" should NOT match
        const allowedDomains = [
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_APP_URL,
        ].filter(Boolean);

        const isAllowed = allowedDomains.some((domain) => {
            if (!domain) return false;
            try {
                const allowedUrl = new URL(domain);
                // Compare protocol and hostname exactly - prevents subdomain attacks
                return (
                    parsedUrl.protocol === allowedUrl.protocol &&
                    parsedUrl.hostname === allowedUrl.hostname
                );
            } catch {
                return false;
            }
        });

        if (!isAllowed) {
            logger.warn({ url, allowedDomains }, "Blocked unauthorized domain");
            return false;
        }

        return true;
    } catch {
        logger.warn({ url }, "Failed to parse URL");
        return false;
    }
}

// Valid image content types for fetched images
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Fetch image from URL and convert to base64
 * This ensures Anthropic can access the image even if it's behind auth
 * Includes SSRF protection via URL validation and content-type verification
 */
async function fetchImageAsBase64(
    url: string
): Promise<{ base64: string; mediaType: string } | null> {
    // Validate URL before fetching (SSRF protection)
    if (!isAllowedImageUrl(url)) {
        return null;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            logger.warn({ url, status: response.status }, "Failed to fetch image");
            return null;
        }

        // Validate content-type is an allowed image type
        const contentType = response.headers.get("content-type");
        if (
            !contentType ||
            !VALID_IMAGE_TYPES.some((type) => contentType.startsWith(type))
        ) {
            logger.warn(
                { url, contentType, validTypes: VALID_IMAGE_TYPES },
                "Rejected non-image content type"
            );
            return null;
        }

        const buffer = await response.arrayBuffer();

        // Validate image size to prevent memory exhaustion
        if (buffer.byteLength > MAX_IMAGE_SIZE) {
            logger.warn(
                { url, size: buffer.byteLength, maxSize: MAX_IMAGE_SIZE },
                "Image too large"
            );
            return null;
        }

        const base64 = Buffer.from(buffer).toString("base64");

        return { base64, mediaType: contentType };
    } catch (error) {
        logger.error({ error, url }, "Error fetching image for base64 conversion");
        return null;
    }
}

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        const supabase = await createClient();

        // Check authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse and validate request body with Zod
        let body: ChatRequest;
        try {
            const rawBody = await request.json();
            body = ChatRequestSchema.parse(rawBody);
        } catch (parseError) {
            if (parseError instanceof z.ZodError) {
                const firstError = parseError.issues[0];
                logger.warn({ issues: parseError.issues }, "Request validation failed");
                return NextResponse.json(
                    { error: firstError?.message || "Invalid request" },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 }
            );
        }

        const { pageId, message, currentHtml, conversationHistory, imageAttachments } =
            body;

        // Fetch the page and verify ownership
        const { data: page, error: pageError } = await supabase
            .from("ai_editor_pages")
            .select("*")
            .eq("id", pageId)
            .single();

        if (pageError || !page) {
            logger.error({ error: pageError, pageId }, "Page not found");
            return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }

        // Verify ownership through the user_id on the page itself
        if (page.user_id !== user.id) {
            return NextResponse.json(
                { error: "You don't have access to this page" },
                { status: 403 }
            );
        }

        // Get project name for context (optional - don't fail if not found)
        let projectName = "Your Project";
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("name")
            .eq("id", page.funnel_project_id)
            .single();

        if (project?.name) {
            projectName = project.name;
        }

        logger.info(
            {
                userId: user.id,
                pageId,
                messageLength: message.length,
                pageType: page.page_type,
                imageCount: imageAttachments.length,
            },
            "Processing AI edit request"
        );

        // Convert image URLs to base64 for safe Anthropic API access (parallel processing)
        const processedAttachments: ProcessedImageAttachment[] = await Promise.all(
            imageAttachments.map(async (attachment) => {
                const imageData = await fetchImageAsBase64(attachment.url);
                if (imageData) {
                    return {
                        ...attachment,
                        base64: imageData.base64,
                        mediaType: imageData.mediaType,
                    };
                }
                // Fall back to URL if base64 conversion fails
                return attachment;
            })
        );

        // Process the edit request with detailed error handling
        let result;
        try {
            const editOptions: EditRequestOptions = {
                pageId,
                pageType: page.page_type,
                userMessage: message,
                currentHtml,
                conversationHistory,
                projectName,
                imageAttachments: processedAttachments,
            };

            logger.info(
                {
                    editOptions: {
                        ...editOptions,
                        currentHtml: `[${currentHtml?.length || 0} chars]`,
                    },
                },
                "Calling processEditRequest"
            );

            result = await processEditRequest(editOptions);

            logger.info(
                {
                    resultKeys: Object.keys(result || {}),
                    editsApplied: result?.editsApplied,
                },
                "processEditRequest completed"
            );
        } catch (processingError) {
            logger.error(
                {
                    error: processingError,
                    errorMessage:
                        processingError instanceof Error
                            ? processingError.message
                            : "Unknown",
                    pageId,
                    pageType: page.page_type,
                },
                "processEditRequest failed"
            );

            Sentry.captureException(processingError, {
                tags: {
                    component: "api",
                    action: "process_edit_request",
                    endpoint: "POST /api/ai-editor/chat",
                },
                extra: {
                    pageId,
                    pageType: page.page_type,
                    messageLength: message.length,
                },
            });

            throw processingError;
        }

        // Update the page with new HTML if edits were made
        if (result.updatedHtml !== currentHtml) {
            const newVersion = (page.version || 1) + 1;

            // Update the page
            const { error: updateError } = await supabase
                .from("ai_editor_pages")
                .update({
                    html_content: result.updatedHtml,
                    version: newVersion,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", pageId);

            if (updateError) {
                logger.error({ error: updateError }, "Failed to update page");
            }

            // Create version record
            const { error: versionError } = await supabase
                .from("ai_editor_versions")
                .insert({
                    page_id: pageId,
                    version: newVersion,
                    html_content: result.updatedHtml,
                    change_description: message.substring(0, 200),
                });

            if (versionError) {
                logger.warn({ error: versionError }, "Failed to create version record");
            }
        }

        // Update conversation history
        const newMessages = [
            { role: "user", content: message },
            { role: "assistant", content: result.explanation },
        ];

        // Get current conversation to increment total_edits
        const { data: currentConv } = await supabase
            .from("ai_editor_conversations")
            .select("total_edits")
            .eq("page_id", pageId)
            .single();

        const { error: convError } = await supabase
            .from("ai_editor_conversations")
            .update({
                messages: [...conversationHistory, ...newMessages],
                total_edits:
                    ((currentConv?.total_edits || 0) as number) + result.editsApplied,
                updated_at: new Date().toISOString(),
            })
            .eq("page_id", pageId);

        if (convError) {
            logger.warn({ error: convError }, "Failed to update conversation");
        }

        const totalTime = (Date.now() - startTime) / 1000;

        logger.info(
            {
                userId: user.id,
                pageId,
                editsApplied: result.editsApplied,
                totalTime,
                processingTime: result.processingTime,
            },
            "AI edit request completed"
        );

        return NextResponse.json({
            success: true,
            response: result.explanation,
            updatedHtml: result.updatedHtml,
            editsApplied: result.editsApplied,
            suggestions: result.suggestions,
            suggestedOptions: result.suggestedOptions,
            processingTime: result.processingTime,
            version: (page.version || 1) + (result.editsApplied > 0 ? 1 : 0),
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error(
            {
                error,
                errorMessage,
                errorStack,
                errorType: error?.constructor?.name,
            },
            "AI chat request failed"
        );

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "ai_chat_request",
                endpoint: "POST /api/ai-editor/chat",
            },
            extra: {
                errorType: error?.constructor?.name,
            },
        });

        return NextResponse.json(
            {
                error: "Edit request failed",
                details: errorMessage,
                type: error?.constructor?.name || "Unknown",
            },
            { status: 500 }
        );
    }
}
