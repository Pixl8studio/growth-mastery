/**
 * Client-Side Logger
 * Browser-compatible logging for client components
 * Integrates with Sentry for error monitoring
 */

import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
    [key: string]: unknown;
}

/**
 * Error patterns that are expected user errors, not application bugs.
 * These should be logged locally but NOT sent to Sentry.
 */
const EXPECTED_USER_ERROR_PATTERNS = [
    // Authentication errors - users trying to login with unconfirmed email
    /email not confirmed/i,
    // File processing errors - users uploading invalid/corrupted files
    /failed to extract text/i,
    /could not find file/i,
    /not a valid docx/i,
    /file.*corrupted/i,
    /unsupported file/i,
    // Website scraping errors - websites with no extractable content
    /no content could be extracted/i,
    /failed to scrape/i,
    /website.*not supported/i,
    // Input validation errors
    /invalid url/i,
    /file too large/i,
    /password.*incorrect/i,
    /invalid credentials/i,
    // Network errors during navigation - user navigated away while request was in progress
    /failed to fetch/i,
    /failed to cancel/i,
    /aborted/i,
];

/**
 * Check if an error message matches expected user error patterns.
 */
function isExpectedUserError(error: unknown, message?: string): boolean {
    const errorMessage =
        error instanceof Error ? error.message : typeof error === "string" ? error : "";

    const textToCheck = `${errorMessage} ${message || ""}`.toLowerCase();

    return EXPECTED_USER_ERROR_PATTERNS.some((pattern) => pattern.test(textToCheck));
}

class ClientLogger {
    private isDevelopment: boolean;

    constructor() {
        this.isDevelopment = process.env.NODE_ENV === "development";
    }

    private log(level: LogLevel, context: LogContext, message?: string) {
        if (!this.isDevelopment && level === "debug") {
            return;
        }

        const timestamp = new Date().toISOString();
        const emoji = {
            debug: "🔍",
            info: "ℹ️",
            warn: "⚠️",
            error: "❌",
        }[level];

        const logData = {
            timestamp,
            level,
            message,
            ...context,
        };

        if (this.isDevelopment) {
            console[level === "debug" ? "log" : level](
                `${emoji} [${level.toUpperCase()}]`,
                message || "",
                context
            );
        } else {
            // In production, just log to console (can be replaced with external logging service)
            console[level === "debug" ? "log" : level](JSON.stringify(logData));
        }
    }

    debug(context: LogContext, message?: string) {
        this.log("debug", context, message);
    }

    info(context: LogContext, message?: string) {
        this.log("info", context, message);
    }

    warn(context: LogContext, message?: string) {
        this.log("warn", context, message);
    }

    /**
     * Log an error and capture to Sentry.
     * Automatically skips Sentry capture for expected user errors.
     */
    error(context: LogContext, message?: string) {
        this.log("error", context, message);

        const error = context.error;

        // Skip Sentry for expected user errors
        if (isExpectedUserError(error, message)) {
            return;
        }

        // Capture unexpected errors to Sentry
        if (error instanceof Error) {
            Sentry.captureException(error, {
                tags: { source: "client_logger" },
                extra: { ...context, message },
            });
        } else if (error) {
            // If error is not an Error object, capture it as a message
            Sentry.captureMessage(message || "Client error", {
                level: "error",
                tags: { source: "client_logger" },
                extra: context,
            });
        } else {
            // No error object provided, just capture the message
            Sentry.captureMessage(message || "Client error logged", {
                level: "error",
                tags: { source: "client_logger" },
                extra: context,
            });
        }
    }

    /**
     * Log an expected user error without sending to Sentry.
     * Use this for errors caused by user actions that are not application bugs,
     * such as invalid input, failed authentication, or unsupported files.
     */
    userError(context: LogContext, message?: string) {
        this.log("error", context, message);
        // Intentionally not sending to Sentry - these are expected user errors
    }
}

export const logger = new ClientLogger();
