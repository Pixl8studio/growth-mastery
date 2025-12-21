/**
 * PowerPoint (PPTX) Generator
 * Creates PPTX files using JSZip (PPTX is a ZIP of XML files)
 *
 * Related: GitHub Issue #325 - In-house PowerPoint Presentation Generator
 *
 * PPTX files follow the Office Open XML (OOXML) standard:
 * - ECMA-376 specification
 * - ISO/IEC 29500 standard
 *
 * Key fixes for PowerPoint compatibility:
 * - Proper relationship IDs between slides and layouts
 * - Complete content types for all parts
 * - Valid XML namespaces and structure
 * - Correct slide master/layout hierarchy
 */

import JSZip from "jszip";
import { z } from "zod";

import { logger } from "@/lib/logger";

// ============================================================================
// Zod Schemas for Type Safety
// ============================================================================

// Layout types for slides
const SlideLayoutTypeSchema = z.enum([
    "title",
    "section",
    "content_left",
    "content_right",
    "bullets",
    "quote",
    "statistics",
    "comparison",
    "process",
    "cta",
]);

// Zod schema for slide data validation (exported for use in API routes)
export const SlideDataSchema = z.object({
    slideNumber: z.number().int().positive(),
    title: z.string(),
    content: z.array(z.string()),
    speakerNotes: z.string(),
    layoutType: SlideLayoutTypeSchema,
    section: z.string(),
    imagePrompt: z.string().optional(),
    imageUrl: z.string().url().optional(),
    imageGeneratedAt: z.string().optional(),
});

export type SlideData = z.infer<typeof SlideDataSchema>;

export interface BrandColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
}

export interface PresentationOptions {
    title: string;
    slides: SlideData[];
    brandName?: string;
    brandColors?: BrandColors;
}

// ============================================================================
// EMU Constants (English Metric Units)
// PowerPoint uses EMUs for all positioning and sizing
// 914400 EMUs = 1 inch
// ============================================================================

// Base conversion factor
const EMU_PER_INCH = 914400;

// Slide dimensions - Standard 16:9 widescreen format
// Width: 10 inches, Height: 5.625 inches (10 / 16 * 9)
// This matches the web preview aspect ratio and PowerPoint's widescreen template
const SLIDE_WIDTH_INCHES = 10;
const SLIDE_HEIGHT_INCHES = 5.625; // 16:9 ratio
const SLIDE_WIDTH = SLIDE_WIDTH_INCHES * EMU_PER_INCH; // 9144000
const SLIDE_HEIGHT = SLIDE_HEIGHT_INCHES * EMU_PER_INCH; // 5143500

// Content positioning - Title slide
// Y positions scaled by 0.75 (5.625/7.5) from original 4:3 layout
const TITLE_SLIDE_TITLE_X = 685800; // 0.75 inches
const TITLE_SLIDE_TITLE_Y = 1600200; // ~1.75 inches (centered for 16:9)
const TITLE_SLIDE_TITLE_WIDTH = 7772400; // 8.5 inches
const TITLE_SLIDE_TITLE_HEIGHT = 1143000; // ~1.25 inches
const TITLE_SLIDE_SUBTITLE_Y = 2914650; // ~3.19 inches
const TITLE_SLIDE_SUBTITLE_HEIGHT = 1314450; // ~1.44 inches

// Content positioning - Section slide
const SECTION_SLIDE_TITLE_X = 685800;
const SECTION_SLIDE_TITLE_Y = 2057400; // ~2.25 inches (centered for 16:9)
const SECTION_SLIDE_TITLE_WIDTH = 7772400;
const SECTION_SLIDE_TITLE_HEIGHT = 1028700; // ~1.125 inches

// Content positioning - Standard content slide
const CONTENT_SLIDE_MARGIN_X = 457200; // 0.5 inches
const CONTENT_SLIDE_TITLE_Y = 228600; // ~0.25 inches
const CONTENT_SLIDE_TITLE_WIDTH = 8229600; // 9 inches
const CONTENT_SLIDE_TITLE_HEIGHT = 914400; // 1 inch
const CONTENT_SLIDE_BODY_Y = 1257300; // ~1.375 inches
const CONTENT_SLIDE_BODY_HEIGHT = 3429000; // ~3.75 inches (fits in 16:9)

// Footer positioning
const FOOTER_Y = 4800600; // ~5.25 inches (near bottom of 5.625" slide)
const FOOTER_HEIGHT = 274320; // ~0.3 inches
const SLIDE_NUMBER_X = 6553200; // ~7.17 inches
const SLIDE_NUMBER_WIDTH = 2133600; // ~2.33 inches
const BRAND_WIDTH = 2743200; // 3 inches

// Text formatting
const BULLET_MARGIN_LEFT = 457200; // 0.5 inches
const BULLET_INDENT = -457200; // Hanging indent

// Font sizes (in hundredths of a point)
const FONT_SIZE_TITLE_LARGE = 6000; // 60pt
const FONT_SIZE_TITLE_SECTION = 5400; // 54pt
const FONT_SIZE_TITLE_CONTENT = 4400; // 44pt
const FONT_SIZE_BODY = 2400; // 24pt
const FONT_SIZE_FOOTER = 1200; // 12pt

// ============================================================================
// Bullet-Only Slide Formatting
// ============================================================================

/**
 * Calculate dynamic font size and spacing for bullet-only slides.
 * Scales text larger for fewer bullets to fill the slide better,
 * and scales down for more bullets to ensure all content fits.
 *
 * @param bulletCount - Number of bullet points on the slide
 * @returns Object with fontSize (hundredths of a point) and lineSpacing (percentage * 1000)
 */
