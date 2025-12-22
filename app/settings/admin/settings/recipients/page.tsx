"use client";

/**
 * Notification Recipients Configuration
 * Configure which admins receive which notification types
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import Link from "next/link";

interface AdminRecipient {
    id: string;
    email: string;
    notificationTypes: string[];
}

const NOTIFICATION_TYPES = [
    { key: "error_spike", label: "Error Alerts" },
    { key: "cost_alert", label: "Cost Alerts" },
    { key: "payment_failed", label: "Payment Failures" },
    { key: "user_struggling", label: "User Struggling" },
    { key: "ai_suggestion", label: "AI Suggestions" },
    { key: "new_user", label: "New Users" },
    { key: "milestone", label: "Milestones" },
];

export default function AdminRecipientsPage() {
    const [recipients, setRecipients] = useState<AdminRecipient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);

    const fetchRecipients = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Get all admins
            const { data: admins, error: adminsError } = await supabase
                .from("user_profiles")
                .select("id, email")
                .in("role", ["support", "admin", "super_admin"]);

            if (adminsError) throw adminsError;

            // Get recipient configurations
            const { data: configs } = await supabase
                .from("admin_notification_recipients")
                .select("admin_user_id, notification_types");

            const configMap = new Map(
                configs?.map((c) => [c.admin_user_id, c.notification_types]) || []
            );

            setRecipients(
                admins?.map((a) => ({
                    id: a.id,
                    email: a.email,
                    notificationTypes:
                        configMap.get(a.id) || NOTIFICATION_TYPES.map((t) => t.key), // Default to all
                })) || []
            );
        } catch (err) {
            logger.error({ error: err }, "Failed to fetch recipients");
            setError("Failed to load recipients");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecipients();
    }, [fetchRecipients]);

    const handleToggle = async (adminId: string, notificationType: string) => {
        try {
            setSaving(adminId);
            const recipient = recipients.find((r) => r.id === adminId);
            if (!recipient) return;

            const newTypes = recipient.notificationTypes.includes(notificationType)
                ? recipient.notificationTypes.filter((t) => t !== notificationType)
                : [...recipient.notificationTypes, notificationType];

            const supabase = createClient();

            // Upsert the configuration
            const { error } = await supabase
                .from("admin_notification_recipients")
                .upsert(
                    {
                        admin_user_id: adminId,
                        notification_types: newTypes,
                    },
                    { onConflict: "admin_user_id" }
                );

            if (error) throw error;

            setRecipients((prev) =>
                prev.map((r) =>
                    r.id === adminId ? { ...r, notificationTypes: newTypes } : r
                )
            );
        } catch (err) {
            logger.error({ error: err }, "Failed to update recipient");
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground">
                    Notification Recipients
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Configure which admins receive which notification types
                </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Admin
                            </th>
                            {NOTIFICATION_TYPES.map((type) => (
                                <th
                                    key={type.key}
                                    className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                >
                                    {type.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {recipients.map((recipient) => (
                            <tr key={recipient.id}>
                                <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                                    {recipient.email}
                                </td>
                                {NOTIFICATION_TYPES.map((type) => (
                                    <td
                                        key={type.key}
                                        className="px-3 py-3 text-center"
                                    >
                                        <button
                                            onClick={() =>
                                                handleToggle(recipient.id, type.key)
                                            }
                                            disabled={saving === recipient.id}
                                            className={`h-5 w-5 rounded border transition-colors ${
                                                recipient.notificationTypes.includes(
                                                    type.key
                                                )
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-border bg-background hover:border-primary"
                                            } ${saving === recipient.id ? "opacity-50" : ""}`}
                                        >
                                            {recipient.notificationTypes.includes(
                                                type.key
                                            ) && (
                                                <svg
                                                    className="h-4 w-4 mx-auto"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Link
                href="/settings/admin/settings"
                className="inline-block text-sm text-primary hover:underline"
            >
                Back to settings
            </Link>
        </div>
    );
}
