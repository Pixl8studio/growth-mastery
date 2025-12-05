/**
 * Logger Tests
 * Tests Pino logger functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pino before importing logger
vi.mock("pino", () => {
    const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
    };
    return {
        default: vi.fn(() => mockLogger),
    };
});

vi.mock("@/lib/env", () => ({
    env: {
        NODE_ENV: "test",
    },
}));

describe("Logger", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should export logger instance", async () => {
        const { logger } = await import("@/lib/logger");
        expect(logger).toBeDefined();
    });

    it("should export createLogger function", async () => {
        const { createLogger } = await import("@/lib/logger");
        expect(createLogger).toBeDefined();
        expect(typeof createLogger).toBe("function");
    });

    it("should create child logger with context", async () => {
        const { logger, createLogger } = await import("@/lib/logger");

        const childLogger = createLogger({ requestId: "123", userId: "abc" });

        expect(logger.child).toHaveBeenCalledWith({
            requestId: "123",
            userId: "abc",
        });
    });

    it("should initialize with correct configuration in test mode", async () => {
        const pino = (await import("pino")).default;

        expect(pino).toHaveBeenCalledWith(
            expect.objectContaining({
                level: "silent",
            })
        );
    });

    it("should have formatters configuration", async () => {
        const pino = (await import("pino")).default;

        const config = (pino as any).mock.calls[0][0];
        expect(config.formatters).toBeDefined();
        expect(typeof config.formatters.level).toBe("function");
    });

    it("should format level correctly", async () => {
        const pino = (await import("pino")).default;

        const config = (pino as any).mock.calls[0][0];
        const formatted = config.formatters.level("info");

        expect(formatted).toEqual({ level: "info" });
    });
});
