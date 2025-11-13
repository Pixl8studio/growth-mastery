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
    const [_hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Store original values to detect changes
    const [originalWebhookEnabled, setOriginalWebhookEnabled] = useState(false);
    const [originalWebhookUrl, setOriginalWebhookUrl] = useState("");
    const [originalWebhookSecret, setOriginalWebhookSecret] = useState("");

    useEffect(() => {
        loadIntegrations();
    }, []);

    // Detect changes to warn user about unsaved changes
    useEffect(() => {
        const hasChanges =
            webhookEnabled !== originalWebhookEnabled ||
            webhookUrl !== originalWebhookUrl ||
            webhookSecret !== originalWebhookSecret;
        setHasUnsavedChanges(hasChanges);
    }, [
        webhookEnabled,
        webhookUrl,
        webhookSecret,
        originalWebhookEnabled,
        originalWebhookUrl,
        originalWebhookSecret,
    ]);

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

            const enabled = profile.webhook_enabled || false;
            const url = profile.crm_webhook_url || "";
            const secret = profile.webhook_secret || "";

            setWebhookEnabled(enabled);
            setWebhookUrl(url);
            setWebhookSecret(secret);

            // Store original values for change detection
            setOriginalWebhookEnabled(enabled);
            setOriginalWebhookUrl(url);
            setOriginalWebhookSecret(secret);
            setHasUnsavedChanges(false);
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

            // Update original values to reflect saved state
            setOriginalWebhookEnabled(webhookEnabled);
            setOriginalWebhookUrl(webhookUrl);
            setOriginalWebhookSecret(webhookSecret);
            setHasUnsavedChanges(false);

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
            // Validate before testing
            if (!webhookEnabled) {
                setError("Please enable the webhook before testing");
                setTesting(false);
                return;
            }

            if (!webhookUrl) {
                setError("Please enter a webhook URL before testing");
                setTesting(false);
                return;
            }

            // Validate URL format
            try {
                new URL(webhookUrl);
            } catch {
                setError("Invalid webhook URL format");
                setTesting(false);
                return;
            }

            // Send current form values for testing (even if unsaved)
            const response = await fetch("/api/user/webhook/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    webhookUrl,
                    webhookSecret: webhookSecret || undefined,
                }),
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
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Integrations</h2>
                <p className="mt-1 text-sm text-muted-foreground">
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
                <div className="rounded-lg border border-border p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Global Webhook Settings
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Default webhook for all pages. Can be overridden
                                per-page.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setWebhookEnabled(!webhookEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                webhookEnabled ? "bg-primary" : "bg-gray-200"
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
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
                                    className="block text-sm font-medium text-foreground"
                                >
                                    Webhook URL
                                </label>
                                <input
                                    id="webhookUrl"
                                    type="url"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="https://your-crm.com/webhooks/genie-ai"
                                    required={webhookEnabled}
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    We'll send a POST request to this URL when a contact
                                    registers through your funnel pages
                                </p>
                            </div>

                            {/* Popular CRM Setup Instructions */}
                            <div className="rounded-md bg-primary/5 p-4">
                                <h4 className="mb-2 text-sm font-semibold text-primary">
                                    Popular CRM Setup
                                </h4>
                                <div className="space-y-2 text-xs text-primary">
                                    <div>
                                        <strong>GoHighLevel:</strong> Create a custom
                                        webhook in Automation → Workflows, then paste
                                        the URL here
                                    </div>
                                    <div>
                                        <strong>Make.com / Zapier:</strong> Create a
                                        webhook trigger and use the provided webhook URL
                                    </div>
                                    <div>
                                        <strong>HubSpot / Salesforce:</strong> Use a
                                        webhook integration tool or custom API endpoint
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="webhookSecret"
                                    className="block text-sm font-medium text-foreground"
                                >
                                    Webhook Secret (Optional)
                                </label>
                                <input
                                    id="webhookSecret"
                                    type="text"
                                    value={webhookSecret}
                                    onChange={(e) => setWebhookSecret(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="your-webhook-secret"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Used to sign requests with HMAC for verification
                                </p>
                            </div>

                            {/* Page-Level Webhooks Info */}
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                                <h4 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                                    💡 Page-Level Webhooks
                                </h4>
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    Individual pages (registration, watch, enrollment)
                                    can override these global settings with their own
                                    custom webhooks. This is useful when you want
                                    different pages to send data to different CRMs or
                                    automation workflows. Configure page-specific
                                    webhooks in each page's settings.
                                </p>
                            </div>

                            <div>
                                <button
                                    type="button"
                                    onClick={handleTestWebhook}
                                    disabled={testing || !webhookUrl}
                                    className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {testing ? "Sending test..." : "Send test webhook"}
                                </button>
                            </div>

                            {/* Webhook Payload Example */}
                            <div className="mt-4 rounded-md bg-muted/50 p-4">
                                <h4 className="mb-2 text-sm font-semibold text-foreground">
                                    Webhook Payload Example
                                </h4>
                                <p className="mb-3 text-xs text-muted-foreground">
                                    This is what your CRM will receive when someone
                                    registers:
                                </p>
                                <pre className="overflow-x-auto text-xs text-foreground">
                                    {JSON.stringify(
                                        {
                                            event: "registration.submitted",
                                            timestamp: "2025-01-24T12:00:00Z",
                                            data: {
                                                email: "user@example.com",
                                                name: "John Doe",
                                                funnel: {
                                                    projectId: "abc-123",
                                                    projectName:
                                                        "My Masterclass Funnel",
                                                    pageId: "page-456",
                                                    pageUrl:
                                                        "https://genieai.com/yourname/my-funnel/register",
                                                },
                                                visitor: {
                                                    id: "visitor-789",
                                                    userAgent:
                                                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                                                    referrer: "https://google.com",
                                                },
                                                utm: {
                                                    source: "facebook",
                                                    medium: "cpc",
                                                    campaign: "summer-promo",
                                                    term: "online-course",
                                                    content: "ad-variant-a",
                                                },
                                            },
                                        },
                                        null,
                                        2
                                    )}
                                </pre>
                                <p className="mt-3 text-xs text-muted-foreground">
                                    Headers:{" "}
                                    <code className="rounded bg-gray-200 px-1">
                                        Content-Type: application/json
                                    </code>
                                    {webhookSecret && (
                                        <>
                                            ,{" "}
                                            <code className="rounded bg-gray-200 px-1">
                                                X-Webhook-Signature: [HMAC-SHA256
                                                signature]
                                            </code>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={loadIntegrations}
                        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
