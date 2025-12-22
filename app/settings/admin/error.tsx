"use client";

/**
 * Admin Dashboard Error Boundary
 * Catches React errors in admin pages and reports to Sentry
 */

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import { logger } from "@/lib/client-logger";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
    useEffect(() => {
        logger.error(
            { error: error.message, digest: error.digest },
            "Admin dashboard error"
        );

        Sentry.captureException(error, {
            tags: {
                component: "error-boundary",
                feature: "admin-dashboard",
            },
            level: "error",
        });
    }, [error]);

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-8">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground">
                    Admin Dashboard Error
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Something went wrong loading this admin page.
                </p>
                {error.digest && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        Error ID: {error.digest}
                    </p>
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
                    href="/settings"
                    className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                    Back to Settings
                </Link>
            </div>
        </div>
    );
}