function getBulletOnlySlideFormatting(bulletCount: number): {
    fontSize: number;
    lineSpacing: number;
    spaceBefore: number;
    spaceAfter: number;
} {
    // Dynamic scaling based on bullet count
    // Available body height: CONTENT_SLIDE_BODY_HEIGHT = 3429000 EMU (~3.75 inches)
    // Goal: Fill vertical space proportionally with larger text for fewer bullets

    if (bulletCount <= 2) {
        // Very few bullets - use large text with generous spacing
        return {
            fontSize: 3600, // 36pt
            lineSpacing: 150000, // 150% line spacing
            spaceBefore: 228600, // 0.25 inches before each bullet
            spaceAfter: 228600, // 0.25 inches after each bullet
        };
    } else if (bulletCount <= 4) {
        // Few bullets - use medium-large text
        return {
            fontSize: 3200, // 32pt
            lineSpacing: 140000, // 140% line spacing
            spaceBefore: 182880, // 0.2 inches
            spaceAfter: 182880,
        };
    } else if (bulletCount <= 6) {
        // Moderate bullets - use medium text
        return {
            fontSize: 2800, // 28pt
            lineSpacing: 130000, // 130% line spacing
            spaceBefore: 137160, // 0.15 inches
            spaceAfter: 137160,
        };
    } else if (bulletCount <= 8) {
        // Many bullets - use slightly larger than default
        return {
            fontSize: 2600, // 26pt
            lineSpacing: 120000, // 120% line spacing
            spaceBefore: 91440, // 0.1 inches
            spaceAfter: 91440,
        };
    } else {
        // Very many bullets - use default compact sizing
        return {
            fontSize: FONT_SIZE_BODY, // 24pt
            lineSpacing: 110000, // 110% line spacing
            spaceBefore: 45720, // 0.05 inches
            spaceAfter: 45720,
        };
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

// Convert hex color to PPTX color format (RRGGBB without #)
function hexToRgb(hex: string): string {
    return hex.replace("#", "").toUpperCase();
}

// Parse hex color to RGB components
function parseHexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}

// Convert RGB to hex string for PPTX
function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n)))
            .toString(16)
            .padStart(2, "0")
            .toUpperCase();
    return `${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Lighten a hex color by a percentage
 *
 * @param hex - Color in #RRGGBB or RRGGBB format
 * @param percent - Percentage to lighten (0-100)
 * @returns Color in RRGGBB format (without #) for PPTX/OOXML compatibility
 *
 * Note: This differs from slide-design-utils.ts lightenColor() which returns
 * CSS rgb() format. Both use the same color math but different output formats
 * for their respective rendering contexts (PPTX XML vs CSS).
 */
function lightenColor(hex: string, percent: number): string {
    const rgb = parseHexToRgb(hex);
    if (!rgb) return hexToRgb(hex);

    const factor = percent / 100;
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));

    return rgbToHex(r, g, b);
}

/**
 * Darken a hex color by a percentage
 *
 * @param hex - Color in #RRGGBB or RRGGBB format
 * @param percent - Percentage to darken (0-100)
 * @returns Color in RRGGBB format (without #) for PPTX/OOXML compatibility
 *
 * Note: This differs from slide-design-utils.ts darkenColor() which returns
 * CSS rgb() format. Both use the same color math but different output formats
 * for their respective rendering contexts (PPTX XML vs CSS).
 */
function darkenColor(hex: string, percent: number): string {
    const rgb = parseHexToRgb(hex);
    if (!rgb) return hexToRgb(hex);

    const factor = 1 - percent / 100;
    const r = Math.round(rgb.r * factor);
    const g = Math.round(rgb.g * factor);
    const b = Math.round(rgb.b * factor);

    return rgbToHex(r, g, b);
}

// Escape XML special characters
function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/** Default fallback color when validation fails (neutral gray) */
const FALLBACK_COLOR = "808080";

/**
 * Validate that a color string is a valid 6-character hex color (RRGGBB format)
 * Returns the validated color or a fallback if invalid
 *
 * @param color - Color in RRGGBB format (without #)
 * @returns Valid RRGGBB color string
 */
function validateHexColor(color: string): string {
    // Remove # if present and convert to uppercase
    const cleaned = color.replace(/^#/, "").toUpperCase();

    // Check if it's a valid 6-character hex color
    if (/^[0-9A-F]{6}$/.test(cleaned)) {
        return cleaned;
    }

    // Log warning and return fallback
    logger.warn({ color }, "Invalid hex color in PPTX generation, using fallback");
    return FALLBACK_COLOR;
}

// ============================================================================
// Gradient Background Generation for PPTX
// Mirrors slide-design-utils.ts generateBrandGradient() for web preview parity
// ============================================================================

// Color shift constants matching slide-design-utils.ts
const COLOR_SHIFT = {
    SECONDARY_DARKEN: 20,
    ACCENT_LIGHTEN: 30,
    TITLE_DEEP_DARKEN: 30,
    TITLE_MID_DARKEN: 20,
    CTA_ACCENT_LIGHTEN: 20,
    QUOTE_VERY_LIGHT: 92,
    QUOTE_LIGHT: 85,
    STATISTICS_ULTRA_LIGHT: 95,
    STATISTICS_SECONDARY_LIGHT: 90,
    COMPARISON_PRIMARY_LIGHT: 94,
    COMPARISON_ACCENT_LIGHT: 92,
    PROCESS_PRIMARY_LIGHT: 93,
    PROCESS_ACCENT_LIGHT: 95,
    CONTENT_BRAND_TINT: 96,
} as const;

/**
 * Convert CSS angle (degrees) to PPTX angle (60,000ths of a degree)
 *
 * Coordinate systems:
 * - CSS: 0° = to-top (gradient goes up), 90° = to-right, 180° = to-bottom, 270° = to-left
 * - PPTX: 0° = to-right (gradient goes right), 90° = to-bottom, 180° = to-left, 270° = to-top
 *
 * Examples:
 * - CSS 0° (up) → PPTX 270° (up) = 16200000
 * - CSS 90° (right) → PPTX 0° (right) = 0
 * - CSS 135° (bottom-right) → PPTX 45° (bottom-right) = 2700000
 * - CSS 180° (down) → PPTX 90° (down) = 5400000
 *
 * @param cssAngle - CSS gradient angle in degrees (0-360)
 * @returns PPTX angle in 60,000ths of a degree
 */
function cssAngleToPptx(cssAngle: number): number {
    // CSS 90° = PPTX 0°, so offset is -90° (or +270°)
    // Formula: PPTX_degrees = (CSS_degrees - 90 + 360) % 360
    const pptxDegrees = (cssAngle - 90 + 360) % 360;
    // Convert to PPTX units (60,000ths of a degree)
    return pptxDegrees * 60000;
}

interface GradientStop {
    position: number; // 0-100000 (0% to 100%)
    color: string; // RRGGBB format
}

interface GradientConfig {
    angle: number; // In PPTX units (60,000ths of a degree)
    stops: GradientStop[];
}

// Generate gradient configuration based on layout type and brand colors
// This mirrors generateBrandGradient() from slide-design-utils.ts
function getSlideGradient(
    layoutType: SlideData["layoutType"],
    colors: BrandColors
): GradientConfig {
    const primary = colors.primary;
    const secondary =
        colors.secondary || darkenColor(primary, COLOR_SHIFT.SECONDARY_DARKEN);
    const accent = colors.accent || lightenColor(primary, COLOR_SHIFT.ACCENT_LIGHTEN);
    const background = colors.background || "FFFFFF";

    switch (layoutType) {
        case "title":
            // Bold, immersive gradient for title slides (CSS 135deg)
            return {
                angle: cssAngleToPptx(135),
                stops: [
                    {
                        position: 0,
                        color: darkenColor(primary, COLOR_SHIFT.TITLE_DEEP_DARKEN),
                    },
                    { position: 50000, color: hexToRgb(primary) },
                    {
                        position: 100000,
                        color: darkenColor(primary, COLOR_SHIFT.TITLE_MID_DARKEN),
                    },
                ],
            };

        case "section":
            // Section headers use primary with subtle secondary blend (CSS 120deg)
            return {
                angle: cssAngleToPptx(120),
                stops: [
                    {
                        position: 0,
                        color: darkenColor(primary, COLOR_SHIFT.TITLE_MID_DARKEN),
                    },
                    { position: 60000, color: hexToRgb(primary) },
                    { position: 100000, color: hexToRgb(secondary) },
                ],
            };

        case "cta":
            // High-energy gradient for call-to-action (CSS 135deg)
            return {
                angle: cssAngleToPptx(135),
                stops: [
                    { position: 0, color: hexToRgb(primary) },
                    { position: 50000, color: hexToRgb(accent) },
                    {
                        position: 100000,
                        color: lightenColor(accent, COLOR_SHIFT.CTA_ACCENT_LIGHTEN),
                    },
                ],
            };

        case "quote":
            // Warm, subtle gradient for testimonials (CSS 180deg = top to bottom)
            return {
                angle: cssAngleToPptx(180),
                stops: [
                    {
                        position: 0,
                        color: lightenColor(primary, COLOR_SHIFT.QUOTE_VERY_LIGHT),
                    },
                    {
                        position: 100000,
                        color: lightenColor(primary, COLOR_SHIFT.QUOTE_LIGHT),
                    },
                ],
            };

        case "statistics":
            // Clean gradient that lets numbers pop (CSS 180deg)
            return {
                angle: cssAngleToPptx(180),
                stops: [
                    {
                        position: 0,
                        color: lightenColor(
                            primary,
                            COLOR_SHIFT.STATISTICS_ULTRA_LIGHT
                        ),
                    },
                    {
                        position: 100000,
                        color: lightenColor(
                            secondary,
                            COLOR_SHIFT.STATISTICS_SECONDARY_LIGHT
                        ),
                    },
                ],
            };

        case "comparison":
            // Neutral base for before/after contrast (CSS 180deg)
            return {
                angle: cssAngleToPptx(180),
                stops: [
                    {
                        position: 0,
                        color: lightenColor(
                            primary,
                            COLOR_SHIFT.COMPARISON_PRIMARY_LIGHT
                        ),
                    },
                    {
                        position: 100000,
                        color: lightenColor(
                            accent,
                            COLOR_SHIFT.COMPARISON_ACCENT_LIGHT
                        ),
                    },
                ],
            };

        case "process":
            // Progressive gradient suggesting forward movement (CSS 90deg = left to right)
            return {
                angle: cssAngleToPptx(90),
                stops: [
                    {
                        position: 0,
                        color: lightenColor(primary, COLOR_SHIFT.PROCESS_PRIMARY_LIGHT),
                    },
                    {
                        position: 100000,
                        color: lightenColor(accent, COLOR_SHIFT.PROCESS_ACCENT_LIGHT),
                    },
                ],
            };

        case "content_left":
        case "content_right":
        case "bullets":
        default:
            // Clean, professional background with subtle brand presence (CSS 180deg)
            return {
                angle: cssAngleToPptx(180),
                stops: [
                    { position: 0, color: hexToRgb(background) },
                    {
                        position: 100000,
                        color: lightenColor(primary, COLOR_SHIFT.CONTENT_BRAND_TINT),
                    },
                ],
            };
    }
}

/**
 * Generate PPTX background XML with gradient fill
 * Validates all colors before inserting into XML to prevent malformed PPTX files
 */
function generateBackgroundXml(gradient: GradientConfig): string {
    const gradientStops = gradient.stops
        .map((stop) => {
            // Validate color and ensure it's in correct format
            const validColor = validateHexColor(stop.color);
            // Clamp position to valid range (0-100000)
            const validPosition = Math.max(
                0,
                Math.min(100000, Math.round(stop.position))
            );
            return `        <a:gs pos="${validPosition}"><a:srgbClr val="${validColor}"/></a:gs>`;
        })
        .join("\n");

    // Validate angle (should be non-negative)
    const validAngle = Math.max(0, Math.round(gradient.angle));

    return `  <p:bg>
    <p:bgPr>
      <a:gradFill rotWithShape="1">
        <a:gsLst>
