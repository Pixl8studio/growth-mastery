"use client";

/**
 * Integrations Settings Page
 * Configure CRM webhooks and other integrations
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

export default function IntegrationsSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [webhookEnabled, setWebhookEnabled] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookSecret, setWebhookSecret] = useState("");

    useEffect(() => {
        loadIntegrations();
    }, []);

    const loadIntegrations = async () => {
        try {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data: profile, error: profileError } = await supabase
                .from("user_profiles")
                .select("webhook_enabled, crm_webhook_url, webhook_secret")
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;

            setWebhookEnabled(profile.webhook_enabled || false);
            setWebhookUrl(profile.crm_webhook_url || "");
            setWebhookSecret(profile.webhook_secret || "");
        } catch (err) {
            logger.error({ error: err }, "Failed to load integrations");
            setError("Failed to load integrations");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError("Not authenticated");
                return;
            }

            // Validate webhook URL if enabled
            if (webhookEnabled && !webhookUrl) {
                setError("Webhook URL is required when webhook is enabled");
                setSaving(false);
                return;
            }

            // Validate URL format
            if (webhookUrl) {
                try {
                    new URL(webhookUrl);
                } catch {
                    setError("Invalid webhook URL format");
                    setSaving(false);
                    return;
                }
            }

            // Update profile
            const { error: updateError } = await supabase
                .from("user_profiles")
                .update({
                    webhook_enabled: webhookEnabled,
                    crm_webhook_url: webhookUrl || null,
                    webhook_secret: webhookSecret || null,
                })
                .eq("id", user.id);

            if (updateError) throw updateError;

            setSuccess("Webhook settings updated successfully!");
            logger.info({ userId: user.id }, "Webhook settings updated");
        } catch (err) {
            logger.error({ error: err }, "Failed to update webhook settings");
            setError(err instanceof Error ? err.message : "Failed to update settings");
        } finally {
            setSaving(false);
        }
    };

    const handleTestWebhook = async () => {
        setTesting(true);
        setError(null);
        setSuccess(null);

        try {
            if (!webhookUrl) {
                setError("Please enter a webhook URL first");
                setTesting(false);
                return;
            }

            // First save the webhook settings
            if (!webhookEnabled) {
                setError("Please enable the webhook first");
                setTesting(false);
                return;
            }

            const response = await fetch("/api/user/webhook/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(
                    "Test webhook sent! Check your webhook endpoint for the test payload."
                );
                logger.info({}, "Test webhook sent successfully");
            } else {
                setError(data.error || "Failed to send test webhook");
                logger.error({ error: data.error }, "Test webhook failed");
            }
        } catch (err) {
            logger.error({ error: err }, "Failed to test webhook");
            setError("Failed to send test webhook");
        } finally {
            setTesting(false);
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
                <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Connect your CRM and other services to automatically sync leads
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 rounded-md bg-green-50 p-3">
                    <p className="text-sm text-green-800">{success}</p>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                {/* Webhook Configuration */}
                <div className="rounded-lg border border-gray-200 p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                CRM Webhook
                            </h3>
                            <p className="text-sm text-gray-600">
                                Automatically send lead data to your CRM when users
                                register
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setWebhookEnabled(!webhookEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                webhookEnabled ? "bg-blue-600" : "bg-gray-200"
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    webhookEnabled ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>

                    {webhookEnabled && (
                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="webhookUrl"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Webhook URL
                                </label>
                                <input
                                    id="webhookUrl"
                                    type="url"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="https://your-crm.com/webhooks/genie-ai"
                                    required={webhookEnabled}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    We'll send a POST request to this URL when a user
                                    registers
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="webhookSecret"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Webhook Secret (Optional)
                                </label>
                                <input
                                    id="webhookSecret"
                                    type="text"
                                    value={webhookSecret}
                                    onChange={(e) => setWebhookSecret(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="your-webhook-secret"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Used to sign requests with HMAC for verification
                                </p>
                            </div>

                            <div>
                                <button
                                    type="button"
                                    onClick={handleTestWebhook}
                                    disabled={testing || !webhookUrl}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {testing ? "Sending test..." : "Send test webhook"}
                                </button>
                            </div>

                            {/* Webhook Payload Example */}
                            <div className="mt-4 rounded-md bg-gray-50 p-4">
                                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                                    Webhook Payload Example
                                </h4>
                                <pre className="overflow-x-auto text-xs text-gray-700">
                                    {JSON.stringify(
                                        {
                                            event: "registration.submitted",
                                            timestamp: "2025-01-23T12:00:00Z",
                                            data: {
                                                email: "user@example.com",
                                                name: "John Doe",
                                                funnel: {
                                                    projectId: "uuid",
                                                    projectName: "My Funnel",
                                                    pageId: "uuid",
                                                    pageUrl:
                                                        "https://genieai.com/username/funnel",
                                                },
                                                visitor: {
                                                    id: "visitor-uuid",
                                                    userAgent: "Mozilla/5.0...",
                                                    referrer: "https://google.com",
                                                },
                                            },
                                        },
                                        null,
                                        2
                                    )}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={loadIntegrations}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
