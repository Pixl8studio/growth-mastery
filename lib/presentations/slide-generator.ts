/**
 * AI Slide Generator
 * Uses OpenAI to generate slide content based on deck structure and customization
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 */

import OpenAI from "openai";

import { logger } from "@/lib/logger";

import type { SlideData } from "./pptx-generator";

export interface DeckStructureSlide {
    slideNumber: number;
    title: string;
    description: string;
    section: string;
}

export interface DeckStructure {
    id: string;
    title: string;
    slideCount: number;
    slides: DeckStructureSlide[];
}

export interface BusinessProfile {
    business_name?: string;
    target_audience?: string;
    main_offer?: string;
    unique_mechanism?: string;
    brand_voice?: string;
}

export interface BrandDesign {
    brand_name?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    background_color?: string;
    text_color?: string;
}

export interface PresentationCustomization {
    textDensity: "minimal" | "balanced" | "detailed";
    visualStyle: "professional" | "creative" | "minimal" | "bold";
    emphasisPreference: "text" | "visuals" | "balanced";
    animationLevel: "none" | "subtle" | "moderate" | "dynamic";
    imageStyle: "photography" | "illustration" | "abstract" | "icons";
}

export interface GenerateSlideOptions {
    deckSlide: DeckStructureSlide;
    customization: PresentationCustomization;
    businessProfile?: BusinessProfile;
    brandDesign?: BrandDesign;
    previousSlides?: SlideData[];
}

