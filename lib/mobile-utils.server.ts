/**
 * Mobile Detection Utilities - Server Side Only
 * Use these functions in Server Components and API routes
 */

import { headers } from "next/headers";

/**
 * Server-side mobile detection using User-Agent header
 * Use this in Server Components or API routes
 */
export async function isMobileDevice(): Promise<boolean> {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "";
    return isMobileUserAgent(userAgent);
}

/**
 * Server-side tablet detection using User-Agent header
 */
export async function isTabletDevice(): Promise<boolean> {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "";
    return isTabletUserAgent(userAgent);
}

/**
 * Server-side touch device detection
 * Returns true for both mobile and tablet
 */
export async function isTouchDevice(): Promise<boolean> {
    const mobile = await isMobileDevice();
    const tablet = await isTabletDevice();
    return mobile || tablet;
}

/**
 * Check if User-Agent string indicates a mobile device
 */
export function isMobileUserAgent(userAgent: string): boolean {
    const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isTablet = isTabletUserAgent(userAgent);
    return mobileRegex.test(userAgent) && !isTablet;
}

/**
 * Check if User-Agent string indicates a tablet device
 */
export function isTabletUserAgent(userAgent: string): boolean {
    const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Silk/i;
    return tabletRegex.test(userAgent);
}

/**
 * Get device type from user agent
 */
export function getDeviceType(userAgent: string): "mobile" | "tablet" | "desktop" {
    if (isTabletUserAgent(userAgent)) {
        return "tablet";
    }
    if (isMobileUserAgent(userAgent)) {
        return "mobile";
    }
    return "desktop";
}

/**
 * Server-side helper to get device type
 */
export async function getServerDeviceType(): Promise<"mobile" | "tablet" | "desktop"> {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "";
    return getDeviceType(userAgent);
}
