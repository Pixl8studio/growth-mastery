/**
 * Ads Accounts API
 * Get Meta Ad Accounts for the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError } from "@/lib/errors";
import { getAdAccounts } from "@/lib/integrations/meta-ads";
import { decryptToken } from "@/lib/crypto/token-encryption";

/**
 * GET /api/ads/accounts
 * Fetch all Meta Ad Accounts accessible to the user
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        // Get Facebook OAuth connection
        const { data: connection } = await supabase
            .from("marketing_oauth_connections")
            .select("*")
            .eq("platform", "facebook")
            .eq("status", "active")
            .single();

        if (!connection) {
            return NextResponse.json(
                { error: "Facebook not connected" },
                { status: 400 }
            );
        }

        // Decrypt access token
        const accessToken = await decryptToken(connection.access_token_encrypted);

        // Fetch ad accounts from Meta
        const metaAccounts = await getAdAccounts(accessToken);

        // Store or update ad accounts in our database
        for (const metaAccount of metaAccounts) {
            await supabase
                .from("marketing_ad_accounts")
                .upsert(
                    {
                        user_id: user.id,
                        oauth_connection_id: connection.id,
                        meta_ad_account_id: metaAccount.account_id,
                        account_name: metaAccount.name,
                        account_status: metaAccount.account_status.toString(),
                        currency: metaAccount.currency,
                        timezone: metaAccount.timezone_name,
                        is_active: true,
                        updated_at: new Date().toISOString(),
                    },
                    {
                        onConflict: "user_id,meta_ad_account_id",
                    }
                )
                .select()
                .single();
        }

        // Return ad accounts from our database
        const { data: accounts } = await supabase
            .from("marketing_ad_accounts")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true);

        logger.info(
            { userId: user.id, accountCount: accounts?.length },
            "Ad accounts fetched"
        );

        return NextResponse.json({
            success: true,
            accounts: accounts || [],
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/ads/accounts");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "fetch_ad_accounts",
                endpoint: "GET /api/ads/accounts",
            },
            extra: {
                errorType:
                    error instanceof Error ? error.constructor.name : typeof error,
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
