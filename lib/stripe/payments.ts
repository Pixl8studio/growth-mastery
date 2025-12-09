/**
 * Stripe Payments
 * Handle payment processing with platform fees
 */

import * as Sentry from "@sentry/nextjs";
import { stripe } from "./client";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { STRIPE_CONFIG } from "@/lib/config";

/**
 * Create a payment intent with platform fee
 */
export async function createPaymentIntent(params: {
    amount: number; // in cents
    currency: string;
    sellerAccountId: string;
    userId: string;
    funnelProjectId: string;
    offerId: string;
    contactId?: string;
    customerEmail: string;
    customerName?: string;
    metadata?: Record<string, string>;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const requestLogger = logger.child({
        handler: "create-payment-intent",
        amount: params.amount,
        sellerAccountId: params.sellerAccountId,
    });

    try {
        requestLogger.info("Creating payment intent with platform fee");

        // Calculate platform fee
        const platformFeePercent = STRIPE_CONFIG.platformFeePercent / 100;
        const platformFeeFixed = STRIPE_CONFIG.platformFeeFixed;
        const platformFee =
            Math.floor(params.amount * platformFeePercent) + platformFeeFixed;
        const sellerAmount = params.amount - platformFee;

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: params.amount,
            currency: params.currency,
            application_fee_amount: platformFee,
            transfer_data: {
                destination: params.sellerAccountId,
            },
            metadata: {
                userId: params.userId,
                funnelProjectId: params.funnelProjectId,
                offerId: params.offerId,
                contactId: params.contactId || "",
                ...params.metadata,
            },
            receipt_email: params.customerEmail,
        });

        // Save transaction to database
        const supabase = await createClient();

        const { error } = await supabase.from("payment_transactions").insert({
            user_id: params.userId,
            funnel_project_id: params.funnelProjectId,
            offer_id: params.offerId,
            contact_id: params.contactId,
            stripe_payment_intent_id: paymentIntent.id,
            amount: params.amount / 100, // Convert to dollars
            currency: params.currency,
            status: "pending",
            platform_fee_amount: platformFee / 100,
            platform_fee_percent: STRIPE_CONFIG.platformFeePercent,
            seller_amount: sellerAmount / 100,
            seller_stripe_account_id: params.sellerAccountId,
            customer_email: params.customerEmail,
            customer_name: params.customerName,
            metadata: params.metadata,
        });

        if (error) {
            requestLogger.error({ error }, "Failed to save transaction to database");
            // Continue anyway - payment is created
        }

        requestLogger.info(
            {
                paymentIntentId: paymentIntent.id,
                amount: params.amount,
                platformFee,
                sellerAmount,
            },
            "Payment intent created successfully"
        );

        return {
            clientSecret: paymentIntent.client_secret!,
            paymentIntentId: paymentIntent.id,
        };
    } catch (error) {
        requestLogger.error({ error }, "Failed to create payment intent");
        Sentry.captureException(error, {
            tags: {
                service: "stripe",
                operation: "create_payment_intent",
            },
            extra: {
                userId: params.userId,
                funnelProjectId: params.funnelProjectId,
                offerId: params.offerId,
                amount: params.amount,
                sellerAccountId: params.sellerAccountId,
                customerEmail: params.customerEmail,
            },
        });
        throw new Error(
            `Failed to create payment: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Handle successful payment
 * Called from Stripe webhook
 */
export async function handlePaymentSuccess(paymentIntentId: string): Promise<void> {
    const requestLogger = logger.child({
        handler: "payment-success",
        paymentIntentId,
    });

    try {
        requestLogger.info("Processing successful payment");

        // Get payment intent details
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ["latest_charge"],
        });

        const charge = paymentIntent.latest_charge;

        if (!charge || typeof charge === "string") {
            throw new Error("No charge found for payment intent");
        }

        // Update transaction in database
        const supabase = await createClient();

        const { error } = await supabase
            .from("payment_transactions")
            .update({
                status: "succeeded",
                stripe_charge_id: charge.id,
                stripe_customer_id: paymentIntent.customer as string,
                metadata: {
                    ...paymentIntent.metadata,
                    chargeId: charge.id,
                    receiptUrl: charge.receipt_url,
                },
            })
            .eq("stripe_payment_intent_id", paymentIntentId);

        if (error) {
            throw error;
        }

        // Update contact if present
        const contactId = paymentIntent.metadata.contactId;
        if (contactId) {
            await supabase
                .from("contacts")
                .update({
                    current_stage: "purchased",
                    stages_completed: [
                        "registration",
                        "watch",
                        "enrollment",
                        "purchased",
                    ],
                })
                .eq("id", contactId);
        }

        requestLogger.info("Payment success processed");
    } catch (error) {
        requestLogger.error({ error }, "Failed to process payment success");
        Sentry.captureException(error, {
            tags: {
                service: "stripe",
                operation: "handle_payment_success",
            },
            extra: {
                paymentIntentId,
            },
        });
        throw error;
    }
}

/**
 * Handle failed payment
 * Called from Stripe webhook
 */
export async function handlePaymentFailed(paymentIntentId: string): Promise<void> {
    const requestLogger = logger.child({
        handler: "payment-failed",
        paymentIntentId,
    });

    try {
        requestLogger.info("Processing failed payment");

        const supabase = await createClient();

        const { error } = await supabase
            .from("payment_transactions")
            .update({
                status: "failed",
            })
            .eq("stripe_payment_intent_id", paymentIntentId);

        if (error) {
            throw error;
        }

        requestLogger.info("Payment failure processed");
    } catch (error) {
        requestLogger.error({ error }, "Failed to process payment failure");
        Sentry.captureException(error, {
            tags: {
                service: "stripe",
                operation: "handle_payment_failed",
            },
            extra: {
                paymentIntentId,
            },
        });
        throw error;
    }
}

/**
 * Handle refund
 * Called from Stripe webhook
 */
export async function handleRefund(chargeId: string): Promise<void> {
    const requestLogger = logger.child({
        handler: "payment-refund",
        chargeId,
    });

    try {
        requestLogger.info("Processing refund");

        const supabase = await createClient();

        const { error } = await supabase
            .from("payment_transactions")
            .update({
                status: "refunded",
            })
            .eq("stripe_charge_id", chargeId);

        if (error) {
            throw error;
        }

        requestLogger.info("Refund processed");
    } catch (error) {
        requestLogger.error({ error }, "Failed to process refund");
        Sentry.captureException(error, {
            tags: {
                service: "stripe",
                operation: "handle_refund",
            },
            extra: {
                chargeId,
            },
        });
        throw error;
    }
}
