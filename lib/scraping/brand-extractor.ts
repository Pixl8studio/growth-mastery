/**
 * Brand Extractor Service
 * Extracts colors, fonts, and visual brand elements from websites
 */

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
 * Color information with frequency and context
 */
interface ColorInfo {
    color: string; // Hex format
    frequency: number;
    weight: number; // Weighted by element importance
    contexts: string[]; // Where the color appears (button, header, etc.)
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

    // Extract from style tags
    $("style").each((_, el) => {
        const css = $(el).html() || "";

        // Simple CSS color extraction (not perfect, but good enough)
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
    });

    return Array.from(colorMap.values());
}

/**
 * Select brand colors from extracted colors
 */
function selectBrandColors(colors: ColorInfo[]): BrandData["colors"] {
    // Filter out grayscale and extreme shades
    const vibrantColors = colors.filter(
        (c) => !isGrayscale(c.color) && !isExtremeShade(c.color)
    );

    // Sort by weighted score (frequency * weight)
    const sorted = vibrantColors.sort(
        (a, b) => b.weight * b.frequency - a.weight * a.frequency
    );

    // Find primary (most prominent vibrant color)
    const primary = sorted[0]?.color || DEFAULT_BRAND_COLORS.PRIMARY;

    // Find secondary (different from primary)
    let secondary = DEFAULT_BRAND_COLORS.SECONDARY;
    for (const color of sorted.slice(1)) {
        if (colorDistance(primary, color.color) > 50) {
            secondary = color.color;
            break;
        }
    }

    // Find accent (high contrast with primary)
    let accent = DEFAULT_BRAND_COLORS.ACCENT;
    for (const color of sorted) {
        if (
            colorDistance(primary, color.color) > 100 &&
            colorDistance(secondary, color.color) > 50
        ) {
            accent = color.color;
            break;
        }
    }

    // Find background and text colors from all colors (including grayscale)
    const allSorted = colors.sort(
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
 * Extract font information from HTML
 * Takes a CheerioAPI instance to avoid multiple parses
 */
function extractFonts($: cheerio.CheerioAPI): BrandData["fonts"] {
    const fontFamilies = new Set<string>();
    const fontWeights = new Set<string>();

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

        const fontRegex = /font-family:\s*([^;}]+)/gi;
        let match;
        while ((match = fontRegex.exec(css)) !== null) {
            fontFamilies.add(match[1].trim());
        }

        const weightRegex = /font-weight:\s*([^;}]+)/gi;
        while ((match = weightRegex.exec(css)) !== null) {
            fontWeights.add(match[1].trim());
        }
    });

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
 * Extract brand data from HTML
 */
export async function extractBrandFromHtml(html: string): Promise<BrandData> {
    try {
        logger.info("Extracting brand data from HTML");

        // Parse HTML once for better performance
        const $ = cheerio.load(html);

        // Extract data using the parsed DOM
        const colors = extractColors($);
        const selectedColors = selectBrandColors(colors);
        const fonts = extractFonts($);

        // Calculate confidence based on data quality
        const colorConfidence = Math.min(
            100,
            (colors.length / COLOR_CONFIDENCE_THRESHOLD) * 100
        );
        const fontConfidence = fonts.primary ? FONT_CONFIDENCE_BASE + 30 : 20;
        const overallConfidence = (colorConfidence + fontConfidence) / 2;

        logger.info(
            {
                colorsFound: colors.length,
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
                gradients: false,
            },
            confidence: {
                colors: Math.round(colorConfidence),
                fonts: Math.round(fontConfidence),
                overall: Math.round(overallConfidence),
            },
        };
    } catch (error) {
        logger.error({ error }, "Failed to extract brand data");
        throw error;
    }
}
