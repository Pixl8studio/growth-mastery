/**
 * Stripe Connect Route
 * Initiates Stripe Connect OAuth flow
 */

import { NextRequest, NextResponse } from "next/server";
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
        return NextResponse.json(
            { error: "Failed to initiate Stripe Connect" },
            { status: 500 }
        );
    }
}
