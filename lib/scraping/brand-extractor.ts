/**
 * Brand Extractor Service
 * Extracts colors, fonts, and visual brand elements from websites
 */

import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import * as cheerio from "cheerio";
import {
    DEFAULT_BRAND_COLORS,
    COLOR_CONFIDENCE_THRESHOLD,
    FONT_CONFIDENCE_BASE,
    GRAYSCALE_RGB_DIFF_THRESHOLD,
    EXTREME_LIGHT_THRESHOLD,
    EXTREME_DARK_THRESHOLD,
} from "./constants";

/**
 * Timeout for fetching external CSS files (3 seconds)
 * Reduced from 5s to ensure total operation completes within serverless limits
 */
const CSS_FETCH_TIMEOUT_MS = 3000;

/**
 * Maximum number of external CSS files to fetch
 */
const MAX_EXTERNAL_CSS_FILES = 10;

/**
 * Color information with frequency and context
 */
interface ColorInfo {
    color: string; // Hex format
    frequency: number;
    weight: number; // Weighted by element importance
    contexts: string[]; // Where the color appears (button, header, etc.)
    isBrandVariable?: boolean; // True if from a CSS variable with brand-related name
    brandRole?: "primary" | "secondary" | "accent"; // Explicit role from CSS variable name
}

/**
 * Extracted brand data
 */
export interface BrandData {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    fonts: {
        primary?: string;
        secondary?: string;
        weights: string[];
    };
    style: {
        borderRadius?: string;
        shadows?: boolean;
        gradients?: boolean;
    };
    confidence: {
        colors: number; // 0-100
        fonts: number; // 0-100
        overall: number; // 0-100
    };
}

/**
 * Convert RGB(A) to Hex
 */
function rgbToHex(rgb: string): string | null {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!match) return null;

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

/**
 * Convert HSL to Hex
 */
function hslToHex(hsl: string): string | null {
    const match = hsl.match(/hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*[\d.]+)?\)/);
    if (!match) return null;

    const h = parseInt(match[1]) / 360;
    const s = parseFloat(match[2]) / 100;
    const l = parseFloat(match[3]) / 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Normalize any color format to Hex
 */
function normalizeColor(color: string): string | null {
    const trimmed = color.trim().toLowerCase();

    // Already hex
    if (trimmed.startsWith("#")) {
        // Expand shorthand hex (#abc -> #aabbcc)
        if (trimmed.length === 4) {
            return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
        }
        return trimmed.toUpperCase();
    }

    // RGB/RGBA
    if (trimmed.startsWith("rgb")) {
        return rgbToHex(trimmed);
    }

    // HSL/HSLA
    if (trimmed.startsWith("hsl")) {
        return hslToHex(trimmed);
    }

    // Named colors (common ones)
    const namedColors: Record<string, string> = {
        white: "#FFFFFF",
        black: "#000000",
        red: "#FF0000",
        green: "#008000",
        blue: "#0000FF",
        yellow: "#FFFF00",
        purple: "#800080",
        orange: "#FFA500",
        pink: "#FFC0CB",
        gray: "#808080",
        grey: "#808080",
    };

    return namedColors[trimmed] || null;
}

/**
 * Resolve a relative URL to an absolute URL
 */
function resolveUrl(relativeUrl: string, baseUrl: string): string | null {
    try {
        // Handle protocol-relative URLs (//example.com/style.css)
        if (relativeUrl.startsWith("//")) {
            const base = new URL(baseUrl);
            return `${base.protocol}${relativeUrl}`;
        }

        // Handle absolute URLs
        if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
            return relativeUrl;
        }

        // Resolve relative URLs
        return new URL(relativeUrl, baseUrl).href;
    } catch {
        logger.debug({ relativeUrl, baseUrl }, "Failed to resolve URL");
        return null;
    }
}

/**
 * Extract external CSS URLs from HTML
 */
