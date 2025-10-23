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
export interface OfferGeneration {
    name: string;
    tagline: string;
    price: number;
    currency: string;
    features: string[];
    bonuses: string[];
    guarantee: string;
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
    extracted_data?: Record<string, unknown>;
}
