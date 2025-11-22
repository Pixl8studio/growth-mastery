/**
 * Color Contrast Utility
 * Detects background brightness and returns appropriate text color
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    // Remove # if present
    hex = hex.replace(/^#/, "");

    // Handle 3-character hex codes
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((char) => char + char)
            .join("");
    }

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}

/**
 * Convert HSL color to RGB
 */
function hslToRgb(
    h: number,
    s: number,
    l: number
): { r: number; g: number; b: number } {
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (60 <= h && h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (120 <= h && h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (180 <= h && h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (240 <= h && h < 300) {
        r = x;
        g = 0;
        b = c;
    } else if (300 <= h && h < 360) {
        r = c;
        g = 0;
        b = x;
    }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
    };
}

/**
 * Calculate relative luminance of a color
 * Uses WCAG formula
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLinear =
        rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear =
        gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear =
        bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Get contrast color (black or white) based on background brightness
 * Returns black for light backgrounds, white for dark backgrounds
 */
export function getContrastColor(backgroundColor: string): string {
    let rgb: { r: number; g: number; b: number } | null = null;

    // Try to parse as hex
    if (backgroundColor.startsWith("#")) {
        rgb = hexToRgb(backgroundColor);
    }
    // Try to parse as HSL
    else if (backgroundColor.includes("hsl")) {
        const hslMatch = backgroundColor.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
        if (hslMatch) {
            const h = parseInt(hslMatch[1]);
            const s = parseInt(hslMatch[2]);
            const l = parseInt(hslMatch[3]);
            rgb = hslToRgb(h, s, l);
        }
    }
    // Try to parse as RGB
    else if (backgroundColor.includes("rgb")) {
        const rgbMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            rgb = {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
            };
        }
    }

    // If we couldn't parse, default to dark text
    if (!rgb) {
        return "hsl(0 0% 12%)";
    }

    // Calculate luminance
    const luminance = getRelativeLuminance(rgb.r, rgb.g, rgb.b);

    // Use threshold of 0.5 (lighter backgrounds get dark text, darker get white)
    return luminance > 0.5 ? "hsl(0 0% 12%)" : "hsl(0 0% 100%)";
}

/**
 * Get secondary text color (muted) based on background brightness
 */
export function getSecondaryTextColor(backgroundColor: string): string {
    let rgb: { r: number; g: number; b: number } | null = null;

    // Try to parse as hex
    if (backgroundColor.startsWith("#")) {
        rgb = hexToRgb(backgroundColor);
    }
    // Try to parse as HSL
    else if (backgroundColor.includes("hsl")) {
        const hslMatch = backgroundColor.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
        if (hslMatch) {
            const h = parseInt(hslMatch[1]);
            const s = parseInt(hslMatch[2]);
            const l = parseInt(hslMatch[3]);
            rgb = hslToRgb(h, s, l);
        }
    }
    // Try to parse as RGB
    else if (backgroundColor.includes("rgb")) {
        const rgbMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            rgb = {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
            };
        }
    }

    // If we couldn't parse, default to muted dark text
    if (!rgb) {
        return "hsl(0 0% 45%)";
    }

    // Calculate luminance
    const luminance = getRelativeLuminance(rgb.r, rgb.g, rgb.b);

    // Use threshold of 0.5
    return luminance > 0.5 ? "hsl(0 0% 45%)" : "hsl(0 0% 75%)";
}
