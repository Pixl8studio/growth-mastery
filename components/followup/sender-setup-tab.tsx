/**
 * Sender Setup Tab Component
 *
 * UI for configuring sender identity via Gmail OAuth or SendGrid.
 */

"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

interface SenderSetupTabProps {
    agentConfigId: string;
    currentSenderName?: string | null;
    currentSenderEmail?: string | null;
    currentSMSSenderId?: string | null;
    emailProviderType?: "sendgrid" | "gmail" | "console" | null;
    gmailUserEmail?: string | null;
    onUpdate?: () => void;
}

export function SenderSetupTab({
    agentConfigId,
    currentSenderName,
    currentSenderEmail,
    currentSMSSenderId,
    emailProviderType = "sendgrid",
    gmailUserEmail,
    onUpdate,
}: SenderSetupTabProps) {
    const { toast } = useToast();
    const [senderName, setSenderName] = useState(currentSenderName || "");
    const [senderEmail, setSenderEmail] = useState(currentSenderEmail || "");
    const [smsSenderId, setSmsSenderId] = useState(currentSMSSenderId || "");
    const [saving, setSaving] = useState(false);
    const [connectingGmail, setConnectingGmail] = useState(false);
    const [disconnectingGmail, setDisconnectingGmail] = useState(false);
    const [localProviderType, setLocalProviderType] = useState(emailProviderType);
    const [localGmailEmail, setLocalGmailEmail] = useState(gmailUserEmail);
    const [gmailAvailable, setGmailAvailable] = useState<boolean | null>(null);
    const [checkingGmailStatus, setCheckingGmailStatus] = useState(true);

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
            : !!(senderName && senderEmail);

    const setupSteps = [
        {
            id: "provider",
            label: "Choose Provider",
            complete: isProviderSelected,
            description:
                localProviderType === "gmail"
                    ? "Gmail"
                    : localProviderType === "sendgrid"
                      ? "SendGrid"
                      : "Not selected",
        },
        {
            id: "connect",
            label: "Connect Account",
            complete: isAccountConnected,
            description: isAccountConnected
                ? localGmailEmail || senderEmail || "Connected"
                : "Not connected",
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
                        {/* Gmail OAuth Not Available Warning */}
                        {!checkingGmailStatus && gmailAvailable === false && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-900">
                                        Gmail OAuth Not Configured
                                    </p>
                                    <p className="text-sm text-amber-700 mt-1">
                                        Gmail integration requires Google OAuth
                                        credentials to be configured by your
                                        administrator. Please use SendGrid below or
                                        contact support for assistance.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Gmail Option - Only show if available */}
                        {gmailAvailable !== false && (
                            <>
                                <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-primary">
                                            Quick Start: Connect Gmail
                                        </p>
                                        <p className="text-sm text-primary mt-1">
                                            Send emails through your Gmail account - no
                                            DNS setup required! Perfect for getting
                                            started quickly.
                                        </p>
                                        <ul className="text-xs text-primary mt-2 space-y-1">
                                            <li>
                                                ✓ Instant setup - just click to connect
                                            </li>
                                            <li>
                                                ✓ Uses Gmail's excellent deliverability
                                            </li>
                                            <li>✓ No domain verification needed</li>
                                            <li>
                                                ✓ Sending limit: 500 emails/day (2,000
                                                for Workspace)
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleConnectGmail}
                                    disabled={connectingGmail || checkingGmailStatus}
                                    variant="default"
                                >
                                    {connectingGmail ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : checkingGmailStatus ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        <>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Connect Gmail
                                        </>
                                    )}
                                </Button>
                            </>
                        )}

                        <div className="pt-4 border-t">
                            <p className="text-sm font-medium text-foreground mb-2">
                                {gmailAvailable === false
                                    ? "Use SendGrid"
                                    : "Or use custom domain with SendGrid"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                For professional branding and higher sending limits, set
                                up your custom domain below. Requires DNS configuration
                                at your domain registrar.
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Sender Information Form - Only show if not using Gmail */}
            {localProviderType !== "gmail" && (
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
