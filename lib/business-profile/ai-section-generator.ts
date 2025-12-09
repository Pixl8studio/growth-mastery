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
 * Build section-specific parsing prompt for better accuracy
 */
function buildSection4ParsingPrompt(): string {
    return `Parse the pasted content and extract structured data for Section 4: Teaching Content (Belief Shifts).

IMPORTANT: The content may use various formats:
- Numbered lists (1, 2, 3)
- Lettered sub-items (a, b, c)
- Roman numerals (i, ii, iii)
- Bullet points
- Nested outlines
- Headers and paragraphs

Extract and structure into exactly this JSON format:

{
  "vehicle_belief_shift": {
    "outdated_model": "string - What outdated model/approach is the audience using?",
    "model_flaws": "string - Why is that model flawed?",
    "proof_data": "string - What proof or data shows it no longer works?",
    "new_model": "string - What is the new model being taught?",
    "key_insights": ["array of 3 most important insights as strings"],
    "quick_win": "string - A quick win to prove the new model works",
    "myths_to_bust": "string - What myths should be busted?",
    "success_story": "string - A short success story proving the new model"
  },
  "internal_belief_shift": {
    "limiting_belief": "string - The biggest self-limiting belief",
    "perceived_lack": "string - What they believe they lack",
    "fear_of_failure": "string - What they fear will happen if they fail",
    "mindset_reframes": ["array of 2-3 mindset reframes as strings"],
    "micro_action": "string - A small action that builds confidence",
    "beginner_success_proof": "string - Proof that beginners succeed",
    "success_story": "string - A story of internal transformation"
  },
  "external_belief_shift": {
    "external_obstacles": "string - What external obstacles they believe stop them",
    "success_evidence": "string - Evidence success is possible despite obstacles",
    "tools_shortcuts": "string - Tools or shortcuts that solve external issues",
    "fastest_path": "string - The fastest path they should recognize",
    "success_story": "string - Story of someone succeeding despite limitations",
    "resource_myths": "string - Myths about time/money/resources to dismantle"
  },
  "poll_questions": ["array of 3-5 engaging poll questions as strings"]
}

RULES:
1. ALL string values must be actual strings, never objects
2. key_insights MUST be an array of strings (split if given as one paragraph)
3. mindset_reframes MUST be an array of strings (split if given as one paragraph)
4. poll_questions MUST be an array of strings
5. If content mentions "Old Model" or "Vehicle Belief" -> goes in vehicle_belief_shift
6. If content mentions "Internal" or "Self-Doubt" or "Limiting Beliefs" -> goes in internal_belief_shift
7. If content mentions "External" or "Resources" or "Obstacles" -> goes in external_belief_shift
8. Never return "[Object]" or "[object Object]" - always extract actual content
9. If a field is truly missing, use null (not an empty object)`;
}

/**
 * Build section-specific parsing prompt for Section 5
 */
function buildSection5ParsingPrompt(): string {
    return `Parse the pasted content and extract structured data for Section 5: Call to Action & Objections.

IMPORTANT: The content may use various formats including numbered lists, bullets, and paragraphs.

Extract and structure into exactly this JSON format:

{
  "call_to_action": "string - The ONE action attendees should take after the masterclass",
  "incentive": "string - An incentive like deadline, discount, bonus, or scholarship",
  "pricing_disclosure": "string - Where pricing is disclosed: 'masterclass', 'call_only', or 'application'",
  "path_options": "string - Single path or multiple options description",
  "top_objections": [
    {
      "objection": "string - The common objection people raise",
      "response": "string - A compelling response that addresses it"
    }
  ]
}

RULES:
1. top_objections MUST be an array of objects with "objection" and "response" keys
2. Each objection should be a separate object in the array
3. Never return "[Object]" - always extract actual text content
4. If objections are listed without explicit responses, use null for response
5. Look for patterns like "Objection 1:", "Common objection:", "They say:", etc.`;
}

/**
 * Build section-specific parsing prompt for Section 3
 */
