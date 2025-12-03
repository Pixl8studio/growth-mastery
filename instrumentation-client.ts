// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn:
        process.env.NEXT_PUBLIC_SENTRY_DSN ||
        "https://216c2b7f4986e5a6e9ee2135b3779b62@o4510468876337152.ingest.us.sentry.io/4510468878893056",

    // Add optional integrations for additional features
    integrations: [Sentry.replayIntegration()],

    // Adjust sample rate based on environment
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Set environment for better filtering in Sentry
    environment: process.env.NODE_ENV || "development",

    // Session Replay: 100% in dev, 10% in production
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Always capture replays when errors occur
    replaysOnErrorSampleRate: 1.0,

    // Only send PII in development (be careful with user data)
    sendDefaultPii: process.env.NODE_ENV !== "production",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
