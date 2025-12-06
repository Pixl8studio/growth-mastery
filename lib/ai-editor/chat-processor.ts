/**
 * AI Chat Processor
 * Handles conversational page editing with Claude Sonnet 4
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import { loadPageFramework, PageType } from "./framework-loader";
import { applyEdits, parseEditsFromResponse, type Edit } from "./edit-applier";

const anthropic = new Anthropic();

export interface EditRequestOptions {
    pageId: string;
    pageType: PageType;
    userMessage: string;
    currentHtml: string;
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
    projectName: string;
}

export interface EditRequestResult {
    explanation: string;
    updatedHtml: string;
    editsApplied: number;
    suggestions: string[];
    processingTime: number;
}

/**
 * Process a conversational edit request
 */
export async function processEditRequest(
    options: EditRequestOptions
): Promise<EditRequestResult> {
    const {
        pageId,
        pageType,
        userMessage,
        currentHtml,
        conversationHistory,
        projectName,
    } = options;

    const startTime = Date.now();

    logger.info(
        { pageId, pageType, messagePreview: userMessage.substring(0, 50) },
        "Processing edit request"
    );

    // Load the framework for context
    const framework = await loadPageFramework(pageType);

    // Build the system prompt for editing
    const systemPrompt = buildEditSystemPrompt(pageType, framework);

    // Build the messages array
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    for (const msg of conversationHistory) {
        messages.push({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
        });
    }

    // Add current state and user request
    messages.push({
        role: "user",
        content: buildEditUserMessage(userMessage, currentHtml, projectName),
    });

    try {
        logger.info(
            { pageId, messagesCount: messages.length },
            "Calling Anthropic API"
        );

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8000,
            system: systemPrompt,
            messages,
        });

        logger.info(
            { pageId, contentLength: response.content?.length },
            "Anthropic API response received"
        );

        const content = response.content[0];
        if (!content || content.type !== "text") {
            logger.error(
                { contentType: content?.type },
                "Unexpected response type from Claude"
            );
            throw new Error("Unexpected response type from Claude");
        }

        const responseText = content.text;

        if (!responseText || typeof responseText !== "string") {
            logger.error(
                { responseTextType: typeof responseText },
                "Invalid response text from Claude"
            );
            throw new Error("Invalid response text from Claude");
        }

        logger.info(
            { pageId, responseLength: responseText.length },
            "Parsing edits from response"
        );

        // Parse the response for edits and explanation
        const { edits, explanation } = parseEditsFromResponse(responseText);

        // If no structured edits found, check if the response contains updated HTML
        // Ensure currentHtml is a valid string before using it
        const safeCurrentHtml =
            currentHtml && typeof currentHtml === "string" ? currentHtml : "";
        let updatedHtml = safeCurrentHtml;
        let editsApplied = 0;

        logger.info(
            { editsCount: edits.length, currentHtmlLength: safeCurrentHtml.length },
            "Processing edits"
        );

        if (edits.length > 0) {
            // Apply structured edits
            try {
                const editResult = applyEdits(safeCurrentHtml, edits);
                updatedHtml = editResult.updatedHtml;
                editsApplied = editResult.appliedEdits;

                if (editResult.failedEdits.length > 0) {
                    logger.warn(
                        { failedEdits: editResult.failedEdits },
                        "Some edits failed to apply"
                    );
                }
            } catch (applyError) {
                logger.error({ error: applyError }, "Error applying edits");
                // Fall through to try HTML extraction
            }
        }

        // If no edits were applied, check if the AI returned complete HTML
        if (editsApplied === 0) {
            const htmlMatch = responseText.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
            if (htmlMatch) {
                updatedHtml = htmlMatch[0];
                editsApplied = 1; // Full page replacement counts as one edit
                logger.info(
                    { newHtmlLength: updatedHtml.length },
                    "Extracted complete HTML from response"
                );
            }
        }

        // Extract suggestions from the response
        const suggestions = extractSuggestions(responseText);

        const processingTime = (Date.now() - startTime) / 1000;

        logger.info(
            {
                pageId,
                editsApplied,
                processingTime,
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
            },
            "Edit request processed"
        );

        return {
            explanation:
                explanation ||
                "I've processed your request. The page has been updated accordingly.",
            updatedHtml,
            editsApplied,
            suggestions,
            processingTime,
        };
    } catch (error) {
        logger.error({ error, pageId }, "Claude API error during edit");
        throw error;
    }
}

/**
 * Build the system prompt for editing
 */
