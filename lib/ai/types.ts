/**
 * AI Types
 * Type definitions for AI-generated content
 */

// Deck structure types
export interface Slide {
    slideNumber: number;
    title: string;
    description: string;
    section: "hook" | "problem" | "agitate" | "solution" | "offer" | "close";
}

export interface DeckStructure {
    slides: Slide[];
    totalSlides: number;
    sections: {
        hook: number;
        problem: number;
        agitate: number;
        solution: number;
        offer: number;
        close: number;
    };
}

// Offer types
export type OfferPathway = "book_call" | "direct_purchase";

export interface OfferGeneration {
    name: string;
    tagline: string;
    price: number;
    currency: string;
    features: string[];
    bonuses: string[];
    guarantee: string;
    // 7 P's Framework
    promise: string;
    person: string;
    process: string;
    purpose: string;
    pathway: OfferPathway;
}

// Sales copy types
export interface EnrollmentCopy {
    headline: string;
    subheadline: string;
    opening: string;
    problemSection: {
        heading: string;
        content: string;
    };
    solutionSection: {
        heading: string;
        content: string;
    };
    featuresHeading: string;
    ctaText: string;
    urgencyText: string;
}

// Talk track types
export interface TalkTrackSlide {
    slideNumber: number;
    script: string;
    duration: number;
    notes: string;
}

export interface TalkTrack {
    totalDuration: number;
    slides: TalkTrackSlide[];
}

// Registration page types
export interface RegistrationCopy {
    headline: string;
    subheadline: string;
    bulletPoints: string[];
    ctaText: string;
    trustStatement: string;
}

// Watch page types
export interface WatchPageCopy {
    headline: string;
    subheadline: string;
    watchPrompt: string;
    ctaText: string;
    ctaSubtext: string;
}

// AI generation options
export interface AIGenerationOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

// Transcript data
export interface TranscriptData {
    transcript_text: string;
    extracted_data?: {
        pricing?: Array<{
            amount: number;
            currency: string;
            context: string;
            confidence: string;
        }>;
        [key: string]: unknown;
    };
}

// Image generation types
export type ImageSize = "1024x1024" | "1792x1024" | "1024x1792";
export type ImageQuality = "standard" | "hd";

export interface ImageGenerationOptions {
    size?: ImageSize;
    quality?: ImageQuality;
    style?: "vivid" | "natural";
}

export interface GeneratedImage {
    url: string;
    revisedPrompt?: string;
}

// Brand design types
export interface BrandDesignGeneration {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    text_color: string;
    design_style:
        | "modern"
        | "classic"
        | "minimal"
        | "bold"
        | "vibrant"
        | "elegant"
        | "playful"
        | "professional";
    personality_traits: {
        tone:
            | "professional"
            | "friendly"
            | "authoritative"
            | "conversational"
            | "inspirational";
        mood: "confident" | "calm" | "energetic" | "serious" | "optimistic";
        energy: "dynamic" | "stable" | "bold" | "subtle" | "vibrant";
        values: string[];
    };
    rationale: string;
}
