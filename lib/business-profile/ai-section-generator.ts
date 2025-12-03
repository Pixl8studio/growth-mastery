/**
 * AI Section Generator
 * Generates answers for all questions in a section based on user context
 */

import { generateWithAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import type {
    SectionId,
    Section1Data,
    Section2Data,
    Section3Data,
    Section4Data,
    Section5Data,
    BusinessProfile,
    VehicleBeliefShift,
    InternalBeliefShift,
    ExternalBeliefShift,
    Objection,
} from "@/types/business-profile";
import { SECTION_DEFINITIONS } from "@/types/business-profile";

/**
 * Generate all answers for a section based on user context
 */
export async function generateSectionAnswers(
    sectionId: SectionId,
    userContext: string,
    existingProfile?: Partial<BusinessProfile>
): Promise<{
    success: boolean;
    data?: Section1Data | Section2Data | Section3Data | Section4Data | Section5Data;
    generatedFields?: string[];
    error?: string;
}> {
    const sectionDef = SECTION_DEFINITIONS[sectionId];

    logger.info(
        { sectionId, contextLength: userContext.length },
        "Generating section answers"
    );

    try {
        switch (sectionId) {
            case "section1":
                return await generateSection1(userContext, existingProfile);
            case "section2":
                return await generateSection2(userContext, existingProfile);
            case "section3":
                return await generateSection3(userContext, existingProfile);
            case "section4":
                return await generateSection4(userContext, existingProfile);
            case "section5":
                return await generateSection5(userContext, existingProfile);
            default:
                return { success: false, error: `Unknown section: ${sectionId}` };
        }
    } catch (error) {
        logger.error({ error, sectionId }, "Failed to generate section answers");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Build context from previous sections for AI prompts
 */
function buildPreviousSectionsContext(profile?: Partial<BusinessProfile>): string {
    if (!profile) return "";

    const contextParts: string[] = [];

    if (profile.ideal_customer) {
        contextParts.push(`Ideal Customer: ${profile.ideal_customer}`);
    }
    if (profile.transformation) {
        contextParts.push(`Transformation: ${profile.transformation}`);
    }
    if (profile.offer_name) {
        contextParts.push(`Offer Name: ${profile.offer_name}`);
    }
    if (profile.signature_method) {
        contextParts.push(`Signature Method: ${profile.signature_method}`);
    }
    if (profile.struggle_story) {
        contextParts.push(`Struggle Story: ${profile.struggle_story}`);
    }

    return contextParts.length > 0
        ? `\n\nPreviously provided information:\n${contextParts.join("\n")}`
        : "";
}

/**
 * Generate Section 1: Ideal Customer & Core Problem
 */
async function generateSection1(
    userContext: string,
    existingProfile?: Partial<BusinessProfile>
): Promise<{
    success: boolean;
    data?: Section1Data;
    generatedFields?: string[];
    error?: string;
}> {
    const previousContext = buildPreviousSectionsContext(existingProfile);

    const systemPrompt = `You are an expert business strategist helping entrepreneurs define their ideal customer and core problem.
Generate thoughtful, specific answers based on the user's context. Be direct and practical.
Output must be valid JSON with the exact field names specified.`;

    const userPrompt = `Based on this context about the business:

"${userContext}"
${previousContext}

Generate answers for these questions about the ideal customer and core problem:

1. ideal_customer: Who is the ideal customer? (Be specific about demographics, psychographics, situation)
2. transformation: What transformation do they help their customer achieve? (Before → After state)
3. perceived_problem: What problem does the customer THINK they have?
4. root_cause: What is the REAL root cause of that problem?
5. daily_pain_points: What daily pain points do they experience? (List 3-5 specific frustrations)
6. secret_desires: What desires are they secretly craving? (What do they really want deep down?)
7. common_mistakes: What common mistakes do they keep making? (List 3-5 patterns)
8. limiting_beliefs: What false or limiting beliefs keep them stuck? (List 3-5 beliefs)
9. empowering_truths: What empowering truths do they need to believe instead? (Counter each limiting belief)

Return as JSON object with these exact field names. Each answer should be 1-3 paragraphs, specific and actionable.`;

    const result = await generateWithAI<Section1Data>(
        [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        { maxTokens: 4000, temperature: 0.7 }
    );

    const generatedFields = [
        "ideal_customer",
        "transformation",
        "perceived_problem",
        "root_cause",
        "daily_pain_points",
        "secret_desires",
        "common_mistakes",
        "limiting_beliefs",
        "empowering_truths",
    ];

    return {
        success: true,
        data: { ...result, section1_context: userContext },
        generatedFields,
    };
}

/**
 * Generate Section 2: Story & Signature Method
 */
async function generateSection2(
    userContext: string,
    existingProfile?: Partial<BusinessProfile>
): Promise<{
    success: boolean;
    data?: Section2Data;
    generatedFields?: string[];
    error?: string;
}> {
    const previousContext = buildPreviousSectionsContext(existingProfile);

    const systemPrompt = `You are an expert storytelling coach helping entrepreneurs craft their founder story and signature method.
Generate compelling, authentic narrative elements based on the user's context.
Output must be valid JSON with the exact field names specified.`;

    const userPrompt = `Based on this context about the entrepreneur's journey:

"${userContext}"
${previousContext}

Generate answers for these questions about their story and signature method:

1. struggle_story: What is their relatable struggle story? (The challenge they faced that their customers face too)
2. breakthrough_moment: What was their breakthrough moment? (The turning point that changed everything)
3. life_now: What is their life or business like now? (The result of their transformation)
4. credibility_experience: What experience drives their credibility? (Credentials, results, years of experience)
5. signature_method: What is their unique method, system, or process? (Give it a compelling name if possible)

Return as JSON object with these exact field names. Make the story emotional, relatable, and authentic. The signature_method should feel proprietary and valuable.`;

    const result = await generateWithAI<Section2Data>(
        [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        { maxTokens: 3000, temperature: 0.7 }
    );

    const generatedFields = [
        "struggle_story",
        "breakthrough_moment",
        "life_now",
        "credibility_experience",
        "signature_method",
    ];

    return {
        success: true,
        data: { ...result, section2_context: userContext },
        generatedFields,
    };
}

/**
 * Generate Section 3: Offer & Proof
 */
async function generateSection3(
    userContext: string,
    existingProfile?: Partial<BusinessProfile>
): Promise<{
    success: boolean;
    data?: Section3Data;
    generatedFields?: string[];
    error?: string;
}> {
    const previousContext = buildPreviousSectionsContext(existingProfile);

    const systemPrompt = `You are an expert offer strategist helping entrepreneurs craft irresistible offers.
Generate compelling offer details based on the user's context.
Output must be valid JSON with the exact field names specified.
For pricing, estimate reasonable prices based on the offer type if not explicitly stated.`;

    const userPrompt = `Based on this context about the offer:

"${userContext}"
${previousContext}

Generate answers for these questions about the offer and proof:

1. offer_name: A compelling name for the offer
2. offer_type: Type of offer (group program, 1:1 coaching, hybrid, SaaS, service, course, etc.)
3. deliverables: Main deliverables or features (list 5-7 key components)
4. delivery_process: How is it delivered? (Format, timeline, access method)
5. problem_solved: What specific problem does this solve for the customer?
6. promise_outcome: The main promise or outcome (be specific and measurable if possible)
7. pricing: Object with "regular" and "webinar" prices as numbers (estimate if not provided)
8. guarantee: Risk-reversal guarantee terms (30-day, results-based, etc.)
9. testimonials: Template for testimonials (what results would ideal testimonials highlight?)
10. bonuses: 3-5 value-add bonuses that could drive urgency

Return as JSON object. The pricing field should be: {"regular": number, "webinar": number}`;

    const result = await generateWithAI<Section3Data>(
        [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        { maxTokens: 4000, temperature: 0.7 }
    );

    const generatedFields = [
        "offer_name",
        "offer_type",
        "deliverables",
        "delivery_process",
        "problem_solved",
        "promise_outcome",
        "pricing",
        "guarantee",
        "testimonials",
        "bonuses",
    ];

    return {
        success: true,
        data: { ...result, section3_context: userContext },
        generatedFields,
    };
}

/**
 * Generate Section 4: Teaching Content (Belief Shifts)
 */
async function generateSection4(
    userContext: string,
    existingProfile?: Partial<BusinessProfile>
): Promise<{
    success: boolean;
    data?: Section4Data;
    generatedFields?: string[];
    error?: string;
}> {
    const previousContext = buildPreviousSectionsContext(existingProfile);

    const systemPrompt = `You are an expert in belief-based persuasion and teaching methodology.
Generate the three belief shifts needed to move prospects to action.
Output must be valid JSON with the exact structure specified.`;

    const userPrompt = `Based on this context about the teaching content and belief shifts needed:

"${userContext}"
${previousContext}

Generate the three belief shifts:

1. vehicle_belief_shift: Shift from OLD MODEL to NEW MODEL
   - outdated_model: What outdated model is the audience using?
   - model_flaws: Why is that model flawed?
   - proof_data: What proof shows it no longer works?
   - new_model: What is the new model being taught?
   - key_insights: Array of 3 most important insights
   - quick_win: A quick win to prove the new model works
   - myths_to_bust: What myths should be busted?
   - success_story: A short success story proving the new model

2. internal_belief_shift: Shift from SELF-DOUBT to SELF-BELIEF
   - limiting_belief: The biggest self-limiting belief
   - perceived_lack: What they believe they lack
   - fear_of_failure: What they fear will happen if they fail
   - mindset_reframes: Array of 2-3 mindset reframes
   - micro_action: A small action that builds confidence
   - beginner_success_proof: Proof that beginners succeed
   - success_story: A story of internal transformation

3. external_belief_shift: Shift from RESOURCES to RESOURCEFULNESS
   - external_obstacles: What external obstacles they believe stop them
   - success_evidence: Evidence success is possible despite obstacles
   - tools_shortcuts: Tools or shortcuts that solve external issues
   - fastest_path: The fastest path they should recognize
   - success_story: Story of someone succeeding despite limitations
   - resource_myths: Myths about time/money/resources to dismantle

4. poll_questions: Array of 3-5 engaging poll questions for the presentation

Return as JSON with fields: vehicle_belief_shift, internal_belief_shift, external_belief_shift, poll_questions`;

    interface Section4Response {
        vehicle_belief_shift: VehicleBeliefShift;
        internal_belief_shift: InternalBeliefShift;
        external_belief_shift: ExternalBeliefShift;
        poll_questions: string[];
    }

    const result = await generateWithAI<Section4Response>(
        [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        { maxTokens: 4000, temperature: 0.7 }
    );

    const generatedFields = [
        "vehicle_belief_shift",
        "internal_belief_shift",
        "external_belief_shift",
        "poll_questions",
    ];

    return {
        success: true,
        data: { ...result, section4_context: userContext },
        generatedFields,
    };
}

/**
 * Generate Section 5: Call to Action & Objections
 */
async function generateSection5(
    userContext: string,
    existingProfile?: Partial<BusinessProfile>
): Promise<{
    success: boolean;
    data?: Section5Data;
    generatedFields?: string[];
    error?: string;
}> {
    const previousContext = buildPreviousSectionsContext(existingProfile);

    const systemPrompt = `You are an expert in sales psychology and objection handling.
Generate compelling CTAs and thorough objection responses.
Output must be valid JSON with the exact structure specified.`;

    const userPrompt = `Based on this context about the call to action and objections:

"${userContext}"
${previousContext}

Generate answers for:

1. call_to_action: The ONE action attendees should take after the masterclass (be specific)
2. incentive: An incentive like deadline, discount, bonus, or scholarship to drive action
3. pricing_disclosure: Where pricing is disclosed ("masterclass", "call_only", or "application")
4. path_options: Single path or multiple options description
5. top_objections: Array of 5 objects, each with:
   - objection: The common objection people raise
   - response: A compelling response that addresses and overcomes it

Return as JSON. The top_objections should be an array of {objection: string, response: string} objects.`;

    interface Section5Response {
        call_to_action: string;
        incentive: string;
        pricing_disclosure: string;
        path_options: string;
        top_objections: Objection[];
    }

    const result = await generateWithAI<Section5Response>(
        [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        { maxTokens: 3000, temperature: 0.7 }
    );

    const generatedFields = [
        "call_to_action",
        "incentive",
        "pricing_disclosure",
        "path_options",
        "top_objections",
    ];

    return {
        success: true,
        data: { ...result, section5_context: userContext },
        generatedFields,
    };
}

/**
 * Parse GPT paste response and extract section answers
 */
export async function parseGptPasteResponse(
    sectionId: SectionId,
    pastedContent: string,
    existingProfile?: Partial<BusinessProfile>
): Promise<{
    success: boolean;
    data?: Section1Data | Section2Data | Section3Data | Section4Data | Section5Data;
    generatedFields?: string[];
    error?: string;
}> {
    const sectionDef = SECTION_DEFINITIONS[sectionId];

    logger.info(
        { sectionId, contentLength: pastedContent.length },
        "Parsing GPT paste response"
    );

    const systemPrompt = `You are a parsing assistant. Extract structured answers from user-provided text.
The user pasted their GPT's response to section questions. Parse it and return structured JSON.
If information is missing, set those fields to null.
Output must be valid JSON.`;

    const fieldsList = sectionDef.fields
        .map((f) => `- ${f.key}: ${f.label}`)
        .join("\n");

    const userPrompt = `Parse this pasted response and extract answers for the following fields:

${fieldsList}

Pasted content:
"""
${pastedContent}
"""

Return a JSON object with the field names as keys. Extract the relevant content for each field.
For complex fields like belief_shift objects, structure them appropriately.
For array fields, return arrays. For missing information, use null.`;

    try {
        const result = await generateWithAI<Record<string, unknown>>(
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            { maxTokens: 4000, temperature: 0.3 }
        );

        // Add the context field
        const contextKey = `${sectionId}_context` as keyof typeof result;
        (result as Record<string, unknown>)[contextKey] = pastedContent;

        const generatedFields = Object.keys(result).filter(
            (key) => result[key] !== null && result[key] !== undefined
        );

        return {
            success: true,
            data: result as
                | Section1Data
                | Section2Data
                | Section3Data
                | Section4Data
                | Section5Data,
            generatedFields,
        };
    } catch (error) {
        logger.error({ error, sectionId }, "Failed to parse GPT paste response");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Generate the prompt text for users to copy to their GPT
 */
export function generateGptCopyPrompt(sectionId: SectionId): string {
    const sectionDef = SECTION_DEFINITIONS[sectionId];

    const questionsText = sectionDef.fields
        .map((field, index) => {
            if (field.type === "belief_shift" && "subfields" in field) {
                const subQuestions = field.subfields
                    .map(
                        (sub, subIndex) =>
                            `   ${String.fromCharCode(97 + subIndex)}) ${sub.label}`
                    )
                    .join("\n");
                return `${index + 1}. ${field.label}:\n${subQuestions}`;
            }
            return `${index + 1}. ${field.label}`;
        })
        .join("\n\n");

    return `# ${sectionDef.title}

Please answer the following questions about ${sectionDef.description.toLowerCase()}:

${questionsText}

Please provide detailed, specific answers for each question. Format your response clearly with each answer labeled by question number.`;
}
