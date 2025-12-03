/**
 * Email Domains Settings Page
 *
 * Account-wide email domain management.
 * Lists all domains and allows creation of new account-wide domains.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Check, AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmailDomainSetup } from "@/components/funnel/settings/email-domain-setup";
import type { EmailDomain } from "@/types/integrations";

export default function EmailDomainsPage() {
    const [domains, setDomains] = useState<EmailDomain[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSetup, setShowSetup] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { toast } = useToast();

    const loadDomains = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/email-domains");
            const data = await response.json();

            if (data.success) {
                setDomains(data.domains || []);
            }
        } catch (error) {
            logger.error({ error }, "Failed to load email domains");
            toast({
                title: "Error",
                description: "Failed to load email domains",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadDomains();
    }, [loadDomains]);

    const handleDomainSetupComplete = () => {
        setShowSetup(false);
        loadDomains();
    };

    const handleVerifyDomain = async (domainId: string) => {
        setVerifyingId(domainId);
        try {
            const response = await fetch(`/api/email-domains/${domainId}/verify`, {
                method: "POST",
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to verify domain");
            }

            if (data.verification.verified) {
                toast({
                    title: "Domain Verified!",
                    description: "Your domain is now ready to send emails.",
                });
            } else {
                toast({
                    title: "Verification Pending",
                    description:
                        "DNS records not yet propagated. Please wait and try again.",
                });
            }

            loadDomains();
        } catch (error) {
            logger.error({ error, domainId }, "Failed to verify domain");
            toast({
                title: "Verification Failed",
                description:
                    error instanceof Error ? error.message : "Failed to verify domain",
                variant: "destructive",
            });
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDeleteDomain = async (domainId: string, domainName: string) => {
        if (
            !confirm(
                `Are you sure you want to delete ${domainName}? This cannot be undone.`
            )
        ) {
            return;
        }

        setDeletingId(domainId);
        try {
            const response = await fetch(`/api/email-domains/${domainId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to delete domain");
            }

            toast({
                title: "Domain Deleted",
                description: `${domainName} has been deleted successfully.`,
            });

            loadDomains();
        } catch (error) {
            logger.error({ error, domainId }, "Failed to delete domain");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to delete domain",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    if (showSetup) {
        return (
            <div className="container mx-auto max-w-4xl py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground">
                        Add Email Domain
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Set up a new account-wide email domain
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-6">
                    <EmailDomainSetup
                        projectId={null}
                        onComplete={handleDomainSetupComplete}
                    />
                    <Button
                        variant="ghost"
                        onClick={() => setShowSetup(false)}
                        className="mt-4 w-full"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        Email Domains
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Manage your custom email domains for white-label email sending
                    </p>
                </div>
                <Button onClick={() => setShowSetup(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Domain
                </Button>
            </div>

            {/* Info Box */}
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <div className="flex gap-2">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                            About Email Domains
                        </h3>
                        <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                            Email domains allow you to send automated emails from your
                            own branded address (e.g., noreply@yourdomain.com). This
                            improves deliverability, builds trust with recipients, and
                            gives you full control over your email reputation.
                        </p>
                        <p className="mt-2 text-sm text-blue-800 dark:text-blue-200">
                            Account-wide domains can be used across all your funnels,
                            while funnel-specific domains are tied to a single funnel.
                        </p>
                    </div>
                </div>
            </div>

            {/* Domains List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-32 animate-pulse rounded-lg border border-border bg-muted"
                        />
                    ))}
                </div>
            ) : domains.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-12 text-center">
                    <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                        No Email Domains
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Get started by adding your first custom email domain
                    </p>
                    <Button onClick={() => setShowSetup(true)} className="mt-4">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Domain
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {domains.map((domain) => (
                        <div
                            key={domain.id}
                            className="rounded-lg border border-border bg-card p-6"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold text-foreground">
                                            {domain.full_domain}
                                        </h3>
                                        {domain.verification_status === "verified" && (
                                            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                                                <Check className="h-3 w-3" />
                                                Verified
                                            </span>
                                        )}
                                        {domain.verification_status === "pending" && (
                                            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                                                <AlertCircle className="h-3 w-3" />
                                                Pending
                                            </span>
                                        )}
                                        {domain.verification_status === "failed" && (
                                            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                                                <AlertCircle className="h-3 w-3" />
                                                Failed
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                                        <div className="flex gap-2">
                                            <span className="font-medium">Scope:</span>
                                            <span>
                                                {domain.funnel_project_id
                                                    ? "Funnel-specific"
                                                    : "Account-wide"}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-medium">Sender:</span>
                                            <span>
                                                {domain.sender_email ||
                                                    "Not configured"}
                                            </span>
                                        </div>
                                        {domain.verified_at && (
                                            <div className="flex gap-2">
                                                <span className="font-medium">
                                                    Verified:
                                                </span>
                                                <span>
                                                    {new Date(
                                                        domain.verified_at
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                        {domain.last_checked_at && (
                                            <div className="flex gap-2">
                                                <span className="font-medium">
                                                    Last Checked:
                                                </span>
                                                <span>
                                                    {new Date(
                                                        domain.last_checked_at
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {domain.verification_status !== "verified" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                handleVerifyDomain(domain.id)
                                            }
                                            disabled={verifyingId === domain.id}
                                        >
                                            {verifyingId === domain.id ? (
                                                <>
                                                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                                    Verifying
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="mr-1 h-3 w-3" />
                                                    Verify
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                            handleDeleteDomain(
                                                domain.id,
                                                domain.full_domain
                                            )
                                        }
                                        disabled={deletingId === domain.id}
                                    >
                                        {deletingId === domain.id ? (
                                            "Deleting..."
                                        ) : (
                                            <Trash2 className="h-3 w-3" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
