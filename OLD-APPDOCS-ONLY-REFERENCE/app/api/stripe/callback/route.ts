/**
 * Stripe Connect Callback
 * Handles OAuth callback from Stripe Connect
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { completeConnect } from "@/lib/stripe/connect";

export async function GET(request: NextRequest) {
    const requestLogger = logger.child({ handler: "stripe-callback" });

    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get("code");
        const state = searchParams.get("state"); // This is the userId
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        // Handle errors from Stripe
        if (error) {
            requestLogger.warn({ error, errorDescription }, "Stripe Connect error");
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?error=${encodeURIComponent(errorDescription || error)}`
            );
        }

        if (!code || !state) {
            requestLogger.warn("Missing code or state in callback");
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?error=invalid_request`
            );
        }

        const userId = state;

        requestLogger.info({ userId }, "Processing Stripe Connect callback");

        // Complete the connection
        const { accountId } = await completeConnect(code, userId);

        requestLogger.info(
            { userId, accountId },
            "Stripe Connect completed successfully"
        );

        // Redirect back to settings with success
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?success=true`
        );
    } catch (error) {
        requestLogger.error({ error }, "Failed to process Stripe callback");
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?error=connection_failed`
        );
    }
}
