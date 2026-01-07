/**
 * Slug Validation Constants
 * Centralized list of reserved slugs and validation utilities
 */

/**
 * Reserved slugs that cannot be used for user pages
 * These are system routes and common navigation paths
 */
export const RESERVED_SLUGS = [
    // System routes
    "api",
    "admin",
    "auth",
    "login",
    "signup",
    "register",
    "logout",
    "dashboard",
    "settings",
    "profile",
    "account",
    "billing",
    // Static pages
    "help",
    "support",
    "docs",
    "blog",
    "about",
    "contact",
    "privacy",
    "terms",
    // AI Editor routes
    "ai-editor",
    "funnel",
    "funnels",
    "project",
    "projects",
    "page",
    "pages",
    "p",
    "preview",
] as const;

export type ReservedSlug = (typeof RESERVED_SLUGS)[number];

/**
 * Common Unicode homograph substitutions
 * Maps visually similar Unicode characters to their ASCII equivalents
 * This prevents attacks like using Cyrillic 'а' (U+0430) instead of Latin 'a'
 */
const HOMOGRAPH_MAP: Record<string, string> = {
    // Cyrillic lookalikes
    а: "a", // Cyrillic small letter a
    е: "e", // Cyrillic small letter ie
    о: "o", // Cyrillic small letter o
    р: "p", // Cyrillic small letter er
    с: "c", // Cyrillic small letter es
    х: "x", // Cyrillic small letter ha
    у: "y", // Cyrillic small letter u
    // Greek lookalikes
    ο: "o", // Greek small letter omicron
    // Other common substitutions
    ı: "i", // Latin small letter dotless i
    ℓ: "l", // Script small l
    "０": "0", // Fullwidth digit zero
    "１": "1", // Fullwidth digit one
};

/**
 * Normalize a string to prevent Unicode homograph attacks
 * Converts visually similar Unicode characters to ASCII equivalents
 * and normalizes to NFC form for consistent comparison
 */
export function normalizeHomographs(input: string): string {
    // First, normalize to NFC form (canonical composition)
    let normalized = input.normalize("NFC");

    // Replace known homograph characters
    for (const [unicode, ascii] of Object.entries(HOMOGRAPH_MAP)) {
        normalized = normalized.replace(new RegExp(unicode, "g"), ascii);
    }

    return normalized;
}

/**
 * Check if a slug is reserved
 * Normalizes the slug to prevent Unicode homograph bypass attacks
 *
 * @param slug - The slug to check
 * @returns true if the slug is reserved (including homograph variants)
 */
export function isReservedSlug(slug: string): boolean {
    // Normalize to prevent homograph attacks (e.g., Cyrillic 'а' for Latin 'a')
    const normalized = normalizeHomographs(slug.toLowerCase());
    return RESERVED_SLUGS.includes(normalized as ReservedSlug);
}

/**
 * Validate slug format
 * Returns validation result with error message if invalid
 */
export function validateSlugFormat(
    slug: string
): { valid: true } | { valid: false; error: string } {
    if (!slug) {
        return { valid: false, error: "Slug is required" };
    }

    if (slug.length < 3) {
        return { valid: false, error: "Slug must be at least 3 characters" };
    }

    if (slug.length > 50) {
        return { valid: false, error: "Slug must be 50 characters or less" };
    }

    // Only allow lowercase letters, numbers, and hyphens
    if (!/^[a-z0-9-]+$/.test(slug)) {
        return {
            valid: false,
            error: "Slug can only contain lowercase letters, numbers, and hyphens",
        };
    }

    return { valid: true };
}
