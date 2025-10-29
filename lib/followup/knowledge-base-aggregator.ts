/**
 * Knowledge Base Aggregator Service
 *
 * Intelligently aggregates knowledge from multiple funnel sources:
 * - Intake transcripts (challenges, goals, objections)
 * - Offer definitions (product details, pricing)
 * - Deck structures (presentation content, proof elements)
 * - Enrollment pages (benefits, FAQs, testimonials)
 *
 * Builds comprehensive knowledge base for AI agent personalization.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { KnowledgeBase } from "@/types/followup";

interface AggregatedKnowledge {
    business_context: string[];
    product_details: string[];
    common_objections: string[];
    proof_elements: string[];
    testimonials: string[];
    sources: {
        intake_count: number;
        has_offer: boolean;
        has_deck: boolean;
        has_enrollment: boolean;
    };
}

/**
 * Extract challenges and objections from intake transcripts.
 */
async function extractIntakeInsights(funnelProjectId: string): Promise<{
    challenges: string[];
    goals: string[];
    objections: string[];
    count: number;
}> {
    const supabase = await createClient();

    const { data: transcripts, error } = await supabase
        .from("vapi_transcripts")
        .select("transcript_text, transcript_analysis")
        .eq("funnel_project_id", funnelProjectId)
        .order("created_at", { ascending: false })
        .limit(50); // Analyze recent transcripts

    if (error || !transcripts || transcripts.length === 0) {
        logger.info({ funnelProjectId }, "No intake transcripts found");
        return { challenges: [], goals: [], objections: [], count: 0 };
    }

    const challenges: Set<string> = new Set();
    const goals: Set<string> = new Set();
    const objections: Set<string> = new Set();

    for (const transcript of transcripts) {
        // Extract from analysis if available
        if (transcript.transcript_analysis) {
            const analysis =
                typeof transcript.transcript_analysis === "string"
                    ? JSON.parse(transcript.transcript_analysis)
                    : transcript.transcript_analysis;

            if (analysis.challenges) {
                if (Array.isArray(analysis.challenges)) {
                    analysis.challenges.forEach((c: string) => challenges.add(c));
                }
            }

            if (analysis.goals) {
                if (Array.isArray(analysis.goals)) {
                    analysis.goals.forEach((g: string) => goals.add(g));
                }
            }

            if (analysis.objections) {
                if (Array.isArray(analysis.objections)) {
                    analysis.objections.forEach((o: string) => objections.add(o));
                }
            }
        }

        // Basic keyword extraction from transcript text
        const text = transcript.transcript_text?.toLowerCase() || "";

        if (
            text.includes("challenge") ||
            text.includes("problem") ||
            text.includes("struggle")
        ) {
            // Extract sentence containing these keywords
            const sentences = text.split(/[.!?]+/);
            sentences.forEach((sentence) => {
                if (
                    sentence.includes("challenge") ||
                    sentence.includes("problem") ||
                    sentence.includes("struggle")
                ) {
                    const cleaned = sentence.trim().substring(0, 200);
                    if (cleaned.length > 20) {
                        challenges.add(cleaned);
                    }
                }
            });
        }
    }

    return {
        challenges: Array.from(challenges).slice(0, 10),
        goals: Array.from(goals).slice(0, 10),
        objections: Array.from(objections).slice(0, 10),
        count: transcripts.length,
    };
}

/**
 * Extract product details from offer.
 */
async function extractOfferDetails(offerId: string): Promise<{
    product_details: string[];
    price_context: string;
}> {
    const supabase = await createClient();

    const { data: offer, error } = await supabase
        .from("offers")
        .select("name, description, price, offer_type, benefits, delivery")
        .eq("id", offerId)
        .single();

    if (error || !offer) {
        logger.info({ offerId }, "No offer found");
        return { product_details: [], price_context: "" };
    }

    const details: string[] = [];

    if (offer.name) {
        details.push(`Product: ${offer.name}`);
    }

    if (offer.description) {
        details.push(`Description: ${offer.description}`);
    }

    if (offer.offer_type) {
        details.push(`Type: ${offer.offer_type}`);
    }

    if (offer.delivery) {
        details.push(`Delivery: ${offer.delivery}`);
    }

    if (offer.benefits) {
        if (Array.isArray(offer.benefits)) {
            offer.benefits.forEach((benefit: string) => {
                details.push(`Benefit: ${benefit}`);
            });
        } else if (typeof offer.benefits === "string") {
            details.push(`Benefits: ${offer.benefits}`);
        }
    }

    const price = Number(offer.price) || 0;
    const priceContext = `Price: $${price.toLocaleString()}`;

    return { product_details: details, price_context: priceContext };
}

