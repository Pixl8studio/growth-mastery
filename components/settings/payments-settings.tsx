/**
 * Payments Settings Component
 * Configure Stripe Connect for receiving payments
 */

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

export function PaymentsSettings() {
    const [loading, setLoading] = useState(true);
    const [stripeConnected, setStripeConnected] = useState(false);
    const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
    const [chargesEnabled, setChargesEnabled] = useState(false);
    const [payoutsEnabled, setPayoutsEnabled] = useState(false);

    useEffect(() => {
        loadPaymentSettings();
    }, []);

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
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Payment Settings</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Connect Stripe to accept payments through your funnel pages
                </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Stripe Connect
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
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
                                    <span className="text-sm text-gray-700">
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
                                    <span className="text-sm text-gray-700">
                                        {payoutsEnabled
                                            ? "Payouts enabled"
                                            : "Payouts not yet enabled"}
                                    </span>
                                </div>
                                {stripeAccountId && (
                                    <p className="mt-2 text-xs text-gray-500">
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
                                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                            >
                                Disconnect
                            </button>
                        ) : (
                            <button
                                onClick={handleConnectStripe}
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                            >
                                Connect Stripe
                            </button>
                        )}
                    </div>
                </div>

                {!stripeConnected && (
                    <div className="mt-6 rounded-md bg-blue-50 p-4">
                        <h4 className="text-sm font-semibold text-blue-900">
                            Why connect Stripe?
                        </h4>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800">
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
                            className="mt-3 inline-block rounded-md border border-yellow-300 bg-white px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-50"
                        >
                            Go to Stripe Dashboard
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
