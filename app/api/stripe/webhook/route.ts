/**
 * Stripe Webhook Handler
 * Processes Stripe events (payments, refunds, account updates)
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe/client";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import {
    handlePaymentSuccess,
    handlePaymentFailed,
    handleRefund,
} from "@/lib/stripe/payments";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "stripe-webhook" });

    try {
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
            requestLogger.warn("Missing signature or webhook secret");
            return NextResponse.json({ error: "Missing signature" }, { status: 400 });
        }

        // Verify webhook signature
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            requestLogger.error({ error: err }, "Invalid webhook signature");
            Sentry.captureException(err, {
                tags: {
                    component: "api",
                    endpoint: "POST /api/stripe/webhook",
                },
            });
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        requestLogger.info(
            { eventType: event.type, eventId: event.id },
            "Processing Stripe webhook"
        );

        // Handle different event types
        switch (event.type) {
            case "payment_intent.succeeded":
                await handlePaymentSuccess(event.data.object.id);
                break;

            case "payment_intent.payment_failed":
                await handlePaymentFailed(event.data.object.id);
                break;

            case "charge.refunded":
                await handleRefund(event.data.object.id);
                break;

            case "account.updated":
                // TODO: Update user's Stripe account status
                requestLogger.info(
                    { accountId: event.data.object.id },
                    "Account updated"
                );
                break;

            default:
                requestLogger.info(
                    { eventType: event.type },
                    "Unhandled webhook event"
                );
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        requestLogger.error({ error }, "Failed to process Stripe webhook");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/stripe/webhook",
            },
        });
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}
