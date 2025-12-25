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
            feature="funnel-builder"
            title="Funnel error"
            description="Something went wrong loading this funnel. We've been notified."
            backLink={{ href: "/funnels", label: "Back to funnels" }}
        />
    );
}
