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

    error(context: LogContext, message?: string) {
        this.log("error", context, message);

        // Automatically capture errors to Sentry
        const error = context.error;
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
}

export const logger = new ClientLogger();
