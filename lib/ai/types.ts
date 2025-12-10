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

// Brand design types - Basic color palette
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

// ============================================
// Comprehensive Brand Guidelines Types
// ============================================

// Visual Identity Section
export interface BrandFonts {
    primary_font: string;
    secondary_font: string;
    font_sizes: {
        h1: string;
        h2: string;
        h3: string;
        body: string;
        small: string;
    };
    font_weights: {
        heading: string;
        body: string;
        accent: string;
    };
}

export interface SizingHierarchy {
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    border_radius: {
        none: string;
        sm: string;
        md: string;
        lg: string;
        full: string;
    };
}

export interface DesignPreferences {
    imagery_style: string;
    icon_style: "outline" | "solid" | "duotone" | "hand-drawn";
    layout_preferences: string[];
    visual_density: "spacious" | "balanced" | "compact";
}

// Brand Voice & Tone Section
export interface ToneSpectrum {
    name: string;
    low_end: string;
    high_end: string;
    position: number; // 1-10 scale
    description: string;
}

export interface BrandVoice {
    personality_descriptors: string[];
    archetypes: {
        primary: string;
        secondary: string;
        description: string;
    };
    tone_spectrums: ToneSpectrum[];
    writing_guidelines: {
        do: string[];
        dont: string[];
    };
    word_lists: {
        power_words: string[];
        words_to_avoid: string[];
        industry_terms: string[];
    };
}

// Messaging Framework Section
export interface ValueProposition {
    headline: string;
    description: string;
    supporting_points: string[];
}

export interface CustomerJourneyMessage {
    stage: "awareness" | "consideration" | "decision" | "retention" | "advocacy";
    primary_message: string;
    emotional_trigger: string;
    call_to_action: string;
}

export interface MessagingFramework {
    positioning_statement: string;
    tagline: string;
    elevator_pitch: string;
    value_propositions: ValueProposition[];
    customer_journey_messages: CustomerJourneyMessage[];
    key_differentiators: string[];
}

// Brand Application Section
export interface BrandApplication {
    logo_usage: {
        clear_space: string;
        minimum_size: string;
        placement_guidelines: string[];
        background_rules: string[];
    };
    photography_style: {
        style: string;
        subjects: string[];
        color_treatment: string;
        composition_notes: string[];
    };
    illustration_style: {
        style: string;
        line_weight: string;
        color_usage: string;
        character_notes: string;
    };
    icon_style: {
        style: string;
        stroke_weight: string;
        corner_style: string;
        fill_style: string;
    };
    dos_and_donts: {
        dos: string[];
        donts: string[];
    };
}

// Comprehensive Brand Guidelines Generation (all four sections)
export interface ComprehensiveBrandGuidelines {
    // Visual Identity (existing + extended)
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    text_color: string;
    design_style: BrandDesignGeneration["design_style"];
    personality_traits: BrandDesignGeneration["personality_traits"];
    fonts: BrandFonts;
    sizing_hierarchy: SizingHierarchy;
    design_preferences: DesignPreferences;
    // Brand Voice & Tone
    brand_voice: BrandVoice;
    // Messaging Framework
    messaging_framework: MessagingFramework;
    // Brand Application
    brand_application: BrandApplication;
    // Generation metadata
    rationale: string;
}

// Wizard questionnaire types
export interface BrandWizardStep {
    id: string;
    title: string;
    description: string;
    questions: BrandWizardQuestion[];
}

export interface BrandWizardQuestion {
    id: string;
    type: "single_choice" | "multiple_choice" | "text" | "slider" | "color_picker";
    question: string;
    description?: string;
    options?: { value: string; label: string; description?: string }[];
    min?: number;
    max?: number;
    required?: boolean;
}

export interface BrandWizardResponses {
    [questionId: string]: string | string[] | number;
}

// Input method type
export type BrandInputMethod = "wizard" | "website" | "manual";
