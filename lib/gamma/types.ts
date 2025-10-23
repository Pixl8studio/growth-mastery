/**
 * Gamma API Types
 * Type definitions for Gamma presentation generation
 */

// Gamma theme configuration
export interface GammaTheme {
    id: string;
    name: string;
    description: string;
    thumbnailUrl: string;
    category?: string;
}

// Gamma deck generation request
export interface GammaDeckRequest {
    text: string; // Markdown or structured text
    theme?: string;
    title?: string;
}

// Gamma deck generation response
export interface GammaDeckResponse {
    sessionId: string;
    deckId: string;
    deckUrl: string;
    editUrl: string;
    thumbnailUrl?: string;
    status: "generating" | "ready" | "failed";
}

// Gamma session
export interface GammaSession {
    sessionId: string;
    status: "active" | "expired";
    createdAt: string;
    expiresAt?: string;
}

// Available Gamma themes (20 themes as per v2)
export const GAMMA_THEMES: GammaTheme[] = [
    {
        id: "alpine",
        name: "Alpine",
        description: "Clean and modern with blue tones",
        thumbnailUrl: "/gamma-themes/alpine.png",
        category: "professional",
    },
    {
        id: "aurora",
        name: "Aurora",
        description: "Vibrant gradient backgrounds",
        thumbnailUrl: "/gamma-themes/aurora.png",
        category: "creative",
    },
    {
        id: "botanical",
        name: "Botanical",
        description: "Nature-inspired with green accents",
        thumbnailUrl: "/gamma-themes/botanical.png",
        category: "organic",
    },
    {
        id: "corporate",
        name: "Corporate",
        description: "Professional business theme",
        thumbnailUrl: "/gamma-themes/corporate.png",
        category: "professional",
    },
    {
        id: "cosmic",
        name: "Cosmic",
        description: "Dark theme with purple accents",
        thumbnailUrl: "/gamma-themes/cosmic.png",
        category: "creative",
    },
    {
        id: "desert",
        name: "Desert",
        description: "Warm earth tones",
        thumbnailUrl: "/gamma-themes/desert.png",
        category: "warm",
    },
    {
        id: "elegant",
        name: "Elegant",
        description: "Sophisticated and minimal",
        thumbnailUrl: "/gamma-themes/elegant.png",
        category: "minimal",
    },
    {
        id: "forest",
        name: "Forest",
        description: "Deep greens and natural tones",
        thumbnailUrl: "/gamma-themes/forest.png",
        category: "organic",
    },
    {
        id: "glacier",
        name: "Glacier",
        description: "Cool blues and whites",
        thumbnailUrl: "/gamma-themes/glacier.png",
        category: "cool",
    },
    {
        id: "graphite",
        name: "Graphite",
        description: "Dark and professional",
        thumbnailUrl: "/gamma-themes/graphite.png",
        category: "dark",
    },
    {
        id: "minimal",
        name: "Minimal",
        description: "Clean and simple",
        thumbnailUrl: "/gamma-themes/minimal.png",
        category: "minimal",
    },
    {
        id: "modern",
        name: "Modern",
        description: "Contemporary design",
        thumbnailUrl: "/gamma-themes/modern.png",
        category: "professional",
    },
    {
        id: "ocean",
        name: "Ocean",
        description: "Deep blue water tones",
        thumbnailUrl: "/gamma-themes/ocean.png",
        category: "cool",
    },
    {
        id: "pastel",
        name: "Pastel",
        description: "Soft, gentle colors",
        thumbnailUrl: "/gamma-themes/pastel.png",
        category: "soft",
    },
    {
        id: "retro",
        name: "Retro",
        description: "Vintage-inspired design",
        thumbnailUrl: "/gamma-themes/retro.png",
        category: "creative",
    },
    {
        id: "sunset",
        name: "Sunset",
        description: "Warm oranges and pinks",
        thumbnailUrl: "/gamma-themes/sunset.png",
        category: "warm",
    },
    {
        id: "tech",
        name: "Tech",
        description: "Futuristic and digital",
        thumbnailUrl: "/gamma-themes/tech.png",
        category: "modern",
    },
    {
        id: "tropical",
        name: "Tropical",
        description: "Bright and vibrant",
        thumbnailUrl: "/gamma-themes/tropical.png",
        category: "vibrant",
    },
    {
        id: "urban",
        name: "Urban",
        description: "City-inspired with grays",
        thumbnailUrl: "/gamma-themes/urban.png",
        category: "modern",
    },
    {
        id: "vintage",
        name: "Vintage",
        description: "Classic and timeless",
        thumbnailUrl: "/gamma-themes/vintage.png",
        category: "classic",
    },
];