function extractCssUrls($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const cssUrls: string[] = [];

    // Find all <link rel="stylesheet"> tags
    $('link[rel="stylesheet"], link[rel="preload"][as="style"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
            const resolvedUrl = resolveUrl(href, baseUrl);
            if (resolvedUrl && !cssUrls.includes(resolvedUrl)) {
                cssUrls.push(resolvedUrl);
            }
        }
    });

    // Find @import statements in inline styles
    $("style").each((_, el) => {
        const css = $(el).html() || "";
        const importRegex =
            /@import\s+(?:url\(['"]?([^'")\s]+)['"]?\)|['"]([^'"]+)['"])/gi;
        let match;
        while ((match = importRegex.exec(css)) !== null) {
            const importUrl = match[1] || match[2];
            if (importUrl) {
                const resolvedUrl = resolveUrl(importUrl, baseUrl);
                if (resolvedUrl && !cssUrls.includes(resolvedUrl)) {
                    cssUrls.push(resolvedUrl);
                }
            }
        }
    });

    return cssUrls.slice(0, MAX_EXTERNAL_CSS_FILES);
}

/**
 * Fetch an external CSS file with timeout and error handling
 * Returns null if the fetch fails (CORS, timeout, etc.)
 */
async function fetchExternalCss(url: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CSS_FETCH_TIMEOUT_MS);

        const response = await fetch(url, {
            headers: {
                Accept: "text/css,*/*;q=0.1",
                "User-Agent":
                    "Mozilla/5.0 (compatible; GrowthMastery/1.0; +https://growthmastery.ai)",
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.debug(
                { url, status: response.status },
                "Failed to fetch external CSS (non-OK status)"
            );
            return null;
        }

        const css = await response.text();
        logger.debug({ url, length: css.length }, "Fetched external CSS");
        return css;
    } catch (error) {
        // Expected failures: CORS, timeout, network errors
        // These are gracefully handled by returning null
        logger.debug(
            { url, error: error instanceof Error ? error.message : String(error) },
            "Failed to fetch external CSS (expected in some cases due to CORS)"
        );
        return null;
    }
}

/**
 * Extract CSS variables (custom properties) from CSS text
 */
function extractCssVariables(css: string): Map<string, string> {
    const variables = new Map<string, string>();

    // Match CSS custom property definitions: --name: value;
    const varRegex = /--([\w-]+)\s*:\s*([^;}\n]+)/gi;
    let match;

    while ((match = varRegex.exec(css)) !== null) {
        const name = match[1].toLowerCase();
        const value = match[2].trim();

        // Only store color-related variables
        const colorKeywords = [
            "color",
            "bg",
            "background",
            "primary",
            "secondary",
            "accent",
            "brand",
        ];
        const isColorVariable = colorKeywords.some((keyword) => name.includes(keyword));

        // Or if the value looks like a color
        const isColorValue =
            value.startsWith("#") ||
            value.startsWith("rgb") ||
            value.startsWith("hsl") ||
            /^(red|blue|green|yellow|purple|orange|pink|gray|grey|white|black)$/i.test(
                value
            );

        if (isColorVariable || isColorValue) {
            variables.set(`--${name}`, value);
        }
    }

    return variables;
}

/**
 * Extract colors from CSS text (for both inline styles and external CSS)
 */
function extractColorsFromCss(css: string, colorMap: Map<string, ColorInfo>): void {
    // Extract standard color properties
    const colorRegex =
        /(background-color|color|border-color|fill|stroke):\s*([^;}]+)/gi;
    let match;

    while ((match = colorRegex.exec(css)) !== null) {
        const color = normalizeColor(match[2]);
        if (color) {
            const existing = colorMap.get(color);
            if (existing) {
                existing.frequency++;
                existing.weight += 2;
            } else {
                colorMap.set(color, {
                    color,
                    frequency: 1,
                    weight: 2,
                    contexts: ["css"],
                });
            }
        }
    }

    // Extract CSS variables that contain color values
    const cssVariables = extractCssVariables(css);
    for (const [varName, varValue] of cssVariables) {
        const color = normalizeColor(varValue);
        if (color) {
            const existing = colorMap.get(color);
            // CSS variables for primary/brand colors get higher weight
            const isPrimaryVar = /primary|brand|main/i.test(varName);
            const isSecondaryVar = /secondary/i.test(varName);
            const isAccentVar = /accent/i.test(varName);
            const isBrandVariable = isPrimaryVar || isSecondaryVar || isAccentVar;

            // Determine explicit brand role from variable name
            let brandRole: "primary" | "secondary" | "accent" | undefined;
            if (isPrimaryVar) brandRole = "primary";
            else if (isSecondaryVar) brandRole = "secondary";
            else if (isAccentVar) brandRole = "accent";

            // Brand variables get significantly higher weight to ensure they're prioritized
            const weight = isBrandVariable ? 25 : 4;

            if (existing) {
                existing.frequency++;
                existing.weight += weight;
                if (!existing.contexts.includes("css-variable")) {
                    existing.contexts.push("css-variable");
                }
                // Mark as brand variable if this CSS variable is brand-related
                if (isBrandVariable) {
                    existing.isBrandVariable = true;
                    // Only set brand role if not already set (first occurrence takes precedence)
                    if (!existing.brandRole && brandRole) {
                        existing.brandRole = brandRole;
                    }
                }
            } else {
                colorMap.set(color, {
                    color,
                    frequency: 1,
                    weight,
                    contexts: ["css-variable"],
                    isBrandVariable,
                    brandRole,
                });
            }
        }
    }
}

