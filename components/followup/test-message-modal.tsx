/**
 * Test Message Modal Component
 *
 * Modal for sending test messages to verify email/SMS configuration.
 * Allows users to send a sample message to themselves.
 */

"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

interface TestMessageModalProps {
    open: boolean;
    onClose: () => void;
    agentConfigId?: string;
    userEmail?: string;
    userPhone?: string;
}

export function TestMessageModal({
    open,
    onClose,
    agentConfigId,
    userEmail,
    userPhone,
}: TestMessageModalProps) {
    const { toast } = useToast();
    const [channel, setChannel] = useState<"email" | "sms">("email");
    const [recipientEmail, setRecipientEmail] = useState(userEmail || "");
    const [recipientPhone, setRecipientPhone] = useState(userPhone || "");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // Update recipient fields when props change
    useEffect(() => {
        if (userEmail) setRecipientEmail(userEmail);
        if (userPhone) setRecipientPhone(userPhone);
    }, [userEmail, userPhone]);

    // Reset modal state when opened
    useEffect(() => {
        if (open) {
            setSent(false);
        }
    }, [open]);

    const handleSendTest = async () => {
        if (!agentConfigId) {
            toast({
                title: "Error",
                description: "No agent configuration found",
                variant: "destructive",
            });
            return;
        }

        if (channel === "email" && !recipientEmail) {
            toast({
                title: "Error",
                description: "Please enter your email address",
                variant: "destructive",
            });
            return;
        }

        if (channel === "sms" && !recipientPhone) {
            toast({
                title: "Error",
                description: "Please enter your phone number",
                variant: "destructive",
            });
            return;
        }

        setSending(true);

        try {
            logger.info(
                { agentConfigId, channel, hasEmail: !!recipientEmail },
                "📤 Sending test message"
            );

            const response = await fetch("/api/followup/test-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agent_config_id: agentConfigId,
                    channel,
                    recipient_email: channel === "email" ? recipientEmail : undefined,
                    recipient_phone: channel === "sms" ? recipientPhone : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send test message");
            }

            setSent(true);
            toast({
                title: "Test Message Sent! ✅",
                description:
                    channel === "email"
                        ? `Check ${recipientEmail} inbox (and spam folder)`
                        : `Check ${recipientPhone} for SMS`,
            });

            logger.info({ deliveryId: data.delivery_id }, "✅ Test message sent");

            // Close modal after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            logger.error({ error }, "❌ Failed to send test message");
            toast({
                title: "Send Failed",
                description:
                    error instanceof Error ? error.message : "Unknown error occurred",
                variant: "destructive",
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Test Message to Self</DialogTitle>
                </DialogHeader>

                {!sent ? (
                    <div className="space-y-6 py-4">
                        {/* Channel Selection */}
                        <div>
                            <Label className="mb-3 block">Select Channel</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setChannel("email")}
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                                        channel === "email"
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                    )}
                                >
                                    <Mail
                                        className={cn(
                                            "h-5 w-5",
                                            channel === "email"
                                                ? "text-blue-600"
                                                : "text-gray-400"
                                        )}
                                    />
                                    <div className="text-left">
                                        <div className="font-medium text-sm">Email</div>
                                        <div className="text-xs text-gray-500">
                                            Test email delivery
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setChannel("sms")}
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                                        channel === "sms"
                                            ? "border-green-500 bg-green-50"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                    )}
                                >
                                    <MessageSquare
                                        className={cn(
                                            "h-5 w-5",
                                            channel === "sms"
                                                ? "text-green-600"
                                                : "text-gray-400"
                                        )}
                                    />
                                    <div className="text-left">
                                        <div className="font-medium text-sm">SMS</div>
                                        <div className="text-xs text-gray-500">
                                            Test SMS delivery
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Recipient Input */}
                        {channel === "email" && (
                            <div>
                                <Label htmlFor="testEmail">Your Email Address</Label>
                                <Input
                                    id="testEmail"
                                    type="email"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                    className="mt-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Test message will be sent to this address
                                </p>
                            </div>
                        )}

                        {channel === "sms" && (
                            <div>
                                <Label htmlFor="testPhone">Your Phone Number</Label>
                                <Input
                                    id="testPhone"
                                    type="tel"
                                    value={recipientPhone}
                                    onChange={(e) => setRecipientPhone(e.target.value)}
                                    placeholder="+1234567890"
                                    className="mt-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Include country code (e.g., +1 for US)
                                </p>
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                            <p className="text-blue-800">
                                {channel === "email" && (
                                    <>
                                        ℹ️ This will send a sample follow-up email with
                                        test data to verify your SendGrid configuration.
                                    </>
                                )}
                                {channel === "sms" && (
                                    <>
                                        ℹ️ This will send a sample SMS to verify your
                                        Twilio configuration. Standard messaging rates
                                        may apply.
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end pt-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={sending}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSendTest} disabled={sending}>
                                {sending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        {channel === "email" ? (
                                            <Mail className="mr-2 h-4 w-4" />
                                        ) : (
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                        )}
                                        Send Test{" "}
                                        {channel === "email" ? "Email" : "SMS"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Success State */
                    <div className="py-8 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="rounded-full bg-green-100 p-3">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Test Message Sent!
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            {channel === "email"
                                ? `Check your inbox at ${recipientEmail}`
                                : `Check your phone at ${recipientPhone}`}
                        </p>
                        <Button onClick={onClose} variant="outline">
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
