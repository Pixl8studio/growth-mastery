/**
 * Context Aggregator
 * Compiles funnel context from Steps 1-4 for AI page generation
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface BusinessContext {
    // Step 1: Business Foundation
    businessName: string;
    businessType: string;
    industry: string;
    targetAudience: string;
    primaryOffer: string;

    // Step 2: Offer Definition
    productName: string;
    pricePoint: string;
    pricingModel: string;
    transformationPromise: string;
    keyBenefits: string[];
    deliveryFormat: string;
    timeline: string;

    // Step 3: Brand Design
    brandColors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    designStyle: string;
    typography: string;
    personalityTraits: {
        tone: string;
        mood: string;
        energy: string;
    };

    // Step 4: Audience Profile
    idealCustomerAvatar: string;
    painPoints: string[];
    desires: string[];
    objections: string[];
    founderStory: string;

    // Additional context
    trainingTitle?: string;
    trainingType?: "live" | "on-demand";
    trainingDuration?: string;
    modules?: Array<{
        title: string;
        takeaways: string[];
    }>;
}

/**
 * Aggregate all funnel context from Steps 1-4
 */
export async function aggregateFunnelContext(
    projectId: string
): Promise<BusinessContext | null> {
    try {
        const supabase = await createServerClient();

        // Fetch all data in parallel
        const [projectResult, intakeResult, offerResult, brandResult, deckResult] =
            await Promise.all([
                supabase
                    .from("funnel_projects")
                    .select("*")
                    .eq("id", projectId)
                    .single(),
                supabase
                    .from("vapi_transcripts")
                    .select("extracted_data, transcript_text")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single(),
                supabase
                    .from("offers")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single(),
                supabase
                    .from("brand_designs")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .single(),
                supabase
                    .from("deck_structures")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single(),
            ]);

        const project = projectResult.data;
        const intake = intakeResult.data?.extracted_data || {};
        const offer = offerResult.data || {};
        const brand = brandResult.data || {};
        const deck = deckResult.data || {};

        // Extract and normalize context
        const context: BusinessContext = {
            // Step 1: Business Foundation
            businessName: project?.name || intake.business_name || "Your Business",
            businessType: intake.business_type || "coaching",
            industry: intake.industry || intake.niche || "business",
            targetAudience:
                intake.target_audience || intake.ideal_customer || "entrepreneurs",
            primaryOffer: intake.primary_offer || offer.name || "Training Program",

            // Step 2: Offer Definition
            productName: offer.name || intake.program_name || "Premium Training",
            pricePoint: offer.price ? `$${offer.price}` : intake.price_point || "$997",
            pricingModel: offer.pricing_model || intake.pricing_model || "one-time",
            transformationPromise:
                offer.transformation_promise ||
                intake.transformation ||
                "Transform your business with proven strategies",
            keyBenefits: extractBenefits(offer, intake),
            deliveryFormat: offer.delivery_format || intake.format || "online training",
            timeline: offer.timeline || intake.timeline || "4 weeks",

            // Step 3: Brand Design
            brandColors: {
                primary: brand.primary_color || "#2563eb",
                secondary: brand.secondary_color || "#10b981",
                accent: brand.accent_color || "#ec4899",
                background: brand.background_color || "#ffffff",
                text: brand.text_color || "#1f2937",
            },
            designStyle: brand.design_style || "modern",
            typography: "Inter, system-ui, sans-serif",
            personalityTraits: {
                tone: brand.personality_traits?.tone || "professional",
                mood: brand.personality_traits?.mood || "confident",
                energy: brand.personality_traits?.energy || "dynamic",
            },

            // Step 4: Audience Profile
            idealCustomerAvatar:
                intake.ideal_customer_avatar ||
                intake.target_audience ||
                "Business owners looking to scale",
            painPoints: extractPainPoints(intake, deck),
            desires: extractDesires(intake, deck),
            objections: extractObjections(intake, deck),
            founderStory: intake.founder_story || intake.background || "",

            // Additional context from deck
            trainingTitle: deck.metadata?.title || offer.name || project?.name,
            trainingType: "on-demand",
            trainingDuration: "90 minutes",
            modules: extractModules(deck),
        };

        logger.info(
            { projectId, hasIntake: !!intakeResult.data, hasBrand: !!brandResult.data },
            "Aggregated funnel context"
        );

        return context;
    } catch (error) {
        logger.error({ error, projectId }, "Failed to aggregate funnel context");
        return null;
    }
}

/**
 * Extract benefits from offer and intake data
 */
function extractBenefits(offer: any, intake: any): string[] {
    const benefits: string[] = [];

    if (offer.benefits && Array.isArray(offer.benefits)) {
        benefits.push(...offer.benefits);
    }

    if (intake.key_benefits && Array.isArray(intake.key_benefits)) {
        benefits.push(...intake.key_benefits);
    }

    if (intake.outcomes && Array.isArray(intake.outcomes)) {
        benefits.push(...intake.outcomes);
    }

    // Default benefits if none found
    if (benefits.length === 0) {
        return [
            "Proven step-by-step system",
            "Expert guidance and support",
            "Actionable strategies you can implement immediately",
            "Access to exclusive resources and tools",
        ];
    }

    return benefits.slice(0, 6);
}

/**
 * Extract pain points from intake and deck
 */
