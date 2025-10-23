/**
 * Errors Unit Tests
 * Test custom error classes
 */

import { describe, it, expect } from "vitest";
import {
    ValidationError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    InternalServerError,
} from "@/lib/errors";

describe("errors", () => {
    describe("ValidationError", () => {
        it("should create error with 400 status code", () => {
            const error = new ValidationError("Invalid input");
            expect(error.message).toBe("Invalid input");
            expect(error.statusCode).toBe(400);
            expect(error.isOperational).toBe(true);
        });
    });

    describe("AuthenticationError", () => {
        it("should create error with 401 status code", () => {
            const error = new AuthenticationError("Not authenticated");
            expect(error.message).toBe("Not authenticated");
            expect(error.statusCode).toBe(401);
        });
    });

    describe("ForbiddenError", () => {
        it("should create error with 403 status code", () => {
            const error = new ForbiddenError("Access denied");
            expect(error.message).toBe("Access denied");
            expect(error.statusCode).toBe(403);
        });
    });

    describe("NotFoundError", () => {
        it("should create error with 404 status code", () => {
            const error = new NotFoundError("User");
            expect(error.message).toBe("User not found");
            expect(error.statusCode).toBe(404);
        });
    });

    describe("ConflictError", () => {
        it("should create error with 409 status code", () => {
            const error = new ConflictError("Resource already exists");
            expect(error.message).toBe("Resource already exists");
            expect(error.statusCode).toBe(409);
        });
    });

    describe("RateLimitError", () => {
        it("should create error with 429 status code", () => {
            const error = new RateLimitError();
            expect(error.message).toBe("Too many requests");
            expect(error.statusCode).toBe(429);
        });

        it("should accept custom message", () => {
            const error = new RateLimitError("Custom rate limit message");
            expect(error.message).toBe("Custom rate limit message");
        });
    });

    describe("InternalServerError", () => {
        it("should create error with 500 status code", () => {
            const error = new InternalServerError();
            expect(error.message).toBe("Internal server error");
            expect(error.statusCode).toBe(500);
            expect(error.isOperational).toBe(false);
        });
    });
});