/**
 * Check if a color is grayscale
 */
function isGrayscale(hex: string): boolean {
    if (hex.length !== 7) return false;

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Colors are grayscale if R, G, B are within threshold of each other
    return (
        Math.abs(r - g) < GRAYSCALE_RGB_DIFF_THRESHOLD &&
        Math.abs(g - b) < GRAYSCALE_RGB_DIFF_THRESHOLD &&
        Math.abs(r - b) < GRAYSCALE_RGB_DIFF_THRESHOLD
    );
}

/**
 * Check if a color is very light (near white) or very dark (near black)
 */
function isExtremeShade(hex: string): boolean {
    if (hex.length !== 7) return false;

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Too light or too dark
    return brightness > EXTREME_LIGHT_THRESHOLD || brightness < EXTREME_DARK_THRESHOLD;
}

/**
 * Calculate color distance in HSL space for grouping similar colors
 */
function colorDistance(hex1: string, hex2: string): number {
    const hexToHsl = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0,
            s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
            }
        }

        return { h: h * 360, s, l };
    };

    const hsl1 = hexToHsl(hex1);
    const hsl2 = hexToHsl(hex2);

    // Weighted distance considering hue, saturation, and lightness
    const hueDiff = Math.min(
        Math.abs(hsl1.h - hsl2.h),
        360 - Math.abs(hsl1.h - hsl2.h)
    );
    const satDiff = Math.abs(hsl1.s - hsl2.s);
    const lightDiff = Math.abs(hsl1.l - hsl2.l);

    return hueDiff * 0.5 + satDiff * 100 * 0.3 + lightDiff * 100 * 0.2;
}

/**
 * Extract all colors from HTML with context
 * Takes a CheerioAPI instance to avoid multiple parses
 */
function extractColors($: cheerio.CheerioAPI): ColorInfo[] {
    const colorMap = new Map<string, ColorInfo>();

    // Element weights for importance
    const weights: Record<string, number> = {
        button: 10,
        a: 8,
        h1: 7,
        h2: 6,
        h3: 5,
        nav: 5,
        header: 4,
        footer: 3,
        p: 2,
        div: 1,
    };

    // Extract from inline styles
    $("[style]").each((_, el) => {
        const style = $(el).attr("style") || "";
        const tagName = el.tagName.toLowerCase();
        const weight = weights[tagName] || 1;

        // Extract background-color
        const bgMatch = style.match(/background-color:\s*([^;]+)/i);
        if (bgMatch) {
            const color = normalizeColor(bgMatch[1]);
            if (color) {
                const existing = colorMap.get(color);
                if (existing) {
                    existing.frequency++;
                    existing.weight += weight;
                    if (!existing.contexts.includes(tagName)) {
                        existing.contexts.push(tagName);
                    }
                } else {
                    colorMap.set(color, {
                        color,
                        frequency: 1,
                        weight,
                        contexts: [tagName],
                    });
                }
            }
        }

        // Extract color (text color)
        const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
        if (colorMatch) {
            const color = normalizeColor(colorMatch[1]);
            if (color) {
                const existing = colorMap.get(color);
                if (existing) {
                    existing.frequency++;
                    existing.weight += weight * 0.5; // Text color has lower weight
                    if (!existing.contexts.includes(tagName)) {
                        existing.contexts.push(tagName);
                    }
                } else {
                    colorMap.set(color, {
                        color,
                        frequency: 1,
                        weight: weight * 0.5,
                        contexts: [tagName],
                    });
                }
            }
        }
    });

    // Extract from style tags using shared function
    $("style").each((_, el) => {
        const css = $(el).html() || "";
        extractColorsFromCss(css, colorMap);
    });

    return Array.from(colorMap.values());
}

