/**
 * Sender Setup Tab Component
 *
 * UI for configuring sender identity via Mailgun (custom domain), Gmail OAuth, or SendGrid.
 * Supports DNS-based domain verification for professional email branding.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Loader2,
    AlertTriangle,
    Check,
    Globe,
    Mail,
    Copy,
    RefreshCw,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";
import type { EmailDomain } from "@/types/integrations";

type EmailProviderType = "mailgun" | "sendgrid" | "gmail" | "console" | null;

interface SenderSetupTabProps {
    agentConfigId: string;
    funnelProjectId?: string | null;
    currentSenderName?: string | null;
    currentSenderEmail?: string | null;
    currentSMSSenderId?: string | null;
    emailProviderType?: EmailProviderType;
    gmailUserEmail?: string | null;
    mailgunDomainId?: string | null;
    onUpdate?: () => void;
}

export function SenderSetupTab({
    agentConfigId,
    funnelProjectId = null,
    currentSenderName,
    currentSenderEmail,
    currentSMSSenderId,
    emailProviderType = "sendgrid",
    gmailUserEmail,
    mailgunDomainId,
    onUpdate,
}: SenderSetupTabProps) {
    const { toast } = useToast();
    const [senderName, setSenderName] = useState(currentSenderName || "");
    const [senderEmail, setSenderEmail] = useState(currentSenderEmail || "");
    const [smsSenderId, setSmsSenderId] = useState(currentSMSSenderId || "");
    const [saving, setSaving] = useState(false);
    const [connectingGmail, setConnectingGmail] = useState(false);
    const [disconnectingGmail, setDisconnectingGmail] = useState(false);
    const [localProviderType, setLocalProviderType] =
        useState<EmailProviderType>(emailProviderType);
    const [localGmailEmail, setLocalGmailEmail] = useState(gmailUserEmail);
    const [gmailAvailable, setGmailAvailable] = useState<boolean | null>(null);
    const [checkingGmailStatus, setCheckingGmailStatus] = useState(true);

    // Mailgun domain state
    const [emailDomains, setEmailDomains] = useState<EmailDomain[]>([]);
    const [selectedDomain, setSelectedDomain] = useState<EmailDomain | null>(null);
    const [loadingDomains, setLoadingDomains] = useState(false);
    const [showDomainSetup, setShowDomainSetup] = useState(false);
    const [newDomain, setNewDomain] = useState("");
    const [newSubdomain, setNewSubdomain] = useState("mail");
    const [creatingDomain, setCreatingDomain] = useState(false);
    const [verifyingDomain, setVerifyingDomain] = useState(false);
    const [showDNSRecords, setShowDNSRecords] = useState(false);

    // Check Gmail OAuth configuration status on mount
    useEffect(() => {
        const checkGmailSetup = async () => {
            try {
                const response = await fetch("/api/followup/gmail/status");
                const data = await response.json();
                setGmailAvailable(data.available);
                logger.info(
                    { available: data.available },
                    "Gmail OAuth configuration status checked"
                );
            } catch (error) {
                logger.error({ error }, "Failed to check Gmail OAuth status");
                setGmailAvailable(false);
            } finally {
                setCheckingGmailStatus(false);
            }
        };
        checkGmailSetup();
    }, []);

    // Load email domains
    const loadEmailDomains = useCallback(async () => {
        setLoadingDomains(true);
        try {
            const params = new URLSearchParams();
            if (funnelProjectId) {
                params.set("funnel_project_id", funnelProjectId);
            }
            const response = await fetch(`/api/email-domains?${params}`);
            const data = await response.json();

            if (data.success) {
                setEmailDomains(data.domains || []);
                // If we have a mailgunDomainId, find and select that domain
                if (mailgunDomainId) {
                    const domain = (data.domains || []).find(
                        (d: EmailDomain) => d.id === mailgunDomainId
                    );
                    if (domain) {
                        setSelectedDomain(domain);
                        if (domain.verification_status === "verified") {
                            setLocalProviderType("mailgun");
                        }
                    }
                }
            }
        } catch (error) {
            logger.error({ error }, "Failed to load email domains");
        } finally {
            setLoadingDomains(false);
        }
    }, [funnelProjectId, mailgunDomainId]);

    useEffect(() => {
        loadEmailDomains();
    }, [loadEmailDomains]);

    // Create new domain
    const handleCreateDomain = async () => {
        if (!newDomain || !newSubdomain) {
            toast({
                title: "Missing Information",
                description: "Please enter both domain and subdomain",
                variant: "destructive",
            });
            return;
        }

        setCreatingDomain(true);
        try {
            const response = await fetch("/api/email-domains", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    domain: newDomain,
                    subdomain: newSubdomain,
                    funnel_project_id: funnelProjectId,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to create domain");
            }

            setSelectedDomain(data.domain);
            setShowDomainSetup(false);
            setShowDNSRecords(true);
            await loadEmailDomains();

            toast({
                title: "Domain Created",
                description: `${newSubdomain}.${newDomain} created. Configure DNS records below.`,
            });
        } catch (error) {
            logger.error({ error }, "Failed to create domain");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to create domain",
                variant: "destructive",
            });
        } finally {
            setCreatingDomain(false);
        }
    };

    // Verify domain DNS
    const handleVerifyDomain = async (domain: EmailDomain) => {
        setVerifyingDomain(true);
        try {
            const response = await fetch(`/api/email-domains/${domain.id}/verify`, {
                method: "POST",
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to verify domain");
            }

            if (data.verification.verified) {
                setSelectedDomain(data.domain);
                setLocalProviderType("mailgun");
                await loadEmailDomains();
                toast({
                    title: "Domain Verified!",
                    description: "Your custom email domain is now ready to use.",
                });

                if (onUpdate) {
                    onUpdate();
                }
            } else {
                toast({
                    title: "Verification Pending",
                    description:
                        "DNS records not yet propagated. This can take up to 48 hours.",
                    variant: "default",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to verify domain");
            toast({
                title: "Verification Failed",
                description:
                    error instanceof Error ? error.message : "Failed to verify",
                variant: "destructive",
            });
        } finally {
            setVerifyingDomain(false);
        }
    };

    // Select a domain for sending
    const handleSelectDomain = async (domain: EmailDomain) => {
        setSelectedDomain(domain);
        if (domain.verification_status === "verified") {
            setLocalProviderType("mailgun");
            // Update the agent config to use this domain
            try {
                await fetch("/api/followup/sender/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        agent_config_id: agentConfigId,
                        email_provider_type: "mailgun",
                        mailgun_domain_id: domain.id,
                        sender_email: `noreply@${domain.full_domain}`,
                    }),
                });

                if (onUpdate) {
                    onUpdate();
                }
            } catch (error) {
                logger.error({ error }, "Failed to update sender with domain");
            }
        }
    };

    // Copy to clipboard helper
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied!",
            description: "DNS record copied to clipboard",
        });
    };

    const handleSaveSenderInfo = async () => {
        if (!senderEmail) {
            toast({
                title: "Error",
                description: "Sender email is required",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);

        try {
            const response = await fetch("/api/followup/sender/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agent_config_id: agentConfigId,
                    sender_name: senderName,
                    sender_email: senderEmail,
                    sms_sender_id: smsSenderId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update sender info");
            }

            toast({
                title: "Success",
                description: "Sender information updated successfully",
            });

            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            logger.error({ error }, "Failed to update sender info");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to update",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleConnectGmail = async () => {
        setConnectingGmail(true);

        try {
            const response = await fetch(
                `/api/followup/gmail/connect?agent_config_id=${agentConfigId}`
            );

            const data = await response.json();

            if (!response.ok) {
                // Check if it's a configuration issue
                if (data.setupRequired) {
                    toast({
                        title: "Gmail OAuth Not Configured",
                        description:
                            data.details ||
                            "Please contact your administrator or use SendGrid instead.",
                        variant: "destructive",
                    });
                    setGmailAvailable(false);
                    return;
                }
                throw new Error(data.error || "Failed to initiate Gmail connection");
            }

            // Open OAuth popup
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                data.authUrl,
                "Gmail OAuth",
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // Poll for popup close or success
            const checkPopup = setInterval(() => {
                if (!popup || popup.closed) {
                    clearInterval(checkPopup);
                    setConnectingGmail(false);
                    // Refresh to get updated state
                    if (onUpdate) {
                        onUpdate();
                    }
                }
            }, 500);
        } catch (error) {
            logger.error({ error }, "Failed to connect Gmail");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to connect Gmail",
                variant: "destructive",
            });
            setConnectingGmail(false);
        }
    };

    const handleDisconnectGmail = async () => {
        if (
            !confirm(
                "Are you sure you want to disconnect Gmail? You'll need to set up SendGrid to continue sending emails."
            )
        ) {
            return;
        }

        setDisconnectingGmail(true);

        try {
            const response = await fetch("/api/followup/gmail/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agent_config_id: agentConfigId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to disconnect Gmail");
            }

            toast({
                title: "Success",
                description: "Gmail disconnected successfully",
            });

            setLocalProviderType("sendgrid");
            setLocalGmailEmail(null);

            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            logger.error({ error }, "Failed to disconnect Gmail");
            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to disconnect Gmail",
                variant: "destructive",
            });
        } finally {
            setDisconnectingGmail(false);
        }
    };

    // Calculate setup progress
    const isProviderSelected = !!localProviderType;
    const isAccountConnected =
        localProviderType === "gmail"
            ? !!localGmailEmail
            : localProviderType === "mailgun"
              ? selectedDomain?.verification_status === "verified"
              : !!(senderName && senderEmail);

    const getProviderDescription = () => {
        switch (localProviderType) {
            case "gmail":
                return "Gmail";
            case "mailgun":
                return "Custom Domain (Mailgun)";
            case "sendgrid":
                return "SendGrid";
            default:
                return "Not selected";
        }
    };

    const getConnectionDescription = () => {
        if (!isAccountConnected) return "Not connected";
        if (localProviderType === "gmail") return localGmailEmail || "Connected";
        if (localProviderType === "mailgun")
            return selectedDomain?.full_domain || "Verified";
        return senderEmail || "Connected";
    };

    const setupSteps = [
        {
            id: "provider",
            label: "Choose Provider",
            complete: isProviderSelected,
            description: getProviderDescription(),
        },
        {
            id: "connect",
            label: "Connect Account",
            complete: isAccountConnected,
            description: getConnectionDescription(),
        },
    ];

    const completedSteps = setupSteps.filter((s) => s.complete).length;
    const totalSteps = setupSteps.length;

    return (
        <div className="space-y-6">
            {/* Setup Progress Tracker */}
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-purple-50">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold">Sender Setup Progress</h3>
                        <p className="text-sm text-muted-foreground">
                            {completedSteps} of {totalSteps} steps complete
                        </p>
                    </div>
                    {completedSteps === totalSteps && (
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm font-medium">Setup Complete!</span>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-2 bg-muted rounded-full mb-4">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-500"
                        style={{
                            width: `${(completedSteps / totalSteps) * 100}%`,
                        }}
                    />
                </div>

                {/* Step Indicators */}
                <div className="flex gap-3">
                    {setupSteps.map((step, index) => (
                        <div
                            key={step.id}
                            className={cn(
                                "flex-1 p-3 rounded-lg border transition-all",
                                step.complete
                                    ? "bg-green-50 border-green-200"
                                    : "bg-muted/50 border-muted"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {step.complete ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {index + 1}
                                    </span>
                                )}
                                <span
                                    className={cn(
                                        "text-xs font-medium",
                                        step.complete
                                            ? "text-green-900"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </div>
                            <p
                                className={cn(
                                    "text-xs truncate",
                                    step.complete
                                        ? "text-green-700"
                                        : "text-muted-foreground"
                                )}
                            >
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Email Sending Method */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Email Sending Method</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Choose how you want to send follow-up emails
                </p>

                {/* Option 1: Custom Domain with Mailgun - Recommended */}
                <div className="space-y-4">
                    {localProviderType === "mailgun" &&
                    selectedDomain?.verification_status === "verified" ? (
                        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-green-900">
                                    Custom Domain Connected
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                    Sending from:{" "}
                                    <strong>{selectedDomain.full_domain}</strong>
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    Professional branding with your own domain.
                                    Excellent deliverability and unlimited sends.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div
                            className={cn(
                                "p-4 rounded-lg border-2 transition-all cursor-pointer",
                                localProviderType === "mailgun" ||
                                    (selectedDomain &&
                                        !selectedDomain.verification_status)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            )}
                            onClick={() => {
                                if (!selectedDomain) {
                                    setShowDomainSetup(true);
                                }
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <Globe className="h-5 w-5 text-primary mt-0.5" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-primary">
                                            Custom Domain (Recommended)
                                        </p>
                                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                                            Best for branding
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Send emails from your own domain like{" "}
                                        <code className="text-xs bg-muted px-1 rounded">
                                            hello@mail.yourdomain.com
                                        </code>
                                    </p>
                                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                                        <li>✓ Professional branded sender address</li>
                                        <li>✓ Unlimited email sending</li>
                                        <li>✓ Best deliverability with proper DNS</li>
                                        <li>
                                            ✓ Required: DNS records at your registrar
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Existing Domains List */}
                    {emailDomains.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">
                                Your Email Domains
                            </p>
                            {emailDomains.map((domain) => (
                                <div
                                    key={domain.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border",
                                        selectedDomain?.id === domain.id
                                            ? "border-primary bg-primary/5"
                                            : "border-border"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-sm">
                                            {domain.full_domain}
                                        </span>
                                        {domain.verification_status === "verified" ? (
                                            <span className="flex items-center gap-1 text-xs text-green-600">
                                                <Check className="h-3 w-3" />
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-amber-600">
                                                <AlertCircle className="h-3 w-3" />
                                                Pending DNS
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {domain.verification_status !== "verified" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    handleVerifyDomain(domain)
                                                }
                                                disabled={verifyingDomain}
                                            >
                                                {verifyingDomain ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <RefreshCw className="h-3 w-3 mr-1" />
                                                        Verify
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant={
                                                selectedDomain?.id === domain.id
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() => handleSelectDomain(domain)}
                                            disabled={
                                                domain.verification_status !==
                                                "verified"
                                            }
                                        >
                                            {selectedDomain?.id === domain.id
                                                ? "Selected"
                                                : "Use"}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* DNS Records Display */}
                    {selectedDomain &&
                        selectedDomain.verification_status !== "verified" && (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    className="flex items-center gap-2 text-sm font-medium text-foreground"
                                    onClick={() => setShowDNSRecords(!showDNSRecords)}
                                >
                                    {showDNSRecords ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                    DNS Configuration for {selectedDomain.full_domain}
                                </button>

                                {showDNSRecords && (
                                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground">
                                            Add these DNS records at your domain
                                            registrar (GoDaddy, Cloudflare, Namecheap,
                                            etc.)
                                        </p>

                                        {/* SPF Record */}
                                        {selectedDomain.spf_record && (
                                            <div className="p-3 bg-card rounded border">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-medium">
                                                        TXT (SPF)
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                selectedDomain.spf_record ||
                                                                    ""
                                                            )
                                                        }
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <code className="text-xs block bg-muted p-2 rounded break-all">
                                                    {selectedDomain.spf_record}
                                                </code>
                                            </div>
                                        )}

                                        {/* DKIM Record 1 */}
                                        {selectedDomain.dkim1_record && (
                                            <div className="p-3 bg-card rounded border">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-medium">
                                                        TXT (DKIM 1) - Host:{" "}
                                                        {selectedDomain.dkim1_host}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                selectedDomain.dkim1_record ||
                                                                    ""
                                                            )
                                                        }
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <code className="text-xs block bg-muted p-2 rounded break-all">
                                                    {selectedDomain.dkim1_record}
                                                </code>
                                            </div>
                                        )}

                                        {/* DKIM Record 2 */}
                                        {selectedDomain.dkim2_record && (
                                            <div className="p-3 bg-card rounded border">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-medium">
                                                        TXT (DKIM 2) - Host:{" "}
                                                        {selectedDomain.dkim2_host}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                selectedDomain.dkim2_record ||
                                                                    ""
                                                            )
                                                        }
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <code className="text-xs block bg-muted p-2 rounded break-all">
                                                    {selectedDomain.dkim2_record}
                                                </code>
                                            </div>
                                        )}

                                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                                            <div className="text-xs text-blue-800">
                                                <p className="font-medium">
                                                    DNS Propagation Time
                                                </p>
                                                <p className="mt-1">
                                                    DNS changes can take 1-48 hours to
                                                    propagate. Click "Verify" after
                                                    adding records.
                                                </p>
                                                <a
                                                    href="https://dnschecker.org"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-1"
                                                >
                                                    Check DNS propagation
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    {/* Add New Domain Form */}
                    {showDomainSetup && (
                        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                            <h4 className="font-medium text-sm">
                                Add Custom Email Domain
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Subdomain</Label>
                                    <Input
                                        value={newSubdomain}
                                        onChange={(e) =>
                                            setNewSubdomain(
                                                e.target.value.toLowerCase()
                                            )
                                        }
                                        placeholder="mail"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Domain</Label>
                                    <Input
                                        value={newDomain}
                                        onChange={(e) =>
                                            setNewDomain(e.target.value.toLowerCase())
                                        }
                                        placeholder="yourdomain.com"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Emails will be sent from:{" "}
                                <strong>
                                    {newSubdomain || "mail"}.
                                    {newDomain || "yourdomain.com"}
                                </strong>
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleCreateDomain}
                                    disabled={creatingDomain || !newDomain}
                                    size="sm"
                                >
                                    {creatingDomain ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Domain"
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDomainSetup(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {!showDomainSetup && emailDomains.length === 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDomainSetup(true)}
                        >
                            <Globe className="mr-2 h-4 w-4" />
                            Add Custom Domain
                        </Button>
                    )}

                    <div className="border-t pt-4 mt-4">
                        <p className="text-sm font-medium text-foreground mb-3">
                            Alternative Options
                        </p>

                        {/* Option 2: Gmail */}
                        {localProviderType === "gmail" && localGmailEmail ? (
                            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-900">
                                        Gmail Connected
                                    </p>
                                    <p className="text-sm text-green-700 mt-1">
                                        Sending emails through:{" "}
                                        <strong>{localGmailEmail}</strong>
                                    </p>
                                    <Button
                                        onClick={handleDisconnectGmail}
                                        disabled={disconnectingGmail}
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                    >
                                        {disconnectingGmail ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Disconnecting...
                                            </>
                                        ) : (
                                            "Disconnect Gmail"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            gmailAvailable !== false && (
                                <div
                                    className={cn(
                                        "p-4 rounded-lg border transition-all cursor-pointer mb-3",
                                        localProviderType === "gmail"
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50"
                                    )}
                                    onClick={handleConnectGmail}
                                >
                                    <div className="flex items-start gap-3">
                                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Gmail</p>
                                            <p className="text-xs text-muted-foreground">
                                                Quick start with no DNS setup. 500
                                                emails/day limit.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        {!checkingGmailStatus && gmailAvailable === false && (
                            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                <p className="text-xs text-amber-700">
                                    Gmail OAuth not configured. Contact your
                                    administrator.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Sender Information Form - Only show if using SendGrid */}
            {localProviderType !== "gmail" && localProviderType !== "mailgun" && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        Sender Information (SendGrid)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Configure your SendGrid sender details. You'll need to set up
                        domain authentication in your SendGrid account.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="senderName">From Name *</Label>
                            <Input
                                id="senderName"
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                                placeholder="Your Name or Company Name"
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Example: "Sarah from Acme Corp"
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="senderEmail">From Email *</Label>
                            <Input
                                id="senderEmail"
                                type="email"
                                value={senderEmail}
                                onChange={(e) => setSenderEmail(e.target.value)}
                                placeholder="followup@yourdomain.com"
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Use an email from your SendGrid authenticated domain
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="smsSenderId">
                                SMS Sender ID (Optional)
                            </Label>
                            <Input
                                id="smsSenderId"
                                value={smsSenderId}
                                onChange={(e) => setSmsSenderId(e.target.value)}
                                placeholder="YourBrand"
                                maxLength={11}
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Max 11 characters. Used as sender name for SMS messages.
                            </p>
                        </div>

                        <Button onClick={handleSaveSenderInfo} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Sender Info"
                            )}
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
