/**
 * ClientLogger Tests
 * Tests client-side logging functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/client-logger";

describe("ClientLogger", () => {
    let consoleSpy: any;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        consoleSpy = {
            log: vi.spyOn(console, "log").mockImplementation(() => {}),
            info: vi.spyOn(console, "info").mockImplementation(() => {}),
            warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
            error: vi.spyOn(console, "error").mockImplementation(() => {}),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        process.env.NODE_ENV = originalEnv;
    });

    describe("debug", () => {
        it("should log debug messages in development", () => {
            process.env.NODE_ENV = "development";

            logger.debug({ test: "value" }, "Debug message");

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("[DEBUG]"),
                "Debug message",
                { test: "value" }
            );
        });

        it("should not log debug messages in production", () => {
            process.env.NODE_ENV = "production";

            logger.debug({ test: "value" }, "Debug message");

            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
    });

    describe("info", () => {
        it("should log info messages", () => {
            process.env.NODE_ENV = "development";

            logger.info({ userId: "123" }, "User logged in");

            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.stringContaining("[INFO]"),
                "User logged in",
                { userId: "123" }
            );
        });

        it("should log info in production as JSON", () => {
            process.env.NODE_ENV = "production";

            logger.info({ userId: "123" }, "User logged in");

            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.stringContaining("userId")
            );
        });
    });

    describe("warn", () => {
        it("should log warning messages", () => {
            process.env.NODE_ENV = "development";

            logger.warn({ code: "DEPRECATED" }, "API deprecated");

            expect(consoleSpy.warn).toHaveBeenCalledWith(
                expect.stringContaining("[WARN]"),
                "API deprecated",
                { code: "DEPRECATED" }
            );
        });
    });

    describe("error", () => {
        it("should log error messages", () => {
            process.env.NODE_ENV = "development";

            logger.error({ error: new Error("Test error") }, "Failed to process");

            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining("[ERROR]"),
                "Failed to process",
                expect.objectContaining({ error: expect.any(Error) })
            );
        });

        it("should log errors in production as JSON", () => {
            process.env.NODE_ENV = "production";

            logger.error({ error: "Something went wrong" }, "Error occurred");

            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining("error")
            );
        });
    });

    describe("context", () => {
        it("should include context in logs", () => {
            process.env.NODE_ENV = "development";

            logger.info({ requestId: "abc-123", userId: "user-456" }, "Processing request");

            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.any(String),
                "Processing request",
                expect.objectContaining({
                    requestId: "abc-123",
                    userId: "user-456",
                })
            );
        });

        it("should handle empty context", () => {
            process.env.NODE_ENV = "development";

            logger.info({}, "Simple message");

            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.any(String),
                "Simple message",
                {}
            );
        });
    });

    describe("message optional", () => {
        it("should work without message", () => {
            process.env.NODE_ENV = "development";

            logger.info({ event: "page_view" });

            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.any(String),
                "",
                { event: "page_view" }
            );
        });
    });

    describe("emojis", () => {
        it("should include emoji for debug", () => {
            process.env.NODE_ENV = "development";

            logger.debug({}, "test");

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("🔍"),
                expect.any(String),
                expect.any(Object)
            );
        });

        it("should include emoji for info", () => {
            process.env.NODE_ENV = "development";

            logger.info({}, "test");

            expect(consoleSpy.info).toHaveBeenCalledWith(
                expect.stringContaining("ℹ️"),
                expect.any(String),
                expect.any(Object)
            );
        });

        it("should include emoji for warn", () => {
            process.env.NODE_ENV = "development";

            logger.warn({}, "test");

            expect(consoleSpy.warn).toHaveBeenCalledWith(
                expect.stringContaining("⚠️"),
                expect.any(String),
                expect.any(Object)
            );
        });

        it("should include emoji for error", () => {
            process.env.NODE_ENV = "development";

            logger.error({}, "test");

            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining("❌"),
                expect.any(String),
                expect.any(Object)
            );
        });
    });
});
