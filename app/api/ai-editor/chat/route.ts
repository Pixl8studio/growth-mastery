/**
 * AI Editor - Chat Endpoint
 * POST /api/ai-editor/chat
 * Handles conversational edits to landing pages using Claude Sonnet 4
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    processEditRequest,
    type EditRequestOptions,
} from "@/lib/ai-editor/chat-processor";

interface ImageAttachment {
    id: string;
    url: string;
}

interface ChatRequest {
    pageId: string;
    message: string;
    currentHtml: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    imageAttachments?: ImageAttachment[];
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
                { error: "pageId and message are required" },
                { status: 400 }
            );
        }

        if (!currentHtml) {
            return NextResponse.json(
                { error: "currentHtml is required" },
                { status: 400 }
            );
        }

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
            },
            "Processing AI edit request"
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
                imageAttachments,
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
