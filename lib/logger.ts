/**
 * Structured Logger using Pino
 * Provides consistent logging across the application
 *
 * Note: Uses process.env.NODE_ENV directly instead of the env module.
 * The logger is a core module imported by many files, and using the env module
 * would trigger Zod validation at import time, defeating the lazy-loading pattern.
 * This follows the same pattern used in middleware.ts for Edge Runtime compatibility.
 */

import pino from "pino";

// Use process.env directly to avoid triggering env module validation at import time
const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

// Check if we're in a browser context (client-side)
const isBrowser = typeof window !== "undefined";

export const logger = pino({
    level: isTest ? "silent" : isDevelopment ? "debug" : "info",
    // Only use pino-pretty transport in development AND on the client side
    // Server-side Next.js components can't use worker threads properly
    transport:
        isDevelopment && isBrowser
            ? {
                  target: "pino-pretty",
                  options: {
                      colorize: true,
                      translateTime: "HH:MM:ss",
                      ignore: "pid,hostname",
                  },
              }
            : undefined,
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
});

/**
 * Create a child logger with persistent context
 * @example
 * const requestLogger = createLogger({ requestId: '123', userId: 'abc' });
 * requestLogger.info('Processing request');
 */
export const createLogger = (context: Record<string, unknown>) => {
    return logger.child(context);
};
