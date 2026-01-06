/**
 * Funnel Map Chat API
 * Handles AI conversations for refining funnel node content
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithAI, type AIMessage } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import type { FunnelNodeDefinition } from "@/types/funnel-map";

// ============================================
// REQUEST VALIDATION SCHEMA
// ============================================

const FunnelNodeTypeSchema = z.enum([
    "traffic_source",
    "registration",
    "masterclass",
    "core_offer",
    "checkout",
    "upsells",
    "call_booking",
    "sales_call",
    "thank_you",
]);

const ConversationMessageSchema = z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    timestamp: z.string(),
    suggestedChanges: z.record(z.string(), z.unknown()).optional(),
});

const FunnelNodeFieldSchema = z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(["text", "textarea", "list", "pricing"]),
    required: z.boolean().optional(),
    aiPrompt: z.string().optional(),
});

const FunnelNodeDefinitionSchema = z.object({
    id: FunnelNodeTypeSchema,
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    color: z.string(),
    pathways: z.array(z.enum(["direct_purchase", "book_call"])),
    framework: z.string().optional(),
    fields: z.array(FunnelNodeFieldSchema),
});

const ChatRequestSchema = z.object({
    projectId: z.string().uuid("Invalid project ID format"),
    nodeType: FunnelNodeTypeSchema,
    message: z.string().min(1, "Message is required").max(10000, "Message too long"),
    conversationHistory: z.array(ConversationMessageSchema).max(100, "Conversation history too long"),
    currentContent: z.record(z.string(), z.unknown()),
    definition: FunnelNodeDefinitionSchema,
});

interface ChatResponse {
    message: string;
    suggestedChanges?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ route: "funnel-map-chat" });

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Validate request body with Zod
        const parseResult = ChatRequestSchema.safeParse(await request.json());
        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid request",
                    details: parseResult.error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                },
                { status: 400 }
            );
        }

        const {
            projectId,
            nodeType,
            message,
            conversationHistory,
            currentContent,
            definition,
        } = parseResult.data;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("user_id")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.user_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        requestLogger.info(
            { projectId, nodeType, messageLength: message.length },
            "Processing funnel map chat request"
        );

        // Build conversation for AI
        const systemPrompt = buildSystemPrompt(definition, currentContent);
        const messages: AIMessage[] = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
            })),
            { role: "user", content: message },
        ];

        // Generate AI response
        const result = await generateWithAI<ChatResponse>(messages, {
            temperature: 0.7,
            maxTokens: 2000,
        });

        requestLogger.info(
            {
                projectId,
                nodeType,
                hasChanges: !!result.suggestedChanges,
            },
            "AI chat response generated"
        );

        // Save updated conversation and content to database
        await saveConversationToDatabase(
            supabase,
            user.id,
            projectId,
            nodeType,
            [...conversationHistory, {
                id: crypto.randomUUID(),
                role: "user",
                content: message,
                timestamp: new Date().toISOString(),
            }],
            result.suggestedChanges
        );

        return NextResponse.json(result);
    } catch (error) {
        requestLogger.error({ error }, "Funnel map chat failed");

        Sentry.captureException(error, {
            tags: { route: "funnel-map-chat" },
            extra: {
                // Note: These might not be available if error occurred before parsing
                errorType: error instanceof z.ZodError ? "validation" : "runtime",
            },
        });

        // Handle Zod validation errors specifically
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: "Invalid request",
                    details: error.issues.map((issue) => ({
                        field: issue.path.join("."),
                        message: issue.message,
                    })),
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to process chat request" },
            { status: 500 }
        );
    }
}

function buildSystemPrompt(
    definition: FunnelNodeDefinition,
    currentContent: Record<string, unknown>
): string {
    const fieldDescriptions = definition.fields
        .map((f) => `- ${f.label} (${f.key}): ${f.type}`)
        .join("\n");

    const currentContentStr =
        Object.keys(currentContent).length > 0
            ? `Current content:\n${JSON.stringify(currentContent, null, 2)}`
            : "No content has been generated yet.";

    return `You are an expert marketing strategist and copywriter helping to refine content for a "${definition.title}" in a webinar funnel.

## Your Role
Help the user refine and improve their funnel content through natural conversation. You understand:
- The "${definition.title}" is: ${definition.description}
${definition.framework ? `- Framework: ${definition.framework}` : ""}

## Available Fields to Update
${fieldDescriptions}

## Current Content
${currentContentStr}

## Response Format
You MUST respond with valid JSON in this exact format:
{
  "message": "Your conversational response to the user",
  "suggestedChanges": {
    "field_key": "new value or updated content"
  }
}

## Guidelines
1. Be helpful, friendly, and expert in your tone
2. When the user asks to improve content, provide specific suggestions
3. Include "suggestedChanges" ONLY when you have concrete updates to propose
4. Keep responses concise but impactful
5. Reference the 7 P's Framework or Perfect Webinar Framework when relevant
6. Focus on conversion-optimized, emotionally compelling copy
7. Always maintain the user's authentic voice and brand

## Important
- Only include fields that are being changed in suggestedChanges
- For list fields (bullet_points, content_pillars, etc.), provide the full updated array
- If just chatting or answering questions, omit suggestedChanges entirely`;
}

async function saveConversationToDatabase(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    projectId: string,
    nodeType: z.infer<typeof FunnelNodeTypeSchema>,
    conversationHistory: z.infer<typeof ConversationMessageSchema>[],
    suggestedChanges?: Record<string, unknown>
) {
    try {
        // First, get existing refined_content if we need to merge changes
        let existingRefinedContent: Record<string, unknown> = {};

        if (suggestedChanges) {
            const { data: existingNode } = await supabase
                .from("funnel_node_data")
                .select("refined_content")
                .eq("funnel_project_id", projectId)
                .eq("node_type", nodeType)
                .single();

            if (existingNode?.refined_content) {
                existingRefinedContent = existingNode.refined_content as Record<string, unknown>;
            }
        }

        // Use upsert to handle race conditions - relies on unique index (funnel_project_id, node_type)
        const { error } = await supabase.from("funnel_node_data").upsert(
            {
                funnel_project_id: projectId,
                user_id: userId,
                node_type: nodeType,
                conversation_history: conversationHistory,
                refined_content: suggestedChanges
                    ? { ...existingRefinedContent, ...suggestedChanges }
                    : existingRefinedContent,
                status: "in_progress",
            },
            {
                onConflict: "funnel_project_id,node_type",
                ignoreDuplicates: false,
            }
        );

        if (error) {
            throw error;
        }
    } catch (error) {
        logger.error({ error, projectId, nodeType }, "Failed to save conversation");
        // Don't throw - conversation save is not critical
    }
}
