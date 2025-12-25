"use client";

/**
 * Global Error Boundary
 * Catches errors in the root layout that other error boundaries cannot handle.
 * Provides clear error identification for debugging and support.
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

/**
 * Extract useful context from error for logging
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
        context.stackPreview = error.stack.split("\n").slice(0, 5).join("\n");
    }

    return context;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    const [isDev] = useState(() => process.env.NODE_ENV === "development");
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const errorContext = extractErrorContext(error);

        // Log to console for server-side visibility
        console.error("[GlobalError] Application error caught:", {
            message: error.message,
            name: error.name,
            digest: error.digest,
            ...errorContext,
        });

        // Capture to Sentry with rich context
        Sentry.captureException(error, {
            tags: {
                component: "global-error-boundary",
                feature: "root-layout",
                ...(error.digest && { digest: error.digest }),
            },
            extra: {
                errorContext,
                url: typeof window !== "undefined" ? window.location.href : "unknown",
                userAgent:
                    typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
            },
            level: "fatal",
        });

        // Show the Sentry User Feedback form when an error occurs
        const feedback = Sentry.getFeedback();
        if (feedback) {
            void (async () => {
                const form = await feedback.createForm();
                form.appendToDom();
                form.open();
            })();
        }
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    padding: 0,
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    backgroundColor: "#fafafa",
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        textAlign: "center",
                        padding: "40px",
                        maxWidth: "500px",
                    }}
                >
                    {/* Error Icon */}
                    <div
                        style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "50%",
                            backgroundColor: "#fee2e2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 24px",
                        }}
                    >
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#dc2626"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h1
                        style={{
                            fontSize: "24px",
                            fontWeight: 600,
                            color: "#111827",
                            margin: "0 0 12px",
                        }}
                    >
                        Something went wrong
                    </h1>

                    <p
                        style={{
                            fontSize: "14px",
                            color: "#6b7280",
                            margin: "0 0 16px",
                            lineHeight: 1.5,
                        }}
                    >
                        An unexpected error occurred. Our team has been notified and is
                        working on a fix.
                    </p>

                    {/* Error ID for support reference */}
                    {error.digest && (
                        <p
                            style={{
                                fontSize: "12px",
                                color: "#9ca3af",
                                fontFamily: "monospace",
                                margin: "0 0 24px",
                                padding: "8px 12px",
                                backgroundColor: "#f3f4f6",
                                borderRadius: "6px",
                                display: "inline-block",
                            }}
                        >
                            Error ID: {error.digest}
                        </p>
                    )}

                    {/* Development-only error details */}
                    {isDev && error.message && (
                        <div style={{ marginBottom: "24px" }}>
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                style={{
                                    fontSize: "12px",
                                    color: "#6b7280",
                                    background: "none",
                                    border: "none",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                    padding: 0,
                                }}
                            >
                                {showDetails ? "Hide" : "Show"} error details (dev only)
                            </button>
                            {showDetails && (
                                <pre
                                    style={{
                                        marginTop: "12px",
                                        padding: "12px",
                                        backgroundColor: "#1f2937",
                                        color: "#f9fafb",
                                        borderRadius: "8px",
                                        fontSize: "11px",
                                        textAlign: "left",
                                        overflow: "auto",
                                        maxHeight: "200px",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {error.name}: {error.message}
                                    {error.stack && `\n\n${error.stack}`}
                                </pre>
                            )}
                        </div>
                    )}

                    <div
                        style={{
                            display: "flex",
                            gap: "12px",
                            justifyContent: "center",
                        }}
                    >
                        <button
                            onClick={reset}
                            style={{
                                padding: "10px 20px",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#ffffff",
                                backgroundColor: "#111827",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                            }}
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => (window.location.href = "/")}
                            style={{
                                padding: "10px 20px",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#374151",
                                backgroundColor: "#ffffff",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                cursor: "pointer",
                            }}
                        >
                            Go to home
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
