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
    offerId?: string;
    deckId?: string;
    templateStyle?: "urgency-convert" | "premium-elegant" | "value-focused";
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
    const { projectId, pageType, customPrompt, offerId, deckId, templateStyle } =
        options;
    const startTime = Date.now();

    logger.info(
        { projectId, pageType, offerId, deckId, templateStyle },
        "Starting page generation with Claude"
    );

    // Load the framework for this page type
    const framework = await loadPageFramework(pageType);

    // Aggregate context from the funnel project with specific offer/deck if provided
    const context = await aggregateFunnelContext({
        projectId,
        offerId,
        deckId,
        templateStyle,
    });

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

    return `You are an expert landing page designer and developer with a keen eye for professional, polished design. Your task is to generate a complete, production-ready ${pageTypeLabels[pageType]} page as a single HTML document.

## Critical Design Standards

IMPORTANT: The page must look PROFESSIONALLY DESIGNED, not like a quick template. Pay close attention to:

### Typography Excellence
- Use proper type hierarchy: H1 (48-64px), H2 (32-40px), H3 (24-28px), body (16-18px)
- CRITICAL: Headline line-height MUST be 1.1-1.2 (tight). NEVER use line-height above 1.3 for headlines.
- Body text line-height: 1.5-1.6 for readability
- Letter spacing: -0.02em for headings, 0 for body
- Use ONE primary font family (Inter, DM Sans, or Nunito from Google Fonts) plus system sans-serif fallbacks
- Limit line length to 65-75 characters for optimal readability
- Headlines should feel compact and punchy, NOT stretched out with excessive line spacing

### Spacing & Layout
- Consistent vertical rhythm using 8px base unit (8, 16, 24, 32, 48, 64, 96, 128px)
- Section padding: minimum 80px top/bottom on desktop, 48px on mobile
- Container max-width: 1200px for content, 1400px for full-width sections
- Card/element spacing: minimum 24px between elements
- NEVER let text touch container edges - minimum 16px horizontal padding

### Two-Column Feature Sections (Copy + Visual)
When creating sections with copy on one side and a visual on the other:
- Both columns should be roughly the same height (balanced visual weight)
- The visual element should be a MEANINGFUL IMAGE, not a tiny icon card
- Use large, engaging visuals: gradient abstract backgrounds, relevant illustrations, or photo placeholders
- Visual should be at least 300-400px tall on desktop to match the copy height
- Use CSS aspect-ratio or min-height to ensure visuals are substantial
- Example visual: rounded rectangle with gradient background (linear-gradient) and subtle pattern

### Color & Contrast - MANDATORY RULES
CRITICAL - THESE ARE NON-NEGOTIABLE:
- NEVER use light text on light backgrounds (this makes text invisible)
- NEVER use gradient text that fades to colors too similar to the background
- Dark text (#1a1a2e, #2d3748, #111827) on light backgrounds ONLY
- Light text (#ffffff, #f8fafc) on dark backgrounds ONLY
- If using gradient text, ensure ALL parts of the gradient have 4.5:1 contrast ratio against the background
- Test every text element: can you read it easily? If not, fix the contrast.
- Primary color for CTAs and key accents only (not overused)
- Background colors should have subtle variation (not all #ffffff)
- Text contrast MUST meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Limit color palette to 3-4 colors maximum

### Visual Polish
- Rounded corners: 8-12px for cards, 6-8px for buttons, 4px for inputs
- Subtle shadows: 0 4px 6px -1px rgba(0,0,0,0.1) for elevated elements
- Hover states for ALL interactive elements with smooth transitions (0.2s ease)
- Button padding: minimum 12px 24px, ideally 16px 32px for primary CTAs
- Consistent icon sizes throughout (20-24px for inline, 40-48px for feature icons)

## Output Requirements

1. Generate a COMPLETE, STANDALONE HTML document
2. Include ALL CSS embedded in a <style> tag in the <head>
3. Include Google Fonts CDN link (Inter, DM Sans, or Nunito)
4. The page must be FULLY RESPONSIVE (mobile-first approach)
5. Use semantic HTML5 elements

## Framework Guidelines

Follow this framework for the page structure and content:

${framework}

## Technical Requirements

- Use CSS custom properties (variables) for colors and spacing
- Use modern CSS (flexbox for components, grid for layouts)
- Include smooth transitions for interactive states
- Ensure accessibility (ARIA labels, semantic structure, proper focus states)
- For image placeholders, use LARGE gradient backgrounds with subtle patterns, not tiny icon boxes
- Example placeholder: <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; min-height: 350px; aspect-ratio: 4/3;"></div>

## Common Mistakes to AVOID - READ CAREFULLY

These are the most common errors. DO NOT make them:
- Light or gradient text on light backgrounds (UNREADABLE - biggest mistake)
- Headline line-height too large (makes sections awkwardly tall)
- Small icon cards instead of substantial feature images
- Text too small or too large
- Inconsistent spacing between sections
- Colors that clash or lack contrast
- Buttons that are too small or hard to click
- Missing hover states on interactive elements
- Content touching container edges
- Sections that feel cramped or have too little padding
- Using more than 2-3 colors extensively
- Gradient text effects that become invisible against the background

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
