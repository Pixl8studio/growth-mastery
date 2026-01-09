/**
 * Payments Settings Component
 * Configure Stripe Connect for receiving payments
 */

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

export function PaymentsSettings() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [stripeConnected, setStripeConnected] = useState(false);
    const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
    const [chargesEnabled, setChargesEnabled] = useState(false);
    const [payoutsEnabled, setPayoutsEnabled] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Check for URL parameters (error/success from OAuth flow)
    const urlError = searchParams.get("error");
    const urlSuccess = searchParams.get("success");
    const errorDetail = searchParams.get("error_detail");

    useEffect(() => {
        loadPaymentSettings();

        // Handle URL parameters
        if (urlError === "stripe_not_configured") {
            setErrorMessage(
                "Stripe Connect is not configured on this server. " +
                    "Please contact support or check that STRIPE_CONNECT_CLIENT_ID is set correctly."
            );
        } else if (urlError === "connection_failed") {
            setErrorMessage(
                errorDetail || "Failed to connect to Stripe. Please try again."
            );
        } else if (urlError) {
            setErrorMessage(errorDetail || "An error occurred with Stripe Connect.");
        }

        if (urlSuccess === "true") {
            setSuccessMessage("Stripe account connected successfully!");
            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    }, [urlError, urlSuccess, errorDetail]);

    const loadPaymentSettings = async () => {
        try {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data: profile, error: profileError } = await supabase
                .from("user_profiles")
                .select(
                    "stripe_account_id, stripe_account_type, stripe_charges_enabled, stripe_payouts_enabled"
                )
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;

            setStripeAccountId(profile.stripe_account_id);
            setStripeConnected(!!profile.stripe_account_id);
            setChargesEnabled(profile.stripe_charges_enabled || false);
            setPayoutsEnabled(profile.stripe_payouts_enabled || false);
        } catch (err) {
            logger.error({ error: err }, "Failed to load payment settings");
        } finally {
            setLoading(false);
        }
    };

    const handleConnectStripe = async () => {
        logger.info({}, "Stripe Connect initiated");
        window.location.href = "/api/stripe/connect";
    };

    const handleDisconnectStripe = async () => {
        if (!confirm("Are you sure you want to disconnect your Stripe account?")) {
            return;
        }

        try {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { error } = await supabase
                .from("user_profiles")
                .update({
                    stripe_account_id: null,
                    stripe_account_type: null,
                    stripe_charges_enabled: false,
                    stripe_payouts_enabled: false,
                })
                .eq("id", user.id);

            if (error) throw error;

            setStripeConnected(false);
            setStripeAccountId(null);
            setChargesEnabled(false);
            setPayoutsEnabled(false);

            logger.info({}, "Stripe disconnected");
        } catch (err) {
            logger.error({ error: err }, "Failed to disconnect Stripe");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Payment Settings</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Connect your Stripe account to receive payments from your funnels
                </p>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 rounded-md bg-green-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg
                                className="h-5 w-5 text-green-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-800">
                                {successMessage}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg
                                className="h-5 w-5 text-red-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-800">
                                {errorMessage}
                            </p>
                            <button
                                onClick={() => setErrorMessage(null)}
                                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            Stripe Connect
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {stripeConnected
                                ? "Your Stripe account is connected"
                                : "Connect your Stripe account to accept payments"}
                        </p>

                        {stripeConnected && (
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center">
                                    <div
                                        className={`mr-2 h-2 w-2 rounded-full ${
                                            chargesEnabled
                                                ? "bg-green-500"
                                                : "bg-red-500"
                                        }`}
                                    />
                                    <span className="text-sm text-foreground">
                                        {chargesEnabled
                                            ? "Charges enabled"
                                            : "Charges not yet enabled"}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <div
                                        className={`mr-2 h-2 w-2 rounded-full ${
                                            payoutsEnabled
                                                ? "bg-green-500"
                                                : "bg-red-500"
                                        }`}
                                    />
                                    <span className="text-sm text-foreground">
                                        {payoutsEnabled
                                            ? "Payouts enabled"
                                            : "Payouts not yet enabled"}
                                    </span>
                                </div>
                                {stripeAccountId && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Account ID: {stripeAccountId}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        {stripeConnected ? (
                            <button
                                onClick={handleDisconnectStripe}
                                className="rounded-md border border-red-300 bg-card px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                            >
                                Disconnect
                            </button>
                        ) : (
                            <button
                                onClick={handleConnectStripe}
                                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/50"
                            >
                                Connect Stripe
                            </button>
                        )}
                    </div>
                </div>

                {!stripeConnected && (
                    <div className="mt-6 rounded-md bg-primary/5 p-4">
                        <h4 className="text-sm font-semibold text-primary">
                            Why connect Stripe?
                        </h4>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-primary">
                            <li>Accept payments directly through your funnel pages</li>
                            <li>
                                Secure payment processing with industry-standard
                                security
                            </li>
                            <li>Automatic payment tracking and receipts</li>
                            <li>Fast payouts to your bank account</li>
                        </ul>
                    </div>
                )}

                {stripeConnected && !chargesEnabled && (
                    <div className="mt-6 rounded-md bg-yellow-50 p-4">
                        <h4 className="text-sm font-semibold text-yellow-900">
                            Complete Your Stripe Setup
                        </h4>
                        <p className="mt-1 text-sm text-yellow-800">
                            Your Stripe account is connected, but charges are not yet
                            enabled. Please complete your Stripe account setup to start
                            accepting payments.
                        </p>
                        <a
                            href="https://dashboard.stripe.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-block rounded-md border border-yellow-300 bg-card px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-50"
                        >
                            Go to Stripe Dashboard
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
