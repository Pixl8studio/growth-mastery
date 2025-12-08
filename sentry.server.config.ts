// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn:
        process.env.SENTRY_DSN ||
        "https://216c2b7f4986e5a6e9ee2135b3779b62@o4510468876337152.ingest.us.sentry.io/4510468878893056",

    // Adjust sample rate based on environment - 10% in production, 100% in development
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Set environment for better filtering in Sentry
    environment: process.env.NODE_ENV || "development",

    // Only send PII in development (protect user data in production)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: process.env.NODE_ENV !== "production",
});
