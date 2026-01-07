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

    // Template style for enrollment pages
    templateStyle?: "urgency-convert" | "premium-elegant" | "value-focused";
}

export interface AggregateContextOptions {
    projectId: string;
    offerId?: string;
    deckId?: string;
    templateStyle?: "urgency-convert" | "premium-elegant" | "value-focused";
}

/**
 * Aggregate all funnel context from Steps 1-4
 * Optionally accepts specific offerId and deckId to use instead of most recent
 */
export async function aggregateFunnelContext(
    projectIdOrOptions: string | AggregateContextOptions
): Promise<BusinessContext | null> {
    // Handle both old signature (string) and new signature (options object)
    const options: AggregateContextOptions =
        typeof projectIdOrOptions === "string"
            ? { projectId: projectIdOrOptions }
            : projectIdOrOptions;

    const { projectId, offerId, deckId, templateStyle } = options;

    try {
        const supabase = await createServerClient();

        // Build offer query - use specific ID if provided, otherwise get most recent
        const offerQuery = offerId
            ? supabase.from("offers").select("*").eq("id", offerId).single()
            : supabase
                  .from("offers")
                  .select("*")
                  .eq("funnel_project_id", projectId)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .single();

        // Build deck query - use specific ID if provided, otherwise get most recent
        const deckQuery = deckId
            ? supabase.from("deck_structures").select("*").eq("id", deckId).single()
            : supabase
                  .from("deck_structures")
                  .select("*")
                  .eq("funnel_project_id", projectId)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .single();

        // Fetch all data in parallel (including business_profiles from Step 1 wizard)
        const [
            projectResult,
            intakeResult,
            offerResult,
            brandResult,
            deckResult,
            businessProfileResult,
        ] = await Promise.all([
            supabase.from("funnel_projects").select("*").eq("id", projectId).single(),
            supabase
                .from("vapi_transcripts")
                .select("extracted_data, transcript_text")
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single(),
            offerQuery,
            supabase
                .from("brand_designs")
                .select("*")
                .eq("funnel_project_id", projectId)
                .single(),
            deckQuery,
            // Fetch business profile from Step 1 wizard
            supabase
                .from("business_profiles")
                .select("*")
                .eq("funnel_project_id", projectId)
                .single(),
        ]);

        const project = projectResult.data;
        const intake = intakeResult.data?.extracted_data || {};
        const offer = offerResult.data || {};
        const brand = brandResult.data || {};
        const deck = deckResult.data || {};
        const businessProfile = businessProfileResult.data || {};

        // Extract and normalize context (businessProfile takes priority when available)
        const context: BusinessContext = {
            // Step 1: Business Foundation (prefer businessProfile from Step 1 wizard)
            businessName:
                project?.name ||
                businessProfile.offer_name ||
                intake.business_name ||
                "Your Business",
            businessType: intake.business_type || "coaching",
            industry:
                businessProfile.ideal_customer ||
                intake.industry ||
                intake.niche ||
                "business",
            targetAudience:
                businessProfile.ideal_customer ||
                intake.target_audience ||
                intake.ideal_customer ||
                "entrepreneurs",
            primaryOffer:
                businessProfile.offer_name ||
                intake.primary_offer ||
                offer.name ||
                "Training Program",

            // Step 2: Offer Definition (prefer businessProfile for offer details)
            productName:
                businessProfile.offer_name ||
                offer.name ||
                intake.program_name ||
                "Premium Training",
            pricePoint: businessProfile.pricing?.regular
                ? `$${businessProfile.pricing.regular}`
                : offer.price
                  ? `$${offer.price}`
                  : intake.price_point || "$997",
            pricingModel: offer.pricing_model || intake.pricing_model || "one-time",
            transformationPromise:
                businessProfile.transformation ||
                offer.transformation_promise ||
                intake.transformation ||
                "Transform your business with proven strategies",
            keyBenefits: extractBenefits(offer, intake, businessProfile),
            deliveryFormat:
                businessProfile.deliverables ||
                offer.delivery_format ||
                intake.format ||
                "online training",
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

            // Step 4: Audience Profile (prefer businessProfile from Step 1 wizard)
            idealCustomerAvatar:
                businessProfile.ideal_customer ||
                intake.ideal_customer_avatar ||
                intake.target_audience ||
                "Business owners looking to scale",
            painPoints: extractPainPoints(intake, deck, businessProfile),
            desires: extractDesires(intake, deck, businessProfile),
            objections: extractObjections(intake, deck, businessProfile),
            founderStory:
                businessProfile.struggle_story ||
                intake.founder_story ||
                intake.background ||
                "",

            // Additional context from deck
            trainingTitle: deck.metadata?.title || offer.name || project?.name,
            trainingType: "on-demand",
            trainingDuration: "90 minutes",
            modules: extractModules(deck),

            // Template style preference
            templateStyle,
        };

        logger.info(
            {
                projectId,
                hasIntake: !!intakeResult.data,
                hasBrand: !!brandResult.data,
                hasBusinessProfile: !!businessProfileResult.data,
            },
            "Aggregated funnel context"
        );

        return context;
    } catch (error) {
        logger.error({ error, projectId }, "Failed to aggregate funnel context");
        return null;
    }
}