${gradientStops}
        </a:gsLst>
        <a:lin ang="${validAngle}" scaled="0"/>
      </a:gradFill>
      <a:effectLst/>
    </p:bgPr>
  </p:bg>`;
}

// Get text colors based on layout type (dark bg = white text, light bg = dark text)
function getTextColors(
    layoutType: SlideData["layoutType"],
    colors: BrandColors
): {
    title: string;
    body: string;
    accent: string;
} {
    const isDarkBg =
        layoutType === "title" || layoutType === "section" || layoutType === "cta";

    if (isDarkBg) {
        return {
            title: "FFFFFF",
            body: "FFFFFF", // Slightly transparent would be ideal but PPTX solid fill works
            accent: "FFFFFF",
        };
    }

    // For light backgrounds, use brand text color or dark defaults
    const textColor = hexToRgb(colors.text || "#1a1a2e");
    const accentColor = hexToRgb(colors.accent || colors.primary);
    return {
        title: textColor,
        body: textColor,
        accent: accentColor,
    };
}

// ============================================================================
// Image Embedding Support
// ============================================================================

/** Maximum image size in bytes (10MB) */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** Image fetch timeout in milliseconds (10 seconds) */
const IMAGE_FETCH_TIMEOUT_MS = 10000;

/** Allowed image content types */
const ALLOWED_IMAGE_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
];

/**
 * Validate that an image URL is safe to fetch (SSRF prevention)
 * Only allows HTTPS URLs from external hosts (not localhost/private IPs)
 *
 * @param url - The URL to validate
 * @returns true if the URL is safe to fetch, false otherwise
 */
function isValidImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url);

        // Only allow HTTPS for security (except in development for localhost Supabase)
        const isDevelopment = process.env.NODE_ENV === "development";
        if (parsed.protocol !== "https:" && !isDevelopment) {
            return false;
        }

        // In production, block HTTP entirely
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return false;
        }

        const hostname = parsed.hostname.toLowerCase();

        // Block localhost and loopback addresses
        if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1" ||
            hostname === "0.0.0.0"
        ) {
            // Allow Supabase storage in development
            if (isDevelopment && parsed.pathname.includes("/storage/")) {
                return true;
            }
            return false;
        }

        // Block private IP ranges (RFC 1918)
        // 10.0.0.0/8
        if (hostname.startsWith("10.")) {
            return false;
        }
        // 172.16.0.0/12
        if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
            return false;
        }
        // 192.168.0.0/16
        if (hostname.startsWith("192.168.")) {
            return false;
        }
        // 169.254.0.0/16 (link-local)
        if (hostname.startsWith("169.254.")) {
            return false;
        }

        // Block internal cloud metadata endpoints
        if (hostname === "metadata.google.internal" || hostname === "169.254.169.254") {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

interface EmbeddedImage {
    slideIndex: number;
    imageData: ArrayBuffer;
    contentType: string;
    width: number;
    height: number;
}

/**
 * Fetch an image from URL and return its data for embedding
 * Returns null if fetch fails - images are optional
 *
 * Security features:
 * - URL validation (SSRF prevention)
 * - Content-type validation (only allows images)
 * - Size limit (10MB max)
 * - Timeout (10 seconds)
 */
async function fetchImageForEmbedding(
    imageUrl: string
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
    try {
        // Validate URL before fetching (SSRF prevention)
        if (!isValidImageUrl(imageUrl)) {
            logger.warn({ imageUrl }, "Rejected unsafe image URL for PPTX embedding");
            return null;
        }

        const response = await fetch(imageUrl, {
            signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
            logger.warn(
                { imageUrl, status: response.status },
                "Failed to fetch image for PPTX"
            );
            return null;
        }

        // Validate content type
        const contentType = response.headers.get("content-type") || "";
        if (!ALLOWED_IMAGE_TYPES.some((t) => contentType.includes(t))) {
            logger.warn(
                { imageUrl, contentType },
                "Invalid image content type for PPTX embedding"
            );
            return null;
        }

        // Check content-length before downloading (if available)
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
            logger.warn(
                { imageUrl, size: contentLength, maxSize: MAX_IMAGE_SIZE },
                "Image too large for PPTX embedding"
            );
            return null;
        }

        const data = await response.arrayBuffer();

        // Double-check size after download (content-length may be missing/wrong)
        if (data.byteLength > MAX_IMAGE_SIZE) {
            logger.warn(
                { imageUrl, size: data.byteLength, maxSize: MAX_IMAGE_SIZE },
                "Downloaded image too large for PPTX embedding"
            );
            return null;
        }

        return { data, contentType };
    } catch (error) {
        // Handle timeout specifically
        if (error instanceof Error && error.name === "TimeoutError") {
            logger.warn({ imageUrl }, "Image fetch timed out for PPTX embedding");
        } else {
            logger.warn({ error, imageUrl }, "Error fetching image for PPTX embedding");
        }
        return null;
    }
}

/**
 * Get file extension from content type
 */
function getImageExtension(contentType: string): string {
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpeg";
    if (contentType.includes("gif")) return "gif";
    if (contentType.includes("webp")) return "webp";
    return "png"; // Default to PNG
}

/**
 * Generate picture XML element for a slide image
 * Position depends on layout (content_left = image right, content_right = image left)
 */
function generatePictureXml(
    rId: string,
    layoutType: SlideData["layoutType"],
    imageId: number
): string {
    // Image positioning based on layout
    // For content_left: image on right side
    // For content_right: image on left side
    const isImageOnLeft = layoutType === "content_right";

    // Calculate positions - image takes up ~45% of slide width
    const imageWidth = 4114800; // ~4.5 inches
    const imageHeight = 2743200; // ~3 inches (fits 16:9 slide height)
    const imageX = isImageOnLeft
        ? CONTENT_SLIDE_MARGIN_X
        : SLIDE_WIDTH - imageWidth - CONTENT_SLIDE_MARGIN_X;
    const imageY = 1600200; // Same Y as body content

    return `      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${imageId}" name="Picture ${imageId}"/>
          <p:cNvPicPr>
            <a:picLocks noChangeAspect="1"/>
          </p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="${rId}"/>
          <a:stretch>
            <a:fillRect/>
          </a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="${imageX}" y="${imageY}"/>
            <a:ext cx="${imageWidth}" cy="${imageHeight}"/>
          </a:xfrm>
          <a:prstGeom prst="roundRect">
            <a:avLst>
              <a:gd name="adj" fmla="val 8000"/>
            </a:avLst>
          </a:prstGeom>
        </p:spPr>
      </p:pic>`;
}

// ============================================================================
// Layout-Specific Shape Generators
// ============================================================================

/**
 * Generate decorative quote mark for quote slides
 */
function generateQuoteMarkXml(accentColor: string): string {
    return `      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="10" name="Quote Mark"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="457200" y="914400"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="18000" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}">
                    <a:alpha val="20000"/>
                  </a:srgbClr>
                </a:solidFill>
                <a:latin typeface="Georgia"/>
              </a:rPr>
              <a:t>"</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
}