export interface GeneratePresentationOptions {
    deckStructure: DeckStructure;
    customization: PresentationCustomization;
    businessProfile?: BusinessProfile;
    brandDesign?: BrandDesign;
    onSlideGenerated?: (slide: SlideData, progress: number) => void;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Map layout types based on slide content and position
function determineLayoutType(
    slide: DeckStructureSlide,
    index: number,
    total: number
): SlideData["layoutType"] {
    const title = slide.title.toLowerCase();
    const section = slide.section?.toLowerCase() || "";

    // First slide is title
    if (index === 0) return "title";

    // Last slide is usually CTA
    if (index === total - 1) return "cta";

    // Section headers
    if (title.includes("section") || title.includes("part") || title === section) {
        return "section";
    }

    // Quote slides
    if (title.includes("quote") || title.includes("testimonial")) {
        return "quote";
    }

    // Statistics slides
    if (
        title.includes("statistic") ||
        title.includes("number") ||
        title.includes("data")
    ) {
        return "statistics";
    }

    // Comparison slides
    if (
        title.includes("vs") ||
        title.includes("comparison") ||
        title.includes("before") ||
        title.includes("after")
    ) {
        return "comparison";
    }

    // Process slides
    if (
        title.includes("step") ||
        title.includes("process") ||
        title.includes("how to")
    ) {
        return "process";
    }

    // Default to bullets for content
    return "bullets";
}

// Get bullet point count based on text density
function getBulletCount(textDensity: "minimal" | "balanced" | "detailed"): {
    min: number;
    max: number;
} {
    switch (textDensity) {
        case "minimal":
            return { min: 2, max: 3 };
        case "balanced":
            return { min: 3, max: 5 };
        case "detailed":
            return { min: 5, max: 7 };
    }
}

/**
 * Generate content for a single slide using AI
 */
export async function generateSlideContent(
    options: GenerateSlideOptions
): Promise<SlideData> {
    const { deckSlide, customization, businessProfile, brandDesign } = options;

    const bulletCount = getBulletCount(customization.textDensity);

    const businessContext = businessProfile
        ? `
Business Context:
- Business Name: ${businessProfile.business_name || "Not specified"}
- Target Audience: ${businessProfile.target_audience || "Not specified"}
- Main Offer: ${businessProfile.main_offer || "Not specified"}
- Unique Mechanism: ${businessProfile.unique_mechanism || "Not specified"}
- Brand Voice: ${businessProfile.brand_voice || "Professional and engaging"}
`
        : "";

    const styleGuidance = `
Style Guidelines:
- Text Density: ${customization.textDensity} (${bulletCount.min}-${bulletCount.max} bullet points per slide)
- Visual Style: ${customization.visualStyle}
- Emphasis: ${customization.emphasisPreference === "text" ? "Focus on clear, impactful text" : customization.emphasisPreference === "visuals" ? "Keep text minimal, suggest strong visuals" : "Balance text and visual elements"}
`;

    const prompt = `Generate compelling slide content for a presentation slide.

${businessContext}
${styleGuidance}

Slide Information:
- Title: ${deckSlide.title}
- Description/Purpose: ${deckSlide.description}
- Section: ${deckSlide.section}

Generate the following for this slide:
1. A refined title (keep it concise and impactful)
2. ${bulletCount.min}-${bulletCount.max} bullet points that support the slide's purpose
3. Speaker notes (2-3 sentences of what the presenter should say)
4. An image prompt describing a relevant visual (for AI image generation)

Respond in JSON format:
{
  "title": "Refined slide title",
  "content": ["Bullet point 1", "Bullet point 2", ...],
  "speakerNotes": "Speaker notes text",
  "imagePrompt": "Description for AI image generation"
}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert presentation designer creating content for a professional business presentation. Generate clear, compelling content that engages the audience. Always respond with valid JSON.",
                },
                { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No content generated");
        }

        const generated = JSON.parse(content);

        return {
            slideNumber: deckSlide.slideNumber,
            title: generated.title || deckSlide.title,
            content: generated.content || [deckSlide.description],
            speakerNotes: generated.speakerNotes || "",
            imagePrompt: generated.imagePrompt,
            layoutType: determineLayoutType(
                deckSlide,
                deckSlide.slideNumber - 1,
                options.previousSlides?.length || 10
            ),
            section: deckSlide.section,
        };
    } catch (error) {
        logger.error(
            { error, slideNumber: deckSlide.slideNumber },
            "Failed to generate slide content"
        );

        // Fallback to basic content
        return {
            slideNumber: deckSlide.slideNumber,
            title: deckSlide.title,
            content: [deckSlide.description],
            speakerNotes: `Discuss ${deckSlide.title} with the audience.`,
            layoutType: determineLayoutType(deckSlide, deckSlide.slideNumber - 1, 10),
            section: deckSlide.section,
        };
    }
}

/**
 * Generate all slides for a presentation
 */
export async function generatePresentation(
    options: GeneratePresentationOptions
): Promise<SlideData[]> {
    const {
        deckStructure,
        customization,
        businessProfile,
        brandDesign,
        onSlideGenerated,
    } = options;

    logger.info(
        {
            deckId: deckStructure.id,
            slideCount: deckStructure.slides.length,
            customization,
        },
        "Starting presentation generation"
    );

    const slides: SlideData[] = [];
    const totalSlides = deckStructure.slides.length;

    for (let i = 0; i < totalSlides; i++) {
        const deckSlide = deckStructure.slides[i];

        const slide = await generateSlideContent({
            deckSlide,
            customization,
            businessProfile,
            brandDesign,
            previousSlides: slides,
        });

        slides.push(slide);

        const progress = Math.round(((i + 1) / totalSlides) * 100);

        if (onSlideGenerated) {
            onSlideGenerated(slide, progress);
        }

        logger.info({ slideNumber: slide.slideNumber, progress }, "Slide generated");

        // Small delay to avoid rate limiting
        if (i < totalSlides - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }

    logger.info({ totalSlides: slides.length }, "Presentation generation complete");

    return slides;
}

/**
 * Regenerate a single slide with AI
 */
export async function regenerateSlide(
    slide: SlideData,
    instruction: string,
    businessProfile?: BusinessProfile,
    brandDesign?: BrandDesign
): Promise<SlideData> {
    const prompt = `Modify this presentation slide based on the following instruction:

Current Slide:
- Title: ${slide.title}
- Content: ${slide.content.join("; ")}
- Speaker Notes: ${slide.speakerNotes}

User Instruction: ${instruction}

Generate updated content in JSON format:
{
  "title": "Updated title",
  "content": ["Updated bullet 1", "Updated bullet 2", ...],
  "speakerNotes": "Updated speaker notes",
  "imagePrompt": "Updated image description"
}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert presentation designer. Modify the slide content based on the user's instruction while maintaining professionalism. Always respond with valid JSON.",
                },
                { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No content generated");
        }

        const generated = JSON.parse(content);

        return {
            ...slide,
            title: generated.title || slide.title,
            content: generated.content || slide.content,
            speakerNotes: generated.speakerNotes || slide.speakerNotes,
            imagePrompt: generated.imagePrompt,
        };
    } catch (error) {
        logger.error(
            { error, slideNumber: slide.slideNumber },
            "Failed to regenerate slide"
        );
        throw error;
    }
}
