/**
 * Utility Functions
 * Shared helper functions used across the application
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with proper precedence
 * @example cn("px-2", "px-4") // => "px-4"
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Generate a URL-safe slug from text
 * @example generateSlug("My Awesome Page!") // => "my-awesome-page"
 */
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a username from an email address
 * @example generateUsername("john.doe@gmail.com") // => "john-doe"
 */
export function generateUsername(email: string): string {
    const localPart = email.split("@")[0];
    return generateSlug(localPart || "user");
}

/**
 * Validate UUID format
 * @example isValidUUID("550e8400-e29b-41d4-a716-446655440000") // => true
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validate username format
 * 3-30 characters, lowercase letters, numbers, hyphens
 * Must start and end with letter or number
 * @example isValidUsername("john-doe") // => true
 */
export function isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
    return usernameRegex.test(username);
}

/**
 * Format date to human-readable string
 * @example formatDate(new Date()) // => "Jan 23, 2025"
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/**
 * Format date with time
 * @example formatDateTime(new Date()) // => "Jan 23, 2025 at 3:45 PM"
 */
export function formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

/**
 * Truncate text to a maximum length
 * @example truncate("Long text here", 10) // => "Long text..."
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize first letter of string
 * @example capitalize("hello") // => "Hello"
 */
export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format number as currency
 * @example formatCurrency(999.99) // => "$999.99"
 */
export function formatCurrency(amount: number, currency = "USD"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
    }).format(amount);
}

/**
 * Format number with commas
 * @example formatNumber(1234567) // => "1,234,567"
 */
export function formatNumber(num: number): string {
    return num.toLocaleString("en-US");
}

/**
 * Calculate percentage
 * @example calculatePercentage(25, 100) // => 25
 */
export function calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

/**
 * Sleep for a given number of milliseconds
 * @example await sleep(1000) // Wait 1 second
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        delayMs?: number;
        backoffMultiplier?: number;
    } = {}
): Promise<T> {
    const { maxAttempts = 3, delayMs = 1000, backoffMultiplier = 2 } = options;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt < maxAttempts) {
                const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Check if code is running on the server
 */
export function isServer(): boolean {
    return typeof window === "undefined";
}

/**
 * Check if code is running on the client
 */
export function isClient(): boolean {
    return typeof window !== "undefined";
}

/**
 * Get base URL for the application
 */
export function getBaseUrl(): string {
    if (isServer()) {
        return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    }
    return window.location.origin;
}

/**
 * Build a full URL from a path
 * @example buildUrl("/api/users") // => "http://localhost:3000/api/users"
 */
export function buildUrl(path: string): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
