/**
 * Application Configuration
 * Centralized configuration constants and settings
 */

export const APP_CONFIG = {
    name: "Growth Mastery AI",
    description: "AI-Powered Funnel Builder",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
} as const;

export const FUNNEL_CONFIG = {
    totalSteps: 14,
    stepNames: [
        "AI Intake Call",
        "Define Offer",
        "Brand Design",
        "Deck Structure",
        "Gamma Presentation",
        "Enrollment Page",
        "Talk Track",
        "Upload Video",
        "Watch Page",
        "Registration Page",
        "Flow Configuration",
        "AI Follow-Up",
        "Marketing Content",
        "Analytics",
    ],
    deckStructure: {
        totalSlides: 55,
        sections: ["hook", "problem", "agitate", "solution", "offer", "close"] as const,
    },
    videoEngagement: {
        milestones: [25, 50, 75, 100] as const,
        segmentThresholds: {
            didntEngage: [0, 25],
            partiallyEngaged: [25, 50],
            highlyEngaged: [50, 75],
            veryInterested: [75, 100],
            hotLead: 100,
        },
    },
} as const;

export const PAGE_CONFIG = {
    types: {
        registration: "registration",
        watch: "watch",
        enrollment: "enrollment",
    },
    enrollmentTypes: {
        directPurchase: "direct_purchase",
        bookCall: "book_call",
    },
    defaultPriceThreshold: 2000, // $2k threshold for enrollment page type
} as const;

export const USERNAME_CONFIG = {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/,
    validationMessage:
        "Username must be 3-30 characters, lowercase letters, numbers, and hyphens only",
} as const;

export const VANITY_SLUG_CONFIG = {
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    validationMessage: "Slug can only contain lowercase letters, numbers, and hyphens",
} as const;

export const STRIPE_CONFIG = {
    platformFeePercent: Number(process.env.STRIPE_PLATFORM_FEE_PERCENT) || 20,
    platformFeeFixed: Number(process.env.STRIPE_PLATFORM_FEE_FIXED) || 50, // in cents
    currency: "USD",
} as const;

export const WEBHOOK_CONFIG = {
    maxRetries: 3,
    retryDelayMs: 1000,
    retryBackoffMultiplier: 2,
    timeoutMs: 30000, // 30 seconds
} as const;

export const ANALYTICS_CONFIG = {
    eventTypes: {
        pageView: "page_view",
        videoStart: "video_start",
        videoProgress: "video_progress",
        videoComplete: "video_complete",
        ctaClick: "cta_click",
        formSubmit: "form_submit",
        purchase: "purchase",
    },
    pageTypes: {
        registration: "registration",
        watch: "watch",
        enrollment: "enrollment",
    },
} as const;

export const CONTACT_CONFIG = {
    stages: {
        registered: "registered",
        watched: "watched",
        enrolled: "enrolled",
        purchased: "purchased",
    },
    defaultTags: [] as string[],
} as const;

export const AI_CONFIG = {
    models: {
        default: "gpt-4-turbo-preview",
        fast: "gpt-3.5-turbo",
        vision: "gpt-4-vision-preview",
    },
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
} as const;

export const VIDEO_CONFIG = {
    providers: {
        cloudflare: "cloudflare",
        youtube: "youtube",
        vimeo: "vimeo",
    },
    processingStatuses: {
        uploaded: "uploaded",
        processing: "processing",
        ready: "ready",
        failed: "failed",
    },
} as const;

export const PROJECT_STATUS = {
    draft: "draft",
    active: "active",
    archived: "archived",
} as const;

export const PAGINATION = {
    defaultPageSize: 20,
    maxPageSize: 100,
} as const;

export const VALIDATION = {
    maxNameLength: 100,
    maxDescriptionLength: 500,
    maxNotesLength: 2000,
    maxEmailLength: 255,
    maxPhoneLength: 20,
    maxUrlLength: 2048,
} as const;
