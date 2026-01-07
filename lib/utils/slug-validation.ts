/**
 * Slug Validation Utilities
 * Provides comprehensive validation for URL slugs including:
 * - Homograph attack prevention (Cyrillic, Greek, fullwidth characters)
 * - Reserved slug protection
 * - Format validation
 *
 * Addresses PR #414 concerns about slug collision and security.
 */

/**
 * Homograph normalization map
 * Converts lookalike characters from other scripts to their ASCII equivalents
 * This prevents homograph attacks where "pаypal" (with Cyrillic 'а') looks like "paypal"
 */
const HOMOGRAPH_MAP: Record<string, string> = {
    // Cyrillic lookalikes
    а: "a",
    е: "e",
    о: "o",
    р: "p",
    с: "c",
    х: "x",
    у: "y",
    А: "a",
    В: "b",
    Е: "e",
    К: "k",
    М: "m",
    Н: "h",
    О: "o",
    Р: "p",
    С: "c",
    Т: "t",
    Х: "x",
    і: "i",
    ї: "i",

    // Greek lookalikes
    α: "a",
    β: "b",
    γ: "y",
    ε: "e",
    η: "n",
    ι: "i",
    κ: "k",
    ν: "v",
    ο: "o",
    ρ: "p",
    τ: "t",
    υ: "u",
    χ: "x",
    Α: "a",
    Β: "b",
    Ε: "e",
    Η: "h",
    Ι: "i",
    Κ: "k",
    Μ: "m",
    Ν: "n",
    Ο: "o",
    Ρ: "p",
    Τ: "t",
    Χ: "x",
    Υ: "y",

    // Fullwidth ASCII
    ａ: "a",
    ｂ: "b",
    ｃ: "c",
    ｄ: "d",
    ｅ: "e",
    ｆ: "f",
    ｇ: "g",
    ｈ: "h",
    ｉ: "i",
    ｊ: "j",
    ｋ: "k",
    ｌ: "l",
    ｍ: "m",
    ｎ: "n",
    ｏ: "o",
    ｐ: "p",
    ｑ: "q",
    ｒ: "r",
    ｓ: "s",
    ｔ: "t",
    ｕ: "u",
    ｖ: "v",
    ｗ: "w",
    ｘ: "x",
    ｙ: "y",
    ｚ: "z",
    "０": "0",
    "１": "1",
    "２": "2",
    "３": "3",
    "４": "4",
    "５": "5",
    "６": "6",
    "７": "7",
    "８": "8",
    "９": "9",
    "－": "-",
};

/**
 * Reserved slugs that cannot be used for pages
 * Includes system routes, API paths, and common reserved words
 */
const RESERVED_SLUGS = new Set([
    // System routes
    "api",
    "auth",
    "login",
    "logout",
    "signup",
    "register",
    "admin",
    "dashboard",
    "settings",
    "profile",
    "account",
    "app",
    "apps",

    // Static assets
    "static",
    "assets",
    "images",
    "img",
    "css",
    "js",
    "fonts",
    "media",

    // Common reserved
    "about",
    "help",
    "support",
    "contact",
    "terms",
    "privacy",
    "legal",
    "blog",
    "news",
    "press",
    "careers",
    "jobs",

    // Technical routes
    "health",
    "status",
    "ping",
    "webhook",
    "webhooks",
    "callback",
    "oauth",
    "sso",

    // Product-specific
    "funnel",
    "funnels",
    "page",
    "pages",
    "editor",
    "preview",
    "p", // Used for published page URLs
    "ai-editor",
    "funnel-builder",
    "marketing",
    "watch",
    "enrollment",
    "registration",
]);

/**
 * Normalize a slug by converting homograph characters to ASCII
 * @example normalizeSlug("pаypal") // "paypal" (Cyrillic 'а' → ASCII 'a')
 */
export function normalizeSlug(slug: string): string {
    let normalized = slug.toLowerCase().trim();

    // Replace homograph characters
    for (const [lookalike, ascii] of Object.entries(HOMOGRAPH_MAP)) {
        normalized = normalized.replaceAll(lookalike, ascii);
    }

    // Remove any remaining non-ASCII characters
    normalized = normalized.replace(/[^a-z0-9-]/g, "-");

    // Collapse multiple hyphens
    normalized = normalized.replace(/-+/g, "-");

    // Remove leading/trailing hyphens
    normalized = normalized.replace(/^-+|-+$/g, "");

    return normalized;
}

/**
 * Check if a slug is reserved
 * Normalizes the slug before checking to prevent homograph attacks
 */
export function isReservedSlug(slug: string): boolean {
    const normalized = normalizeSlug(slug);
    return RESERVED_SLUGS.has(normalized);
}

/**
 * Validate slug format
 * Returns an error message if invalid, or null if valid
 *
 * Rules:
 * - 3-100 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Must start and end with a letter or number
 * - No consecutive hyphens
 */
export function validateSlugFormat(slug: string): string | null {
    if (!slug || typeof slug !== "string") {
        return "Slug is required";
    }

    const normalized = normalizeSlug(slug);

    if (normalized.length < 3) {
        return "Slug must be at least 3 characters";
    }

    if (normalized.length > 100) {
        return "Slug must be less than 100 characters";
    }

    // Check for valid characters (after normalization)
    if (!/^[a-z0-9-]+$/.test(normalized)) {
        return "Slug can only contain lowercase letters, numbers, and hyphens";
    }

    // Must start and end with letter or number
    if (!/^[a-z0-9]/.test(normalized)) {
        return "Slug must start with a letter or number";
    }

    if (!/[a-z0-9]$/.test(normalized)) {
        return "Slug must end with a letter or number";
    }

    // No consecutive hyphens
    if (/--/.test(normalized)) {
        return "Slug cannot contain consecutive hyphens";
    }

    return null;
}

/**
 * Generate a unique slug by appending a random suffix
 * Useful when handling collisions
 */
export function generateUniqueSlug(baseSlug: string): string {
    const normalized = normalizeSlug(baseSlug);
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${normalized}-${suffix}`;
}

/**
 * Sanitize user input to create a valid slug
 * Converts spaces to hyphens and removes invalid characters
 */
export function sanitizeToSlug(input: string): string {
    return normalizeSlug(
        input
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "-")
    );
}
