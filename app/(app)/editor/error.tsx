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
            feature="ai-editor"
            title="Editor error"
            description="Something went wrong in the editor. We've been notified."
        />
    );
}
