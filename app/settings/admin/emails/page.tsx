"use client";

/**
 * Admin Email Drafts
 * AI-drafted emails awaiting approval
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

interface EmailDraft {
    id: string;
    targetUserId: string;
    targetUserEmail: string;
    triggerReason: string;
    subject: string;
    body: string;
    status: "pending" | "approved" | "sent" | "rejected";
    createdAt: string;
}

export default function AdminEmailsPage() {
    const [drafts, setDrafts] = useState<EmailDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchDrafts = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from("admin_email_drafts")
                .select("*")
                .order("created_at", { ascending: false });

            if (fetchError) throw fetchError;

            // Get target user emails
            const userIds = [...new Set(data?.map((d) => d.target_user_id) || [])];
            const { data: users } = await supabase
                .from("user_profiles")
                .select("id, email")
                .in("id", userIds);

            const userEmailMap = new Map(users?.map((u) => [u.id, u.email]) || []);

            setDrafts(
                data?.map((d) => ({
                    id: d.id,
                    targetUserId: d.target_user_id,
                    targetUserEmail: userEmailMap.get(d.target_user_id) || "Unknown",
                    triggerReason: d.trigger_reason,
                    subject: d.subject,
                    body: d.body,
                    status: d.status,
                    createdAt: d.created_at,
                })) || []
            );
        } catch (err) {
            logger.error({ error: err }, "Failed to fetch email drafts");
            setError("Failed to load email drafts");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts]);

    const handleAction = async (draftId: string, action: "approve" | "reject") => {
        try {
            setProcessing(draftId);
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const status = action === "approve" ? "approved" : "rejected";

            const { error } = await supabase
                .from("admin_email_drafts")
                .update({
                    status,
                    approved_by: action === "approve" ? user.id : null,
                    approved_at: action === "approve" ? new Date().toISOString() : null,
                })
                .eq("id", draftId);

            if (error) throw error;

            // If approved, would send email here
            if (action === "approve") {
                // TODO: Integrate with email service
                await supabase
                    .from("admin_email_drafts")
                    .update({ status: "sent", sent_at: new Date().toISOString() })
                    .eq("id", draftId);
            }

            fetchDrafts();
            setSelectedDraft(null);
        } catch (err) {
            logger.error({ error: err }, "Failed to process email draft");
        } finally {
            setProcessing(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const pendingDrafts = drafts.filter((d) => d.status === "pending");
    const processedDrafts = drafts.filter((d) => d.status !== "pending");

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                    Loading email drafts...
                </div>
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
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-950/30">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        Pending Review
                    </p>
                    <p className="mt-1 text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                        {pendingDrafts.length}
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">Sent</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {drafts.filter((d) => d.status === "sent").length}
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Rejected
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {drafts.filter((d) => d.status === "rejected").length}
                    </p>
                </div>
            </div>

            {/* Pending Drafts */}
            <div>
                <h3 className="mb-4 font-semibold text-foreground">Pending Review</h3>
                {pendingDrafts.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                        <p className="text-muted-foreground">
                            No pending email drafts. AI will create drafts when users
                            need outreach.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingDrafts.map((draft) => (
                            <div
                                key={draft.id}
                                className="rounded-lg border border-border bg-card p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-foreground">
                                            To: {draft.targetUserEmail}
                                        </p>
                                        <p className="text-sm text-foreground">
                                            Subject: {draft.subject}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Trigger: {draft.triggerReason}
                                        </p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDate(draft.createdAt)}
                                    </span>
                                </div>
                                <div className="mt-3 flex space-x-2">
                                    <button
                                        onClick={() => setSelectedDraft(draft)}
                                        className="rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-muted"
                                    >
                                        Preview
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleAction(draft.id, "approve")
                                        }
                                        disabled={processing === draft.id}
                                        className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {processing === draft.id
                                            ? "..."
                                            : "Approve & Send"}
                                    </button>
                                    <button
                                        onClick={() => handleAction(draft.id, "reject")}
                                        disabled={processing === draft.id}
                                        className="rounded-md border border-destructive/50 px-3 py-1 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Processed Drafts */}
            {processedDrafts.length > 0 && (
                <div>
                    <h3 className="mb-4 font-semibold text-foreground">History</h3>
                    <div className="space-y-2">
                        {processedDrafts.slice(0, 10).map((draft) => (
                            <div
                                key={draft.id}
                                className="flex items-center justify-between rounded-md bg-muted/50 p-3"
                            >
                                <div>
                                    <p className="text-sm text-foreground">
                                        {draft.subject}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        To: {draft.targetUserEmail}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        draft.status === "sent"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                    }`}
                                >
                                    {draft.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {selectedDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-card p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">
                                Email Preview
                            </h3>
                            <button
                                onClick={() => setSelectedDraft(null)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground">To</p>
                                <p className="text-sm text-foreground">
                                    {selectedDraft.targetUserEmail}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Subject</p>
                                <p className="text-sm font-medium text-foreground">
                                    {selectedDraft.subject}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Body</p>
                                <div className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">
                                    {selectedDraft.body}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Trigger Reason
                                </p>
                                <p className="text-sm text-foreground">
                                    {selectedDraft.triggerReason}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-2">
                            <button
                                onClick={() => setSelectedDraft(null)}
                                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction(selectedDraft.id, "reject")}
                                disabled={processing === selectedDraft.id}
                                className="rounded-md border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() =>
                                    handleAction(selectedDraft.id, "approve")
                                }
                                disabled={processing === selectedDraft.id}
                                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {processing === selectedDraft.id
                                    ? "Sending..."
                                    : "Approve & Send"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
