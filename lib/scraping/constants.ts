/**
 * Constants for Web Scraping Services
 * Centralized configuration values to avoid magic numbers
 */

/**
 * Cache Time-To-Live (TTL) configuration
 */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
export const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours in seconds (for Redis)

/**
 * Default brand colors used when no colors are extracted
 */
export const DEFAULT_BRAND_COLORS = {
    PRIMARY: "#3B82F6", // Tailwind blue-500
    SECONDARY: "#8B5CF6", // Tailwind purple-500
    ACCENT: "#EC4899", // Tailwind pink-500
    BACKGROUND: "#FFFFFF", // White
    TEXT: "#1F2937", // Tailwind gray-800
};

/**
 * Brand extraction confidence thresholds
 */
export const COLOR_CONFIDENCE_THRESHOLD = 10; // Number of colors needed for 100% confidence
export const FONT_CONFIDENCE_BASE = 50; // Base confidence when font family is found

/**
 * Fetch retry configuration defaults
 * Optimized for serverless function limits (60 second max on Vercel Pro)
 */
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_INITIAL_DELAY_MS = 1000; // 1 second
export const DEFAULT_MAX_DELAY_MS = 5000; // 5 seconds
export const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds (reduced from 30s for serverless compatibility)

/**
 * Rate limiting configuration
 */
export const SCRAPING_RATE_LIMIT = 10; // Requests per minute for scraping
export const BRAND_COLORS_RATE_LIMIT = 20; // Requests per minute for brand colors
export const RATE_LIMIT_WINDOW = "1 m" as const; // 1 minute window

/**
 * Content extraction limits
 */
export const MAX_INSTAGRAM_POSTS = 20;
export const MAX_LINKEDIN_POSTS = 10;
export const MAX_TWEETS = 50;
export const MAX_FACEBOOK_POSTS = 20;

/**
 * Color distance thresholds for grouping similar colors
 */
export const COLOR_DISTANCE_THRESHOLD = 30; // HSL color space distance

/**
 * Grayscale detection threshold
 */
export const GRAYSCALE_RGB_DIFF_THRESHOLD = 10; // Max difference between R, G, B for grayscale

/**
 * Extreme shade thresholds (near white/black)
 */
export const EXTREME_LIGHT_THRESHOLD = 240; // Brightness above this is considered too light
export const EXTREME_DARK_THRESHOLD = 20; // Brightness below this is considered too dark