/**
 * Fetch and extract colors from external CSS files
 * Returns the CSS content that was successfully fetched for further processing
 */
async function fetchAndExtractExternalCss(
    $: cheerio.CheerioAPI,
    baseUrl: string,
    colorMap: Map<string, ColorInfo>
): Promise<{ fetchedCount: number; failedCount: number; cssContent: string[] }> {
    const cssUrls = extractCssUrls($, baseUrl);

    if (cssUrls.length === 0) {
        return { fetchedCount: 0, failedCount: 0, cssContent: [] };
    }

    logger.info({ cssUrls: cssUrls.length }, "Found external CSS files to fetch");

    // Fetch all CSS files in parallel
    const results = await Promise.all(
        cssUrls.map(async (url) => {
            const css = await fetchExternalCss(url);
            return { url, css };
        })
    );

    let fetchedCount = 0;
    let failedCount = 0;
    const cssContent: string[] = [];

    for (const result of results) {
        if (result.css) {
            fetchedCount++;
            cssContent.push(result.css);
            extractColorsFromCss(result.css, colorMap);
        } else {
            failedCount++;
        }
    }

    logger.info(
        { fetchedCount, failedCount, totalColors: colorMap.size },
        "External CSS extraction complete"
    );

    return { fetchedCount, failedCount, cssContent };
}

/**
 * Calculate color saturation (0-1) from hex
 */
function getColorSaturation(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) return 0;

    const d = max - min;
    return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

/**
 * Select brand colors from extracted colors
 * Priority: 1) Explicit brand CSS variables, 2) High-saturation weighted colors, 3) Defaults
 */