/**
 * Extract benefits from offer, intake, and business profile data
 */
function extractBenefits(offer: any, intake: any, businessProfile: any): string[] {
    const benefits: string[] = [];

    // Prefer business profile benefits from Step 1 wizard
    if (businessProfile.benefits && Array.isArray(businessProfile.benefits)) {
        benefits.push(...businessProfile.benefits);
    }

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
 * Extract pain points from intake, deck, and business profile
 */
function extractPainPoints(intake: any, deck: any, businessProfile: any): string[] {
    const painPoints: string[] = [];

    // Prefer business profile pain points from Step 1 wizard
    if (businessProfile.pain_points && Array.isArray(businessProfile.pain_points)) {
        painPoints.push(...businessProfile.pain_points);
    }

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
 * Extract desires from intake, deck, and business profile
 */
function extractDesires(intake: any, deck: any, businessProfile: any): string[] {
    const desires: string[] = [];

    // Prefer business profile desires from Step 1 wizard
    if (businessProfile.desires && Array.isArray(businessProfile.desires)) {
        desires.push(...businessProfile.desires);
    }

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
 * Extract objections from intake, deck, and business profile
 */
function extractObjections(intake: any, deck: any, businessProfile: any): string[] {
    const objections: string[] = [];

    // Prefer business profile objections from Step 1 wizard
    if (businessProfile.objections && Array.isArray(businessProfile.objections)) {
        objections.push(...businessProfile.objections);
    }

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
 * Get template style guidance for AI generation
 */
function getTemplateStyleGuidance(
    templateStyle?: "urgency-convert" | "premium-elegant" | "value-focused"
): string {
    if (!templateStyle) return "";

    const styleGuidance: Record<string, string> = {
        "urgency-convert": `
## Design Style: Urgency Convert

Create a HIGH-ENERGY sales page with strong urgency and scarcity elements:
- Use countdown timers prominently (deadline-driven messaging)
- Bold, action-oriented headlines that create FOMO
- Scarcity messaging ("Only X spots left", "Doors closing soon")
- Vibrant, energetic color scheme with contrasting CTAs
- Multiple call-to-action buttons throughout the page
- Social proof with real-time indicators if possible
- Short, punchy paragraphs that drive action
- Risk reversal with money-back guarantee prominently displayed
- Limited-time bonuses or early-bird pricing`,

        "premium-elegant": `
## Design Style: Premium Elegant

Create a SOPHISTICATED, high-end sales page with refined aesthetics:
- Clean, minimalist layout with generous white space
- Elegant typography with clear hierarchy
- Muted, sophisticated color palette (navy, gold, cream)
- Subtle animations and smooth transitions
- High-quality imagery placeholders with premium feel
- Testimonials from notable/credible sources
- Focus on exclusivity and premium positioning
- Longer-form storytelling that builds value
- Understated but confident call-to-action
- Trust indicators that emphasize quality over urgency`,

        "value-focused": `
## Design Style: Value Focused

Create a BENEFIT-DRIVEN sales page that emphasizes ROI and transformation:
- Clear value proposition above the fold
- Comparison tables showing before/after or value stack
- ROI calculations and concrete outcome metrics
- Detailed breakdown of what's included
- Feature cards with tangible benefits
- Case studies with specific results and numbers
- Educational approach that informs before selling
- Trust-building through transparency
- Clear pricing with value justification
- Logical, structured layout that guides decision-making`,
    };

    return styleGuidance[templateStyle] || "";
}

/**
 * Format context as a prompt-ready string
 */
export function formatContextForPrompt(context: BusinessContext): string {
    const templateGuidance = getTemplateStyleGuidance(context.templateStyle);

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
${templateGuidance}
`.trim();
}
