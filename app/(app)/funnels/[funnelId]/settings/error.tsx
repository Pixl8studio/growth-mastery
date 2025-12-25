"use client";

import { ErrorBoundaryContent } from "@/components/error-boundary-content";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <ErrorBoundaryContent
            error={error}
            reset={reset}
            feature="funnel-settings"
            title="Settings error"
            description="Something went wrong loading funnel settings. We've been notified."
        />
    );
}
