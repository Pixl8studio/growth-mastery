"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error, {
            tags: {
                component: "error-boundary",
                feature: "funnel-builder",
            },
            level: "error",
        });
    }, [error]);

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground">
                We've been notified and are working on a fix.
            </p>
            <Button onClick={reset} variant="outline">
                Try again
            </Button>
        </div>
    );
}
