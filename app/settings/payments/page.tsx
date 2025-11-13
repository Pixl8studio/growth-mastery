"use client";

/**
 * Payments Settings Page
 * Configure Stripe Connect for receiving payments
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

export default function PaymentsSettingsPage() {
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
        // Redirect to Stripe Connect authorization
        window.location.href = "/api/stripe/connect";
    };

    const handleDisconnectStripe = async () => {
        if (!confirm("Are you sure you want to disconnect your Stripe account?")) {
            return;
        }

        try {
            logger.info({}, "Stripe disconnect initiated");

            const response = await fetch("/api/stripe/disconnect", {
                method: "POST",
            });

            const data = await response.json();

            if (data.success) {
                // Reload page to show disconnected state
                window.location.reload();
            } else {
                alert("Failed to disconnect Stripe account");
            }
        } catch (error) {
            logger.error({ error }, "Failed to disconnect Stripe");
            alert("Failed to disconnect Stripe account");
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

            {/* Stripe Connect Status */}
            <div className="space-y-6">
                <div className="rounded-lg border border-border p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Stripe Connect
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Accept payments directly through your funnels
                            </p>
                        </div>
                        {stripeConnected ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                <svg
                                    className="mr-1.5 h-4 w-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                Connected
                            </span>
                        ) : (
                            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
                                Not Connected
                            </span>
                        )}
                    </div>

                    {stripeConnected ? (
                        <div className="space-y-4">
                            <div className="rounded-md bg-green-50 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg
                                            className="h-5 w-5 text-green-400"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-green-800">
                                            Stripe account connected
                                        </h3>
                                        <div className="mt-2 text-sm text-green-700">
                                            <p>Account ID: {stripeAccountId}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Account Capabilities */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground">
                                    Account Capabilities
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Accept Charges
                                        </span>
                                        <span
                                            className={`text-sm font-medium ${
                                                chargesEnabled
                                                    ? "text-green-600"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {chargesEnabled ? "Enabled" : "Pending"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Receive Payouts
                                        </span>
                                        <span
                                            className={`text-sm font-medium ${
                                                payoutsEnabled
                                                    ? "text-green-600"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {payoutsEnabled ? "Enabled" : "Pending"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Platform Fee Info */}
                            <div className="rounded-md bg-primary/5 p-4">
                                <h4 className="text-sm font-semibold text-primary">
                                    Platform Fee
                                </h4>
                                <p className="mt-1 text-sm text-primary">
                                    Growth Mastery AI acts as your affiliate marketer
                                    and charges a 20% platform fee + $0.50 per
                                    transaction for all sales we generate. You'll
                                    receive 80% of each sale minus Stripe processing
                                    fees.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleDisconnectStripe}
                                className="text-sm font-medium text-red-600 hover:text-red-500"
                            >
                                Disconnect Stripe Account
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-md bg-primary/5 p-4">
                                <h4 className="text-sm font-semibold text-primary">
                                    Why Connect Stripe?
                                </h4>
                                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-primary">
                                    <li>
                                        Accept payments directly through your funnels
                                    </li>
                                    <li>Automatic payout to your bank account</li>
                                    <li>Track all transactions in one place</li>
                                    <li>No upfront fees, only pay per transaction</li>
                                </ul>
                            </div>

                            <button
                                type="button"
                                onClick={handleConnectStripe}
                                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/50"
                            >
                                <svg
                                    className="mr-2 h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                                Connect Stripe Account
                            </button>

                            <p className="text-xs text-muted-foreground">
                                You'll be redirected to Stripe to complete the
                                connection process
                            </p>
                        </div>
                    )}
                </div>

                {/* Transaction History (Future) */}
                <div className="rounded-lg border border-border p-6">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">
                        Transaction History
                    </h3>
                    <div className="text-center text-sm text-muted-foreground">
                        <p>No transactions yet</p>
                        <p className="mt-1">
                            Transactions will appear here once you start receiving
                            payments
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
