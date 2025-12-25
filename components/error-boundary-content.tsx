"use client";

/**
 * ErrorBoundaryContent - Reusable error display component
 * Provides consistent error UI across all error boundaries with:
 * - Clear error identification via digest
 * - Development-mode error details for debugging
 * - Proper Sentry capture with rich context
 * - Structured logging
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

import { logger } from "@/lib/client-logger";

interface ErrorBoundaryContentProps {
    error: Error & { digest?: string };
    reset: () => void;
    /** Feature name for Sentry tagging (e.g., "ai-editor", "funnels") */
    feature?: string;
    /** Title shown to user */
    title?: string;
    /** Description shown to user */
    description?: string;
    /** Back link URL (optional) */
    backLink?: { href: string; label: string };
}

/**
 * Format error for display - shows more detail in development
 */
function formatErrorForDisplay(error: Error, isDev: boolean): string | null {
    if (!isDev) return null;

    const parts: string[] = [];

    if (error.message) {
        parts.push(error.message);
    }

    if (error.cause) {
        parts.push(`Cause: ${String(error.cause)}`);
    }

    return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Extract useful context from error for Sentry
 */
function extractErrorContext(
    error: Error & { digest?: string }
): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    if (error.digest) {
        context.digest = error.digest;
    }

    if (error.cause) {
        context.cause = String(error.cause);
    }

    if (error.stack) {
        // Get first 5 lines of stack for context without overwhelming
        context.stackPreview = error.stack.split("\n").slice(0, 5).join("\n");
    }

    // Check for common error properties
    if ("code" in error) {
        context.errorCode = (error as Error & { code?: string }).code;
    }

    if ("statusCode" in error) {
        context.statusCode = (error as Error & { statusCode?: number }).statusCode;
    }

    return context;
}

export function ErrorBoundaryContent({
    error,
    reset,
    feature = "unknown",
    title = "Something went wrong",
    description = "We've been notified and are working on a fix.",
    backLink,
}: ErrorBoundaryContentProps) {
    const [isDev] = useState(() => process.env.NODE_ENV === "development");
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const errorContext = extractErrorContext(error);

        // Log with structured context for debugging
        logger.error(
            {
                error: error.message,
                errorName: error.name,
                digest: error.digest,
                feature,
                ...errorContext,
            },
            `Error boundary caught error in ${feature}`
        );

        // Capture to Sentry with rich context
        Sentry.captureException(error, {
            tags: {
                component: "error-boundary",
                feature,
                ...(error.digest && { digest: error.digest }),
            },
            extra: {
                errorContext,
                url: typeof window !== "undefined" ? window.location.href : "unknown",
            },
            level: "error",
        });
    }, [error, feature]);

    const errorDetails = formatErrorForDisplay(error, isDev);

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
            <div className="text-center max-w-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <svg
                        className="h-6 w-6 text-destructive"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>

                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>

                {/* Error ID for support reference */}
                {error.digest && (
                    <p className="mt-3 font-mono text-xs text-muted-foreground">
                        Error ID: {error.digest}
                    </p>
                )}

                {/* Development-only error details */}
                {isDev && errorDetails && (
                    <div className="mt-4">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-xs text-muted-foreground underline hover:text-foreground"
                        >
                            {showDetails ? "Hide" : "Show"} error details
                        </button>
                        {showDetails && (
                            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
                                {errorDetails}
                                {error.stack && (
                                    <>
                                        {"\n\nStack trace:\n"}
                                        {error.stack}
                                    </>
                                )}
                            </pre>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-2 mt-4">
                <button
                    onClick={reset}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Try again
                </button>
                {backLink && (
                    <a
                        href={backLink.href}
                        className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                        {backLink.label}
                    </a>
                )}
            </div>
        </div>
    );
}
