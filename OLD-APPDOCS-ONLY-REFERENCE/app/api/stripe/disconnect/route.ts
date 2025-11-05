/**
 * Stripe Disconnect Route
 * Disconnects user's Stripe Connect account
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { disconnectStripe } from "@/lib/stripe/connect";

export async function POST(_request: NextRequest) {
    const requestLogger = logger.child({ handler: "stripe-disconnect" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        requestLogger.info({ userId: user.id }, "Disconnecting Stripe account");

        // Get current Stripe account ID
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("stripe_account_id")
            .eq("id", user.id)
            .single();

        if (!profile?.stripe_account_id) {
            return NextResponse.json(
                { error: "No Stripe account connected" },
                { status: 400 }
            );
        }

        // Disconnect
        await disconnectStripe(user.id, profile.stripe_account_id);

        requestLogger.info({ userId: user.id }, "Stripe account disconnected");

        return NextResponse.json({ success: true });
    } catch (error) {
        requestLogger.error({ error }, "Failed to disconnect Stripe");
        return NextResponse.json(
            { error: "Failed to disconnect Stripe account" },
            { status: 500 }
        );
    }
}