function extractPainPoints(intake: any, deck: any): string[] {
    const painPoints: string[] = [];

    if (intake.pain_points && Array.isArray(intake.pain_points)) {
        painPoints.push(...intake.pain_points);
    }

    if (intake.challenges && Array.isArray(intake.challenges)) {
        painPoints.push(...intake.challenges);
    }

    // Extract from deck slides if available
    if (deck.slides && Array.isArray(deck.slides)) {
        const problemSlide = deck.slides.find(
            (s: any) =>
                s.type === "problem" ||
                s.title?.toLowerCase().includes("problem") ||
                s.title?.toLowerCase().includes("pain")
        );
        if (problemSlide?.content?.points) {
            painPoints.push(...problemSlide.content.points);
        }
    }

    // Default pain points if none found
    if (painPoints.length === 0) {
        return [
            "Struggling to scale your business",
            "Overwhelmed by too many tactics",
            "Not seeing results from current strategies",
        ];
    }

    return painPoints.slice(0, 5);
}

/**
 * Extract desires from intake and deck
 */
function extractDesires(intake: any, deck: any): string[] {
    const desires: string[] = [];

    if (intake.desires && Array.isArray(intake.desires)) {
        desires.push(...intake.desires);
    }

    if (intake.goals && Array.isArray(intake.goals)) {
        desires.push(...intake.goals);
    }

    if (intake.aspirations && Array.isArray(intake.aspirations)) {
        desires.push(...intake.aspirations);
    }

    // Default desires if none found
    if (desires.length === 0) {
        return [
            "Build a thriving, profitable business",
            "Have more time freedom and flexibility",
            "Make a bigger impact in your industry",
        ];
    }

    return desires.slice(0, 5);
}

/**
 * Extract objections from intake and deck
 */
function extractObjections(intake: any, deck: any): string[] {
    const objections: string[] = [];

    if (intake.objections && Array.isArray(intake.objections)) {
        objections.push(...intake.objections);
    }

    if (intake.concerns && Array.isArray(intake.concerns)) {
        objections.push(...intake.concerns);
    }

    // Default objections if none found
    if (objections.length === 0) {
        return [
            "I don't have enough time",
            "I've tried similar things before",
            "I'm not sure this will work for my situation",
        ];
    }

    return objections.slice(0, 5);
}

/**
 * Extract modules from deck structure
 */
function extractModules(deck: any): Array<{ title: string; takeaways: string[] }> {
    const modules: Array<{ title: string; takeaways: string[] }> = [];

    if (deck.slides && Array.isArray(deck.slides)) {
        // Find slides that look like module introductions
        const moduleSlides = deck.slides.filter(
            (s: any) =>
                s.type === "module" ||
                s.type === "section" ||
                s.title?.toLowerCase().includes("module") ||
                s.title?.toLowerCase().includes("step")
        );

        for (const slide of moduleSlides.slice(0, 4)) {
            modules.push({
                title: slide.title || "Key Learning",
                takeaways: slide.content?.points || [
                    "Learn proven strategies",
                    "Get actionable insights",
                    "Apply immediately",
                ],
            });
        }
    }

    // Default modules if none found
    if (modules.length === 0) {
        return [
            {
                title: "The Foundation",
                takeaways: [
                    "Understand the core principles",
                    "Build a solid base for success",
                    "Avoid common mistakes",
                ],
            },
            {
                title: "The Strategy",
                takeaways: [
                    "Learn the step-by-step process",
                    "See real examples in action",
                    "Get the templates you need",
                ],
            },
            {
                title: "The Implementation",
                takeaways: [
                    "Put your plan into action",
                    "Track your progress",
                    "Optimize for results",
                ],
            },
            {
                title: "The Scale",
                takeaways: [
                    "Multiply your results",
                    "Automate key processes",
                    "Build for long-term success",
                ],
            },
        ];
    }

    return modules;
}

/**
 * Format context as a prompt-ready string
 */
export function formatContextForPrompt(context: BusinessContext): string {
    return `
## Business Context

**Business:** ${context.businessName}
**Industry:** ${context.industry}
**Target Audience:** ${context.targetAudience}

## Offer Details

**Product:** ${context.productName}
**Price:** ${context.pricePoint}
**Transformation Promise:** ${context.transformationPromise}

**Key Benefits:**
${context.keyBenefits.map((b) => `- ${b}`).join("\n")}

## Brand Identity

**Colors:**
- Primary: ${context.brandColors.primary}
- Secondary: ${context.brandColors.secondary}
- Accent: ${context.brandColors.accent}
- Background: ${context.brandColors.background}
- Text: ${context.brandColors.text}

**Style:** ${context.designStyle}
**Tone:** ${context.personalityTraits.tone}
**Mood:** ${context.personalityTraits.mood}

## Audience Profile

**Ideal Customer:** ${context.idealCustomerAvatar}

**Pain Points:**
${context.painPoints.map((p) => `- ${p}`).join("\n")}

**Desires:**
${context.desires.map((d) => `- ${d}`).join("\n")}

**Common Objections:**
${context.objections.map((o) => `- ${o}`).join("\n")}

${context.founderStory ? `## Founder Story\n${context.founderStory}` : ""}

## Training Details

**Title:** ${context.trainingTitle}
**Type:** ${context.trainingType}
**Duration:** ${context.trainingDuration}

**Modules:**
${context.modules?.map((m) => `### ${m.title}\n${m.takeaways.map((t) => `- ${t}`).join("\n")}`).join("\n\n")}
`.trim();
}