/**
 * Extract proof elements from deck structure.
 */
async function extractDeckContent(funnelProjectId: string): Promise<{
    talking_points: string[];
    proof_elements: string[];
}> {
    const supabase = await createClient();

    const { data: deck, error } = await supabase
        .from("deck_structures")
        .select("slides, proof_elements, testimonials")
        .eq("funnel_project_id", funnelProjectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (error || !deck) {
        logger.info({ funnelProjectId }, "No deck structure found");
        return { talking_points: [], proof_elements: [] };
    }

    const talkingPoints: string[] = [];
    const proofElements: string[] = [];

    // Extract talking points from slides
    if (deck.slides && Array.isArray(deck.slides)) {
        deck.slides.forEach(
            (slide: { title?: string; content?: string; bullet_points?: string[] }) => {
                if (slide.title) {
                    talkingPoints.push(slide.title);
                }
                if (slide.content) {
                    talkingPoints.push(slide.content.substring(0, 200));
                }
                if (slide.bullet_points && Array.isArray(slide.bullet_points)) {
                    slide.bullet_points.forEach((point: string) => {
                        talkingPoints.push(point);
                    });
                }
            }
        );
    }

    // Extract proof elements
    if (deck.proof_elements) {
        if (Array.isArray(deck.proof_elements)) {
            proofElements.push(...deck.proof_elements);
        } else if (typeof deck.proof_elements === "string") {
            proofElements.push(deck.proof_elements);
        }
    }

    // Extract testimonials as proof
    if (deck.testimonials && Array.isArray(deck.testimonials)) {
        deck.testimonials.forEach(
            (testimonial: { quote?: string; author?: string }) => {
                if (testimonial.quote) {
                    const proof = testimonial.author
                        ? `${testimonial.quote} - ${testimonial.author}`
                        : testimonial.quote;
                    proofElements.push(proof);
                }
            }
        );
    }

    return {
        talking_points: talkingPoints.slice(0, 15),
        proof_elements: proofElements.slice(0, 10),
    };
}

/**
 * Extract testimonials and FAQs from enrollment page.
 */
async function extractEnrollmentContent(funnelProjectId: string): Promise<{
    testimonials: string[];
    faqs: string[];
    cta_copy: string[];
}> {
    const supabase = await createClient();

    const { data: page, error } = await supabase
        .from("enrollment_pages")
        .select("content, testimonials, faqs, cta_text")
        .eq("funnel_project_id", funnelProjectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (error || !page) {
        logger.info({ funnelProjectId }, "No enrollment page found");
        return { testimonials: [], faqs: [], cta_copy: [] };
    }

    const testimonials: string[] = [];
    const faqs: string[] = [];
    const ctaCopy: string[] = [];

    // Extract testimonials
    if (page.testimonials && Array.isArray(page.testimonials)) {
        page.testimonials.forEach(
            (testimonial: { quote?: string; author?: string; company?: string }) => {
                if (testimonial.quote) {
                    let formatted = testimonial.quote;
                    if (testimonial.author) {
                        formatted += ` - ${testimonial.author}`;
                    }
                    if (testimonial.company) {
                        formatted += `, ${testimonial.company}`;
                    }
                    testimonials.push(formatted);
                }
            }
        );
    }

    // Extract FAQs
    if (page.faqs && Array.isArray(page.faqs)) {
        page.faqs.forEach((faq: { question?: string; answer?: string }) => {
            if (faq.question && faq.answer) {
                faqs.push(`Q: ${faq.question} A: ${faq.answer}`);
            }
        });
    }

    // Extract CTA copy
    if (page.cta_text) {
        if (Array.isArray(page.cta_text)) {
            ctaCopy.push(...page.cta_text);
        } else if (typeof page.cta_text === "string") {
            ctaCopy.push(page.cta_text);
        }
    }

    return {
        testimonials: testimonials.slice(0, 10),
        faqs: faqs.slice(0, 10),
        cta_copy: ctaCopy.slice(0, 5),
    };
}

/**
 * Aggregate knowledge base from all funnel sources.
 *
 * Pulls data from intake, offer, deck, and enrollment to create
 * comprehensive knowledge base for AI agent.
 */
export async function aggregateKnowledgeBase(
    funnelProjectId: string,
    offerId: string
): Promise<{
    success: boolean;
    knowledge?: AggregatedKnowledge;
    error?: string;
}> {
    logger.info({ funnelProjectId, offerId }, "🧠 Aggregating knowledge base");

    try {
        // Fetch data from all sources in parallel
        const [intakeInsights, offerDetails, deckContent, enrollmentContent] =
            await Promise.all([
                extractIntakeInsights(funnelProjectId),
                extractOfferDetails(offerId),
                extractDeckContent(funnelProjectId),
                extractEnrollmentContent(funnelProjectId),
            ]);

        // Build business context
        const businessContext: string[] = [];

        // Add intake challenges and goals
        if (intakeInsights.challenges.length > 0) {
            businessContext.push("Common Challenges:");
            businessContext.push(...intakeInsights.challenges.map((c) => `- ${c}`));
        }

        if (intakeInsights.goals.length > 0) {
            businessContext.push("Customer Goals:");
            businessContext.push(...intakeInsights.goals.map((g) => `- ${g}`));
        }

        // Add deck talking points
        if (deckContent.talking_points.length > 0) {
            businessContext.push("Key Points from Presentation:");
            businessContext.push(...deckContent.talking_points.map((p) => `- ${p}`));
        }

        // Build product details
        const productDetails: string[] = [];
        productDetails.push(...offerDetails.product_details);

        if (offerDetails.price_context) {
            productDetails.push(offerDetails.price_context);
        }

        if (enrollmentContent.cta_copy.length > 0) {
            productDetails.push("Value Propositions:");
            productDetails.push(...enrollmentContent.cta_copy.map((c) => `- ${c}`));
        }

        // Build common objections (from intake + FAQs)
        const commonObjections: string[] = [];
        commonObjections.push(...intakeInsights.objections);

        if (enrollmentContent.faqs.length > 0) {
            commonObjections.push("From FAQs:");
            commonObjections.push(...enrollmentContent.faqs);
        }

        // Build proof elements
        const proofElements: string[] = [];
        proofElements.push(...deckContent.proof_elements);

        // Build testimonials
        const testimonials: string[] = [];
        testimonials.push(...enrollmentContent.testimonials);

        const aggregated: AggregatedKnowledge = {
            business_context: businessContext,
            product_details: productDetails,
            common_objections: commonObjections,
            proof_elements: proofElements,
            testimonials,
            sources: {
                intake_count: intakeInsights.count,
                has_offer: offerDetails.product_details.length > 0,
                has_deck: deckContent.talking_points.length > 0,
                has_enrollment: enrollmentContent.testimonials.length > 0,
            },
        };

        logger.info(
            {
                funnelProjectId,
                businessContextCount: businessContext.length,
                productDetailsCount: productDetails.length,
                objectionsCount: commonObjections.length,
                proofCount: proofElements.length,
                testimonialsCount: testimonials.length,
            },
            "✅ Knowledge base aggregated"
        );

        return { success: true, knowledge: aggregated };
    } catch (error) {
        logger.error(
            { error, funnelProjectId, offerId },
            "❌ Error aggregating knowledge base"
        );
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Update agent config with aggregated knowledge.
 *
 * Replaces knowledge_base field with freshly aggregated data.
 */
export async function updateAgentKnowledge(
    agentConfigId: string,
    funnelProjectId: string,
    offerId: string
): Promise<{ success: boolean; knowledge?: KnowledgeBase; error?: string }> {
    const result = await aggregateKnowledgeBase(funnelProjectId, offerId);

    if (!result.success || !result.knowledge) {
        return { success: false, error: result.error };
    }

    const supabase = await createClient();

    // Format as KnowledgeBase type
    const knowledgeBase: KnowledgeBase = {
        business_context: result.knowledge.business_context,
        product_details: result.knowledge.product_details,
        common_objections: result.knowledge.common_objections,
        proof_elements: result.knowledge.proof_elements,
        testimonials: result.knowledge.testimonials,
    };

    const { error } = await supabase
        .from("followup_agent_configs")
        .update({ knowledge_base: knowledgeBase })
        .eq("id", agentConfigId);

    if (error) {
        logger.error({ error, agentConfigId }, "❌ Failed to update agent knowledge");
        return { success: false, error: error.message };
    }

    logger.info({ agentConfigId }, "✅ Agent knowledge updated");

    return { success: true, knowledge: knowledgeBase };
}
