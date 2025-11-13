/**
 * Page Webhook Settings Component
 * Configure webhook settings for individual pages
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/client-logger";
import type {
    PageType,
    EffectiveWebhookConfig,
} from "@/types/pages";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface PageWebhookSettingsProps {
    pageId: string;
    pageType: PageType;
}

export function PageWebhookSettings({ pageId, pageType }: PageWebhookSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [inheritGlobal, setInheritGlobal] = useState(true);
    const [webhookEnabled, setWebhookEnabled] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState("");
    const [webhookSecret, setWebhookSecret] = useState("");

    const [effectiveConfig, setEffectiveConfig] =
        useState<EffectiveWebhookConfig | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [originalInheritGlobal, setOriginalInheritGlobal] = useState(true);
    const [originalWebhookEnabled, setOriginalWebhookEnabled] = useState(false);
    const [originalWebhookUrl, setOriginalWebhookUrl] = useState("");
    const [originalWebhookSecret, setOriginalWebhookSecret] = useState("");

    const loadWebhookConfig = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/pages/${pageId}/webhook?pageType=${pageType}`
            );

            if (!response.ok) {
                throw new Error("Failed to load webhook configuration");
            }

            const data = await response.json();
            const { pageConfig, effectiveConfig: effective } = data;

            setInheritGlobal(pageConfig.webhook_inherit_global ?? true);
            setWebhookEnabled(pageConfig.webhook_enabled ?? false);
            setWebhookUrl(pageConfig.webhook_url || "");
            setWebhookSecret(pageConfig.webhook_secret || "");
            setEffectiveConfig(effective);

            setOriginalInheritGlobal(pageConfig.webhook_inherit_global ?? true);
            setOriginalWebhookEnabled(pageConfig.webhook_enabled ?? false);
            setOriginalWebhookUrl(pageConfig.webhook_url || "");
            setOriginalWebhookSecret(pageConfig.webhook_secret || "");

            logger.info({ pageId, pageType }, "Webhook config loaded");
        } catch (err) {
            logger.error({ error: err, pageId }, "Failed to load webhook config");
            setError("Failed to load webhook configuration");
        } finally {
            setLoading(false);
        }
    }, [pageId, pageType]);

    useEffect(() => {
        loadWebhookConfig();
    }, [pageId, pageType, loadWebhookConfig]);

    useEffect(() => {
        const hasChanges =
            inheritGlobal !== originalInheritGlobal ||
            webhookEnabled !== originalWebhookEnabled ||
            webhookUrl !== originalWebhookUrl ||
            webhookSecret !== originalWebhookSecret;
        setHasUnsavedChanges(hasChanges);
    }, [
        inheritGlobal,
        webhookEnabled,
        webhookUrl,
        webhookSecret,
        originalInheritGlobal,
        originalWebhookEnabled,
        originalWebhookUrl,
        originalWebhookSecret,
    ]);

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const response = await fetch(`/api/pages/${pageId}/webhook`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pageType,
                    webhook_enabled: webhookEnabled,
                    webhook_url: webhookUrl,
                    webhook_secret: webhookSecret,
                    webhook_inherit_global: inheritGlobal,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to save webhook configuration"
                );
            }

            const data = await response.json();
            setEffectiveConfig(data.effectiveConfig);

            setOriginalInheritGlobal(inheritGlobal);
            setOriginalWebhookEnabled(webhookEnabled);
            setOriginalWebhookUrl(webhookUrl);
            setOriginalWebhookSecret(webhookSecret);

            setSuccess("Webhook configuration saved successfully");
            logger.info({ pageId }, "Webhook config saved");

            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            logger.error({ error: err, pageId }, "Failed to save webhook config");
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save webhook configuration"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        try {
            setTesting(true);
            setError(null);
            setSuccess(null);

            const response = await fetch(`/api/pages/${pageId}/webhook`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pageType }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error || data.notConfigured
                        ? "Webhook is not configured"
                        : "Failed to send test webhook"
                );
            }

            setSuccess(
                `Test webhook sent successfully! ${data.isInherited ? "(Using global webhook)" : "(Using page-specific webhook)"}`
            );
            logger.info({ pageId, statusCode: data.statusCode }, "Test webhook sent");

            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            logger.error({ error: err, pageId }, "Failed to test webhook");
            setError(
                err instanceof Error ? err.message : "Failed to send test webhook"
            );
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-foreground">
                    Webhook Configuration
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Configure webhooks to send form submissions to your CRM or
                    automation platform.
                </p>
            </div>

            {error && (
                <div className="rounded-md bg-destructive/10 p-4">
                    <div className="flex">
                        <XCircle className="h-5 w-5 text-destructive" />
                        <p className="ml-3 text-sm text-destructive">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
                    <div className="flex">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <p className="ml-3 text-sm text-green-600 dark:text-green-400">
                            {success}
                        </p>
                    </div>
                </div>
            )}

            {/* Effective Configuration Display */}
            {effectiveConfig && (
                <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="ml-3 flex-1">
                            <h4 className="text-sm font-medium text-foreground">
                                Current Webhook Status
                            </h4>
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                <p>
                                    <strong>Enabled:</strong>{" "}
                                    {effectiveConfig.enabled ? "Yes" : "No"}
                                </p>
                                {effectiveConfig.url && (
                                    <p>
                                        <strong>URL:</strong>{" "}
                                        {effectiveConfig.url.substring(0, 40)}
                                        {effectiveConfig.url.length > 40 ? "..." : ""}
                                    </p>
                                )}
                                <p>
                                    <strong>Source:</strong>{" "}
                                    {effectiveConfig.isInherited
                                        ? "Using global webhook settings"
                                        : "Using page-specific settings"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Inherit from Global Toggle */}
            <div className="flex items-start space-x-3">
                <div className="flex h-5 items-center">
                    <input
                        id="inheritGlobal"
                        type="checkbox"
                        checked={inheritGlobal}
                        onChange={(e) => setInheritGlobal(e.target.checked)}
                        className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                </div>
                <div className="flex-1">
                    <label
                        htmlFor="inheritGlobal"
                        className="text-sm font-medium text-foreground"
                    >
                        Use Global Webhook Settings
                    </label>
                    <p className="text-sm text-muted-foreground">
                        When enabled, this page will use the webhook configured in
                        global settings. Disable to configure a custom webhook for this
                        page only.
                    </p>
                </div>
            </div>

            {/* Page-Specific Configuration */}
            {!inheritGlobal && (
                <div className="space-y-4 rounded-md border border-border bg-card/50 p-4">
                    <div className="flex items-start space-x-3">
                        <div className="flex h-5 items-center">
                            <input
                                id="webhookEnabled"
                                type="checkbox"
                                checked={webhookEnabled}
                                onChange={(e) => setWebhookEnabled(e.target.checked)}
                                className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            />
                        </div>
                        <div className="flex-1">
                            <label
                                htmlFor="webhookEnabled"
                                className="text-sm font-medium text-foreground"
                            >
                                Enable Webhook for This Page
                            </label>
                        </div>
                    </div>

                    {webhookEnabled && (
                        <>
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
                                    placeholder="https://your-crm.com/webhooks/this-page"
                                    required={webhookEnabled}
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    POST requests will be sent to this URL when forms
                                    are submitted
                                </p>
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
                                    type="password"
                                    value={webhookSecret}
                                    onChange={(e) => setWebhookSecret(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Your webhook secret key"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Used to sign requests with HMAC-SHA256 for
                                    verification
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        "Save Configuration"
                    )}
                </Button>

                <Button onClick={handleTest} disabled={testing} variant="outline">
                    {testing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                        </>
                    ) : (
                        "Send Test Webhook"
                    )}
                </Button>

                {hasUnsavedChanges && (
                    <span className="text-sm text-muted-foreground">
                        You have unsaved changes
                    </span>
                )}
            </div>
        </div>
    );
}
