/**
 * AI Editor - Chat Endpoint
 * POST /api/ai-editor/chat
 * Handles conversational edits to landing pages using Claude Sonnet 4
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    processEditRequest,
    type EditRequestOptions,
} from "@/lib/ai-editor/chat-processor";
import { sanitizeUserContent } from "@/lib/ai/sanitize";
import { checkHtmlSize, DEFAULT_MAX_HTML_SIZE } from "@/lib/validation/html";
import {
    checkRateLimitWithInfo,
    getRateLimitIdentifier,
    addRateLimitHeaders,
    type RateLimitResult,
} from "@/lib/middleware/rate-limit";

/** Error codes for standardized error responses */
const ErrorCode = {
    AUTH_REQUIRED: "AUTH_REQUIRED",
    RATE_LIMITED: "RATE_LIMITED",
    INVALID_REQUEST: "INVALID_REQUEST",
    CONTENT_TOO_LARGE: "CONTENT_TOO_LARGE",
    PAGE_NOT_FOUND: "PAGE_NOT_FOUND",
    ACCESS_DENIED: "ACCESS_DENIED",
    PROCESSING_ERROR: "PROCESSING_ERROR",
    INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

interface ImageAttachment {
    id: string;
    url: string;
    base64?: string;
    mediaType?: string;
}

/** Maximum image size for base64 conversion (5MB) */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Timeout for image fetch operations (10 seconds) */
const IMAGE_FETCH_TIMEOUT_MS = 10000;

/**
 * Fetch image from URL and convert to base64
 * This ensures Anthropic can access the image even if it's behind auth
 *
 * Security measures:
 * - Size validation to prevent memory exhaustion attacks
 * - Timeout to prevent blocking on slow/hanging servers
 */
async function fetchImageAsBase64(
    url: string
): Promise<{ base64: string; mediaType: string } | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            logger.warn({ url, status: response.status }, "Failed to fetch image");
            return null;
        }

        // Check content length before downloading to prevent memory exhaustion
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
            logger.warn(
                { url, size: contentLength, maxSize: MAX_IMAGE_SIZE },
                "Image too large for processing"
            );
            return null;
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const buffer = await response.arrayBuffer();

        // Double-check actual size after download (content-length may be missing/wrong)
        if (buffer.byteLength > MAX_IMAGE_SIZE) {
            logger.warn(
                { url, actualSize: buffer.byteLength, maxSize: MAX_IMAGE_SIZE },
                "Image exceeded size limit after download"
            );
            return null;
        }

        const base64 = Buffer.from(buffer).toString("base64");

        return { base64, mediaType: contentType };
    } catch (error) {
        // Handle abort (timeout) vs other errors
        if (error instanceof Error && error.name === "AbortError") {
            logger.warn(
                { url, timeout: IMAGE_FETCH_TIMEOUT_MS },
                "Image fetch timed out"
            );
        } else {
            logger.error({ error, url }, "Error fetching image for base64 conversion");
        }
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

interface ChatRequest {
    pageId: string;
    message: string;
    currentHtml: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    imageAttachments?: ImageAttachment[];
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let rateLimitInfo: RateLimitResult["info"] = null;

    try {
        const supabase = await createClient();

        // Check authentication
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized", code: ErrorCode.AUTH_REQUIRED },
                { status: 401 }
            );
        }

        // Check rate limit
        const rateLimitResult = await checkRateLimitWithInfo(
            getRateLimitIdentifier(request, user.id),
            "ai-editor-chat"
        );
        rateLimitInfo = rateLimitResult.info;
        if (rateLimitResult.blocked) {
            return rateLimitResult.response!;
        }

        // Parse request body
        const body: ChatRequest = await request.json();
        const {
            pageId,
            message,
            currentHtml,
            conversationHistory = [],
            imageAttachments = [],
        } = body;

        // Validate inputs
        if (!pageId || !message) {
            return NextResponse.json(
                {
                    error: "pageId and message are required",
                    code: ErrorCode.INVALID_REQUEST,
                },
                { status: 400 }
            );
        }

        if (!currentHtml) {
            return NextResponse.json(
                {
                    error: "currentHtml is required",
                    code: ErrorCode.INVALID_REQUEST,
                },
                { status: 400 }
            );
        }

        // Validate HTML content size to prevent performance issues
        const htmlSizeCheck = checkHtmlSize(currentHtml);
        if (!htmlSizeCheck.valid) {
            logger.warn(
                { size: htmlSizeCheck.size, maxSize: htmlSizeCheck.maxSize },
                "HTML content too large"
            );
            return NextResponse.json(
                {
                    error: "HTML content is too large",
                    code: ErrorCode.CONTENT_TOO_LARGE,
                    details: `Maximum size is ${DEFAULT_MAX_HTML_SIZE / 1024 / 1024}MB`,
                },
                { status: 400 }
            );
        }

        // Sanitize user message to prevent prompt injection
        const sanitizedMessage = sanitizeUserContent(message);

        // Validate image URLs - only allow our storage URLs or data URLs
        // Use exact hostname check to prevent SSRF via lookalike domains
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const allowedOrigin = supabaseUrl ? new URL(supabaseUrl).origin : null;

        const validatedAttachments = imageAttachments.filter((attachment) => {
            // Allow data URLs directly
            if (attachment.url.startsWith("data:image/")) {
                return true;
            }

            try {
                const url = new URL(attachment.url);
                // Strict origin check - only allow exact Supabase project origin
                if (allowedOrigin && url.origin === allowedOrigin) {
                    return true;
                }
                logger.warn(
                    { url: attachment.url, allowedOrigin },
                    "Rejected image URL: origin mismatch"
                );
                return false;
            } catch {
                // Invalid URL format
                logger.warn(
                    { url: attachment.url },
                    "Rejected image URL: invalid format"
                );
                return false;
            }
        });

        // Fetch the page and verify ownership
        const { data: page, error: pageError } = await supabase
            .from("ai_editor_pages")
            .select("*")
            .eq("id", pageId)
            .single();

        if (pageError || !page) {
            logger.error({ error: pageError, pageId }, "Page not found");
            return NextResponse.json(
                { error: "Page not found", code: ErrorCode.PAGE_NOT_FOUND },
                { status: 404 }
            );
        }

        // Verify ownership through the user_id on the page itself
        if (page.user_id !== user.id) {
            return NextResponse.json(
                {
                    error: "You don't have access to this page",
                    code: ErrorCode.ACCESS_DENIED,
                },
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
                messageLength: sanitizedMessage.length,
                pageType: page.page_type,
                imageCount: validatedAttachments.length,
            },
            "Processing AI edit request"
        );

        // Convert image URLs to base64 for safe Anthropic API access
        const processedAttachments: ImageAttachment[] = [];
        for (const attachment of validatedAttachments) {
            const imageData = await fetchImageAsBase64(attachment.url);
            if (imageData) {
                processedAttachments.push({
                    ...attachment,
                    base64: imageData.base64,
                    mediaType: imageData.mediaType,
                });
            } else {
                // Fall back to URL if base64 conversion fails
                processedAttachments.push(attachment);
            }
        }

        // Process the edit request with detailed error handling
        let result;
        try {
            const editOptions: EditRequestOptions = {
                pageId,
                pageType: page.page_type,
                userMessage: sanitizedMessage,
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
                    messageLength: sanitizedMessage.length,
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
            // PR #414: Store AI explanation for better audit trails
            // Format: "User: [request] | AI: [explanation]" (truncated to 500 chars)
            const userRequest = message.substring(0, 150);
            const aiExplanation =
                result.explanation?.substring(0, 300) || "Changes applied";
            const changeDescription = `User: ${userRequest}${message.length > 150 ? "..." : ""} | AI: ${aiExplanation}${(result.explanation?.length || 0) > 300 ? "..." : ""}`;

            const { error: versionError } = await supabase
                .from("ai_editor_versions")
                .insert({
                    page_id: pageId,
                    version: newVersion,
                    html_content: result.updatedHtml,
                    change_description: changeDescription.substring(0, 500),
                });

            if (versionError) {
                logger.warn({ error: versionError }, "Failed to create version record");
            }
        }

        // Update conversation history
        const newMessages = [
            { role: "user", content: sanitizedMessage },
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

        const response = NextResponse.json({
            success: true,
            response: result.explanation,
            updatedHtml: result.updatedHtml,
            editsApplied: result.editsApplied,
            suggestions: result.suggestions,
            suggestedOptions: result.suggestedOptions,
            processingTime: result.processingTime,
            version: (page.version || 1) + (result.editsApplied > 0 ? 1 : 0),
        });

        return addRateLimitHeaders(response, rateLimitInfo);
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
                code: ErrorCode.PROCESSING_ERROR,
                details: errorMessage,
                type: error?.constructor?.name || "Unknown",
            },
            { status: 500 }
        );
    }
}
