/**
 * AI Page Generator
 * Core generation logic using Claude Sonnet 4
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import { loadPageFramework, PageType } from "./framework-loader";
import {
    aggregateFunnelContext,
    formatContextForPrompt,
    BusinessContext,
} from "./context-aggregator";

const anthropic = new Anthropic();

export interface GeneratePageOptions {
    projectId: string;
    pageType: PageType;
    customPrompt?: string;
}

export interface GeneratePageResult {
    html: string;
    title: string;
    generationTime: number;
    sectionsGenerated: string[];
}

/**
 * Generate a complete landing page using Claude Sonnet 4
 */
export async function generatePage(
    options: GeneratePageOptions
): Promise<GeneratePageResult> {
    const { projectId, pageType, customPrompt } = options;
    const startTime = Date.now();

    logger.info({ projectId, pageType }, "Starting page generation with Claude");

    // Load the framework for this page type
    const framework = await loadPageFramework(pageType);

    // Aggregate context from the funnel project
    const context = await aggregateFunnelContext(projectId);

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(pageType, framework);

    // Build the user prompt with context
    const userPrompt = buildUserPrompt(pageType, context, customPrompt);

    try {
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 16000,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: userPrompt,
                },
            ],
        });

        // Extract the HTML from the response
        const content = response.content[0];
        if (content.type !== "text") {
            throw new Error("Unexpected response type from Claude");
        }

        const { html, title, sections } = parseGeneratedContent(content.text, pageType);

        const generationTime = (Date.now() - startTime) / 1000;

        logger.info(
            {
                projectId,
                pageType,
                generationTime,
                sectionsCount: sections.length,
                htmlLength: html.length,
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
            },
            "Page generation completed"
        );

        return {
            html,
            title,
            generationTime,
            sectionsGenerated: sections,
        };
    } catch (error) {
        logger.error({ error, projectId, pageType }, "Claude API error");
        throw error;
    }
}

/**
 * Build the system prompt for page generation
 */
function buildSystemPrompt(pageType: PageType, framework: string): string {
    const pageTypeLabels: Record<PageType, string> = {
        registration: "Registration",
        watch: "Watch",
        enrollment: "Enrollment",
    };

    return `You are an expert landing page designer and developer. Your task is to generate a complete, production-ready ${pageTypeLabels[pageType]} page as a single HTML document.

## Output Requirements

1. Generate a COMPLETE, STANDALONE HTML document
2. Include ALL CSS embedded in a <style> tag in the <head>
3. Include necessary CDN links for fonts (Google Fonts) and icons (Font Awesome or Heroicons)
4. The page must be FULLY RESPONSIVE (mobile-first approach)
5. The page must be BEAUTIFUL and CONVERSION-OPTIMIZED
6. Use semantic HTML5 elements

## Framework Guidelines

Follow this framework for the page structure and content:

${framework}

## Technical Requirements

- Use modern CSS (flexbox, grid, CSS variables)
- Include smooth animations and micro-interactions
- Ensure accessibility (ARIA labels, semantic structure, color contrast)
- Optimize for fast loading (no external images, use gradients and CSS art)
- Include placeholder content for images using gradient backgrounds or SVG patterns

## Output Format

Return ONLY the complete HTML document. Start with <!DOCTYPE html> and end with </html>.
Do not include any explanation or markdown code blocks - just the raw HTML.`;
}

/**
 * Build the user prompt with project context
 */
function buildUserPrompt(
    pageType: PageType,
    context: BusinessContext | null,
    customPrompt?: string
): string {
    const parts: string[] = [];

    parts.push(`Generate a ${pageType} page for my business.`);

    // Add context if available
    if (context) {
        parts.push("\n" + formatContextForPrompt(context));
    } else {
        // Provide minimal default context if none available
        parts.push("\n## Business Information");
        parts.push(
            "Please generate a professional landing page with placeholder content."
        );
    }

    // Add custom prompt if provided
    if (customPrompt) {
        parts.push("\n## Additional Instructions");
        parts.push(customPrompt);
    }

    parts.push("\nGenerate the complete HTML page now.");

    return parts.join("\n");
}

/**
 * Parse the generated content to extract HTML, title, and sections
 */
function parseGeneratedContent(
    content: string,
    pageType: PageType
): { html: string; title: string; sections: string[] } {
    // Clean up any markdown code blocks if present
    let html = content.trim();

    if (html.startsWith("```html")) {
        html = html.slice(7);
    } else if (html.startsWith("```")) {
        html = html.slice(3);
    }

    if (html.endsWith("```")) {
        html = html.slice(0, -3);
    }

    html = html.trim();

    // Extract title from <title> tag
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const title =
        titleMatch?.[1] ||
        `${pageType.charAt(0).toUpperCase() + pageType.slice(1)} Page`;

    // Extract sections by looking for common section markers
    const sections = extractSections(html);

    return { html, title, sections };
}

/**
 * Extract section names from the HTML
 */
function extractSections(html: string): string[] {
    const sections: string[] = [];

    // Look for section IDs
    const idMatches = html.matchAll(/id="([^"]+)"/g);
    for (const match of idMatches) {
        const id = match[1];
        // Convert kebab-case to Title Case
        const sectionName = id
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        if (!sections.includes(sectionName)) {
            sections.push(sectionName);
        }
    }

    // Look for common section patterns
    const sectionPatterns = [
        "hero",
        "about",
        "features",
        "benefits",
        "testimonials",
        "pricing",
        "faq",
        "cta",
        "footer",
        "instructor",
        "modules",
        "guarantee",
        "bonuses",
        "registration",
        "form",
        "video",
        "countdown",
        "social-proof",
        "transformation",
    ];

    for (const pattern of sectionPatterns) {
        const regex = new RegExp(
            `(section|div)[^>]*(?:id|class)="[^"]*${pattern}[^"]*"`,
            "i"
        );
        if (
            regex.test(html) &&
            !sections.some((s) => s.toLowerCase().includes(pattern))
        ) {
            sections.push(pattern.charAt(0).toUpperCase() + pattern.slice(1));
        }
    }

    return sections;
}

/**
 * Validate generated HTML for completeness
 */
export function validateGeneratedHtml(
    html: string,
    pageType: PageType
): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check for basic HTML structure
    if (!html.includes("<!DOCTYPE html>")) {
        warnings.push("Missing DOCTYPE declaration");
    }

    if (!html.includes("<html")) {
        warnings.push("Missing html tag");
    }

    if (!html.includes("<head>") || !html.includes("</head>")) {
        warnings.push("Missing or incomplete head section");
    }

    if (!html.includes("<body>") || !html.includes("</body>")) {
        warnings.push("Missing or incomplete body section");
    }

    if (!html.includes("<style>")) {
        warnings.push("Missing embedded styles");
    }

    // Check for viewport meta tag (responsive)
    if (!html.includes('name="viewport"')) {
        warnings.push("Missing viewport meta tag for responsive design");
    }

    // Page-type specific checks
    if (pageType === "registration") {
        if (!html.includes("<form") && !html.includes("form")) {
            warnings.push("Registration page missing form element");
        }
    }

    if (pageType === "watch") {
        if (!html.includes("video") && !html.includes("iframe")) {
            warnings.push("Watch page may be missing video placeholder");
        }
    }

    if (pageType === "enrollment") {
        if (!html.includes("price") && !html.includes("payment")) {
            warnings.push("Enrollment page may be missing pricing information");
        }
    }

    return {
        isValid: warnings.length === 0,
        warnings,
    };
}
