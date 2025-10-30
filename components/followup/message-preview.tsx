/**
 * Message Preview Component
 *
 * Split-view preview showing email and SMS versions of a message
 * with token interpolation using sample prospect data.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessagePreviewProps {
    subject?: string | null;
    bodyContent: string;
    senderName?: string;
    className?: string;
}

const SAMPLE_PROSPECT_DATA = {
    first_name: "Sarah",
    watch_pct: "75",
    minutes: "45",
    challenge_notes: "scaling their business",
    goal_notes: "reach 7 figures",
    offer_link: "https://example.com/offer",
    replay_link: "https://example.com/replay",
    booking_link: "https://example.com/book",
    registration_link: "https://example.com/register",
    offer_title: "Business Accelerator Program",
    price: "$2,997",
    sender_name: "John Smith",
};

/**
 * Replace tokens in message content with sample data.
 */
function interpolateTokens(content: string, senderName?: string): string {
    let interpolated = content;

    // Use provided sender name or sample
    const data = {
        ...SAMPLE_PROSPECT_DATA,
        sender_name: senderName || SAMPLE_PROSPECT_DATA.sender_name,
    };

    // Replace all tokens
    Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, "g");
        interpolated = interpolated.replace(regex, value);
    });

    return interpolated;
}

/**
 * Strip HTML tags for SMS preview.
 */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
}

export function MessagePreview({
    subject,
    bodyContent,
    senderName,
    className,
}: MessagePreviewProps) {
    const [emailView, setEmailView] = useState<"desktop" | "mobile">("desktop");

    const interpolatedSubject = subject ? interpolateTokens(subject, senderName) : "";
    const interpolatedBody = interpolateTokens(bodyContent, senderName);
    const smsBody = stripHtml(interpolatedBody).substring(0, 320);
    const smsCharCount = smsBody.length;
    const smsSegments = Math.ceil(smsCharCount / 160);

    return (
        <div className={cn("grid md:grid-cols-2 gap-6", className)}>
            {/* Email Preview */}
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-primary/50 to-purple-500 p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            <h3 className="font-semibold">Email Preview</h3>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant={
                                    emailView === "desktop" ? "secondary" : "ghost"
                                }
                                onClick={() => setEmailView("desktop")}
                                className="h-7 px-2"
                            >
                                <Monitor className="h-3 w-3" />
                            </Button>
                            <Button
                                size="sm"
                                variant={emailView === "mobile" ? "secondary" : "ghost"}
                                onClick={() => setEmailView("mobile")}
                                className="h-7 px-2"
                            >
                                <Smartphone className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-muted/50">
                    {/* Email Header */}
                    <div className="bg-card border rounded-lg p-3 mb-3 text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">From:</span>
                            <span className="font-medium">
                                {senderName || SAMPLE_PROSPECT_DATA.sender_name}
                            </span>
                        </div>
                        <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">To:</span>
                            <span className="font-medium">sarah@example.com</span>
                        </div>
                        {interpolatedSubject && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subject:</span>
                                <span className="font-semibold">
                                    {interpolatedSubject}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Email Body */}
                    <div
                        className={cn(
                            "bg-card border rounded-lg overflow-auto transition-all",
                            emailView === "desktop"
                                ? "min-h-[400px]"
                                : "max-w-[375px] mx-auto"
                        )}
                    >
                        <div className="p-6">
                            <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{
                                    __html: interpolatedBody.replace(/\n/g, "<br />"),
                                }}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* SMS Preview */}
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            <h3 className="font-semibold">SMS Preview</h3>
                        </div>
                        <Badge variant="secondary" className="bg-card text-green-700">
                            {smsSegments} {smsSegments === 1 ? "message" : "messages"}
                        </Badge>
                    </div>
                </div>

                <div className="p-4 bg-muted/50">
                    {/* Phone Mockup */}
                    <div className="max-w-[320px] mx-auto">
                        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
                            {/* Phone Screen */}
                            <div className="bg-card rounded-[2rem] overflow-hidden h-[500px] flex flex-col">
                                {/* SMS Header */}
                                <div className="bg-muted px-4 py-3 flex items-center gap-3 border-b">
                                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-muted-foreground font-semibold">
                                        {(
                                            senderName ||
                                            SAMPLE_PROSPECT_DATA.sender_name
                                        )
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm">
                                            {senderName ||
                                                SAMPLE_PROSPECT_DATA.sender_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            iMessage
                                        </div>
                                    </div>
                                </div>

                                {/* SMS Body */}
                                <div className="flex-1 p-4 bg-muted/50 overflow-auto">
                                    <div className="flex justify-end mb-2">
                                        <div className="max-w-[85%] bg-primary/50 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm leading-relaxed">
                                            {smsBody}
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        Just now
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Character Count */}
                        <div className="mt-4 text-center">
                            <div className="text-sm text-foreground">
                                <span className="font-semibold">{smsCharCount}</span>{" "}
                                characters
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {smsCharCount > 160 && (
                                    <span className="text-amber-600">
                                        ⚠️ Will be split into {smsSegments} messages
                                    </span>
                                )}
                                {smsCharCount <= 160 && (
                                    <span className="text-green-600">
                                        ✓ Fits in 1 message
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