function selectBrandColors(colors: ColorInfo[]): BrandData["colors"] {
    // Step 1: Look for explicitly defined brand colors from CSS variables
    const brandVariables = colors.filter(
        (c) => c.isBrandVariable && !isGrayscale(c.color) && !isExtremeShade(c.color)
    );

    // Extract colors by their explicit brand role
    const explicitPrimary = brandVariables.find((c) => c.brandRole === "primary");
    const explicitSecondary = brandVariables.find((c) => c.brandRole === "secondary");
    const explicitAccent = brandVariables.find((c) => c.brandRole === "accent");

    // Step 2: Filter all colors for vibrant, saturated colors
    const vibrantColors = colors.filter(
        (c) => !isGrayscale(c.color) && !isExtremeShade(c.color)
    );

    // Sort by weighted score, with saturation as a tiebreaker
    // Higher saturation colors are typically more "branded"
    const sorted = vibrantColors.sort((a, b) => {
        const scoreA = a.weight * a.frequency;
        const scoreB = b.weight * b.frequency;
        if (scoreA !== scoreB) return scoreB - scoreA;
        // Use saturation as tiebreaker (more saturated = more likely brand color)
        return getColorSaturation(b.color) - getColorSaturation(a.color);
    });

    // Step 3: Select primary - explicit brand variable takes absolute priority
    let primary = DEFAULT_BRAND_COLORS.PRIMARY;
    if (explicitPrimary) {
        primary = explicitPrimary.color;
    } else if (sorted.length > 0) {
        primary = sorted[0].color;
    }

    // Step 4: Select secondary - explicit brand variable takes priority
    let secondary = DEFAULT_BRAND_COLORS.SECONDARY;
    if (explicitSecondary) {
        secondary = explicitSecondary.color;
    } else {
        // Find from weighted colors, must be distinct from primary
        for (const color of sorted) {
            if (color.color !== primary && colorDistance(primary, color.color) > 50) {
                secondary = color.color;
                break;
            }
        }
    }

    // Step 5: Select accent - explicit brand variable takes priority
    let accent = DEFAULT_BRAND_COLORS.ACCENT;
    if (explicitAccent) {
        accent = explicitAccent.color;
    } else {
        // Find high contrast color distinct from both primary and secondary
        for (const color of sorted) {
            if (
                color.color !== primary &&
                color.color !== secondary &&
                colorDistance(primary, color.color) > 100 &&
                colorDistance(secondary, color.color) > 50
            ) {
                accent = color.color;
                break;
            }
        }
    }

    // Step 6: Find background and text colors from all colors (including grayscale)
    const allSorted = [...colors].sort(
        (a, b) => b.weight * b.frequency - a.weight * a.frequency
    );

    let background = DEFAULT_BRAND_COLORS.BACKGROUND;
    let text = DEFAULT_BRAND_COLORS.TEXT;

    // Find light background
    for (const color of allSorted) {
        const r = parseInt(color.color.slice(1, 3), 16);
        const g = parseInt(color.color.slice(3, 5), 16);
        const b = parseInt(color.color.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        if (brightness > 230) {
            background = color.color;
            break;
        }
    }

    // Find dark text
    for (const color of allSorted) {
        const r = parseInt(color.color.slice(1, 3), 16);
        const g = parseInt(color.color.slice(3, 5), 16);
        const b = parseInt(color.color.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        if (brightness < 60) {
            text = color.color;
            break;
        }
    }

    return { primary, secondary, accent, background, text };
}

/**
 * Extract font information from HTML and optional external CSS
 * @param $ - CheerioAPI instance
 * @param externalCss - Optional array of external CSS content
 */
function extractFonts(
    $: cheerio.CheerioAPI,
    externalCss: string[] = []
): BrandData["fonts"] {
    const fontFamilies = new Set<string>();
    const fontWeights = new Set<string>();

    // Helper to extract fonts from CSS text
    const extractFromCss = (css: string) => {
        const fontRegex = /font-family:\s*([^;}]+)/gi;
        let match;
        while ((match = fontRegex.exec(css)) !== null) {
            fontFamilies.add(match[1].trim());
        }

        const weightRegex = /font-weight:\s*([^;}]+)/gi;
        while ((match = weightRegex.exec(css)) !== null) {
            fontWeights.add(match[1].trim());
        }
    };

    // Extract from inline styles
    $("[style]").each((_, el) => {
        const style = $(el).attr("style") || "";

        const fontMatch = style.match(/font-family:\s*([^;]+)/i);
        if (fontMatch) {
            fontFamilies.add(fontMatch[1].trim());
        }

        const weightMatch = style.match(/font-weight:\s*([^;]+)/i);
        if (weightMatch) {
            fontWeights.add(weightMatch[1].trim());
        }
    });

    // Extract from style tags
    $("style").each((_, el) => {
        const css = $(el).html() || "";
        extractFromCss(css);
    });

    // Extract from external CSS files
    for (const css of externalCss) {
        extractFromCss(css);
    }

    // Parse most common font
    const fonts = Array.from(fontFamilies);
    const primary = fonts[0]?.replace(/['"]/g, "").split(",")[0].trim();
    const secondary = fonts[1]?.replace(/['"]/g, "").split(",")[0].trim();

    return {
        primary,
        secondary,
        weights: Array.from(fontWeights),
    };
}

/**
 * Detect if gradients are used in the HTML and external CSS
 * @param $ - CheerioAPI instance
 * @param externalCss - Optional array of external CSS content
 */
function detectGradients($: cheerio.CheerioAPI, externalCss: string[] = []): boolean {
    let hasGradients = false;

    // Check inline styles
    $("[style]").each((_, el) => {
        const style = $(el).attr("style") || "";
        if (/linear-gradient|radial-gradient|conic-gradient/i.test(style)) {
            hasGradients = true;
            return false; // Break the loop
        }
    });

    // Check style tags
    if (!hasGradients) {
        $("style").each((_, el) => {
            const css = $(el).html() || "";
            if (/linear-gradient|radial-gradient|conic-gradient/i.test(css)) {
                hasGradients = true;
                return false; // Break the loop
            }
        });
    }

    // Check external CSS files
    if (!hasGradients) {
        for (const css of externalCss) {
            if (/linear-gradient|radial-gradient|conic-gradient/i.test(css)) {
                hasGradients = true;
                break;
            }
        }
    }

    return hasGradients;
}

/**
 * Options for brand extraction
 */
export interface BrandExtractionOptions {
    /** Base URL for resolving relative CSS file paths */
    baseUrl?: string;
    /** Whether to fetch external CSS files (default: true if baseUrl provided) */
    fetchExternalCss?: boolean;
}

/**
 * Extract brand data from HTML
 * @param html - The HTML content to extract brand data from
 * @param options - Optional configuration for extraction
 */
export async function extractBrandFromHtml(
    html: string,
    options: BrandExtractionOptions = {}
): Promise<BrandData> {
    try {
        const { baseUrl, fetchExternalCss = !!baseUrl } = options;

        logger.info({ baseUrl, fetchExternalCss }, "Extracting brand data from HTML");

        // Handle empty HTML
        if (!html || html.trim().length === 0) {
            return {
                colors: {
                    primary: DEFAULT_BRAND_COLORS.PRIMARY,
                    secondary: DEFAULT_BRAND_COLORS.SECONDARY,
                    accent: DEFAULT_BRAND_COLORS.ACCENT,
                    background: DEFAULT_BRAND_COLORS.BACKGROUND,
                    text: DEFAULT_BRAND_COLORS.TEXT,
                },
                fonts: {
                    primary: undefined,
                    secondary: undefined,
                    weights: [],
                },
                style: {
                    borderRadius: "8px",
                    shadows: false,
                    gradients: false,
                },
                confidence: {
                    colors: 0,
                    fonts: 0,
                    overall: 0,
                },
            };
        }

        // Parse HTML once for better performance
        const $ = cheerio.load(html);

        // Extract colors from inline styles and embedded <style> tags
        const colors = extractColors($);
        const colorMap = new Map<string, ColorInfo>(colors.map((c) => [c.color, c]));

        // Fetch and extract colors from external CSS files if baseUrl is provided
        let externalCssStats = {
            fetchedCount: 0,
            failedCount: 0,
            cssContent: [] as string[],
        };
        if (fetchExternalCss && baseUrl) {
            externalCssStats = await fetchAndExtractExternalCss($, baseUrl, colorMap);
        }

        // Convert map back to array for selection
        const allColors = Array.from(colorMap.values());
        const selectedColors = selectBrandColors(allColors);

        // Extract fonts from both inline and external CSS
        const fonts = extractFonts($, externalCssStats.cssContent);

        // Detect gradients from both inline and external CSS
        const hasGradients = detectGradients($, externalCssStats.cssContent);

        // Calculate confidence based on data quality
        // Boost confidence if we successfully fetched external CSS
        const baseColorConfidence = Math.min(
            100,
            (allColors.length / COLOR_CONFIDENCE_THRESHOLD) * 100
        );
        // Add confidence bonus for successfully fetched external CSS
        const externalCssBonus =
            externalCssStats.fetchedCount > 0
                ? Math.min(20, externalCssStats.fetchedCount * 5)
                : 0;
        const colorConfidence = Math.min(100, baseColorConfidence + externalCssBonus);

        const fontConfidence = fonts.primary ? FONT_CONFIDENCE_BASE + 30 : 20;
        const overallConfidence = (colorConfidence + fontConfidence) / 2;

        logger.info(
            {
                colorsFound: allColors.length,
                externalCssFetched: externalCssStats.fetchedCount,
                externalCssFailed: externalCssStats.failedCount,
                colorConfidence,
                fontConfidence,
                overallConfidence,
            },
            "Brand extraction complete"
        );

        return {
            colors: selectedColors,
            fonts,
            style: {
                borderRadius: "8px", // Default, would need more parsing to detect
                shadows: true,
                gradients: hasGradients,
            },
            confidence: {
                colors: Math.round(colorConfidence),
                fonts: Math.round(fontConfidence),
                overall: Math.round(overallConfidence),
            },
        };
    } catch (error) {
        logger.error({ error }, "Failed to extract brand data");

        Sentry.captureException(error, {
            tags: {
                service: "scraping",
                operation: "extract_brand_from_html",
            },
            extra: {
                htmlLength: html?.length || 0,
            },
        });

        throw error;
    }
}