/**
 * Generate CTA button shape
 */
function generateCtaButtonXml(buttonText: string, accentColor: string): string {
    const buttonWidth = 2743200; // ~3 inches
    const buttonHeight = 548640; // ~0.6 inches
    const buttonX = (SLIDE_WIDTH - buttonWidth) / 2;
    const buttonY = 3886200; // ~4.25 inches (fits in 16:9 slide)

    return `      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="10" name="CTA Button"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${buttonX}" y="${buttonY}"/>
            <a:ext cx="${buttonWidth}" cy="${buttonHeight}"/>
          </a:xfrm>
          <a:prstGeom prst="roundRect">
            <a:avLst>
              <a:gd name="adj" fmla="val 50000"/>
            </a:avLst>
          </a:prstGeom>
          <a:solidFill>
            <a:srgbClr val="FFFFFF"/>
          </a:solidFill>
          <a:ln w="0">
            <a:noFill/>
          </a:ln>
          <a:effectLst>
            <a:outerShdw blurRad="76200" dist="38100" dir="5400000" algn="t" rotWithShape="0">
              <a:srgbClr val="000000">
                <a:alpha val="23000"/>
              </a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="2000" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(buttonText)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
}

/**
 * Generate numbered step circle for process slides
 */
function generateStepCircleXml(
    stepNumber: number,
    stepText: string,
    accentColor: string,
    textColor: string
): string {
    const circleSize = 548640; // ~0.6 inches
    const columnWidth = SLIDE_WIDTH / 4;
    const circleX = columnWidth * (stepNumber - 1) + (columnWidth - circleSize) / 2;
    const circleY = 1828800; // ~2 inches from top (fits 16:9 slide)
    const textY = circleY + circleSize + 228600; // Below circle
    const textWidth = columnWidth - 182880;
    const textX = columnWidth * (stepNumber - 1) + 91440;

    return `      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${10 + (stepNumber - 1) * 2}" name="Step ${stepNumber} Circle"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${circleX}" y="${circleY}"/>
            <a:ext cx="${circleSize}" cy="${circleSize}"/>
          </a:xfrm>
          <a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>
          <a:solidFill>
            <a:srgbClr val="${accentColor}"/>
          </a:solidFill>
          <a:effectLst>
            <a:outerShdw blurRad="50800" dist="25400" dir="5400000" algn="t" rotWithShape="0">
              <a:srgbClr val="000000">
                <a:alpha val="20000"/>
              </a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="2400" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="FFFFFF"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${stepNumber}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${11 + (stepNumber - 1) * 2}" name="Step ${stepNumber} Text"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${textX}" y="${textY}"/>
            <a:ext cx="${textWidth}" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="1600" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColor}"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${escapeXml(stepText)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
}