function buildSection3ParsingPrompt(): string {
    return `Parse the pasted content and extract structured data for Section 3: Your Offer & Proof.

Extract and structure into exactly this JSON format:

{
  "offer_name": "string - Name of the offer",
  "offer_type": "string - Type: group, 1:1, hybrid, SaaS, service, course, etc.",
  "deliverables": "string - Main deliverables or features",
  "delivery_process": "string - How it is delivered",
  "problem_solved": "string - What problem this solves",
  "promise_outcome": "string - The main promise or outcome",
  "pricing": {
    "regular": number or null,
    "webinar": number or null
  },
  "guarantee": "string - Risk-reversal guarantee terms",
  "testimonials": "string - Testimonials or success stories",
  "bonuses": "string - Value-add bonuses"
}

RULES:
1. pricing MUST be an object with "regular" and "webinar" as numbers (or null if not mentioned)
2. Extract actual dollar amounts for pricing (remove $ and commas)
3. All other fields should be strings
4. Never return "[Object]" - always extract actual text content`;
}

/**
 * Normalize parsed data to ensure proper structure
 */
function normalizeSection4Data(data: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...data };

    // Ensure belief shift objects are properly structured
    const beliefShiftFields = [
        "vehicle_belief_shift",
        "internal_belief_shift",
        "external_belief_shift",
    ];

    for (const field of beliefShiftFields) {
        if (normalized[field]) {
            const value = normalized[field];

            // If it's a string (incorrectly parsed), convert to proper structure
            if (typeof value === "string") {
                normalized[field] = { content: value };
            } else if (typeof value === "object" && value !== null) {
                // Ensure nested fields are strings, not objects
                const obj = value as Record<string, unknown>;
                for (const [key, val] of Object.entries(obj)) {
                    if (
                        typeof val === "object" &&
                        val !== null &&
                        !Array.isArray(val)
                    ) {
                        // Convert object to string representation
                        obj[key] = JSON.stringify(val);
                    }
                    // Ensure array fields contain only strings
                    if (Array.isArray(val)) {
                        obj[key] = val.map((item) =>
                            typeof item === "object"
                                ? JSON.stringify(item)
                                : String(item)
                        );
                    }
                }
                normalized[field] = obj;
            }
        }
    }

    // Ensure poll_questions is an array of strings
    if (normalized.poll_questions) {
        if (typeof normalized.poll_questions === "string") {
            normalized.poll_questions = [normalized.poll_questions];
        } else if (Array.isArray(normalized.poll_questions)) {
            normalized.poll_questions = (normalized.poll_questions as unknown[]).map(
                (q) => (typeof q === "object" ? JSON.stringify(q) : String(q))
            );
        }
    }

    return normalized;
}

/**
 * Normalize parsed data for Section 5
 */
function normalizeSection5Data(data: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...data };

    // Ensure top_objections is properly structured
    if (normalized.top_objections) {
        if (typeof normalized.top_objections === "string") {
            // Try to parse if it's a string
            try {
                normalized.top_objections = JSON.parse(
                    normalized.top_objections as string
                );
            } catch {
                // If can't parse, wrap it
                normalized.top_objections = [
                    { objection: normalized.top_objections as string, response: "" },
                ];
            }
        } else if (Array.isArray(normalized.top_objections)) {
            // Ensure each item has the correct structure
            normalized.top_objections = (normalized.top_objections as unknown[]).map(
                (item) => {
                    if (typeof item === "string") {
                        return { objection: item, response: "" };
                    }
                    if (typeof item === "object" && item !== null) {
                        const obj = item as Record<string, unknown>;
                        return {
                            objection: String(obj.objection || ""),
                            response: String(obj.response || ""),
                        };
                    }
                    return { objection: String(item), response: "" };
                }
            );
        }
    }

    return normalized;
}

/**
 * Normalize parsed data for Section 3
 */
