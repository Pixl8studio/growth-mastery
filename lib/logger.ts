/**
 * Structured Logger using Pino
 * Provides consistent logging across the application
 */

import pino from "pino";
import { env } from "./env";

const isDevelopment = env.NODE_ENV === "development";
const isTest = env.NODE_ENV === "test";

export const logger = pino({
    level: isTest ? "silent" : isDevelopment ? "debug" : "info",
    transport: isDevelopment
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
