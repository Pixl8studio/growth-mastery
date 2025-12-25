/**
 * Structured Logger using Pino
 * Provides consistent logging across the application
 *
 * Note: This file uses process.env directly instead of importing from lib/env.ts
 * to avoid Zod validation issues during module initialization. The lib/env.ts
 * module runs Zod validation at import time, which can cause errors in certain
 * Next.js runtime contexts.
 */

import pino from "pino";

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