/**
 * Generate statistic display for statistics slides
 */
function generateStatisticXml(
    statIndex: number,
    statText: string,
    accentColor: string,
    textColor: string
): string {
    const columnWidth = SLIDE_WIDTH / 3;
    const statX = columnWidth * statIndex + 91440;
    const statY = 1828800; // ~2 inches from top (fits 16:9 slide)
    const width = columnWidth - 182880;

    // Extract number from stat text
    const numberMatch = statText.match(/\d+%?/);
    const number = numberMatch ? numberMatch[0] : `${statIndex + 1}`;
    const label = statText.replace(/\d+%?\s*/, "").trim();

    return `      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${10 + statIndex * 2}" name="Stat ${statIndex + 1} Number"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${statX}" y="${statY}"/>
            <a:ext cx="${width}" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="5400" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${escapeXml(number)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${11 + statIndex * 2}" name="Stat ${statIndex + 1} Label"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${statX}" y="${statY + 914400}"/>
            <a:ext cx="${width}" cy="548640"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="1600" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColor}"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${escapeXml(label)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
}

/**
 * Generate comparison column box
 */
function generateComparisonColumnXml(
    isAfter: boolean,
    title: string,
    points: string[],
    accentColor: string,
    textColor: string,
    bgColor: string
): string {
    const columnWidth = 4114800; // ~4.5 inches
    const columnX = isAfter ? SLIDE_WIDTH / 2 + 182880 : 457200;
    const columnY = 1600200; // ~1.75 inches from top
    const columnHeight = 2971800; // ~3.25 inches (fits 16:9 slide)

    const bulletPoints = points
        .slice(0, 3)
        .map(
            (point, idx) => `            <a:p>
              <a:pPr marL="342900" indent="-342900">
                <a:buFont typeface="Arial"/>
                <a:buChar char="•"/>
              </a:pPr>
              <a:r>
                <a:rPr lang="en-US" sz="1800" dirty="0">
                  <a:solidFill>
                    <a:srgbClr val="${textColor}"/>
                  </a:solidFill>
                  <a:latin typeface="Arial"/>
                </a:rPr>
                <a:t>${escapeXml(point)}</a:t>
              </a:r>
            </a:p>`
        )
        .join("\n");

    return `      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${isAfter ? 12 : 10}" name="${title} Box"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${columnX}" y="${columnY}"/>
            <a:ext cx="${columnWidth}" cy="${columnHeight}"/>
          </a:xfrm>
          <a:prstGeom prst="roundRect">
            <a:avLst>
              <a:gd name="adj" fmla="val 5000"/>
            </a:avLst>
          </a:prstGeom>
          <a:solidFill>
            <a:srgbClr val="${bgColor}"/>
          </a:solidFill>
          ${
              isAfter
                  ? `<a:ln w="38100">
            <a:solidFill>
              <a:srgbClr val="${accentColor}"/>
            </a:solidFill>
          </a:ln>`
                  : ""
          }
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" lIns="182880" tIns="182880" rIns="182880" bIns="182880">
            <a:normAutofit fontScale="70000" lnSpcReduction="20000"/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="2400" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColor}"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${escapeXml(title)}</a:t>
            </a:r>
          </a:p>
