/**
 * Client-Side Logger
 * Browser-compatible logging for client components
 */

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
    }
}

export const logger = new ClientLogger();
