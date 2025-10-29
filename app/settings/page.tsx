/**
 * Settings Page
 * Main settings dashboard with user settings and integration status
 */

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { Building2, Mail, Globe, Check, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UserSettings {
    company_name: string;
    support_email: string;
    timezone: string;
    beta_followup_engine_enabled: boolean;
    beta_analytics_modules_enabled: boolean;
}

const TIMEZONES = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
];

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<UserSettings>({
        company_name: "",
        support_email: "",
        timezone: "America/New_York",
        beta_followup_engine_enabled: false,
        beta_analytics_modules_enabled: false,
    });
    const [integrationStatus, setIntegrationStatus] = useState({
        openai: false,
        stripe: false,
        vapi: false,
        cloudflare: false,
    });

    useEffect(() => {
        loadSettings();
        checkIntegrations();
    }, []);

    const loadSettings = async () => {
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            // Get or create user settings
            let { data: userSettings } = await supabase
                .from("user_settings")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (!userSettings) {
                // Settings don't exist, create them
                const { data: newSettings } = await supabase
                    .from("user_settings")
                    .insert({
                        user_id: user.id,
                        timezone: "America/New_York",
                    })
                    .select()
                    .single();

                userSettings = newSettings;
            }

            if (userSettings) {
                setSettings({
                    company_name: userSettings.company_name || "",
                    support_email: userSettings.support_email || "",
                    timezone: userSettings.timezone || "America/New_York",
                    beta_followup_engine_enabled:
                        userSettings.beta_followup_engine_enabled || false,
                    beta_analytics_modules_enabled:
                        userSettings.beta_analytics_modules_enabled || false,
                });
            }
        } catch (err) {
            logger.error({ error: err }, "Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const checkIntegrations = () => {
        // Check if API keys are configured (client-side check for public keys only)
        setIntegrationStatus({
            openai: !!process.env.NEXT_PUBLIC_OPENAI_KEY,
            stripe: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
            vapi: !!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY,
            cloudflare: true, // Server-side only, assume configured
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            await supabase
                .from("user_settings")
                .update({
                    company_name: settings.company_name,
                    support_email: settings.support_email,
                    timezone: settings.timezone,
                    beta_followup_engine_enabled: settings.beta_followup_engine_enabled,
                    beta_analytics_modules_enabled:
                        settings.beta_analytics_modules_enabled,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);

            logger.info({ userId: user.id }, "Settings updated");
        } catch (err) {
            logger.error({ error: err }, "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-gray-500">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="mt-2 text-gray-600">
                    Manage your account preferences and integrations
                </p>
            </div>

            <div className="space-y-8">
                {/* Quick Links */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                        href="/settings/profile"
                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                        <h3 className="font-semibold text-gray-900">Profile</h3>
                        <p className="mt-1 text-sm text-gray-600">
                            Name, email, username
                        </p>
                    </Link>
                    <Link
                        href="/settings/integrations"
                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                        <h3 className="font-semibold text-gray-900">Integrations</h3>
                        <p className="mt-1 text-sm text-gray-600">CRM webhooks</p>
                    </Link>
                    <Link
                        href="/settings/payments"
                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                        <h3 className="font-semibold text-gray-900">Payments</h3>
                        <p className="mt-1 text-sm text-gray-600">Stripe Connect</p>
                    </Link>
                    <Link
                        href="/settings/domains"
                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                        <h3 className="font-semibold text-gray-900">Domains</h3>
                        <p className="mt-1 text-sm text-gray-600">Custom domains</p>
                    </Link>
                </div>

                {/* Business Settings */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="mb-6 text-xl font-semibold text-gray-900">
                        Business Settings
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                                <Building2 className="mr-2 h-4 w-4" />
                                Company Name
                            </label>
                            <input
                                type="text"
                                value={settings.company_name}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        company_name: e.target.value,
                                    })
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Your Company"
                            />
                        </div>

                        <div>
                            <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                                <Mail className="mr-2 h-4 w-4" />
                                Support Email
                            </label>
                            <input
                                type="email"
                                value={settings.support_email}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        support_email: e.target.value,
                                    })
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="support@yourcompany.com"
                            />
                        </div>

                        <div>
                            <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                                <Globe className="mr-2 h-4 w-4" />
                                Timezone
                            </label>
                            <select
                                value={settings.timezone}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        timezone: e.target.value,
                                    })
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {TIMEZONES.map((tz) => (
                                    <option key={tz} value={tz}>
                                        {tz}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Beta Features */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="mb-6 text-xl font-semibold text-gray-900">
                        Beta Features
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900">
                                    AI Follow-Up Engine
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Automated AI-powered follow-up sequences
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    setSettings({
                                        ...settings,
                                        beta_followup_engine_enabled:
                                            !settings.beta_followup_engine_enabled,
                                    })
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settings.beta_followup_engine_enabled
                                        ? "bg-blue-600"
                                        : "bg-gray-200"
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        settings.beta_followup_engine_enabled
                                            ? "translate-x-6"
                                            : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900">
                                    Advanced Analytics
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Enhanced analytics and reporting modules
                                </p>
                            </div>
                            <button
                                onClick={() =>
                                    setSettings({
                                        ...settings,
                                        beta_analytics_modules_enabled:
                                            !settings.beta_analytics_modules_enabled,
                                    })
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    settings.beta_analytics_modules_enabled
                                        ? "bg-blue-600"
                                        : "bg-gray-200"
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        settings.beta_analytics_modules_enabled
                                            ? "translate-x-6"
                                            : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Integration Status */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="mb-6 text-xl font-semibold text-gray-900">
                        Integration Status
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            {
                                name: "OpenAI",
                                key: "openai",
                                docs: "https://platform.openai.com",
                            },
                            {
                                name: "Stripe",
                                key: "stripe",
                                docs: "https://stripe.com/docs",
                            },
                            { name: "VAPI", key: "vapi", docs: "https://docs.vapi.ai" },
                            {
                                name: "Cloudflare Stream",
                                key: "cloudflare",
                                docs: "https://developers.cloudflare.com/stream",
                            },
                        ].map((integration) => (
                            <div
                                key={integration.key}
                                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                            >
                                <div className="flex items-center space-x-3">
                                    {integrationStatus[
                                        integration.key as keyof typeof integrationStatus
                                    ] ? (
                                        <Check className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <X className="h-5 w-5 text-gray-400" />
                                    )}
                                    <span className="font-medium text-gray-900">
                                        {integration.name}
                                    </span>
                                </div>
                                <a
                                    href={integration.docs}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-500"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