${bulletPoints}
        </p:txBody>
      </p:sp>`;
}

/**
 * Generate accent bar for left side of content slides
 */
function generateAccentBarXml(accentColor: string): string {
    return `      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="6" name="Accent Bar"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="685800"/>
            <a:ext cx="91440" cy="3771900"/>
          </a:xfrm>
          <a:prstGeom prst="roundRect">
            <a:avLst>
              <a:gd name="adj" fmla="val 50000"/>
            </a:avLst>
          </a:prstGeom>
          <a:solidFill>
            <a:srgbClr val="${accentColor}"/>
          </a:solidFill>
        </p:spPr>
      </p:sp>`;
}

// ============================================================================
// Slide XML Generators
// ============================================================================

// Generate XML for a single slide
function generateSlideXml(
    slide: SlideData,
    colors: BrandColors,
    brandName: string,
    hasImage: boolean = false,
    imageRId?: string
): string {
    // Get gradient background based on layout type - matches web preview exactly
    const gradient = getSlideGradient(slide.layoutType, colors);
    const backgroundXml = generateBackgroundXml(gradient);

    // Get text colors appropriate for the background (dark bg = white text, light bg = dark text)
    const textColors = getTextColors(slide.layoutType, colors);
    const accentColor = hexToRgb(colors.accent || colors.primary);

    // Determine if this is a bullet-only slide (bullets layout without images)
    const isBulletOnlySlide = slide.layoutType === "bullets" && !hasImage;

    // Get dynamic formatting for bullet-only slides, use fixed formatting otherwise
    const bulletFormatting = isBulletOnlySlide
        ? getBulletOnlySlideFormatting(slide.content.length)
        : {
              fontSize: FONT_SIZE_BODY,
              lineSpacing: 100000,
              spaceBefore: 0,
              spaceAfter: 0,
          };

    // Build bullet points with layout-appropriate text colors and dynamic sizing
    const bulletPoints = slide.content
        .map(
            (point: string, index: number) => `
      <a:p>
        <a:pPr marL="${BULLET_MARGIN_LEFT}" indent="${BULLET_INDENT}">
          ${
              isBulletOnlySlide
                  ? `<a:lnSpc><a:spcPct val="${bulletFormatting.lineSpacing}"/></a:lnSpc>
          <a:spcBef><a:spcPts val="${index === 0 ? 0 : Math.round(bulletFormatting.spaceBefore / 12.7)}"/></a:spcBef>
          <a:spcAft><a:spcPts val="${Math.round(bulletFormatting.spaceAfter / 12.7)}"/></a:spcAft>`
                  : ""
          }
          <a:buFont typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
          <a:buChar char="&#8226;"/>
        </a:pPr>
        <a:r>
          <a:rPr lang="en-US" sz="${bulletFormatting.fontSize}" dirty="0">
            <a:solidFill>
              <a:srgbClr val="${textColors.body}"/>
            </a:solidFill>
            <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
          </a:rPr>
          <a:t>${escapeXml(point)}</a:t>
        </a:r>
      </a:p>`
        )
        .join("");

    // Body properties for bullet content - use different settings for bullet-only slides
    // Bullet-only slides: distribute content vertically to fill available space
    // Other slides: use standard autofit behavior
    const bulletBodyPr = isBulletOnlySlide
        ? `<a:bodyPr wrap="square" anchor="t" anchorCtr="0">
            <a:noAutofit/>
          </a:bodyPr>`
        : `<a:bodyPr wrap="square" anchor="ctr">
            <a:normAutofit fontScale="70000" lnSpcReduction="20000"/>
          </a:bodyPr>`;

    // Different layouts based on slide type
    const isTitleSlide = slide.layoutType === "title";
    const isSectionSlide = slide.layoutType === "section";

    if (isTitleSlide) {
        // Title slide: gradient background with white text (matches web preview)
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${backgroundXml}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="ctrTitle"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${TITLE_SLIDE_TITLE_X}" y="${TITLE_SLIDE_TITLE_Y}"/>
            <a:ext cx="${TITLE_SLIDE_TITLE_WIDTH}" cy="${TITLE_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_LARGE}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.title}"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Subtitle"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="subTitle" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${TITLE_SLIDE_TITLE_X}" y="${TITLE_SLIDE_SUBTITLE_Y}"/>
            <a:ext cx="${TITLE_SLIDE_TITLE_WIDTH}" cy="${TITLE_SLIDE_SUBTITLE_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_BODY}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.body}"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(slide.content[0] || "")}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Brand"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${FOOTER_Y}"/>
            <a:ext cx="${BRAND_WIDTH}" cy="${FOOTER_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_FOOTER}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.body}"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(brandName)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
    }

    if (isSectionSlide) {
        // Section slide: gradient background with white text (matches web preview)
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${backgroundXml}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Section Title"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${SECTION_SLIDE_TITLE_X}" y="${SECTION_SLIDE_TITLE_Y}"/>
            <a:ext cx="${SECTION_SLIDE_TITLE_WIDTH}" cy="${SECTION_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_SECTION}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.title}"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
    }

    // Generate layout-specific additional shapes
    let layoutSpecificShapes = "";

    // Add accent bar for content slides with bullets (like web preview)
    if (
        slide.layoutType === "bullets" ||
        slide.layoutType === "content_left" ||
        slide.layoutType === "content_right" ||
        slide.layoutType === "statistics"
    ) {
        layoutSpecificShapes += generateAccentBarXml(accentColor);
    }

    // Generate layout-specific content
    switch (slide.layoutType) {
        case "quote":
            // Quote slide with decorative quote mark
            layoutSpecificShapes += generateQuoteMarkXml(accentColor);
            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${backgroundXml}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
${layoutSpecificShapes}
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Quote"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1371600" y="1600200"/>
            <a:ext cx="6400800" cy="1828800"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="3200" i="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.title}"/>
                </a:solidFill>
                <a:latin typeface="Georgia"/>
              </a:rPr>
              <a:t>${escapeXml(slide.content[0] || slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

        case "statistics":
            // Statistics slide with prominent numbers in 3-column grid
            const statsShapes = slide.content
                .slice(0, 3)
                .map((stat, idx) =>
                    generateStatisticXml(idx, stat, accentColor, textColors.body)
                )
                .join("\n");

            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${backgroundXml}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
${layoutSpecificShapes}
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${CONTENT_SLIDE_TITLE_Y}"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_CONTENT}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.title}"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
${statsShapes}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

        case "process":
            // Process slide with numbered step circles
            const processShapes = slide.content
                .slice(0, 4)
                .map((step, idx) =>
                    generateStepCircleXml(idx + 1, step, accentColor, textColors.body)
                )
                .join("\n");

            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${backgroundXml}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${CONTENT_SLIDE_TITLE_Y}"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_CONTENT}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.title}"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
${processShapes}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

        case "comparison":
            // Comparison slide with Before/After columns
            const halfContent = Math.ceil(slide.content.length / 2);
            const beforePoints = slide.content.slice(0, Math.min(3, halfContent));
            const afterPoints = slide.content.slice(halfContent, halfContent + 3);
            const beforeBgColor = lightenColor(colors.primary, 95);
            const afterBgColor = lightenColor(colors.accent || colors.primary, 93);

            const comparisonShapes =
                generateComparisonColumnXml(
                    false,
                    "Before",
                    beforePoints,
                    accentColor,
                    textColors.body,
                    beforeBgColor
                ) +
                "\n" +
                generateComparisonColumnXml(
                    true,
                    "After",
                    afterPoints,
                    accentColor,
                    textColors.body,
                    afterBgColor
                );

            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${backgroundXml}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${CONTENT_SLIDE_TITLE_Y}"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_CONTENT}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.title}"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
${comparisonShapes}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

        case "cta":
            // CTA slide with button-like element
            const buttonText = slide.content[1] || "Get Started Now";
            const ctaButton = generateCtaButtonXml(buttonText, accentColor);

            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${backgroundXml}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="1828800"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="4800" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.title}"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Subtitle"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="3200400"/>
            <a:ext cx="7315200" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="2400" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.body}"/>
                </a:solidFill>
                <a:latin typeface="Arial"/>
              </a:rPr>
              <a:t>${escapeXml(slide.content[0] || "")}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
${ctaButton}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

        case "content_left":
        case "content_right":
            // Content slides with image area
            // Adjust bullet area width when image is present
            const bulletWidth = hasImage ? 4114800 : CONTENT_SLIDE_TITLE_WIDTH;
            const bulletX =
                slide.layoutType === "content_right" && hasImage
                    ? SLIDE_WIDTH - bulletWidth - CONTENT_SLIDE_MARGIN_X
                    : CONTENT_SLIDE_MARGIN_X;

            const imageXml =
                hasImage && imageRId
                    ? generatePictureXml(imageRId, slide.layoutType, 7)
                    : "";

            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${backgroundXml}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
${layoutSpecificShapes}
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${CONTENT_SLIDE_TITLE_Y}"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square">
            <a:normAutofit fontScale="75000" lnSpcReduction="10000"/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_CONTENT}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.title}"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${bulletX}" y="${CONTENT_SLIDE_BODY_Y}"/>
            <a:ext cx="${bulletWidth}" cy="${CONTENT_SLIDE_BODY_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" anchor="ctr">
            <a:normAutofit fontScale="70000" lnSpcReduction="20000"/>
          </a:bodyPr>
          <a:lstStyle/>
          ${bulletPoints}
        </p:txBody>
      </p:sp>
${imageXml}
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Number"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${SLIDE_NUMBER_X}" y="${FOOTER_Y}"/>
            <a:ext cx="${SLIDE_NUMBER_WIDTH}" cy="${FOOTER_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="r"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_FOOTER}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${slide.slideNumber}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Brand"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${FOOTER_Y}"/>
            <a:ext cx="${BRAND_WIDTH}" cy="${FOOTER_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_FOOTER}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(brandName)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

        case "bullets":
        default:
            // Default bullets content slide with accent bar
            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
${backgroundXml}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
${layoutSpecificShapes}
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${CONTENT_SLIDE_TITLE_Y}"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square">
            <a:normAutofit fontScale="75000" lnSpcReduction="10000"/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_TITLE_CONTENT}" b="1" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${textColors.title}"/>
                </a:solidFill>
                <a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${CONTENT_SLIDE_BODY_Y}"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_BODY_HEIGHT}"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          ${bulletBodyPr}
          <a:lstStyle/>
          ${bulletPoints}
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Number"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${SLIDE_NUMBER_X}" y="${FOOTER_Y}"/>
            <a:ext cx="${SLIDE_NUMBER_WIDTH}" cy="${FOOTER_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="r"/>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_FOOTER}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${slide.slideNumber}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="5" name="Brand"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${FOOTER_Y}"/>
            <a:ext cx="${BRAND_WIDTH}" cy="${FOOTER_HEIGHT}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${FONT_SIZE_FOOTER}" dirty="0">
                <a:solidFill>
                  <a:srgbClr val="${accentColor}"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(brandName)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
    }
}

// Generate speaker notes XML with proper OOXML structure
function generateNotesXml(notes: string, slideNumber: number): string {
    // Break notes into paragraphs for better formatting
    const paragraphs = notes
        .split("\n")
        .filter((line) => line.trim())
        .map(
            (line) => `          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="1200" dirty="0"/>
              <a:t>${escapeXml(line.trim())}</a:t>
            </a:r>
          </a:p>`
        )
        .join("\n");

    // If no notes, add empty paragraph
    const notesContent =
        paragraphs ||
        `          <a:p>
            <a:endParaRPr lang="en-US" sz="1200" dirty="0"/>
          </a:p>`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Slide Image Placeholder 1"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="sldImg"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="381000" y="685800"/>
            <a:ext cx="6096000" cy="3429000"/>
          </a:xfrm>
        </p:spPr>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Notes Placeholder 2"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="body" idx="1"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="685800" y="4343400"/>
            <a:ext cx="5486400" cy="4114800"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
${notesContent}
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Slide Number Placeholder 3"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="sldNum" sz="quarter" idx="5"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="3884613" y="8685213"/>
            <a:ext cx="2971800" cy="457200"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:fld id="{B5A4E8E8-A1C3-4A98-9F2E-D2C60D06B2F7}" type="slidenum">
              <a:rPr lang="en-US" sz="1200"/>
              <a:t>${slideNumber}</a:t>
            </a:fld>
            <a:endParaRPr lang="en-US" sz="1200"/>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:notes>`;
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate a PPTX file from presentation data
 * Creates a valid OOXML structure that PowerPoint can open without repair
 */
