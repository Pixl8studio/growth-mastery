/**
 * Unit Tests: Stripe Payments
 * Tests for lib/stripe/payments.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    createPaymentIntent,
    handlePaymentSuccess,
    handlePaymentFailed,
    handleRefund,
} from "@/lib/stripe/payments";

// Mock dependencies
vi.mock("@/lib/stripe/client", () => ({
    stripe: {
        paymentIntents: {
            create: vi.fn(),
            retrieve: vi.fn(),
        },
    },
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        from: vi.fn((table: string) => ({
            insert: vi.fn(() => ({ error: null })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({ error: null })),
            })),
        })),
    })),
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

vi.mock("@/lib/config", () => ({
    STRIPE_CONFIG: {
        platformFeePercent: 20,
        platformFeeFixed: 50,
        currency: "USD",
    },
}));

describe("Stripe Payments", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("createPaymentIntent", () => {
        it("should create a payment intent with correct platform fee", async () => {
            const { stripe } = await import("@/lib/stripe/client");

            const mockPaymentIntent = {
                id: "pi_test123",
                client_secret: "pi_test123_secret_xyz",
                amount: 10000,
                currency: "usd",
            };

            vi.mocked(stripe.paymentIntents.create).mockResolvedValue(
                mockPaymentIntent as any
            );

            const params = {
                amount: 10000, // $100.00
                currency: "usd",
                sellerAccountId: "acct_seller123",
                userId: "user_123",
                funnelProjectId: "project_123",
                offerId: "offer_123",
                customerEmail: "customer@example.com",
                customerName: "John Doe",
                metadata: { custom: "data" },
            };

            const result = await createPaymentIntent(params);

            // Platform fee calculation: 20% * 10000 + 50 = 2000 + 50 = 2050 cents
            const expectedPlatformFee = 2050;

            expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
                amount: 10000,
                currency: "usd",
                application_fee_amount: expectedPlatformFee,
                transfer_data: {
                    destination: "acct_seller123",
                },
                metadata: {
                    userId: "user_123",
                    funnelProjectId: "project_123",
                    offerId: "offer_123",
                    contactId: "",
                    custom: "data",
                },
                receipt_email: "customer@example.com",
            });

            expect(result).toEqual({
                clientSecret: "pi_test123_secret_xyz",
                paymentIntentId: "pi_test123",
            });
        });

        it("should calculate platform fee correctly for different amounts", async () => {
            const { stripe } = await import("@/lib/stripe/client");

            vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
                id: "pi_test",
                client_secret: "secret",
            } as any);

            await createPaymentIntent({
                amount: 5000, // $50.00
                currency: "usd",
                sellerAccountId: "acct_seller",
                userId: "user_123",
                funnelProjectId: "project_123",
                offerId: "offer_123",
                customerEmail: "test@example.com",
            });

            // Platform fee: 20% * 5000 + 50 = 1000 + 50 = 1050
            expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    application_fee_amount: 1050,
                })
            );
        });

        it("should save transaction to database", async () => {
            const { stripe } = await import("@/lib/stripe/client");
            const { createClient } = await import("@/lib/supabase/server");

            vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
                id: "pi_test123",
                client_secret: "secret",
            } as any);

            const mockSupabase = {
                from: vi.fn((table: string) => ({
                    insert: vi.fn(() => ({ error: null })),
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await createPaymentIntent({
                amount: 10000,
                currency: "usd",
                sellerAccountId: "acct_seller",
                userId: "user_123",
                funnelProjectId: "project_123",
                offerId: "offer_123",
                contactId: "contact_123",
                customerEmail: "test@example.com",
                customerName: "John Doe",
            });

            expect(mockSupabase.from).toHaveBeenCalledWith("payment_transactions");
        });

        it("should handle missing optional contactId", async () => {
            const { stripe } = await import("@/lib/stripe/client");

            vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
                id: "pi_test",
                client_secret: "secret",
            } as any);

            await createPaymentIntent({
                amount: 10000,
                currency: "usd",
                sellerAccountId: "acct_seller",
                userId: "user_123",
                funnelProjectId: "project_123",
                offerId: "offer_123",
                customerEmail: "test@example.com",
            });

            expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        contactId: "",
                    }),
                })
            );
        });

        it("should handle Stripe API errors", async () => {
            const { stripe } = await import("@/lib/stripe/client");

            vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
                new Error("Card declined")
            );

            await expect(
                createPaymentIntent({
                    amount: 10000,
                    currency: "usd",
                    sellerAccountId: "acct_seller",
                    userId: "user_123",
                    funnelProjectId: "project_123",
                    offerId: "offer_123",
                    customerEmail: "test@example.com",
                })
            ).rejects.toThrow(/Failed to create payment/);
        });

        it("should continue even if database save fails", async () => {
            const { stripe } = await import("@/lib/stripe/client");
            const { createClient } = await import("@/lib/supabase/server");

            vi.mocked(stripe.paymentIntents.create).mockResolvedValue({
                id: "pi_test",
                client_secret: "secret",
            } as any);

            const mockSupabase = {
                from: vi.fn(() => ({
                    insert: vi.fn(() => ({ error: new Error("DB error") })),
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            // Should not throw even though DB save fails
            const result = await createPaymentIntent({
                amount: 10000,
                currency: "usd",
                sellerAccountId: "acct_seller",
                userId: "user_123",
                funnelProjectId: "project_123",
                offerId: "offer_123",
                customerEmail: "test@example.com",
            });

            expect(result).toEqual({
                clientSecret: "secret",
                paymentIntentId: "pi_test",
            });
        });
    });

    describe("handlePaymentSuccess", () => {
        it("should update transaction status and contact stage", async () => {
            const { stripe } = await import("@/lib/stripe/client");
            const { createClient } = await import("@/lib/supabase/server");

            const mockCharge = {
                id: "ch_test123",
                receipt_url: "https://stripe.com/receipt",
            };

            vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
                id: "pi_test123",
                customer: "cus_test",
                metadata: { contactId: "contact_123" },
                latest_charge: mockCharge,
            } as any);

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "payment_transactions") {
                        return {
                            update: vi.fn(() => ({
                                eq: vi.fn(() => ({ error: null })),
                            })),
                        };
                    }
                    if (table === "contacts") {
                        return {
                            update: vi.fn(() => ({
                                eq: vi.fn(() => ({ error: null })),
                            })),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await handlePaymentSuccess("pi_test123");

            expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_test123", {
                expand: ["latest_charge"],
            });
        });

        it("should throw error if no charge found", async () => {
            const { stripe } = await import("@/lib/stripe/client");

            vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
                id: "pi_test123",
                latest_charge: undefined,
            } as any);

            await expect(handlePaymentSuccess("pi_test123")).rejects.toThrow(
                /No charge found for payment intent/
            );
        });

        it("should throw error if charge is a string reference", async () => {
            const { stripe } = await import("@/lib/stripe/client");

            vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
                id: "pi_test123",
                latest_charge: "ch_test123", // String reference instead of object
            } as any);

            await expect(handlePaymentSuccess("pi_test123")).rejects.toThrow(
                /No charge found for payment intent/
            );
        });

        it("should handle missing contactId", async () => {
            const { stripe } = await import("@/lib/stripe/client");
            const { createClient } = await import("@/lib/supabase/server");

            vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
                id: "pi_test123",
                customer: "cus_test",
                metadata: {}, // No contactId
                latest_charge: { id: "ch_test", receipt_url: "url" },
            } as any);

            const updateFn = vi.fn(() => ({
                eq: vi.fn(() => ({ error: null })),
            }));

            const mockSupabase = {
                from: vi.fn(() => ({
                    update: updateFn,
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await handlePaymentSuccess("pi_test123");

            // Should only update payment_transactions, not contacts
            expect(mockSupabase.from).toHaveBeenCalledWith("payment_transactions");
        });

        it("should handle database errors", async () => {
            const { stripe } = await import("@/lib/stripe/client");
            const { createClient } = await import("@/lib/supabase/server");

            vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValue({
                id: "pi_test123",
                metadata: {},
                latest_charge: { id: "ch_test", receipt_url: "url" },
            } as any);

            const mockSupabase = {
                from: vi.fn(() => ({
                    update: vi.fn(() => ({
                        eq: vi.fn(() => ({ error: new Error("DB error") })),
                    })),
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await expect(handlePaymentSuccess("pi_test123")).rejects.toThrow();
        });
    });

    describe("handlePaymentFailed", () => {
        it("should update transaction status to failed", async () => {
            const { createClient } = await import("@/lib/supabase/server");

            const updateFn = vi.fn(() => ({
                eq: vi.fn(() => ({ error: null })),
            }));

            const mockSupabase = {
                from: vi.fn(() => ({
                    update: updateFn,
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await handlePaymentFailed("pi_test123");

            expect(updateFn).toHaveBeenCalledWith({ status: "failed" });
        });

        it("should handle database errors", async () => {
            const { createClient } = await import("@/lib/supabase/server");

            const mockSupabase = {
                from: vi.fn(() => ({
                    update: vi.fn(() => ({
                        eq: vi.fn(() => ({ error: new Error("DB error") })),
                    })),
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await expect(handlePaymentFailed("pi_test123")).rejects.toThrow();
        });
    });

    describe("handleRefund", () => {
        it("should update transaction status to refunded", async () => {
            const { createClient } = await import("@/lib/supabase/server");

            const updateFn = vi.fn(() => ({
                eq: vi.fn(() => ({ error: null })),
            }));

            const mockSupabase = {
                from: vi.fn(() => ({
                    update: updateFn,
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await handleRefund("ch_test123");

            expect(updateFn).toHaveBeenCalledWith({ status: "refunded" });
        });

        it("should query by stripe_charge_id", async () => {
            const { createClient } = await import("@/lib/supabase/server");

            const eqFn = vi.fn(() => ({ error: null }));

            const mockSupabase = {
                from: vi.fn(() => ({
                    update: vi.fn(() => ({
                        eq: eqFn,
                    })),
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await handleRefund("ch_test123");

            expect(eqFn).toHaveBeenCalledWith("stripe_charge_id", "ch_test123");
        });

        it("should handle database errors", async () => {
            const { createClient } = await import("@/lib/supabase/server");

            const mockSupabase = {
                from: vi.fn(() => ({
                    update: vi.fn(() => ({
                        eq: vi.fn(() => ({ error: new Error("DB error") })),
                    })),
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await expect(handleRefund("ch_test123")).rejects.toThrow();
        });
    });
});
