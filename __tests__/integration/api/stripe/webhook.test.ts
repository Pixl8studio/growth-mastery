/**
 * Integration Tests: Stripe Webhook Route
 * Tests for app/api/stripe/webhook/route.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/stripe/webhook/route";
import { NextRequest } from "next/server";
import type Stripe from "stripe";

// Mock dependencies
vi.mock("@/lib/stripe/client", () => ({
    stripe: {
        webhooks: {
            constructEvent: vi.fn(),
        },
    },
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
    },
}));

vi.mock("@/lib/env", () => ({
    env: {
        STRIPE_WEBHOOK_SECRET: "whsec_test123",
    },
}));

vi.mock("@/lib/stripe/payments", () => ({
    handlePaymentSuccess: vi.fn(),
    handlePaymentFailed: vi.fn(),
    handleRefund: vi.fn(),
}));

describe("POST /api/stripe/webhook", () => {
    const mockSignature = "t=1234567890,v1=signature_hash";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should handle payment_intent.succeeded event", async () => {
        const { stripe } = await import("@/lib/stripe/client");
        const { handlePaymentSuccess } = await import("@/lib/stripe/payments");

        const mockEvent: Stripe.Event = {
            id: "evt_test123",
            type: "payment_intent.succeeded",
            data: {
                object: {
                    id: "pi_test123",
                } as Stripe.PaymentIntent,
            },
        } as Stripe.Event;

        vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent);
        vi.mocked(handlePaymentSuccess).mockResolvedValue();

        const mockRequest = {
            text: vi.fn().mockResolvedValue(JSON.stringify(mockEvent)),
            headers: new Headers({ "stripe-signature": mockSignature }),
        } as unknown as NextRequest;

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ received: true });
        expect(handlePaymentSuccess).toHaveBeenCalledWith("pi_test123");
    });

    it("should handle payment_intent.payment_failed event", async () => {
        const { stripe } = await import("@/lib/stripe/client");
        const { handlePaymentFailed } = await import("@/lib/stripe/payments");

        const mockEvent: Stripe.Event = {
            id: "evt_test456",
            type: "payment_intent.payment_failed",
            data: {
                object: {
                    id: "pi_failed123",
                } as Stripe.PaymentIntent,
            },
        } as Stripe.Event;

        vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent);
        vi.mocked(handlePaymentFailed).mockResolvedValue();

        const mockRequest = {
            text: vi.fn().mockResolvedValue(JSON.stringify(mockEvent)),
            headers: new Headers({ "stripe-signature": mockSignature }),
        } as unknown as NextRequest;

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ received: true });
        expect(handlePaymentFailed).toHaveBeenCalledWith("pi_failed123");
    });

    it("should handle charge.refunded event", async () => {
        const { stripe } = await import("@/lib/stripe/client");
        const { handleRefund } = await import("@/lib/stripe/payments");

        const mockEvent: Stripe.Event = {
            id: "evt_refund123",
            type: "charge.refunded",
            data: {
                object: {
                    id: "ch_refund123",
                } as Stripe.Charge,
            },
        } as Stripe.Event;

        vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent);
        vi.mocked(handleRefund).mockResolvedValue();

        const mockRequest = {
            text: vi.fn().mockResolvedValue(JSON.stringify(mockEvent)),
            headers: new Headers({ "stripe-signature": mockSignature }),
        } as unknown as NextRequest;

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ received: true });
        expect(handleRefund).toHaveBeenCalledWith("ch_refund123");
    });

    it("should handle account.updated event", async () => {
        const { stripe } = await import("@/lib/stripe/client");

        const mockEvent: Stripe.Event = {
            id: "evt_account123",
            type: "account.updated",
            data: {
                object: {
                    id: "acct_test123",
                } as Stripe.Account,
            },
        } as Stripe.Event;

        vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent);

        const mockRequest = {
            text: vi.fn().mockResolvedValue(JSON.stringify(mockEvent)),
            headers: new Headers({ "stripe-signature": mockSignature }),
        } as unknown as NextRequest;

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ received: true });
    });

    it("should handle unhandled event types gracefully", async () => {
        const { stripe } = await import("@/lib/stripe/client");

        const mockEvent: Stripe.Event = {
            id: "evt_other123",
            type: "customer.created" as any,
            data: {
                object: {} as any,
            },
        } as Stripe.Event;

        vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent);

        const mockRequest = {
            text: vi.fn().mockResolvedValue(JSON.stringify(mockEvent)),
            headers: new Headers({ "stripe-signature": mockSignature }),
        } as unknown as NextRequest;

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ received: true });
    });

    it("should return 400 when signature is missing", async () => {
        const mockRequest = {
            text: vi.fn().mockResolvedValue("{}"),
            headers: new Headers(),
        } as unknown as NextRequest;

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Missing signature" });
    });

    it("should return 400 when webhook secret is not configured", async () => {
        vi.doMock("@/lib/env", () => ({
            env: {
                STRIPE_WEBHOOK_SECRET: undefined,
            },
        }));

        const mockRequest = {
            text: vi.fn().mockResolvedValue("{}"),
            headers: new Headers({ "stripe-signature": mockSignature }),
        } as unknown as NextRequest;

        const { POST: postHandler } = await import("@/app/api/vapi/webhook/route");
        const response = await postHandler(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Missing signature" });
    });

    it("should return 400 when signature verification fails", async () => {
        const { stripe } = await import("@/lib/stripe/client");

        vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
            throw new Error("Invalid signature");
        });

        const mockRequest = {
            text: vi.fn().mockResolvedValue("{}"),
            headers: new Headers({ "stripe-signature": "invalid_signature" }),
        } as unknown as NextRequest;

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Invalid signature" });
    });

    it("should return 500 when event handler throws error", async () => {
        const { stripe } = await import("@/lib/stripe/client");
        const { handlePaymentSuccess } = await import("@/lib/stripe/payments");

        const mockEvent: Stripe.Event = {
            id: "evt_test",
            type: "payment_intent.succeeded",
            data: {
                object: {
                    id: "pi_test",
                } as Stripe.PaymentIntent,
            },
        } as Stripe.Event;

        vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent);
        vi.mocked(handlePaymentSuccess).mockRejectedValue(new Error("Database error"));

        const mockRequest = {
            text: vi.fn().mockResolvedValue(JSON.stringify(mockEvent)),
            headers: new Headers({ "stripe-signature": mockSignature }),
        } as unknown as NextRequest;

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Webhook processing failed" });
    });

    it("should verify webhook signature with correct parameters", async () => {
        const { stripe } = await import("@/lib/stripe/client");

        const mockEvent: Stripe.Event = {
            id: "evt_test",
            type: "payment_intent.succeeded",
            data: {
                object: { id: "pi_test" } as Stripe.PaymentIntent,
            },
        } as Stripe.Event;

        const rawBody = JSON.stringify({ type: "payment_intent.succeeded" });

        vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent);

        const mockRequest = {
            text: vi.fn().mockResolvedValue(rawBody),
            headers: new Headers({ "stripe-signature": mockSignature }),
        } as unknown as NextRequest;

        await POST(mockRequest);

        expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
            rawBody,
            mockSignature,
            "whsec_test123"
        );
    });

    it("should handle malformed JSON in webhook body", async () => {
        const mockRequest = {
            text: vi.fn().mockResolvedValue("invalid json"),
            headers: new Headers({ "stripe-signature": mockSignature }),
        } as unknown as NextRequest;

        const { stripe } = await import("@/lib/stripe/client");

        vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
            throw new Error("Unexpected token");
        });

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toEqual({ error: "Invalid signature" });
    });
});
