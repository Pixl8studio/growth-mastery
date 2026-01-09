/**
 * Stripe Connect Route
 * Initiates Stripe Connect OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateConnectUrl } from "@/lib/stripe/connect";

export async function GET(_request: NextRequest) {
    const requestLogger = logger.child({ handler: "stripe-connect" });

    try {
        requestLogger.info("Initiating Stripe Connect");

        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user profile for email
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("email")
            .eq("id", user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Generate Stripe Connect URL
        const connectUrl = await generateConnectUrl(user.id, profile.email);

        requestLogger.info({ userId: user.id }, "Redirecting to Stripe Connect");

        // Redirect to Stripe Connect
        return NextResponse.redirect(connectUrl);
    } catch (error) {
        requestLogger.error({ error }, "Failed to initiate Stripe Connect");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "GET /api/stripe/connect",
            },
        });

        // Redirect to settings page with error message for better UX
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Failed to initiate Stripe Connect";
        const isConfigError =
            errorMessage.includes("not configured") ||
            errorMessage.includes("STRIPE_CONNECT_CLIENT_ID");

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?error=${encodeURIComponent(
                isConfigError
                    ? "stripe_not_configured"
                    : "connection_failed"
            )}&error_detail=${encodeURIComponent(errorMessage)}`
        );
    }
}
