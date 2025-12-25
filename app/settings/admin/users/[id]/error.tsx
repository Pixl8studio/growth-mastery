"use client";

/**
 * Admin User Detail Error Boundary
 * Catches React errors in the user detail page and reports to Sentry
 */

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { logger } from "@/lib/client-logger";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function AdminUserDetailError({ error, reset }: ErrorProps) {
    const [isDev] = useState(() => process.env.NODE_ENV === "development");
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        logger.error(
            {
                error: error.message,
                errorName: error.name,
                digest: error.digest,
                stack: error.stack?.split("\n").slice(0, 5).join("\n"),
            },
            "Admin user detail page error"
        );

        Sentry.captureException(error, {
            tags: {
                component: "error-boundary",
                feature: "admin-user-detail",
                ...(error.digest && { digest: error.digest }),
            },
            extra: {
                url: typeof window !== "undefined" ? window.location.href : "unknown",
            },
            level: "error",
        });
    }, [error]);

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-8">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground">
                    Failed to Load User Details
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    There was a problem loading this user&apos;s details. The user may
                    not exist or you may not have permission to view them.
                </p>
                {error.digest && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                        Error ID: {error.digest}
                    </p>
                )}
                {isDev && error.message && (
                    <div className="mt-3">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-xs text-muted-foreground underline hover:text-foreground"
                        >
                            {showDetails ? "Hide" : "Show"} error details (dev only)
                        </button>
                        {showDetails && (
                            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
                                {error.name}: {error.message}
                                {error.stack && `\n\n${error.stack}`}
                            </pre>
                        )}
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <button
                    onClick={reset}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    Try Again
                </button>
                <Link
                    href="/settings/admin/users"
                    className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                    Back to Users
                </Link>
            </div>
        </div>
    );
}
