"use client";

/**
 * Admin Settings Page (Super Admin Only)
 * Manage admin roles and system configuration
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import Link from "next/link";

interface AdminUser {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
}

interface AdminSettings {
    costAlertThresholdCents: number;
    errorSpikeThreshold: number;
    npsSurveyIntervalDays: number;
}

export default function AdminSettingsPage() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [settings, setSettings] = useState<AdminSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Get current user role
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data: profile } = await supabase
                .from("user_profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            setCurrentUserRole(profile?.role || "user");

            if (profile?.role !== "super_admin") {
                setError("Only super admins can access settings");
                return;
            }

            // Fetch admin users
            const { data: adminUsers, error: adminError } = await supabase
                .from("user_profiles")
                .select("id, email, full_name, role")
                .in("role", ["support", "admin", "super_admin"])
                .order("created_at");

            if (adminError) throw adminError;

            setAdmins(
                adminUsers?.map((a) => ({
                    id: a.id,
                    email: a.email,
                    fullName: a.full_name,
                    role: a.role,
                })) || []
            );

            // Fetch settings
            const { data: settingsData } = await supabase
                .from("admin_settings")
                .select("setting_key, setting_value");

            const settingsMap = new Map(
                settingsData?.map((s) => [s.setting_key, s.setting_value]) || []
            );

            setSettings({
                costAlertThresholdCents: Number(
                    settingsMap.get("cost_alert_threshold_cents") || 5000
                ),
                errorSpikeThreshold: Number(
                    settingsMap.get("error_spike_threshold") || 5
                ),
                npsSurveyIntervalDays: Number(
                    settingsMap.get("nps_survey_interval_days") || 90
                ),
            });
        } catch (err) {
            logger.error({ error: err }, "Failed to fetch admin settings");
            setError("Failed to load settings");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("user_profiles")
                .update({ role: newRole })
                .eq("id", userId);

            if (error) throw error;

            setAdmins((prev) =>
                prev.map((a) => (a.id === userId ? { ...a, role: newRole } : a))
            );
        } catch (err) {
            logger.error({ error: err }, "Failed to update role");
        }
    };

    const handleSaveSettings = async () => {
        if (!settings) return;

        try {
            setSavingSettings(true);
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            // Update each setting
            await Promise.all([
                supabase
                    .from("admin_settings")
                    .update({
                        setting_value: settings.costAlertThresholdCents,
                        updated_by: user?.id,
                    })
                    .eq("setting_key", "cost_alert_threshold_cents"),
                supabase
                    .from("admin_settings")
                    .update({
                        setting_value: settings.errorSpikeThreshold,
                        updated_by: user?.id,
                    })
                    .eq("setting_key", "error_spike_threshold"),
                supabase
                    .from("admin_settings")
                    .update({
                        setting_value: settings.npsSurveyIntervalDays,
                        updated_by: user?.id,
                    })
                    .eq("setting_key", "nps_survey_interval_days"),
            ]);

            logger.info({}, "Admin settings saved");
        } catch (err) {
            logger.error({ error: err }, "Failed to save settings");
        } finally {
            setSavingSettings(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                    Loading settings...
                </div>
            </div>
        );
    }

    if (error || currentUserRole !== "super_admin") {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                    {error || "Only super admins can access this page"}
                </p>
                <Link
                    href="/settings/admin/overview"
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                    Back to overview
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Admin Role Management */}
            <div>
                <h2 className="text-lg font-semibold text-foreground">
                    Admin Role Management
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage who has admin access and their permission level
                </p>

                <div className="mt-4 overflow-hidden rounded-lg border border-border">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Role
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {admins.map((admin) => (
                                <tr key={admin.id}>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <p className="text-sm font-medium text-foreground">
                                            {admin.fullName || admin.email}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {admin.email}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        {admin.role === "super_admin" ? (
                                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                super_admin
                                            </span>
                                        ) : (
                                            <select
                                                value={admin.role}
                                                onChange={(e) =>
                                                    handleRoleChange(
                                                        admin.id,
                                                        e.target.value
                                                    )
                                                }
                                                className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
                                            >
                                                <option value="support">support</option>
                                                <option value="admin">admin</option>
                                                <option value="super_admin">
                                                    super_admin
                                                </option>
                                            </select>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                    <strong>support:</strong> View-only access | <strong>admin:</strong>{" "}
                    Full access, can impersonate | <strong>super_admin:</strong> Can
                    manage other admins
                </p>
            </div>

            {/* Global Settings */}
            {settings && (
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Global Settings
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Configure system-wide thresholds and behavior
                    </p>

                    <div className="mt-4 space-y-4 rounded-lg border border-border bg-card p-4">
                        <div>
                            <label className="text-sm font-medium text-foreground">
                                Cost Alert Threshold (per user/month)
                            </label>
                            <div className="mt-1 flex items-center space-x-2">
                                <span className="text-muted-foreground">$</span>
                                <input
                                    type="number"
                                    value={settings.costAlertThresholdCents / 100}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            costAlertThresholdCents:
                                                Number(e.target.value) * 100,
                                        })
                                    }
                                    className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                                />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Alert when a user&apos;s monthly API cost exceeds this
                                amount
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground">
                                Error Spike Threshold
                            </label>
                            <div className="mt-1">
                                <input
                                    type="number"
                                    value={settings.errorSpikeThreshold}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            errorSpikeThreshold: Number(e.target.value),
                                        })
                                    }
                                    className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                                />
                                <span className="ml-2 text-sm text-muted-foreground">
                                    errors per hour
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Create urgent notification when a user has this many
                                errors in one hour
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground">
                                NPS Survey Interval
                            </label>
                            <div className="mt-1">
                                <input
                                    type="number"
                                    value={settings.npsSurveyIntervalDays}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            npsSurveyIntervalDays: Number(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                                />
                                <span className="ml-2 text-sm text-muted-foreground">
                                    days
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                How often to send NPS surveys to each user
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleSaveSettings}
                                disabled={savingSettings}
                                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {savingSettings ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Links to Other Admin Settings */}
            <div>
                <h2 className="text-lg font-semibold text-foreground">
                    Other Settings
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Link
                        href="/settings/admin/settings/roles"
                        className="rounded-lg border border-border bg-card p-4 hover:bg-muted"
                    >
                        <p className="font-medium text-foreground">Role Permissions</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Configure what each role can access
                        </p>
                    </Link>
                    <Link
                        href="/settings/admin/settings/recipients"
                        className="rounded-lg border border-border bg-card p-4 hover:bg-muted"
                    >
                        <p className="font-medium text-foreground">
                            Notification Recipients
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Configure who receives which notifications
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