function buildEditSystemPrompt(
    pageType: PageType,
    framework: string | null | undefined
): string {
    // Safely handle framework - it should be a string but add defensive check
    const frameworkPreview =
        framework && typeof framework === "string"
            ? framework.substring(0, 5000)
            : "Framework not available";

    return `You are an expert landing page designer helping users edit their ${pageType} page through conversation.

## Your Role

1. UNDERSTAND the user's request thoroughly
2. EXPLAIN what changes you'll make and why
3. PROVIDE specific edits in a structured format
4. SUGGEST related improvements they might want

## Framework Reference

${frameworkPreview}...

## Edit Response Format

When making edits, respond with:

1. A brief, friendly explanation of what you're changing
2. The specific edits in this JSON format:

\`\`\`json
[
  {
    "type": "text|style|structure|attribute",
    "selector": "description of what's being changed",
    "action": "replace|append|prepend|remove|modify",
    "oldValue": "exact text/code to find",
    "newValue": "replacement text/code"
  }
]
\`\`\`

3. Any suggestions for additional improvements

## Edit Types

- **text**: Changes to visible text content
- **style**: Changes to colors, fonts, spacing, etc.
- **structure**: Adding/removing/reorganizing HTML sections
- **attribute**: Changes to element attributes (src, href, etc.)

## Important Rules

1. Be PRECISE with oldValue - it must match exactly what's in the current HTML
2. Make minimal changes to achieve the goal
3. Preserve the overall design aesthetic
4. Maintain responsive design
5. Keep accessibility features intact
6. For complex changes, return complete updated HTML sections
7. Always explain your changes in user-friendly terms

## Conversational Style

- Be helpful and encouraging
- Explain design decisions briefly
- Offer relevant suggestions
- Confirm what was changed`;
}

/**
 * Build the user message with current context
 */
function buildEditUserMessage(
    userMessage: string | null | undefined,
    currentHtml: string | null | undefined,
    projectName: string | null | undefined
): string {
    // Defensive checks
    const safeMessage =
        userMessage && typeof userMessage === "string" ? userMessage : "";
    const safeHtml = currentHtml && typeof currentHtml === "string" ? currentHtml : "";
    const safeProjectName =
        projectName && typeof projectName === "string" ? projectName : "Your Project";

    // Truncate HTML if too long to fit in context
    const maxHtmlLength = 30000;
    const truncatedHtml =
        safeHtml.length > maxHtmlLength
            ? safeHtml.substring(0, maxHtmlLength) + "\n<!-- ... HTML truncated ... -->"
            : safeHtml;

    return `## Current Page

Project: ${safeProjectName}

\`\`\`html
${truncatedHtml}
\`\`\`

## User Request

${safeMessage}

Please analyze the current HTML and make the requested changes. Provide your response with:
1. A brief explanation
2. Structured edits in JSON format
3. Any helpful suggestions`;
}

/**
 * Extract suggestions from the AI response
 */
function extractSuggestions(response: string | null | undefined): string[] {
    // Defensive check - ensure response is a valid string
    if (!response || typeof response !== "string") {
        return [];
    }

    const suggestions: string[] = [];

    // Look for suggestion patterns
    // Note: All patterns must have the 'g' flag for matchAll to work
    const suggestionPatterns = [
        /(?:suggestion|recommend|consider|you might|you could|try):\s*(.+?)(?:\.|$)/gi,
        /(?:💡|🎯|✨)\s*(.+?)(?:\.|$)/gi,
        /(?:##?\s*suggestions?\s*\n)([\s\S]*?)(?:\n##|\n```|$)/gi,
    ];

    try {
        for (const pattern of suggestionPatterns) {
            const matches = response.matchAll(pattern);
            for (const match of matches) {
                const suggestion = match[1]?.trim();
                if (suggestion && suggestion.length > 10 && suggestion.length < 200) {
                    suggestions.push(suggestion);
                }
            }
        }
    } catch (error) {
        logger.warn({ error }, "Failed to extract suggestions from response");
    }

    // Deduplicate and limit to 3 suggestions
    return [...new Set(suggestions)].slice(0, 3);
}

/**
 * Quick edit presets for common operations
 */
export const QUICK_EDIT_PRESETS = {
    makeMorePersuasive:
        "Make the copy more persuasive and compelling while keeping the same structure",
    addUrgency:
        "Add urgency elements like countdown timers, limited availability, or deadline messaging",
    improveCTA: "Make the call-to-action buttons more prominent and compelling",
    addTestimonials: "Add a testimonials section with placeholder quotes and names",
    changeColorScheme: "Suggest a more modern and professional color scheme",
    improveHero:
        "Make the hero section more impactful with better headline and subheadline",
    addSocialProof: "Add social proof elements like logos, stats, or trust badges",
    mobileOptimize: "Review and improve the mobile responsiveness",
};

export type QuickEditType = keyof typeof QUICK_EDIT_PRESETS;

/**
 * Get a preset edit message
 */
export function getQuickEditMessage(preset: QuickEditType): string {
    return QUICK_EDIT_PRESETS[preset];
}