export async function generatePptx(options: PresentationOptions): Promise<Blob> {
    const { title, slides, brandName = "Presentation", brandColors } = options;

    const colors: BrandColors = brandColors || {
        primary: "#1a365d",
        secondary: "#2b6cb0",
        accent: "#4299e1",
        background: "#ffffff",
        text: "#2d3748",
    };

    logger.info({ title, slideCount: slides.length }, "Starting PPTX generation");

    const zip = new JSZip();

    // ========================================================================
    // [Content_Types].xml - Defines MIME types for all parts
    // ========================================================================
    const slideTypes = slides
        .map(
            (_, i) =>
                `  <Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
        )
        .join("\n");

    const notesTypes = slides
        .map(
            (_, i) =>
                `  <Override PartName="/ppt/notesSlides/notesSlide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`
        )
        .join("\n");

    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
${slideTypes}
${notesTypes}
</Types>`
    );

    // ========================================================================
    // _rels/.rels - Package-level relationships
    // ========================================================================
    zip.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
    );

    // ========================================================================
    // docProps/core.xml - Core document properties
    // ========================================================================
    zip.file(
        "docProps/core.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>${escapeXml(brandName)}</dc:creator>
  <cp:lastModifiedBy>${escapeXml(brandName)}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`
    );

    // ========================================================================
    // docProps/app.xml - Application-specific properties
    // ========================================================================
    zip.file(
        "docProps/app.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <TotalTime>0</TotalTime>
  <Words>0</Words>
  <Application>Genie Presentation Generator</Application>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
  <Paragraphs>0</Paragraphs>
  <Slides>${slides.length}</Slides>
  <Notes>${slides.length}</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`
    );

    // ========================================================================
    // ppt/presentation.xml - Main presentation document
    // ========================================================================
    const slideRefs = slides
        .map((_, i) => `    <p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`)
        .join("\n");

    zip.file(
        "ppt/presentation.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
${slideRefs}
  </p:sldIdLst>
  <p:sldSz cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}"/>
  <p:notesSz cx="${SLIDE_HEIGHT}" cy="${SLIDE_WIDTH}"/>
  <p:defaultTextStyle>
    <a:defPPr>
      <a:defRPr lang="en-US"/>
    </a:defPPr>
  </p:defaultTextStyle>
</p:presentation>`
    );

    // ========================================================================
    // ppt/_rels/presentation.xml.rels - Presentation relationships
    // ========================================================================
    const slideRelRefs = slides
        .map(
            (_, i) =>
                `  <Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
        )
        .join("\n");

    zip.file(
        "ppt/_rels/presentation.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slideRelRefs}
  <Relationship Id="rId${slides.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`
    );

    // ========================================================================
    // ppt/slideMasters/slideMaster1.xml - Master slide template
    // ========================================================================
    zip.file(
        "ppt/slideMasters/slideMaster1.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgRef idx="1001">
        <a:schemeClr val="bg1"/>
      </p:bgRef>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
    <p:sldLayoutId id="2147483650" r:id="rId2"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle>
      <a:lvl1pPr algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:spcBef><a:spcPct val="0"/></a:spcBef>
        <a:buNone/>
        <a:defRPr sz="4400" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mj-lt"/>
          <a:ea typeface="+mj-ea"/>
          <a:cs typeface="+mj-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:titleStyle>
    <p:bodyStyle>
      <a:lvl1pPr marL="342900" indent="-342900" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">
        <a:spcBef><a:spcPct val="20000"/></a:spcBef>
        <a:buFont typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
        <a:buChar char="•"/>
        <a:defRPr sz="3200" kern="1200">
          <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
          <a:latin typeface="+mn-lt"/>
          <a:ea typeface="+mn-ea"/>
          <a:cs typeface="+mn-cs"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:bodyStyle>
    <p:otherStyle>
      <a:defPPr>
        <a:defRPr lang="en-US"/>
      </a:defPPr>
    </p:otherStyle>
  </p:txStyles>
</p:sldMaster>`
    );

    // ========================================================================
    // ppt/slideMasters/_rels/slideMaster1.xml.rels
    // ========================================================================
    zip.file(
        "ppt/slideMasters/_rels/slideMaster1.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`
    );

    // ========================================================================
    // ppt/slideLayouts/slideLayout1.xml - Title Slide Layout
    // ========================================================================
    zip.file(
        "ppt/slideLayouts/slideLayout1.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="title" preserve="1">
  <p:cSld name="Title Slide">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`
    );

    // ========================================================================
    // ppt/slideLayouts/slideLayout2.xml - Content Slide Layout
    // ========================================================================
    zip.file(
        "ppt/slideLayouts/slideLayout2.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="obj" preserve="1">
  <p:cSld name="Title and Content">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`
    );

    // ========================================================================
    // ppt/slideLayouts/_rels/slideLayout1.xml.rels
    // ========================================================================
    zip.file(
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`
    );

    // ========================================================================
    // ppt/slideLayouts/_rels/slideLayout2.xml.rels
    // ========================================================================
    zip.file(
        "ppt/slideLayouts/_rels/slideLayout2.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`
    );

    // ========================================================================
    // ppt/theme/theme1.xml - Theme with brand colors
    // ========================================================================
    zip.file(
        "ppt/theme/theme1.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Brand Theme">
  <a:themeElements>
    <a:clrScheme name="Brand Colors">
      <a:dk1><a:srgbClr val="${hexToRgb(colors.text)}"/></a:dk1>
      <a:lt1><a:srgbClr val="${hexToRgb(colors.background)}"/></a:lt1>
      <a:dk2><a:srgbClr val="${hexToRgb(colors.primary)}"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="${hexToRgb(colors.primary)}"/></a:accent1>
      <a:accent2><a:srgbClr val="${hexToRgb(colors.secondary)}"/></a:accent2>
      <a:accent3><a:srgbClr val="${hexToRgb(colors.accent)}"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="${hexToRgb(colors.accent)}"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Calibri Light" panose="020F0302020204030204"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri" panose="020F0502020204030204"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/></a:schemeClr></a:gs>
            <a:gs pos="50000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="103000"/><a:tint val="73000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs>
            <a:gs pos="50000"><a:schemeClr val="phClr"><a:satMod val="110000"/><a:lumMod val="100000"/><a:shade val="100000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0">
              <a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs>
            <a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:satMod val="130000"/><a:shade val="90000"/><a:lumMod val="103000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="63000"/><a:satMod val="120000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`
    );

    // ========================================================================
    // Fetch and embed images for slides that have imageUrl
    // ========================================================================
    interface SlideImageInfo {
        slideIndex: number;
        extension: string;
        rId: string;
    }
    const slideImages: Map<number, SlideImageInfo> = new Map();
    const imageExtensions: Set<string> = new Set();

    // Fetch images in parallel for slides that have imageUrl
    const imagePromises = slides.map(async (slide, idx) => {
        // Only fetch for content_left and content_right layouts that have imageUrl
        if (
            (slide.layoutType === "content_left" ||
                slide.layoutType === "content_right") &&
            slide.imageUrl
        ) {
            const imageData = await fetchImageForEmbedding(slide.imageUrl);
            if (imageData) {
                const extension = getImageExtension(imageData.contentType);
                imageExtensions.add(extension);
                return {
                    slideIndex: idx,
                    data: imageData.data,
                    extension,
                };
            }
        }
        return null;
    });

    const fetchedImages = await Promise.all(imagePromises);

    // Add images to zip and track relationships
    let imageCounter = 1;
    for (const img of fetchedImages) {
        if (img) {
            const imagePath = `ppt/media/image${imageCounter}.${img.extension}`;
            zip.file(imagePath, img.data);
            slideImages.set(img.slideIndex, {
                slideIndex: img.slideIndex,
                extension: img.extension,
                rId: "rId3", // rId1 is layout, rId2 is notes, rId3 is image
            });
            imageCounter++;
        }
    }

    logger.info({ imagesEmbedded: slideImages.size }, "Embedded images into PPTX");

    // ========================================================================
    // Update [Content_Types].xml with image extensions if we have any
    // ========================================================================
    let imageTypeDefaults = "";
    if (imageExtensions.has("png")) {
        imageTypeDefaults += `  <Default Extension="png" ContentType="image/png"/>\n`;
    }
    if (imageExtensions.has("jpeg")) {
        imageTypeDefaults += `  <Default Extension="jpeg" ContentType="image/jpeg"/>\n`;
    }
    if (imageExtensions.has("gif")) {
        imageTypeDefaults += `  <Default Extension="gif" ContentType="image/gif"/>\n`;
    }
    if (imageExtensions.has("webp")) {
        imageTypeDefaults += `  <Default Extension="webp" ContentType="image/webp"/>\n`;
    }

    // Re-generate Content_Types with image extensions
    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
${imageTypeDefaults}  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
${slideTypes}
${notesTypes}
</Types>`
    );

    // ========================================================================
    // Generate individual slides
    // ========================================================================
    let currentImageIndex = 1;
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const isTitleSlide = slide.layoutType === "title";
        const slideImageInfo = slideImages.get(i);
        const hasImage = !!slideImageInfo;

        // Slide XML - pass image info if available
        zip.file(
            `ppt/slides/slide${i + 1}.xml`,
            generateSlideXml(
                slide,
                colors,
                brandName,
                hasImage,
                hasImage ? slideImageInfo.rId : undefined
            )
        );

        // Slide relationships - include image and notes relationships
        // rId1 = slideLayout, rId2 = notesSlide (always), rId3 = image (if present)
        let slideRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout${isTitleSlide ? "1" : "2"}.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${i + 1}.xml"/>`;

        if (hasImage && slideImageInfo) {
            slideRels += `
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${currentImageIndex}.${slideImageInfo.extension}"/>`;
            currentImageIndex++;
        }

        slideRels += `
</Relationships>`;

        zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, slideRels);

        // Notes slide with proper structure
        zip.file(
            `ppt/notesSlides/notesSlide${i + 1}.xml`,
            generateNotesXml(slide.speakerNotes, i + 1)
        );

        // Notes relationships - reference slide
        zip.file(
            `ppt/notesSlides/_rels/notesSlide${i + 1}.xml.rels`,
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${i + 1}.xml"/>
</Relationships>`
        );
    }

    logger.info({ slideCount: slides.length }, "PPTX generation complete");

    // Generate the zip file as a blob
    return await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
