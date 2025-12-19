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

// Slide dimensions (standard 16:9 would be different)
const SLIDE_WIDTH_INCHES = 10;
const SLIDE_HEIGHT_INCHES = 7.5;
const SLIDE_WIDTH = SLIDE_WIDTH_INCHES * EMU_PER_INCH; // 9144000
const SLIDE_HEIGHT = SLIDE_HEIGHT_INCHES * EMU_PER_INCH; // 6858000

// Content positioning - Title slide
const TITLE_SLIDE_TITLE_X = 685800; // 0.75 inches
const TITLE_SLIDE_TITLE_Y = 2130425; // ~2.33 inches
const TITLE_SLIDE_TITLE_WIDTH = 7772400; // 8.5 inches
const TITLE_SLIDE_TITLE_HEIGHT = 1470025; // ~1.6 inches
const TITLE_SLIDE_SUBTITLE_Y = 3886200; // ~4.25 inches
const TITLE_SLIDE_SUBTITLE_HEIGHT = 1752600; // ~1.92 inches

// Content positioning - Section slide
const SECTION_SLIDE_TITLE_X = 685800;
const SECTION_SLIDE_TITLE_Y = 2743200; // 3 inches
const SECTION_SLIDE_TITLE_WIDTH = 7772400;
const SECTION_SLIDE_TITLE_HEIGHT = 1371600; // 1.5 inches

// Content positioning - Standard content slide
const CONTENT_SLIDE_MARGIN_X = 457200; // 0.5 inches
const CONTENT_SLIDE_TITLE_Y = 274638; // ~0.3 inches
const CONTENT_SLIDE_TITLE_WIDTH = 8229600; // 9 inches
const CONTENT_SLIDE_TITLE_HEIGHT = 1143000; // 1.25 inches
const CONTENT_SLIDE_BODY_Y = 1600200; // ~1.75 inches
const CONTENT_SLIDE_BODY_HEIGHT = 4525963; // ~4.95 inches

// Footer positioning
const FOOTER_Y = 6400800; // 7 inches
const FOOTER_HEIGHT = 365125; // ~0.4 inches
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

// Lighten a hex color by a percentage
function lightenColor(hex: string, percent: number): string {
    const rgb = parseHexToRgb(hex);
    if (!rgb) return hexToRgb(hex);

    const factor = percent / 100;
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));

    return rgbToHex(r, g, b);
}

// Darken a hex color by a percentage
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

// Convert CSS angle (degrees) to PPTX angle (60,000ths of a degree)
// PPTX angles: 0 = right, 90 = down, 180 = left, 270 = up
// CSS angles: 0 = up, 90 = right, 180 = down, 270 = left
// Conversion: PPTX angle = (90 - CSS angle) * 60000, then normalize
function cssAngleToPptx(cssAngle: number): number {
    // CSS 135deg (diagonal top-left to bottom-right) = PPTX (90 - 135 + 360) * 60000 = 315 * 60000
    // But PPTX uses different convention: we need to map correctly
    // For a 135deg CSS gradient (top-left to bottom-right):
    // PPTX equivalent is approximately 2700000 (45 degrees in PPTX = bottom-left to top-right)
    // Actually PPTX: 0 = left-to-right, 5400000 = top-to-bottom, etc.
    // CSS 135deg = diagonal from top-left to bottom-right
    // In PPTX: 135 degrees from the right axis going counterclockwise = 135 * 60000 = 8100000
    return cssAngle * 60000;
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

// Generate PPTX background XML with gradient fill
function generateBackgroundXml(gradient: GradientConfig): string {
    const gradientStops = gradient.stops
        .map(
            (stop) =>
                `        <a:gs pos="${stop.position}"><a:srgbClr val="${stop.color}"/></a:gs>`
        )
        .join("\n");

    return `  <p:bg>
    <p:bgPr>
      <a:gradFill rotWithShape="1">
        <a:gsLst>
${gradientStops}
        </a:gsLst>
        <a:lin ang="${gradient.angle}" scaled="0"/>
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
// Slide XML Generators
// ============================================================================

// Generate XML for a single slide
function generateSlideXml(
    slide: SlideData,
    colors: BrandColors,
    brandName: string
): string {
    // Get gradient background based on layout type - matches web preview exactly
    const gradient = getSlideGradient(slide.layoutType, colors);
    const backgroundXml = generateBackgroundXml(gradient);

    // Get text colors appropriate for the background (dark bg = white text, light bg = dark text)
    const textColors = getTextColors(slide.layoutType, colors);
    const accentColor = hexToRgb(colors.accent || colors.primary);

    // Build bullet points with layout-appropriate text colors
    const bulletPoints = slide.content
        .map(
            (point: string) => `
      <a:p>
        <a:pPr marL="${BULLET_MARGIN_LEFT}" indent="${BULLET_INDENT}">
          <a:buFont typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/>
          <a:buChar char="&#8226;"/>
        </a:pPr>
        <a:r>
          <a:rPr lang="en-US" sz="${FONT_SIZE_BODY}" dirty="0">
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
              <a:t>${escapeXml(slide.content.join(" "))}</a:t>
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

    // Default content slide: gradient background matching the web preview
    // This applies to: bullets, content_left, content_right, quote, statistics, comparison, process, cta
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
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${CONTENT_SLIDE_MARGIN_X}" y="${CONTENT_SLIDE_TITLE_Y}"/>
            <a:ext cx="${CONTENT_SLIDE_TITLE_WIDTH}" cy="${CONTENT_SLIDE_TITLE_HEIGHT}"/>
          </a:xfrm>
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
          <a:bodyPr/>
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
    // Generate individual slides
    // ========================================================================
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const isTitleSlide = slide.layoutType === "title";

        // Slide XML
        zip.file(
            `ppt/slides/slide${i + 1}.xml`,
            generateSlideXml(slide, colors, brandName)
        );

        // Slide relationships - reference appropriate layout
        zip.file(
            `ppt/slides/_rels/slide${i + 1}.xml.rels`,
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout${isTitleSlide ? "1" : "2"}.xml"/>
</Relationships>`
        );

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
