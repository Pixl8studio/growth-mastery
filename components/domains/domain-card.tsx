"use client";

/**
 * DomainCard Component
 * Individual domain card with verification polling and copy functionality
 */

import { useState, useCallback } from "react";
import { Copy, Check, RefreshCw, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useDomainVerification } from "./hooks/use-domain-verification";
import { logger } from "@/lib/client-logger";

interface DomainCardProps {
    domain: {
        id: string;
        domain: string;
        verified: boolean;
        verification_status: string;
        funnel_projects: {
            id: string;
            name: string;
        };
        dns_instructions: {
            type: string;
            name: string;
            value: string;
        };
    };
    onVerified: (domainId: string) => void;
    onDelete: (domainId: string, domainName: string) => void;
}

export function DomainCard({ domain, onVerified, onDelete }: DomainCardProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { status, isPolling, checkNow, startPolling } = useDomainVerification({
        domainId: domain.id,
        enabled: !domain.verified,
        initialStatus: domain.verified ? "verified" : "pending",
        onVerified: () => {
            onVerified(domain.id);
            toast({
                title: "Domain verified!",
                description: `${domain.domain} is now connected and ready to use.`,
            });
        },
    });

    const handleCopy = useCallback(
        async (text: string, field: string) => {
            try {
                await navigator.clipboard.writeText(text);
                setCopied(field);
                setTimeout(() => setCopied(null), 2000);
                toast({
                    title: "Copied!",
                    description: `${field} copied to clipboard.`,
                });
            } catch {
                toast({
                    title: "Copy failed",
                    description: "Could not copy to clipboard.",
                    variant: "destructive",
                });
            }
        },
        [toast]
    );

    const handleManualCheck = useCallback(async () => {
        const verified = await checkNow();
        if (!verified) {
            toast({
                title: "Not verified yet",
                description:
                    "DNS records not detected. This can take up to 48 hours to propagate.",
            });
        }
    }, [checkNow, toast]);

    const handleDelete = useCallback(async () => {
        if (
            !confirm(
                `Are you sure you want to remove ${domain.domain}? This action cannot be undone.`
            )
        ) {
            return;
        }

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/domains/${domain.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete domain");
            }

            onDelete(domain.id, domain.domain);
            toast({
                title: "Domain removed",
                description: `${domain.domain} has been disconnected.`,
            });
            logger.info({ domainId: domain.id }, "Domain deleted");
        } catch (error) {
            logger.error({ error }, "Failed to delete domain");
            toast({
                title: "Delete failed",
                description: "Could not remove domain. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    }, [domain.id, domain.domain, onDelete, toast]);

    const isVerified = status === "verified" || domain.verified;

    return (
        <div className="rounded-lg border border-border bg-card p-6">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h4 className="text-lg font-semibold">{domain.domain}</h4>
                    <p className="text-sm text-muted-foreground">
                        Points to: {domain.funnel_projects.name}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {isVerified ? (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                            <Check className="h-3 w-3" />
                            Verified
                        </span>
                    ) : isPolling ? (
                        <span className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Checking...
                        </span>
                    ) : (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                            Pending
                        </span>
                    )}
                </div>
            </div>

            {/* DNS Instructions (for unverified domains) */}
            {!isVerified && (
                <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h5 className="mb-2 font-semibold">DNS Configuration Required</h5>
                    <p className="mb-3 text-sm text-muted-foreground">
                        Add this CNAME record to your DNS provider. Changes can take up
                        to 48 hours to propagate.
                    </p>

                    <div className="space-y-2 rounded border bg-card p-3">
                        {/* Type */}
                        <div className="flex items-center justify-between">
                            <div className="font-mono text-sm">
                                <span className="font-semibold text-muted-foreground">
                                    Type:
                                </span>{" "}
                                CNAME
                            </div>
                        </div>

                        {/* Name */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1 font-mono text-sm">
                                <span className="font-semibold text-muted-foreground">
                                    Name:
                                </span>{" "}
                                <span className="break-all">
                                    {domain.dns_instructions.name}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    handleCopy(domain.dns_instructions.name, "Name")
                                }
                            >
                                {copied === "Name" ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        {/* Value */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1 font-mono text-sm">
                                <span className="font-semibold text-muted-foreground">
                                    Value:
                                </span>{" "}
                                <span className="break-all">
                                    {domain.dns_instructions.value}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    handleCopy(domain.dns_instructions.value, "Value")
                                }
                            >
                                {copied === "Value" ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <Button
                            onClick={handleManualCheck}
                            disabled={isPolling}
                            size="sm"
                        >
                            {isPolling ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Check Now
                                </>
                            )}
                        </Button>

                        {!isPolling && (
                            <Button variant="outline" size="sm" onClick={startPolling}>
                                Start Auto-Check
                            </Button>
                        )}
                    </div>

                    {isPolling && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            Automatically checking every 30 seconds...
                        </p>
                    )}
                </div>
            )}

            {/* Verified status message */}
            {isVerified && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-800">
                        Your domain is live! Visitors can now access your funnel at{" "}
                        <a
                            href={`https://${domain.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 underline hover:no-underline"
                        >
                            {domain.domain}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </p>
                </div>
            )}

            {/* Delete button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
                {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remove Domain
            </Button>
        </div>
    );
}
