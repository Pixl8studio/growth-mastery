/**
 * AI Chat Processor
 * Handles conversational page editing with Claude Sonnet 4
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import { loadPageFramework, PageType } from "./framework-loader";
import { applyEdits, parseEditsFromResponse, type Edit as _Edit } from "./edit-applier";

const anthropic = new Anthropic();

export interface ImageAttachment {
    id: string;
    url: string;
    base64?: string;
    mediaType?: string;
}

export interface SuggestedOption {
    id: string;
    label: string;
    description?: string;
}

export interface EditRequestOptions {
    pageId: string;
    pageType: PageType;
    userMessage: string;
    currentHtml: string;
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
    projectName: string;
    imageAttachments?: ImageAttachment[];
}

export interface EditRequestResult {
    explanation: string;
    updatedHtml: string;
    editsApplied: number;
    suggestions: string[];
    suggestedOptions?: SuggestedOption[];
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
        imageAttachments = [],
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

    // Add current state and user request (with optional images)
    messages.push({
        role: "user",
        content: buildEditUserMessageContent(
            userMessage,
            currentHtml,
            projectName,
            imageAttachments
        ),
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

        // Extract suggestions and options from the response
        const suggestions = extractSuggestions(responseText);
        const suggestedOptions = extractSuggestedOptions(responseText);

        const processingTime = (Date.now() - startTime) / 1000;

        logger.info(
            {
                pageId,
                editsApplied,
                processingTime,
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
                hasOptions: suggestedOptions.length > 0,
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
            suggestedOptions:
                suggestedOptions.length > 0 ? suggestedOptions : undefined,
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
2. If the request is AMBIGUOUS or could be interpreted multiple ways, ASK a clarifying question with OPTIONS
3. EXPLAIN what changes you'll make and why
4. PROVIDE specific edits in a structured format
5. SUGGEST related improvements they might want

## Framework Reference

${frameworkPreview}...

## When to Ask Clarifying Questions

When the user's request could be interpreted multiple ways, ALWAYS ask a clarifying question with options instead of guessing. Include clickable options for the user to choose from.

Format your clarifying questions like this:

\`\`\`options
[
  {"id": "option-1", "label": "Option A label", "description": "Brief description of what this does"},
  {"id": "option-2", "label": "Option B label", "description": "Brief description of what this does"},
  {"id": "option-3", "label": "Option C label", "description": "Brief description of what this does"}
]
\`\`\`

Examples of when to ask clarifying questions:
- "Make it pop more" → Ask: What aspect? Colors? Typography? Layout? Animation?
- "Add a section" → Ask: What type? Testimonials? Features? FAQ? Pricing?
- "Change the style" → Ask: Which element? Header? Buttons? Overall theme?
- "Make it better" → Ask: Better how? More professional? More energetic? More minimal?

## Handling Image Uploads

When the user uploads an image, analyze it and suggest where it could be placed on the page. Offer options like:
- Replace hero background
- Add as a testimonial photo
- Use in the about section
- Add as a product image

Format your image placement options the same way as other options.

## Edit Response Format

When making edits (after any clarifications), respond with:

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
8. When in doubt about user intent, ASK with options rather than guess

## Conversational Style

- Be helpful and encouraging
- Explain design decisions briefly
- When requests are ambiguous, ask clarifying questions with clickable options
- Offer relevant suggestions
- Confirm what was changed`;
}

/**
 * Build the user message with current context (simple string version)
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

Please analyze the current HTML and make the requested changes. If the request is ambiguous, ask a clarifying question with options. Provide your response with:
1. A brief explanation (or clarifying question with options if needed)
2. Structured edits in JSON format (if making changes)
3. Any helpful suggestions`;
}

/**
 * Build the user message content with optional images (for Claude vision API)
 */
function buildEditUserMessageContent(
    userMessage: string | null | undefined,
    currentHtml: string | null | undefined,
    projectName: string | null | undefined,
    imageAttachments: ImageAttachment[]
): Anthropic.MessageCreateParams["messages"][0]["content"] {
    const textContent = buildEditUserMessage(userMessage, currentHtml, projectName);

    // If no images, return simple string
    if (!imageAttachments || imageAttachments.length === 0) {
        return textContent;
    }

    // Build content blocks for vision API
    const contentBlocks: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    // Add image content blocks first - prefer base64 over URL for reliability
    for (const image of imageAttachments) {
        if (image.base64 && image.mediaType) {
            // Use base64 encoding for better reliability (works even if URL requires auth)
            (contentBlocks as Anthropic.ContentBlockParam[]).push({
                type: "image",
                source: {
                    type: "base64",
                    media_type: image.mediaType as
                        | "image/jpeg"
                        | "image/png"
                        | "image/gif"
                        | "image/webp",
                    data: image.base64,
                },
            });
        } else {
            // Fall back to URL
            (contentBlocks as Anthropic.ContentBlockParam[]).push({
                type: "image",
                source: {
                    type: "url",
                    url: image.url,
                },
            });
        }
    }

    // Add text content
    (contentBlocks as Anthropic.ContentBlockParam[]).push({
        type: "text",
        text:
            textContent +
            `\n\n## Uploaded Image${imageAttachments.length > 1 ? "s" : ""}\n\nThe user has uploaded ${imageAttachments.length} image${imageAttachments.length > 1 ? "s" : ""}. Please analyze the image${imageAttachments.length > 1 ? "s" : ""} and suggest where ${imageAttachments.length > 1 ? "they" : "it"} could be placed on the page. Provide placement options using the \`\`\`options format.`,
    });

    return contentBlocks;
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
 * Extract suggested options from the AI response (for clarifying questions)
 */
function extractSuggestedOptions(
    response: string | null | undefined
): SuggestedOption[] {
    if (!response || typeof response !== "string") {
        return [];
    }

    const options: SuggestedOption[] = [];

    try {
        // Look for options in code block format
        const optionsMatch = response.match(/```options\s*([\s\S]*?)```/i);
        if (optionsMatch) {
            const optionsJson = optionsMatch[1].trim();
            const parsedOptions = JSON.parse(optionsJson);

            if (Array.isArray(parsedOptions)) {
                for (const opt of parsedOptions) {
                    if (opt.id && opt.label) {
                        options.push({
                            id: opt.id,
                            label: opt.label,
                            description: opt.description,
                        });
                    }
                }
            }
        }
    } catch (error) {
        logger.warn({ error }, "Failed to parse options from response");
    }

    // Limit to 5 options
    return options.slice(0, 5);
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
