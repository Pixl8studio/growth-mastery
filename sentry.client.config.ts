// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn:
        process.env.NEXT_PUBLIC_SENTRY_DSN ||
        "https://216c2b7f4986e5a6e9ee2135b3779b62@o4510468876337152.ingest.us.sentry.io/4510468878893056",

    // Adjust sample rate based on environment - 10% in production, 100% in development
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Set environment for better filtering in Sentry
    environment: process.env.NODE_ENV || "development",

    // Enable Session Replay for error context
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
        // User Feedback integration - allows users to submit feedback
        Sentry.feedbackIntegration({
            // Automatically inject the feedback widget
            autoInject: true,

            // Use system color scheme (light/dark mode)
            colorScheme: "system",

            // Show branding
            showBranding: false,

            // Enable screenshots for better bug reports
            enableScreenshot: true,

            // Customized labels for better UX
            buttonLabel: "Report a Bug",
            submitButtonLabel: "Send Feedback",
            formTitle: "Report an Issue",
            messagePlaceholder: "What happened? Please describe the issue in detail...",
            successMessageText: "Thank you for your feedback!",

            // Position at bottom-right
            triggerLabel: "Report a Bug",
        }),

        // Session Replay for debugging user sessions
        Sentry.replayIntegration({
            // Mask all text content for privacy
            maskAllText: true,
            // Block all media for privacy
            blockAllMedia: true,
        }),
    ],

    // Only send PII in development (protect user data in production)
    sendDefaultPii: process.env.NODE_ENV !== "production",

    // Filter out certain errors to reduce noise
    beforeSend(event) {
        // Filter out browser extension errors
        if (
            event.exception?.values?.some((e) =>
                e.value?.includes("chrome-extension://")
            )
        ) {
            return null;
        }
        return event;
    },
});
