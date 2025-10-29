/**
 * Sender Setup Tab Component
 *
 * UI for configuring sender identity and domain verification.
 * Displays DNS records and verification status.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import type { SendGridDNSRecord } from "@/types/followup";

interface SenderSetupTabProps {
    agentConfigId: string;
    currentSenderName?: string | null;
    currentSenderEmail?: string | null;
    currentSMSSenderId?: string | null;
    domainVerificationStatus?: "not_started" | "pending" | "verified" | "failed";
    dnsRecords?: SendGridDNSRecord[];
    emailProviderType?: "sendgrid" | "gmail" | "console" | null;
    gmailUserEmail?: string | null;
    onUpdate?: () => void;
}

export function SenderSetupTab({
    agentConfigId,
    currentSenderName,
    currentSenderEmail,
    currentSMSSenderId,
    domainVerificationStatus = "not_started",
    dnsRecords = [],
    emailProviderType = "sendgrid",
    gmailUserEmail,
    onUpdate,
}: SenderSetupTabProps) {
    const { toast } = useToast();
    const [senderName, setSenderName] = useState(currentSenderName || "");
    const [senderEmail, setSenderEmail] = useState(currentSenderEmail || "");
    const [smsSenderId, setSmsSenderId] = useState(currentSMSSenderId || "");
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [checking, setChecking] = useState(false);
    const [connectingGmail, setConnectingGmail] = useState(false);
    const [disconnectingGmail, setDisconnectingGmail] = useState(false);
    const [localDnsRecords, setLocalDnsRecords] =
        useState<SendGridDNSRecord[]>(dnsRecords);
    const [localStatus, setLocalStatus] = useState(domainVerificationStatus);
    const [localProviderType, setLocalProviderType] = useState(emailProviderType);
    const [localGmailEmail, setLocalGmailEmail] = useState(gmailUserEmail);

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

    const handleVerifyDomain = async () => {
        if (!senderEmail) {
            toast({
                title: "Error",
                description: "Please enter a sender email first",
                variant: "destructive",
            });
            return;
        }

        setVerifying(true);

        try {
            const response = await fetch("/api/followup/sender/verify-domain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agent_config_id: agentConfigId,
                    sender_email: senderEmail,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to verify domain");
            }

            if (data.dns_records) {
                setLocalDnsRecords(data.dns_records);
                setLocalStatus("pending");
            }

            toast({
                title: "Domain Verification Initiated",
                description: "Please add the DNS records below to your domain provider",
            });

            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            logger.error({ error }, "Failed to verify domain");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to verify domain",
                variant: "destructive",
            });
        } finally {
            setVerifying(false);
        }
    };

    const handleCheckVerification = async () => {
        setChecking(true);

        try {
            const response = await fetch(
                `/api/followup/sender/check-verification?agent_config_id=${agentConfigId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to check verification");
            }

            if (data.dns_records) {
                setLocalDnsRecords(data.dns_records);
            }

            if (data.verified) {
                setLocalStatus("verified");
                toast({
                    title: "Domain Verified! ✅",
                    description: "Your domain is authenticated and ready for sending",
                });
            } else {
                toast({
                    title: "Verification Pending",
                    description:
                        "DNS records not yet propagated. This can take up to 48 hours.",
                });
            }

            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            logger.error({ error }, "Failed to check verification");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to check status",
                variant: "destructive",
            });
        } finally {
            setChecking(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied!",
            description: `${label} copied to clipboard`,
        });
    };

    const handleConnectGmail = async () => {
        setConnectingGmail(true);

        try {
            const response = await fetch(
                `/api/followup/gmail/connect?agent_config_id=${agentConfigId}`
            );

            const data = await response.json();

            if (!response.ok) {
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
                "Are you sure you want to disconnect Gmail? You'll need to set up SendGrid domain verification to continue sending emails."
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

    const renderVerificationBanner = () => {
        if (localStatus === "verified") {
            return (
                <Card className="bg-green-50 border-2 border-green-200 p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm text-green-800">
                            <strong>Domain Verified</strong> - Your domain is
                            authenticated and ready to send emails. All systems go! ✅
                        </div>
                    </div>
                </Card>
            );
        }

        if (localStatus === "pending") {
            return (
                <Card className="bg-amber-50 border-2 border-amber-200 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <strong>Verification Pending</strong> - Please add the DNS
                            records below to your domain provider. DNS propagation can
                            take up to 48 hours.
                        </div>
                    </div>
                </Card>
            );
        }

        if (localStatus === "failed") {
            return (
                <Card className="bg-red-50 border-2 border-red-200 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="text-sm text-red-800">
                            <strong>Verification Failed</strong> - Could not verify your
                            domain. Check DNS records and try again.
                        </div>
                    </div>
                </Card>
            );
        }

        return (
            <Card className="bg-blue-50 border-2 border-blue-200 p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                        <strong>Domain Not Verified</strong> - Configure your sender
                        email below and verify your domain to enable email sending.
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            {/* Gmail OAuth Option */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Email Sending Method</h3>

                {localProviderType === "gmail" && localGmailEmail ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-green-900">
                                    Gmail Connected
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                    Sending emails through:{" "}
                                    <strong>{localGmailEmail}</strong>
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    Your emails will be sent through your Gmail account
                                    with full Gmail deliverability. No DNS setup
                                    required!
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={handleDisconnectGmail}
                            disabled={disconnectingGmail}
                            variant="outline"
                            size="sm"
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
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">
                                    Quick Start: Connect Gmail
                                </p>
                                <p className="text-sm text-blue-700 mt-1">
                                    Send emails through your Gmail account - no DNS
                                    setup required! Perfect for getting started quickly.
                                </p>
                                <ul className="text-xs text-blue-600 mt-2 space-y-1">
                                    <li>✓ Instant setup - just click to connect</li>
                                    <li>✓ Uses Gmail's excellent deliverability</li>
                                    <li>✓ No domain verification needed</li>
                                    <li>
                                        ✓ Sending limit: 500 emails/day (2,000 for
                                        Workspace)
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <Button
                            onClick={handleConnectGmail}
                            disabled={connectingGmail}
                            variant="default"
                        >
                            {connectingGmail ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Connect Gmail
                                </>
                            )}
                        </Button>

                        <div className="pt-4 border-t">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                                Or use custom domain with SendGrid
                            </p>
                            <p className="text-xs text-gray-500">
                                For professional branding and higher sending limits, set
                                up your custom domain below. Requires DNS configuration
                                at your domain registrar.
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Only show verification and sender form if not using Gmail */}
            {localProviderType !== "gmail" && (
                <>
                    {/* Verification Status Banner */}
                    {renderVerificationBanner()}

                    {/* Sender Information Form */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">
                            Sender Information
                        </h3>

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
                                <p className="text-xs text-gray-500 mt-1">
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
                                <p className="text-xs text-gray-500 mt-1">
                                    Must be an email address on your verified domain
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
                                <p className="text-xs text-gray-500 mt-1">
                                    Max 11 characters. Used as sender name for SMS
                                    messages.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleSaveSenderInfo}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Sender Info"
                                    )}
                                </Button>

                                {localStatus !== "verified" && senderEmail && (
                                    <Button
                                        onClick={handleVerifyDomain}
                                        disabled={verifying}
                                        variant="outline"
                                    >
                                        {verifying ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            "Verify Domain"
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* DNS Records */}
                    {localDnsRecords.length > 0 && (
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        DNS Records
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Add these records to your DNS provider to verify
                                        your domain
                                    </p>
                                </div>
                                <Button
                                    onClick={handleCheckVerification}
                                    disabled={checking}
                                    variant="outline"
                                    size="sm"
                                >
                                    {checking ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        "Check Verification"
                                    )}
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {localDnsRecords.map((record, index) => (
                                    <div
                                        key={index}
                                        className="border rounded-lg p-4 bg-gray-50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">
                                                    {record.type}
                                                </Badge>
                                                {record.valid && (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            record.host,
                                                            "Host"
                                                        )
                                                    }
                                                >
                                                    <Copy className="h-3 w-3 mr-1" />
                                                    Copy Host
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            record.value,
                                                            "Value"
                                                        )
                                                    }
                                                >
                                                    <Copy className="h-3 w-3 mr-1" />
                                                    Copy Value
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-1 text-sm">
                                            <div>
                                                <span className="font-medium text-gray-700">
                                                    Host:
                                                </span>
                                                <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                                                    {record.host}
                                                </code>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">
                                                    Value:
                                                </span>
                                                <code className="ml-2 bg-white px-2 py-1 rounded text-xs break-all">
                                                    {record.value}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex gap-2">
                                    <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5" />
                                    <div className="text-sm">
                                        <strong className="text-blue-900">
                                            Need help?
                                        </strong>
                                        <p className="text-blue-800 mt-1">
                                            Check our{" "}
                                            <a
                                                href="/docs/ai-followup/Email-SMS-Setup-Guide.md"
                                                target="_blank"
                                                className="underline font-medium"
                                            >
                                                Email & SMS Setup Guide
                                            </a>{" "}
                                            for step-by-step instructions on adding DNS
                                            records.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
