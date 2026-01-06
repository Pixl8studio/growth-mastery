/**
 * Funnel Map Chat API
 * Handles AI conversations for refining funnel node content
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithAI, type AIMessage } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import type {
    FunnelNodeType,
    FunnelNodeDefinition,
    ConversationMessage,
} from "@/types/funnel-map";

interface ChatRequest {
    projectId: string;
    nodeType: FunnelNodeType;
    message: string;
    conversationHistory: ConversationMessage[];
    currentContent: Record<string, unknown>;
    definition: FunnelNodeDefinition;
}

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

        const body: ChatRequest = await request.json();
        const {
            projectId,
            nodeType,
            message,
            conversationHistory,
            currentContent,
            definition,
        } = body;

        if (!projectId || !nodeType || !message) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
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
        });

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
    nodeType: FunnelNodeType,
    conversationHistory: ConversationMessage[],
    suggestedChanges?: Record<string, unknown>
) {
    try {
        // Check if node data exists
        const { data: existingNode } = await supabase
            .from("funnel_node_data")
            .select("id, refined_content")
            .eq("funnel_project_id", projectId)
            .eq("node_type", nodeType)
            .single();

        if (existingNode) {
            // Update existing node
            const updateData: Record<string, unknown> = {
                conversation_history: conversationHistory,
                status: "in_progress",
            };

            if (suggestedChanges) {
                updateData.refined_content = {
                    ...(existingNode.refined_content as Record<string, unknown> || {}),
                    ...suggestedChanges,
                };
            }

            await supabase
                .from("funnel_node_data")
                .update(updateData)
                .eq("id", existingNode.id);
        } else {
            // Create new node
            await supabase.from("funnel_node_data").insert({
                funnel_project_id: projectId,
                user_id: userId,
                node_type: nodeType,
                conversation_history: conversationHistory,
                refined_content: suggestedChanges || {},
                status: "in_progress",
            });
        }
    } catch (error) {
        logger.error({ error, projectId, nodeType }, "Failed to save conversation");
        // Don't throw - conversation save is not critical
    }
}
