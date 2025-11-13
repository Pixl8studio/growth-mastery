/**
 * Section Copy Generator
 * Generate AI-powered copy for page sections based on intake data
 */

import { createClient } from "@/lib/supabase/server";
import { generateWithAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import type { PageType } from "@/types/pages";

export interface SectionCopyRequest {
    sectionType: string;
    pageType: PageType;
    projectId: string;
    customPrompt?: string;
}

export interface SectionCopy {
    headline?: string;
    subheadline?: string;
    body?: string;
    bullets?: string[];
    cta?: string;
    buttonText?: string;
}

/**
 * Generate section copy based on intake data and page context
 */
export async function generateSectionCopy(
    request: SectionCopyRequest
): Promise<SectionCopy> {
    const requestLogger = logger.child({
        handler: "section-copy-generator",
        sectionType: request.sectionType,
        pageType: request.pageType,
    });

    requestLogger.info({ projectId: request.projectId }, "Generating section copy");

    const supabase = await createClient();

    // Fetch intake data for context
    const { data: intakeData, error: intakeError } = await supabase
        .from("vapi_transcripts")
        .select("transcript_text, extracted_data")
        .eq("funnel_project_id", request.projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (intakeError || !intakeData) {
        requestLogger.warn(
            { error: intakeError },
            "No intake data found, using generic generation"
        );
    }

    // Fetch project name for context
    const { data: project } = await supabase
        .from("funnel_projects")
        .select("name")
        .eq("id", request.projectId)
        .single();

    const intakeContext = intakeData?.transcript_text || "";
    const projectName = project?.name || "Your Program";

    // Build prompt based on section type and page type
    const prompt = buildSectionPrompt(
        request.sectionType,
        request.pageType,
        intakeContext,
        projectName,
        request.customPrompt
    );

    // Generate copy with AI
    const generatedCopy = await generateWithAI<SectionCopy>(
        [
            {
                role: "system",
                content: prompt.system,
            },
            {
                role: "user",
                content: prompt.user,
            },
        ],
        {
            model: "gpt-4o",
            temperature: 0.7,
            maxTokens: 1500,
        }
    );

    requestLogger.info(
        {
            sectionType: request.sectionType,
            hasHeadline: !!generatedCopy.headline,
            hasBullets: !!generatedCopy.bullets,
        },
        "Section copy generated successfully"
    );

    return generatedCopy;
}

/**
 * Build prompt for section copy generation
 */
function buildSectionPrompt(
    sectionType: string,
    pageType: PageType,
    intakeContext: string,
    projectName: string,
    customPrompt?: string
): { system: string; user: string } {
    const pageContext = getPageContext(pageType);
    const sectionGuidance = getSectionGuidance(sectionType, pageType);

    const systemPrompt = `You are an expert copywriter creating compelling ${pageType} page copy.

Generate copy for a ${sectionType} section that:
- Follows conversion copywriting best practices
- Matches the voice and messaging from the intake data
- Is specific, benefit-focused, and action-oriented
- Follows the framework: ${sectionGuidance.framework}

Return ONLY valid JSON with this exact structure:
${JSON.stringify(sectionGuidance.structure, null, 2)}

Keep copy concise and punchy. Headlines should be 6-10 words. Body copy should be 2-3 sentences max.`;

    const userPrompt = customPrompt
        ? `Custom instructions: ${customPrompt}\n\nProject: ${projectName}\nPage type: ${pageContext}\n\nIntake context:\n${intakeContext.substring(0, 2000)}`
        : `Generate ${sectionType} section copy for: ${projectName}

Page context: ${pageContext}

Intake data provides this context:
${intakeContext.substring(0, 2000)}

Create compelling copy that converts visitors based on this information.`;

    return {
        system: systemPrompt,
        user: userPrompt,
    };
}

/**
 * Get page type context description
 */
function getPageContext(pageType: PageType): string {
    switch (pageType) {
        case "registration":
            return "This is a webinar registration page. Goal: Get people to register for the free webinar.";
        case "watch":
            return "This is a watch page where people view the webinar/VSL. Goal: Keep them watching and lead to the offer.";
        case "enrollment":
            return "This is a sales page for the paid offer. Goal: Convert viewers into paying customers.";
        default:
            return "This is a landing page. Goal: Convert visitors.";
    }
}

/**
 * Get section-specific guidance and structure
 */
function getSectionGuidance(
    sectionType: string,
    _pageType: PageType
): { framework: string; structure: Record<string, string> } {
    const guidanceMap: Record<
        string,
        { framework: string; structure: Record<string, string> }
    > = {
        hero: {
            framework: "Hook + Promise + CTA",
            structure: {
                headline: "Compelling promise or transformation (string)",
                subheadline: "Supporting detail that builds curiosity (string)",
                cta: "Action-oriented button text (string)",
            },
        },
        benefits: {
            framework: "Feature → Benefit transformation",
            structure: {
                headline: "Section headline about benefits (string)",
                bullets: "Array of 3-5 benefit statements (array of strings)",
            },
        },
        problem: {
            framework: "Agitate the problem they're facing",
            structure: {
                headline: "Call out the painful problem (string)",
                body: "2-3 sentences describing the struggle (string)",
            },
        },
        solution: {
            framework: "Present your solution as the answer",
            structure: {
                headline: "How you solve their problem (string)",
                body: "Explanation of your unique approach (string)",
                bullets: "3-4 key elements of the solution (array of strings)",
            },
        },
        testimonial: {
            framework: "Social proof and credibility",
            structure: {
                headline: "Section heading for testimonials (string)",
                body: "Brief intro to social proof (string)",
            },
        },
        cta: {
            framework: "Clear call-to-action with urgency",
            structure: {
                headline: "Action-focused headline (string)",
                subheadline: "Reason to act now (string)",
                buttonText: "CTA button text (string)",
            },
        },
        features: {
            framework: "What's included in the offer",
            structure: {
                headline: "What you'll get section headline (string)",
                bullets: "5-7 specific features/modules (array of strings)",
            },
        },
        faq: {
            framework: "Address objections and concerns",
            structure: {
                headline: "FAQ section headline (string)",
                body: "Brief intro to FAQs (string)",
            },
        },
    };

    return (
        guidanceMap[sectionType] || {
            framework: "Persuasive copy that converts",
            structure: {
                headline: "Section headline (string)",
                body: "Section body copy (string)",
                cta: "Call to action if applicable (string)",
            },
        }
    );
}
