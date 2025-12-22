/**
 * Sender Setup Tab Component
 *
 * Simplified email sender configuration with two modes:
 * 1. Quick Start (Default): Use platform domain - just enter name and reply-to
 * 2. Custom Domain (Advanced): Full Mailgun setup with DNS for branded emails
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
    Loader2,
    Check,
    Globe,
    Mail,
    Copy,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Zap,
    Settings2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";
import type { EmailDomain } from "@/types/integrations";

// Platform sending domain - emails go from here, replies go to user's email
const PLATFORM_DOMAIN = "mail.geniefunnels.com";
const PLATFORM_SENDER_EMAIL = `noreply@${PLATFORM_DOMAIN}`;

type EmailMode = "platform" | "custom";

interface SenderSetupTabProps {
    agentConfigId: string;
    funnelProjectId?: string | null;
    currentSenderName?: string | null;
    currentReplyToEmail?: string | null;
    currentSMSSenderId?: string | null;
    emailMode?: EmailMode;
    customDomainId?: string | null;
    onUpdate?: () => void;
}

export function SenderSetupTab({
    agentConfigId,
    funnelProjectId = null,
    currentSenderName,
    currentReplyToEmail,
    currentSMSSenderId,
    emailMode = "platform",
    customDomainId,
    onUpdate,
}: SenderSetupTabProps) {
    const { toast } = useToast();

    // Quick Start state (platform domain)
    const [senderName, setSenderName] = useState(currentSenderName || "");
    const [replyToEmail, setReplyToEmail] = useState(currentReplyToEmail || "");
    const [smsSenderId, setSmsSenderId] = useState(currentSMSSenderId || "");
    const [saving, setSaving] = useState(false);
    const [localEmailMode, setLocalEmailMode] = useState<EmailMode>(emailMode);

    // Advanced/Custom domain state
    const [showAdvanced, setShowAdvanced] = useState(emailMode === "custom");
    const [emailDomains, setEmailDomains] = useState<EmailDomain[]>([]);
    const [selectedDomain, setSelectedDomain] = useState<EmailDomain | null>(null);
    const [loadingDomains, setLoadingDomains] = useState(false);
    const [showDomainSetup, setShowDomainSetup] = useState(false);
    const [newDomain, setNewDomain] = useState("");
    const [newSubdomain, setNewSubdomain] = useState("mail");
    const [creatingDomain, setCreatingDomain] = useState(false);
    const [verifyingDomain, setVerifyingDomain] = useState(false);
    const [showDNSRecords, setShowDNSRecords] = useState(false);

    // Check if setup is complete
    const isSetupComplete =
        localEmailMode === "platform"
            ? !!(senderName && replyToEmail)
            : selectedDomain?.verification_status === "verified";

    // Load custom domains if needed
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
                if (customDomainId) {
                    const domain = (data.domains || []).find(
                        (d: EmailDomain) => d.id === customDomainId
                    );
                    if (domain) {
                        setSelectedDomain(domain);
                    }
                }
            }
        } catch (error) {
            logger.error({ error }, "Failed to load email domains");
        } finally {
            setLoadingDomains(false);
        }
    }, [funnelProjectId, customDomainId]);

    useEffect(() => {
        if (showAdvanced) {
            loadEmailDomains();
        }
    }, [showAdvanced, loadEmailDomains]);

    // Save Quick Start settings (platform domain)
    const handleSaveQuickStart = async () => {
        if (!senderName || !replyToEmail) {
            toast({
                title: "Missing Information",
                description: "Please enter your name and reply-to email",
                variant: "destructive",
            });
            return;
        }

        // Basic email validation
        if (!replyToEmail.includes("@")) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address",
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
                    email_mode: "platform",
                    sender_name: senderName,
                    sender_email: PLATFORM_SENDER_EMAIL,
                    reply_to_email: replyToEmail,
                    sms_sender_id: smsSenderId || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to save settings");
            }

            setLocalEmailMode("platform");

            toast({
                title: "Ready to Send!",
                description: "Your email sender is configured and ready to go.",
            });

            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            logger.error({ error }, "Failed to save sender settings");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to save settings",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    // Create new custom domain
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
                setLocalEmailMode("custom");

                // Update agent config to use custom domain
                await fetch("/api/followup/sender/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        agent_config_id: agentConfigId,
                        email_mode: "custom",
                        custom_domain_id: domain.id,
                        sender_email: `noreply@${domain.full_domain}`,
                        sender_name: senderName,
                    }),
                });

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

    // Copy to clipboard helper
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied!",
            description: "DNS record copied to clipboard",
        });
    };

    return (
        <div className="space-y-6">
            {/* Status Banner */}
            {isSetupComplete && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                        <p className="text-sm font-medium text-green-900">
                            Email Sender Configured
                        </p>
                        <p className="text-xs text-green-700">
                            {localEmailMode === "platform" ? (
                                <>
                                    Sending as "{senderName}" • Replies go to{" "}
                                    {replyToEmail}
                                </>
                            ) : (
                                <>Sending from {selectedDomain?.full_domain}</>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Quick Start - Platform Domain */}
            <Card className="p-6">
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Quick Start Setup</h3>
                        <p className="text-sm text-muted-foreground">
                            Start sending emails in seconds - no technical setup
                            required
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="senderName">Your Name *</Label>
                        <Input
                            id="senderName"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            placeholder="Sarah from Acme Corp"
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            This is how your name will appear in the "From" field
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="replyToEmail">Reply-To Email *</Label>
                        <Input
                            id="replyToEmail"
                            type="email"
                            value={replyToEmail}
                            onChange={(e) => setReplyToEmail(e.target.value)}
                            placeholder="you@yourcompany.com"
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            When recipients reply, their response goes to this email
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="smsSenderId">SMS Sender ID (Optional)</Label>
                        <Input
                            id="smsSenderId"
                            value={smsSenderId}
                            onChange={(e) => setSmsSenderId(e.target.value)}
                            placeholder="YourBrand"
                            maxLength={11}
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Max 11 characters. Shown as sender name for SMS.
                        </p>
                    </div>

                    {/* How it works info */}
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="font-medium text-foreground mb-2">
                            How it works:
                        </p>
                        <ul className="text-muted-foreground space-y-1 text-xs">
                            <li>
                                • Emails sent from:{" "}
                                <code className="bg-muted px-1 rounded">
                                    "{senderName || "Your Name"}" &lt;
                                    {PLATFORM_SENDER_EMAIL}&gt;
                                </code>
                            </li>
                            <li>
                                • When they reply, it goes to:{" "}
                                <code className="bg-muted px-1 rounded">
                                    {replyToEmail || "your@email.com"}
                                </code>
                            </li>
                            <li>
                                • High deliverability - our domain is already verified
                            </li>
                        </ul>
                    </div>

                    <Button
                        onClick={handleSaveQuickStart}
                        disabled={saving || !senderName || !replyToEmail}
                        className="w-full"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : isSetupComplete && localEmailMode === "platform" ? (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Settings Saved
                            </>
                        ) : (
                            <>
                                <Mail className="mr-2 h-4 w-4" />
                                Save & Start Sending
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Advanced - Custom Domain */}
            <Card className="p-6">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full"
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                            <Settings2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-semibold">
                                Custom Domain (Optional)
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Send from your own domain like
                                hello@mail.yourcompany.com
                            </p>
                        </div>
                    </div>
                    {showAdvanced ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                </button>

                {showAdvanced && (
                    <div className="mt-6 pt-6 border-t space-y-4">
                        {/* Benefits */}
                        <div className="p-3 bg-primary/5 rounded-lg text-sm">
                            <p className="font-medium text-primary mb-2">
                                Benefits of custom domain:
                            </p>
                            <ul className="text-muted-foreground space-y-1 text-xs">
                                <li>✓ Professional branded sender address</li>
                                <li>✓ Better brand recognition</li>
                                <li>✓ Full control over email reputation</li>
                                <li>⚠️ Requires DNS configuration</li>
                            </ul>
                        </div>

                        {/* Existing Domains */}
                        {loadingDomains ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : emailDomains.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Your Domains</p>
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
                                            {domain.verification_status ===
                                            "verified" ? (
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
                                            {domain.verification_status !==
                                                "verified" && (
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
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {/* DNS Records for pending domain */}
                        {selectedDomain &&
                            selectedDomain.verification_status !== "verified" && (
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 text-sm font-medium"
                                        onClick={() =>
                                            setShowDNSRecords(!showDNSRecords)
                                        }
                                    >
                                        {showDNSRecords ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                        DNS Records for {selectedDomain.full_domain}
                                    </button>

                                    {showDNSRecords && (
                                        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                                            <p className="text-xs text-muted-foreground">
                                                Add these DNS records at your domain
                                                registrar
                                            </p>

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

                                            {selectedDomain.dkim1_record && (
                                                <div className="p-3 bg-card rounded border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-medium">
                                                            TXT (DKIM) - Host:{" "}
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

                                            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                                                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="font-medium">
                                                        DNS Propagation
                                                    </p>
                                                    <p className="mt-1">
                                                        DNS changes can take 1-48 hours.
                                                        Click "Verify" after adding
                                                        records.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        {/* Add New Domain */}
                        {showDomainSetup ? (
                            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                                <h4 className="font-medium text-sm">
                                    Add Custom Domain
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
                                                setNewDomain(
                                                    e.target.value.toLowerCase()
                                                )
                                            }
                                            placeholder="yourcompany.com"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Emails will send from:{" "}
                                    <strong>
                                        {newSubdomain || "mail"}.
                                        {newDomain || "yourcompany.com"}
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
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDomainSetup(true)}
                            >
                                <Globe className="mr-2 h-4 w-4" />
                                Add Custom Domain
                            </Button>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
