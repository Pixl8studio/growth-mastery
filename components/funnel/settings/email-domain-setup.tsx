/**
 * Email Domain Setup Component
 *
 * Multi-step wizard for setting up custom email domains with Mailgun.
 * Handles domain creation, DNS configuration, and verification.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Check, Copy, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { EmailDomain } from "@/types/integrations";

interface EmailDomainSetupProps {
    projectId?: string | null;
    onComplete?: (domain: EmailDomain) => void;
}

type Step = "input" | "dns" | "verification";

interface DNSRecord {
    type: string;
    name: string;
    value: string;
    valid: boolean;
}

export function EmailDomainSetup({
    projectId = null,
    onComplete,
}: EmailDomainSetupProps) {
    const [step, setStep] = useState<Step>("input");
    const [domain, setDomain] = useState("");
    const [subdomain, setSubdomain] = useState("mail");
    const [loading, setLoading] = useState(false);
    const [createdDomain, setCreatedDomain] = useState<EmailDomain | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
    const [existingDomains, setExistingDomains] = useState<EmailDomain[]>([]);
    const { toast } = useToast();

    const loadExistingDomains = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (projectId) {
                params.set("funnel_project_id", projectId);
            }

            const response = await fetch(`/api/email-domains?${params}`);
            const data = await response.json();

            if (data.success) {
                setExistingDomains(data.domains || []);
            }
        } catch (error) {
            logger.error({ error }, "Failed to load existing domains");
        }
    }, [projectId]);

    useEffect(() => {
        loadExistingDomains();
    }, [loadExistingDomains]);

    const handleCreateDomain = async () => {
        if (!domain || !subdomain) {
            toast({
                title: "Missing Information",
                description: "Please enter both domain and subdomain",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/email-domains", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    domain,
                    subdomain,
                    funnel_project_id: projectId,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to create domain");
            }

            setCreatedDomain(data.domain);
            setStep("dns");

            toast({
                title: "Domain Created",
                description: `${subdomain}.${domain} has been created. Please configure DNS records.`,
            });
        } catch (error) {
            logger.error({ error, domain, subdomain }, "Failed to create domain");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to create domain",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyDomain = async () => {
        if (!createdDomain) return;

        setVerifying(true);
        try {
            const response = await fetch(
                `/api/email-domains/${createdDomain.id}/verify`,
                {
                    method: "POST",
                }
            );

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to verify domain");
            }

            setCreatedDomain(data.domain);
            setDnsRecords(data.verification.dns_records || []);

            if (data.verification.verified) {
                setStep("verification");
                toast({
                    title: "Domain Verified!",
                    description: "Your domain is now ready to send emails.",
                });

                if (onComplete) {
                    onComplete(data.domain);
                }
            } else {
                toast({
                    title: "Verification Pending",
                    description:
                        "DNS records not yet propagated. Please wait and try again.",
                    variant: "default",
                });
            }
        } catch (error) {
            logger.error(
                { error, domainId: createdDomain.id },
                "Failed to verify domain"
            );
            toast({
                title: "Verification Failed",
                description:
                    error instanceof Error ? error.message : "Failed to verify domain",
                variant: "destructive",
            });
        } finally {
            setVerifying(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied!",
            description: "DNS record copied to clipboard",
        });
    };

    const handleUseExistingDomain = (existingDomain: EmailDomain) => {
        if (onComplete) {
            onComplete(existingDomain);
        }
    };

    // Step 1: Domain Input
    if (step === "input") {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        Configure Email Domain
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Set up a custom domain to send emails from your own branded
                        address.
                    </p>
                </div>

                {/* Existing Domains */}
                {existingDomains.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-foreground">
                            Use Existing Domain
                        </p>
                        {existingDomains.map((existingDomain) => (
                            <div
                                key={existingDomain.id}
                                className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-primary" />
                                        <span className="font-medium text-foreground">
                                            {existingDomain.full_domain}
                                        </span>
                                        {existingDomain.verification_status ===
                                            "verified" && (
                                            <Check className="h-4 w-4 text-green-500" />
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Status: {existingDomain.verification_status}
                                        {existingDomain.funnel_project_id
                                            ? " • Funnel-specific"
                                            : " • Account-wide"}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        handleUseExistingDomain(existingDomain)
                                    }
                                >
                                    Use This Domain
                                </Button>
                            </div>
                        ))}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or create new domain
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create New Domain */}
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-foreground">
                            Root Domain
                        </label>
                        <Input
                            type="text"
                            placeholder="yourdomain.com"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value.toLowerCase())}
                            className="mt-2"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Your website's domain name
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground">
                            Email Subdomain
                        </label>
                        <Input
                            type="text"
                            placeholder="mail"
                            value={subdomain}
                            onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                            className="mt-2"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Emails will be sent from: {subdomain || "mail"}.
                            {domain || "yourdomain.com"}
                        </p>
                    </div>

                    <Button
                        onClick={handleCreateDomain}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? "Creating..." : "Create Email Domain"}
                    </Button>
                </div>
            </div>
        );
    }

    // Step 2: DNS Configuration
    if (step === "dns" && createdDomain) {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        Configure DNS Records
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Add these DNS records to your domain registrar to verify
                        ownership and enable email sending.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* SPF Record */}
                    {createdDomain.spf_record && (
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-foreground">
                                    TXT (SPF)
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        copyToClipboard(createdDomain.spf_record || "")
                                    }
                                >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                </Button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Host:</span>
                                    <code className="ml-2 rounded bg-muted px-2 py-1">
                                        {createdDomain.full_domain}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Value:
                                    </span>
                                    <code className="ml-2 block mt-1 rounded bg-muted px-2 py-1 break-all">
                                        {createdDomain.spf_record}
                                    </code>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DKIM Record 1 */}
                    {createdDomain.dkim1_record && (
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-foreground">
                                    TXT (DKIM 1)
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        copyToClipboard(
                                            createdDomain.dkim1_record || ""
                                        )
                                    }
                                >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                </Button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Host:</span>
                                    <code className="ml-2 rounded bg-muted px-2 py-1">
                                        {createdDomain.dkim1_host}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Value:
                                    </span>
                                    <code className="ml-2 block mt-1 rounded bg-muted px-2 py-1 break-all">
                                        {createdDomain.dkim1_record}
                                    </code>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DKIM Record 2 */}
                    {createdDomain.dkim2_record && (
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-foreground">
                                    TXT (DKIM 2)
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        copyToClipboard(
                                            createdDomain.dkim2_record || ""
                                        )
                                    }
                                >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                </Button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Host:</span>
                                    <code className="ml-2 rounded bg-muted px-2 py-1">
                                        {createdDomain.dkim2_host}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Value:
                                    </span>
                                    <code className="ml-2 block mt-1 rounded bg-muted px-2 py-1 break-all">
                                        {createdDomain.dkim2_record}
                                    </code>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MX Record (Optional for receiving) */}
                    {createdDomain.mx_record && (
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-foreground">
                                    MX (Optional - for receiving)
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        copyToClipboard(createdDomain.mx_record || "")
                                    }
                                >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                </Button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Host:</span>
                                    <code className="ml-2 rounded bg-muted px-2 py-1">
                                        {createdDomain.mx_host}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Value:
                                    </span>
                                    <code className="ml-2 rounded bg-muted px-2 py-1">
                                        {createdDomain.mx_record}
                                    </code>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Help Section */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                    <div className="flex gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                DNS Propagation
                            </h4>
                            <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                                DNS changes can take 1-48 hours to propagate. After
                                adding these records, click "Verify Domain" to check the
                                status.
                            </p>
                            <a
                                href="https://dnschecker.org"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center text-sm text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Check DNS propagation
                                <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleVerifyDomain}
                    disabled={verifying}
                    className="w-full"
                >
                    {verifying ? (
                        <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        "Verify Domain"
                    )}
                </Button>
            </div>
        );
    }

    // Step 3: Verification Complete
    if (step === "verification" && createdDomain) {
        return (
            <div className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-foreground">
                        Domain Verified!
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Your email domain <strong>{createdDomain.full_domain}</strong>{" "}
                        is now ready to send emails.
                    </p>
                </div>

                {/* DNS Record Status */}
                {dnsRecords.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-4">
                        <p className="mb-3 text-sm font-medium text-foreground">
                            DNS Records Status
                        </p>
                        <div className="space-y-2">
                            {dnsRecords.map((record, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="text-muted-foreground">
                                        {record.type}
                                    </span>
                                    <span
                                        className={cn(
                                            "flex items-center gap-1",
                                            record.valid
                                                ? "text-green-600"
                                                : "text-yellow-600"
                                        )}
                                    >
                                        {record.valid ? (
                                            <>
                                                <Check className="h-3 w-3" />
                                                Verified
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="h-3 w-3" />
                                                Pending
                                            </>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Button
                    onClick={() => onComplete && onComplete(createdDomain)}
                    className="w-full"
                >
                    Done
                </Button>
            </div>
        );
    }

    return null;
}