function normalizeSection3Data(data: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...data };

    // Ensure pricing is properly structured
    if (normalized.pricing) {
        if (typeof normalized.pricing === "string") {
            // Try to extract numbers from string
            const priceMatch = (normalized.pricing as string).match(/\$?([\d,]+)/g);
            if (priceMatch && priceMatch.length >= 1) {
                const prices = priceMatch.map((p) =>
                    parseInt(p.replace(/[$,]/g, ""), 10)
                );
                normalized.pricing = {
                    regular: prices[0] || null,
                    webinar: prices[1] || null,
                };
            } else {
                normalized.pricing = { regular: null, webinar: null };
            }
        } else if (
            typeof normalized.pricing === "object" &&
            normalized.pricing !== null
        ) {
            const pricingObj = normalized.pricing as Record<string, unknown>;
            normalized.pricing = {
                regular:
                    typeof pricingObj.regular === "number"
                        ? pricingObj.regular
                        : pricingObj.regular
                          ? parseInt(
                                String(pricingObj.regular).replace(/[$,]/g, ""),
                                10
                            )
                          : null,
                webinar:
                    typeof pricingObj.webinar === "number"
                        ? pricingObj.webinar
                        : pricingObj.webinar
                          ? parseInt(
                                String(pricingObj.webinar).replace(/[$,]/g, ""),
                                10
                            )
                          : null,
            };
        }
    }

    return normalized;
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

    // Use section-specific prompts for complex sections
    let systemPrompt: string;
    let userPromptSuffix: string;

    if (sectionId === "section4") {
        systemPrompt = `You are a precise JSON parser. Extract structured data from user-provided text.
CRITICAL: Never return "[Object]" or "[object Object]" as values. Always extract actual text content.
All string fields must contain actual text, not object representations.
Output must be valid JSON that matches the exact structure specified.`;
        userPromptSuffix = buildSection4ParsingPrompt();
    } else if (sectionId === "section5") {
        systemPrompt = `You are a precise JSON parser. Extract structured data from user-provided text.
CRITICAL: Never return "[Object]" or "[object Object]" as values. Always extract actual text content.
Output must be valid JSON that matches the exact structure specified.`;
        userPromptSuffix = buildSection5ParsingPrompt();
    } else if (sectionId === "section3") {
        systemPrompt = `You are a precise JSON parser. Extract structured data from user-provided text.
CRITICAL: Never return "[Object]" or "[object Object]" as values. Always extract actual text content.
Output must be valid JSON that matches the exact structure specified.`;
        userPromptSuffix = buildSection3ParsingPrompt();
    } else {
        systemPrompt = `You are a parsing assistant. Extract structured answers from user-provided text.
The user pasted their GPT's response to section questions. Parse it and return structured JSON.
CRITICAL: Never return "[Object]" or "[object Object]" as values. Always extract actual text content.
If information is missing, set those fields to null.
Output must be valid JSON.`;

        const fieldsList = sectionDef.fields
            .map((f) => `- ${f.key}: ${f.label}`)
            .join("\n");

        userPromptSuffix = `Parse this pasted response and extract answers for the following fields:

${fieldsList}

Return a JSON object with the field names as keys. Extract the relevant content for each field.
All values should be strings or arrays of strings. For missing information, use null.`;
    }

    const userPrompt = `${userPromptSuffix}

Pasted content to parse:
"""
${pastedContent}
"""`;

    try {
        let result = await generateWithAI<Record<string, unknown>>(
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            { maxTokens: 4000, temperature: 0.3 }
        );

        // Apply section-specific normalization
        if (sectionId === "section4") {
            result = normalizeSection4Data(result);
        } else if (sectionId === "section5") {
            result = normalizeSection5Data(result);
        } else if (sectionId === "section3") {
            result = normalizeSection3Data(result);
        }

        // Add the context field
        const contextKey = `${sectionId}_context` as keyof typeof result;
        (result as Record<string, unknown>)[contextKey] = pastedContent;

        const generatedFields = Object.keys(result).filter(
            (key) => result[key] !== null && result[key] !== undefined
        );

        logger.info(
            { sectionId, fieldCount: generatedFields.length },
            "Successfully parsed GPT paste response"
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
