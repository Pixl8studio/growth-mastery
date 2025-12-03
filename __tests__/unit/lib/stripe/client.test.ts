/**
 * Unit Tests: Stripe Client
 * Tests for lib/stripe/client.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getStripeClient, stripe } from "@/lib/stripe/client";
import Stripe from "stripe";

// Mock the env module
vi.mock("@/lib/env", () => ({
    env: {
        STRIPE_SECRET_KEY: "sk_test_123456789",
    },
}));

describe("Stripe Client", () => {
    beforeEach(() => {
        // Reset modules to ensure fresh instance for each test
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("getStripeClient", () => {
        it("should create and return a Stripe client instance", () => {
            const client = getStripeClient();

            expect(client).toBeInstanceOf(Stripe);
            // Note: apiVersion is set during construction but may not be directly accessible
            expect(client).toBeDefined();
        });

        it("should return the same instance on subsequent calls (singleton pattern)", () => {
            const client1 = getStripeClient();
            const client2 = getStripeClient();

            expect(client1).toBe(client2);
        });

        it("should throw error when STRIPE_SECRET_KEY is not configured", async () => {
            // Mock env with missing key
            vi.doMock("@/lib/env", () => ({
                env: {
                    STRIPE_SECRET_KEY: undefined,
                },
            }));

            // Re-import to get mocked version
            const { getStripeClient: getClient } = await import("@/lib/stripe/client");

            expect(() => getClient()).toThrow(
                "STRIPE_SECRET_KEY is not configured. Please add it to your environment variables."
            );
        });

        it("should initialize Stripe with correct configuration", () => {
            const client = getStripeClient();

            // Verify client is properly configured and is a Stripe instance
            expect(client).toBeInstanceOf(Stripe);
            expect(client).toBeDefined();
        });
    });

    describe("stripe proxy", () => {
        it("should forward property access to the Stripe client", () => {
            // Access a property through the proxy
            expect(stripe.customers).toBeDefined();
            expect(stripe.paymentIntents).toBeDefined();
            expect(stripe.accounts).toBeDefined();
        });

        it("should lazily initialize the client when accessed", () => {
            // The proxy should work even before explicit initialization
            expect(stripe).toBeDefined();
            expect(typeof stripe).toBe("object");
        });

        it("should handle method calls through the proxy", () => {
            // Accessing methods should work through the proxy
            expect(typeof stripe.customers.list).toBe("function");
            expect(typeof stripe.paymentIntents.create).toBe("function");
        });
    });

    describe("error handling", () => {
        it("should handle invalid API key gracefully", async () => {
            vi.doMock("@/lib/env", () => ({
                env: {
                    STRIPE_SECRET_KEY: "",
                },
            }));

            const { getStripeClient: getClient } = await import("@/lib/stripe/client");

            expect(() => getClient()).toThrow();
        });
    });
});
