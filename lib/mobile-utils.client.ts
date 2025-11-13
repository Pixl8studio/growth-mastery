"use client";

/**
 * Mobile Detection Utilities - Client Side Only
 * Use these hooks in Client Components
 */

import { useEffect, useState } from "react";

// Breakpoint constants matching Tailwind config
export const BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1400,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Client-side hook for mobile detection using window.matchMedia
 * Use this in Client Components
 */
export function useIsMobile(breakpoint: Breakpoint = "md"): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(
            `(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`
        );

        // Set initial value
        setIsMobile(mediaQuery.matches);

        // Create listener
        const handleChange = (e: MediaQueryListEvent) => {
            setIsMobile(e.matches);
        };

        // Add listener
        mediaQuery.addEventListener("change", handleChange);

        // Cleanup
        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, [breakpoint]);

    return isMobile;
}

/**
 * Client-side hook for tablet detection
 */
export function useIsTablet(): boolean {
    const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
        // Check for tablet-specific screen sizes (typically 768px to 1024px)
        const mediaQuery = window.matchMedia(
            `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
        );

        // Also check for tablet user agent
        const userAgent = navigator.userAgent;
        const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Silk/i;
        const isTabletUA = tabletRegex.test(userAgent);

        setIsTablet(mediaQuery.matches || isTabletUA);

        const handleChange = (e: MediaQueryListEvent) => {
            setIsTablet(e.matches || isTabletUA);
        };

        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return isTablet;
}

/**
 * Client-side hook for touch device detection
 */
export function useIsTouchDevice(): boolean {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        const hasTouchScreen =
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            (navigator as any).msMaxTouchPoints > 0;

        setIsTouch(hasTouchScreen);
    }, []);

    return isTouch;
}

/**
 * Client-side hook for responsive breakpoint detection
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(
            `(min-width: ${BREAKPOINTS[breakpoint]}px)`
        );

        setMatches(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setMatches(e.matches);
        };

        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, [breakpoint]);

    return matches;
}

/**
 * Get current viewport width on client side
 */
export function useViewportWidth(): number {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            setWidth(window.innerWidth);
        };

        // Set initial width
        handleResize();

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return width;
}

/**
 * Helper to check if current viewport is below a breakpoint
 */
export function isViewportBelow(width: number, breakpoint: Breakpoint): boolean {
    return width < BREAKPOINTS[breakpoint];
}

/**
 * Helper to check if current viewport is above a breakpoint
 */
export function isViewportAbove(width: number, breakpoint: Breakpoint): boolean {
    return width >= BREAKPOINTS[breakpoint];
}
