"use client";

/**
 * Admin User Detail Page
 * Comprehensive view of a single user with impersonation capability
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import Link from "next/link";

interface UserDetail {
    id: string;
    email: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
    onboardingCompleted: boolean;
    stripeAccountId: string | null;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
    stripeConnectedAt: string | null;
}

interface HealthScore {
    overallScore: number;
    engagementScore: number | null;
    successScore: number | null;
    technicalScore: number | null;
    billingScore: number | null;
    calculatedAt: string;
}

interface Funnel {
    id: string;
    name: string;
    status: string;
    createdAt: string;
}

interface UserNote {
    id: string;
    adminUserEmail: string;
    content: string;
    followUpDate: string | null;
    followUpCompleted: boolean;
    createdAt: string;
}

interface UsageData {
    service: string;
    totalCostCents: number;
    totalCalls: number;
}

export default function AdminUserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [user, setUser] = useState<UserDetail | null>(null);
    const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [notes, setNotes] = useState<UserNote[]>([]);
    const [usage, setUsage] = useState<UsageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Impersonation state
    const [showImpersonation, setShowImpersonation] = useState(false);

    // New note form
    const [newNote, setNewNote] = useState("");
    const [newNoteFollowUp, setNewNoteFollowUp] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (profileError) {
                if (profileError.code === "PGRST116") {
                    setError("User not found");
                    return;
                }
                throw profileError;
            }

            setUser({
                id: profile.id,
                email: profile.email,
                fullName: profile.full_name,
                username: profile.username,
                avatarUrl: profile.avatar_url,
                createdAt: profile.created_at,
                updatedAt: profile.updated_at,
                onboardingCompleted: profile.onboarding_completed ?? false,
                stripeAccountId: profile.stripe_account_id,
                stripeChargesEnabled: profile.stripe_charges_enabled ?? false,
                stripePayoutsEnabled: profile.stripe_payouts_enabled ?? false,
                stripeConnectedAt: profile.stripe_connected_at,
            });

            // Fetch health score
            const { data: health } = await supabase
                .from("user_health_scores")
                .select("*")
                .eq("user_id", userId)
                .single();

            if (health) {
                setHealthScore({
                    overallScore: health.overall_score,
                    engagementScore: health.engagement_score,
                    successScore: health.success_score,
                    technicalScore: health.technical_score,
                    billingScore: health.billing_score,
                    calculatedAt: health.calculated_at,
                });
            }

            // Fetch funnels
            const { data: userFunnels } = await supabase
                .from("funnel_projects")
                .select("id, name, status, created_at")
                .eq("user_id", userId)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

            setFunnels(
                userFunnels?.map((f) => ({
                    id: f.id,
                    name: f.name,
                    status: f.status,
                    createdAt: f.created_at,
                })) || []
            );

            // Fetch notes
            const { data: userNotes } = await supabase
                .from("admin_user_notes")
                .select(
                    `
                    id,
                    content,
                    follow_up_date,
                    follow_up_completed,
                    created_at,
                    admin_user_id
                `
                )
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            // Get admin emails for notes
            if (userNotes && userNotes.length > 0) {
                const adminIds = [...new Set(userNotes.map((n) => n.admin_user_id))];
                const { data: admins } = await supabase
                    .from("user_profiles")
                    .select("id, email")
                    .in("id", adminIds);

                const adminEmailMap = new Map(
                    admins?.map((a) => [a.id, a.email]) || []
                );

                setNotes(
                    userNotes.map((n) => ({
                        id: n.id,
                        adminUserEmail: adminEmailMap.get(n.admin_user_id) || "Unknown",
                        content: n.content,
                        followUpDate: n.follow_up_date,
                        followUpCompleted: n.follow_up_completed,
                        createdAt: n.created_at,
                    }))
                );
            }

            // Fetch monthly usage
            const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
            const { data: usageData } = await supabase
                .from("api_usage_monthly")
                .select("service, total_cost_cents, total_calls")
                .eq("user_id", userId)
                .eq("month", currentMonth);

            setUsage(
                usageData?.map((u) => ({
                    service: u.service,
                    totalCostCents: u.total_cost_cents,
                    totalCalls: u.total_calls,
                })) || []
            );
        } catch (err) {
            logger.error({ error: err, userId }, "Failed to fetch user data");
            setError("Failed to load user data");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        try {
            setSavingNote(true);
            const supabase = createClient();

            const {
                data: { user: currentUser },
            } = await supabase.auth.getUser();
            if (!currentUser) throw new Error("Not authenticated");

            const { error } = await supabase.from("admin_user_notes").insert({
                user_id: userId,
                admin_user_id: currentUser.id,
                content: newNote,
                follow_up_date: newNoteFollowUp || null,
            });

            if (error) throw error;

            setNewNote("");
            setNewNoteFollowUp("");
            fetchUserData();
        } catch (err) {
            logger.error({ error: err }, "Failed to add note");
        } finally {
            setSavingNote(false);
        }
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const getHealthColor = (score: number | null) => {
        if (score === null) return "text-gray-500";
        if (score >= 80) return "text-green-600 dark:text-green-400";
        if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
        return "text-red-600 dark:text-red-400";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                    Loading user...
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error || "User not found"}</p>
                <Link
                    href="/settings/admin/users"
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                    Back to users
                </Link>
            </div>
        );
    }

    const totalCost = usage.reduce((sum, u) => sum + u.totalCostCents, 0);

    return (
        <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-muted">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt=""
                                className="h-16 w-16 rounded-full"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-medium text-primary">
                                {user.email[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">
                            {user.fullName || user.email}
                        </h2>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Joined {formatDate(user.createdAt)} •{" "}
                            {user.onboardingCompleted
                                ? "Onboarding complete"
                                : "Onboarding incomplete"}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowImpersonation(true)}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    Impersonate User
                </button>
            </div>

            {/* Health Score Card */}
            <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-4 font-semibold text-foreground">Health Score</h3>
                {healthScore ? (
                    <div className="grid gap-4 sm:grid-cols-5">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Overall</p>
                            <p
                                className={`text-2xl font-bold ${getHealthColor(healthScore.overallScore)}`}
                            >
                                {healthScore.overallScore}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Engagement</p>
                            <p
                                className={`text-lg font-semibold ${getHealthColor(healthScore.engagementScore)}`}
                            >
                                {healthScore.engagementScore ?? "—"}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Success</p>
                            <p
                                className={`text-lg font-semibold ${getHealthColor(healthScore.successScore)}`}
                            >
                                {healthScore.successScore ?? "—"}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Technical</p>
                            <p
                                className={`text-lg font-semibold ${getHealthColor(healthScore.technicalScore)}`}
                            >
                                {healthScore.technicalScore ?? "—"}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Billing</p>
                            <p
                                className={`text-lg font-semibold ${getHealthColor(healthScore.billingScore)}`}
                            >
                                {healthScore.billingScore ?? "—"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No health score calculated yet
                    </p>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Funnels */}
                <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="mb-4 font-semibold text-foreground">
                        Funnels ({funnels.length})
                    </h3>
                    {funnels.length > 0 ? (
                        <div className="space-y-2">
                            {funnels.map((funnel) => (
                                <div
                                    key={funnel.id}
                                    className="flex items-center justify-between rounded-md bg-muted/50 p-2"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {funnel.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(funnel.createdAt)}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            funnel.status === "published"
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                        }`}
                                    >
                                        {funnel.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No funnels yet</p>
                    )}
                </div>

                {/* API Usage */}
                <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="mb-4 font-semibold text-foreground">
                        API Usage (This Month)
                    </h3>
                    <p className="mb-4 text-2xl font-bold text-foreground">
                        {formatCurrency(totalCost)}
                    </p>
                    {usage.length > 0 ? (
                        <div className="space-y-2">
                            {usage.map((u, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="text-muted-foreground capitalize">
                                        {u.service}
                                    </span>
                                    <span className="text-foreground">
                                        {formatCurrency(u.totalCostCents)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No usage data</p>
                    )}
                </div>
            </div>

            {/* Team Notes */}
            <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-4 font-semibold text-foreground">Team Notes</h3>

                {/* Add Note Form */}
                <div className="mb-4 space-y-2">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a note about this user..."
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={3}
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-muted-foreground">
                                Follow-up date:
                            </label>
                            <input
                                type="date"
                                value={newNoteFollowUp}
                                onChange={(e) => setNewNoteFollowUp(e.target.value)}
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAddNote}
                            disabled={!newNote.trim() || savingNote}
                            className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {savingNote ? "Saving..." : "Add Note"}
                        </button>
                    </div>
                </div>

                {/* Notes List */}
                {notes.length > 0 ? (
                    <div className="space-y-3">
                        {notes.map((note) => (
                            <div
                                key={note.id}
                                className="rounded-md border border-border/50 bg-muted/30 p-3"
                            >
                                <div className="mb-1 flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {note.adminUserEmail}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDateTime(note.createdAt)}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground">
                                    {note.content}
                                </p>
                                {note.followUpDate && (
                                    <p
                                        className={`mt-2 text-xs ${
                                            note.followUpCompleted
                                                ? "text-green-600"
                                                : "text-yellow-600"
                                        }`}
                                    >
                                        {note.followUpCompleted
                                            ? "Completed"
                                            : `Follow up: ${formatDate(note.followUpDate)}`}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No notes yet</p>
                )}
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-4 font-semibold text-foreground">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                    <button className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted">
                        Send Email
                    </button>
                    <button className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted">
                        Reset Password
                    </button>
                    <button className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted">
                        Extend Trial
                    </button>
                    <button className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted">
                        Apply Credit
                    </button>
                </div>
            </div>

            {/* Impersonation Drawer */}
            {showImpersonation && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowImpersonation(false)}
                    />

                    {/* Admin Panel */}
                    <div className="relative z-10 flex h-full w-[300px] flex-col border-r border-border bg-card">
                        <div className="border-b border-border p-4">
                            <h3 className="font-semibold text-foreground">
                                Impersonation Mode
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Viewing as: {user.fullName || user.email}
                            </p>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Health Score
                                    </p>
                                    <p
                                        className={`text-lg font-bold ${getHealthColor(healthScore?.overallScore ?? null)}`}
                                    >
                                        {healthScore?.overallScore ?? "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Funnels
                                    </p>
                                    <p className="text-lg font-bold text-foreground">
                                        {funnels.length}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Cost (MTD)
                                    </p>
                                    <p className="text-lg font-bold text-foreground">
                                        {formatCurrency(totalCost)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-border p-4">
                            <button
                                onClick={() => setShowImpersonation(false)}
                                className="w-full rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                            >
                                Exit Impersonation
                            </button>
                        </div>
                    </div>

                    {/* User View (iframe placeholder) */}
                    <div className="relative flex-1 bg-background">
                        <div className="absolute left-0 right-0 top-0 z-10 bg-red-500 py-1 text-center text-xs font-medium text-white">
                            IMPERSONATION MODE - Viewing as {user.email} - Read-only
                        </div>
                        <div className="flex h-full items-center justify-center pt-6">
                            <div className="text-center">
                                <p className="text-lg font-semibold text-foreground">
                                    User Dashboard Preview
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Full impersonation with iframe embedding would be
                                    implemented here
                                </p>
                                <p className="mt-4 text-xs text-muted-foreground">
                                    This would show the user&apos;s actual dashboard
                                    view
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
