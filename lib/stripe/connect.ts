/**
 * Stripe Connect
 * Handle Stripe Connect OAuth and account management
 */

import * as Sentry from "@sentry/nextjs";
import { stripe } from "./client";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { StripeConfigurationError } from "@/lib/errors";

/**
 * Validate Stripe Connect Client ID format
 * Valid IDs start with 'ca_' prefix
 * Returns true only if clientId is a valid non-empty string with ca_ prefix
 */
function isValidStripeConnectClientId(
    clientId: string | undefined
): clientId is string {
    if (!clientId) return false;
    if (!clientId.startsWith("ca_")) return false;
    // Must be at least ca_ + some characters
    if (clientId.length < 10) return false;
    return true;
}

/**
 * Generate Stripe Connect OAuth URL
 */
export async function generateConnectUrl(
    userId: string,
    email: string
): Promise<string> {
    const requestLogger = logger.child({ handler: "stripe-connect-url", userId });

    try {
        requestLogger.info("Generating Stripe Connect URL");

        // Validate required Stripe Connect credentials using typed error
        const clientId = env.STRIPE_CONNECT_CLIENT_ID;
        if (!isValidStripeConnectClientId(clientId)) {
            const error = new StripeConfigurationError(
                "STRIPE_CONNECT_CLIENT_ID",
                clientId || undefined
            );
            requestLogger.error(
                { configKey: error.configKey, suggestion: error.suggestion },
                error.message
            );
            throw error;
        }

        const baseUrl = env.NEXT_PUBLIC_APP_URL;
        const redirectUri = `${baseUrl}/api/stripe/callback`;

        const params = new URLSearchParams({
            client_id: clientId,
            state: userId, // We'll verify this on callback
            scope: "read_write",
            response_type: "code",
            redirect_uri: redirectUri,
            "stripe_user[email]": email,
        });

        const connectUrl = `https://connect.stripe.com/oauth/authorize?${params}`;

        requestLogger.info("Stripe Connect URL generated");

        return connectUrl;
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate Stripe Connect URL");
        Sentry.captureException(error, {
            tags: {
                service: "stripe",
                operation: "generate_connect_url",
            },
            extra: {
                userId,
                email,
            },
        });
        throw new Error(
            `Failed to generate connect URL: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Complete Stripe Connect OAuth flow
 */
export async function completeConnect(
    code: string,
    userId: string
): Promise<{ accountId: string }> {
    const requestLogger = logger.child({ handler: "stripe-complete-connect", userId });

    try {
        requestLogger.info("Completing Stripe Connect");

        // Exchange authorization code for access token
        const response = await stripe.oauth.token({
            grant_type: "authorization_code",
            code,
        });

        const accountId = response.stripe_user_id;

        if (!accountId) {
            throw new Error("No account ID returned from Stripe");
        }

        // Get account details
        const account = await stripe.accounts.retrieve(accountId);

        // Save to database
        const supabase = await createClient();

        const { error: profileError } = await supabase
            .from("user_profiles")
            .update({
                stripe_account_id: accountId,
                stripe_account_type: account.type,
                stripe_charges_enabled: account.charges_enabled || false,
                stripe_payouts_enabled: account.payouts_enabled || false,
                stripe_connected_at: new Date().toISOString(),
            })
            .eq("id", userId);

        if (profileError) {
            throw profileError;
        }

        // Also save to stripe_accounts table
        const { error: accountError } = await supabase.from("stripe_accounts").upsert({
            user_id: userId,
            stripe_account_id: accountId,
            account_type: account.type,
            charges_enabled: account.charges_enabled || false,
            payouts_enabled: account.payouts_enabled || false,
            details_submitted: account.details_submitted || false,
            business_name: account.business_profile?.name,
            business_type: account.business_type,
            country: account.country,
            metadata: {
                capabilities: account.capabilities,
                requirements: account.requirements,
            },
        });

        if (accountError) {
            throw accountError;
        }

        requestLogger.info({ accountId }, "Stripe Connect completed successfully");

        return { accountId };
    } catch (error) {
        requestLogger.error({ error }, "Failed to complete Stripe Connect");
        Sentry.captureException(error, {
            tags: {
                service: "stripe",
                operation: "complete_connect",
            },
            extra: {
                userId,
                code: code.substring(0, 10) + "...", // Partial code for security
            },
        });
        throw new Error(
            `Failed to connect Stripe: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Disconnect Stripe account
 */
export async function disconnectStripe(
    userId: string,
    accountId: string
): Promise<void> {
    const requestLogger = logger.child({
        handler: "stripe-disconnect",
        userId,
        accountId,
    });

    try {
        requestLogger.info("Disconnecting Stripe account");

        // Validate required Stripe Connect credentials using typed error
        if (!isValidStripeConnectClientId(env.STRIPE_CONNECT_CLIENT_ID)) {
            throw new StripeConfigurationError(
                "STRIPE_CONNECT_CLIENT_ID",
                env.STRIPE_CONNECT_CLIENT_ID || undefined
            );
        }

        // Deauthorize the account
        await stripe.oauth.deauthorize({
            client_id: env.STRIPE_CONNECT_CLIENT_ID,
            stripe_user_id: accountId,
        });

        // Update database
        const supabase = await createClient();

        await supabase
            .from("user_profiles")
            .update({
                stripe_account_id: null,
                stripe_account_type: null,
                stripe_charges_enabled: false,
                stripe_payouts_enabled: false,
                stripe_connected_at: null,
            })
            .eq("id", userId);

        // Mark stripe_accounts as disconnected
        await supabase
            .from("stripe_accounts")
            .update({
                charges_enabled: false,
                payouts_enabled: false,
                metadata: { disconnected_at: new Date().toISOString() },
            })
            .eq("user_id", userId)
            .eq("stripe_account_id", accountId);

        requestLogger.info("Stripe account disconnected");
    } catch (error) {
        requestLogger.error({ error }, "Failed to disconnect Stripe");
        Sentry.captureException(error, {
            tags: {
                service: "stripe",
                operation: "disconnect_stripe",
            },
            extra: {
                userId,
                accountId,
            },
        });
        throw new Error(
            `Failed to disconnect Stripe: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Get Stripe account status
 */
export async function getAccountStatus(accountId: string): Promise<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirementsNeeded: string[];
}> {
    const requestLogger = logger.child({ handler: "stripe-account-status", accountId });

    try {
        requestLogger.info("Fetching Stripe account status");

        const account = await stripe.accounts.retrieve(accountId);

        return {
            chargesEnabled: account.charges_enabled || false,
            payoutsEnabled: account.payouts_enabled || false,
            detailsSubmitted: account.details_submitted || false,
            requirementsNeeded: account.requirements?.currently_due || [],
        };
    } catch (error) {
        requestLogger.error({ error }, "Failed to fetch account status");
        Sentry.captureException(error, {
            tags: {
                service: "stripe",
                operation: "get_account_status",
            },
            extra: {
                accountId,
            },
        });
        throw new Error(
            `Failed to fetch account status: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}
