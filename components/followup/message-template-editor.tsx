/**
 * Message Template Editor Component
 *
 * Create and edit message templates with token insertion, preview, and A/B testing.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Plus, Eye, Code, Sparkles } from "lucide-react";
import { logger } from "@/lib/client-logger";

interface Message {
    id: string;
    sequence_id: string;
    name: string;
    message_order: number;
    channel: "email" | "sms";
    send_delay_hours: number;
    subject_line?: string;
    body_content: string;
    primary_cta: {
        text: string;
        url: string;
        tracking_enabled: boolean;
    };
    ab_test_variant?: string | null;
}

interface Sequence {
    id: string;
    name: string;
    sequence_type: string;
}

interface MessageTemplateEditorProps {
    sequenceId: string;
    messages: Message[];
    sequences?: Sequence[]; // Optional: for cross-sequence view
    onCreateMessage: (message: Partial<Message>) => Promise<void>;
    onUpdateMessage: (id: string, updates: Partial<Message>) => Promise<void>;
    onDeleteMessage: (id: string) => Promise<void>;
}

const AVAILABLE_TOKENS = [
    { token: "{first_name}", description: "Prospect's first name" },
    { token: "{last_name}", description: "Prospect's last name" },
    { token: "{email}", description: "Prospect's email" },
    { token: "{watch_pct}", description: "Webinar watch percentage" },
    { token: "{challenge_notes}", description: "Prospect's stated challenge" },
    { token: "{goal_notes}", description: "Prospect's stated goal" },
    { token: "{segment}", description: "Prospect's segment (hot/engaged/etc.)" },
    { token: "{offer_name}", description: "Name of the offer" },
    { token: "{offer_price}", description: "Offer price" },
    { token: "{discount_amount}", description: "Discount amount" },
    { token: "{deadline_date}", description: "Deadline date" },
    { token: "{deadline_time}", description: "Time remaining" },
    { token: "{webinar_title}", description: "Webinar title" },
    { token: "{company_name}", description: "Your company name" },
    { token: "{sender_name}", description: "Sender's name" },
];

export function MessageTemplateEditor({
    sequenceId,
    messages,
    sequences,
    onCreateMessage,
    onUpdateMessage,
    onDeleteMessage,
}: MessageTemplateEditorProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [selectedSequenceFilter, setSelectedSequenceFilter] =
        useState<string>("current");
    const [channelFilter, setChannelFilter] = useState<"all" | "email" | "sms">("all");
    const [previewSegment, setPreviewSegment] = useState<string>("sampler");
    const [formData, setFormData] = useState<Partial<Message>>({
        sequence_id: sequenceId,
        name: "",
        message_order: messages.length + 1,
        channel: "email",
        send_delay_hours: 0,
        subject_line: "",
        body_content: "",
        primary_cta: {
            text: "Take Action",
            url: "",
            tracking_enabled: true,
        },
        ab_test_variant: null,
    });

    const insertToken = (token: string, field: "subject" | "body") => {
        if (field === "subject") {
            setFormData({
                ...formData,
                subject_line: (formData.subject_line || "") + token,
            });
        } else {
            setFormData({
                ...formData,
                body_content: (formData.body_content || "") + token,
            });
        }
    };

    const handleCreate = async () => {
        await onCreateMessage(formData);
        setShowCreateForm(false);
        setFormData({
            sequence_id: sequenceId,
            name: "",
            message_order: messages.length + 1,
            channel: "email",
            send_delay_hours: 0,
            subject_line: "",
            body_content: "",
            primary_cta: {
                text: "Take Action",
                url: "",
                tracking_enabled: true,
            },
            ab_test_variant: null,
        });
    };

    const handleStartEdit = (message: Message) => {
        setEditingId(message.id);
        setFormData({
            sequence_id: message.sequence_id,
            name: message.name,
            message_order: message.message_order,
            channel: message.channel,
            send_delay_hours: message.send_delay_hours,
            subject_line: message.subject_line || "",
            body_content: message.body_content,
            primary_cta: message.primary_cta,
            ab_test_variant: message.ab_test_variant,
        });
        setShowCreateForm(false);
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        await onUpdateMessage(editingId, formData);
        setEditingId(null);
        setFormData({
            sequence_id: sequenceId,
            name: "",
            message_order: messages.length + 1,
            channel: "email",
            send_delay_hours: 0,
            subject_line: "",
            body_content: "",
            primary_cta: {
                text: "Take Action",
                url: "",
                tracking_enabled: true,
            },
            ab_test_variant: null,
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            sequence_id: sequenceId,
            name: "",
            message_order: messages.length + 1,
            channel: "email",
            send_delay_hours: 0,
            subject_line: "",
            body_content: "",
            primary_cta: {
                text: "Take Action",
                url: "",
                tracking_enabled: true,
            },
            ab_test_variant: null,
        });
    };

    const handleRegenerateMessage = async () => {
        if (!editingId) return;

        setIsRegenerating(true);
        logger.info({ messageId: editingId, sequenceId }, "🔄 Regenerating message");

        try {
            const response = await fetch(
                `/api/followup/sequences/${sequenceId}/messages/${editingId}/regenerate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to regenerate message");
            }

            const data = await response.json();

            if (data.success && data.message) {
                // Update form with regenerated content
                setFormData({
                    ...formData,
                    subject_line: data.message.subject_line || formData.subject_line,
                    body_content: data.message.body_content || formData.body_content,
                });

                logger.info({ messageId: editingId }, "✅ Message regenerated");
            }
        } catch (err) {
            logger.error(
                { error: err, messageId: editingId },
                "❌ Regeneration failed"
            );
            alert(
                `Failed to regenerate: ${err instanceof Error ? err.message : "Unknown error"}`
            );
        } finally {
            setIsRegenerating(false);
        }
    };

    const renderPreview = () => {
        // Segment-specific sample data
        const segmentSampleData: Record<string, any> = {
            no_show: {
                first_name: "David",
                last_name: "Miller",
                email: "david@example.com",
                watch_pct: "0",
                minutes_watched: "0",
                challenge_notes: "generating consistent leads",
                goal_notes: "fill my calendar with qualified prospects",
                segment: "no_show",
                offer_name: "Business Growth Accelerator",
                offer_price: "$1,997",
                discount_amount: "$500",
                deadline_date: "Friday, Jan 31",
                deadline_time: "23 hours",
                webinar_title: "The Growth Blueprint",
                company_name: "Your Company",
                sender_name: "Alex",
            },
            skimmer: {
                first_name: "Jessica",
                last_name: "Chen",
                email: "jessica@example.com",
                watch_pct: "18",
                minutes_watched: "9",
                challenge_notes: "converting leads to sales calls",
                goal_notes: "close 10 deals per month",
                segment: "skimmer",
                offer_name: "Business Growth Accelerator",
                offer_price: "$1,997",
                discount_amount: "$500",
                deadline_date: "Friday, Jan 31",
                deadline_time: "23 hours",
                webinar_title: "The Growth Blueprint",
                company_name: "Your Company",
                sender_name: "Alex",
            },
            sampler: {
                first_name: "Sarah",
                last_name: "Johnson",
                email: "sarah@example.com",
                watch_pct: "42",
                minutes_watched: "21",
                challenge_notes: "scaling their business profitably",
                goal_notes: "double revenue in 6 months",
                segment: "sampler",
                offer_name: "Business Growth Accelerator",
                offer_price: "$1,997",
                discount_amount: "$500",
                deadline_date: "Friday, Jan 31",
                deadline_time: "23 hours",
                webinar_title: "The Growth Blueprint",
                company_name: "Your Company",
                sender_name: "Alex",
            },
            engaged: {
                first_name: "Marcus",
                last_name: "Rodriguez",
                email: "marcus@example.com",
                watch_pct: "67",
                minutes_watched: "34",
                challenge_notes: "building a predictable sales pipeline",
                goal_notes: "achieve $50k/month recurring",
                segment: "engaged",
                offer_name: "Business Growth Accelerator",
                offer_price: "$1,997",
                discount_amount: "$500",
                deadline_date: "Friday, Jan 31",
                deadline_time: "23 hours",
                webinar_title: "The Growth Blueprint",
                company_name: "Your Company",
                sender_name: "Alex",
            },
            hot: {
                first_name: "Alicia",
                last_name: "Thompson",
                email: "alicia@example.com",
                watch_pct: "94",
                minutes_watched: "47",
                challenge_notes: "scaling paid ads profitably",
                goal_notes: "fill calendar with qualified calls",
                segment: "hot",
                offer_name: "Business Growth Accelerator",
                offer_price: "$1,997",
                discount_amount: "$500",
                deadline_date: "Friday, Jan 31",
                deadline_time: "23 hours",
                webinar_title: "The Growth Blueprint",
                company_name: "Your Company",
                sender_name: "Alex",
            },
        };

        const sampleData =
            segmentSampleData[previewSegment] || segmentSampleData.sampler;

        let preview = formData.body_content || "";
        Object.entries(sampleData).forEach(([key, value]) => {
            preview = preview.replaceAll(`{${key}}`, String(value));
        });

        return preview;
    };

    // Filter messages based on selected filters
    const filteredMessages = messages
        .filter((msg) => {
            // Sequence filter
            if (selectedSequenceFilter === "current") {
                return msg.sequence_id === sequenceId;
            } else if (selectedSequenceFilter !== "all") {
                return msg.sequence_id === selectedSequenceFilter;
            }
            return true;
        })
        .filter((msg) => {
            // Channel filter
            if (channelFilter === "all") return true;
            return msg.channel === channelFilter;
        });

    // Get sequence name for display
    const getSequenceName = (seqId: string) => {
        const seq = sequences?.find((s) => s.id === seqId);
        return seq?.name || "Unknown Sequence";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Message Templates</h3>
                    <p className="text-sm text-gray-600">
                        Create personalized email and SMS messages for your sequences
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Message
                </Button>
            </div>

            {/* Filters */}
            {sequences && sequences.length > 0 && (
                <Card className="p-4">
                    <div className="flex gap-4 items-center flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Sequence:</span>
                            <select
                                value={selectedSequenceFilter}
                                onChange={(e) =>
                                    setSelectedSequenceFilter(e.target.value)
                                }
                                className="border rounded px-3 py-1.5 text-sm"
                            >
                                <option value="current">Current Only</option>
                                <option value="all">All Sequences</option>
                                {sequences.map((seq) => (
                                    <option key={seq.id} value={seq.id}>
                                        {seq.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Channel:</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setChannelFilter("all")}
                                    className={`px-3 py-1.5 rounded text-sm ${
                                        channelFilter === "all"
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-100 hover:bg-gray-200"
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setChannelFilter("email")}
                                    className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 ${
                                        channelFilter === "email"
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-100 hover:bg-gray-200"
                                    }`}
                                >
                                    <Mail className="h-3 w-3" />
                                    Email
                                </button>
                                <button
                                    onClick={() => setChannelFilter("sms")}
                                    className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 ${
                                        channelFilter === "sms"
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-100 hover:bg-gray-200"
                                    }`}
                                >
                                    <MessageSquare className="h-3 w-3" />
                                    SMS
                                </button>
                            </div>
                        </div>

                        <div className="ml-auto text-sm text-gray-600">
                            Showing {filteredMessages.length} of {messages.length}{" "}
                            messages
                        </div>
                    </div>
                </Card>
            )}

            {/* Edit Form */}
            {editingId && (
                <Card className="p-6 border-2 border-orange-500 mb-6">
                    <h4 className="font-semibold mb-4 text-orange-700">
                        Edit Message Template
                    </h4>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Form Fields - same as create */}
                        <div className="space-y-4">
                            <div>
                                <Label>Message Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="Welcome Email"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Channel</Label>
                                    <select
                                        value={formData.channel}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                channel: e.target.value as
                                                    | "email"
                                                    | "sms",
                                            })
                                        }
                                        className="w-full border rounded p-2"
                                    >
                                        <option value="email">📧 Email</option>
                                        <option value="sms">📱 SMS</option>
                                    </select>
                                </div>

                                <div>
                                    <Label>Order</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.message_order || ""}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFormData({
                                                ...formData,
                                                message_order: isNaN(val)
                                                    ? 1
                                                    : Math.max(1, val),
                                            });
                                        }}
                                    />
                                </div>

                                <div>
                                    <Label>Delay (hours)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.send_delay_hours || ""}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFormData({
                                                ...formData,
                                                send_delay_hours: isNaN(val)
                                                    ? 0
                                                    : Math.max(0, val),
                                            });
                                        }}
                                    />
                                </div>
                            </div>

                            {formData.channel === "email" && (
                                <div>
                                    <Label>Subject Line</Label>
                                    <Input
                                        value={formData.subject_line}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                subject_line: e.target.value,
                                            })
                                        }
                                        placeholder="Quick question about {webinar_title}..."
                                    />
                                </div>
                            )}

                            <div>
                                <Label>Message Body</Label>
                                <Textarea
                                    value={formData.body_content}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            body_content: e.target.value,
                                        })
                                    }
                                    rows={8}
                                    placeholder="Hey {first_name}! I noticed you watched {watch_pct}% of the webinar..."
                                />
                            </div>

                            <div>
                                <Label>Call-to-Action Text</Label>
                                <Input
                                    value={formData.primary_cta?.text}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            primary_cta: {
                                                ...formData.primary_cta!,
                                                text: e.target.value,
                                            },
                                        })
                                    }
                                    placeholder="Get Started Now"
                                />
                            </div>

                            <div>
                                <Label>CTA URL</Label>
                                <Input
                                    value={formData.primary_cta?.url}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            primary_cta: {
                                                ...formData.primary_cta!,
                                                url: e.target.value,
                                            },
                                        })
                                    }
                                    placeholder="https://example.com/offer"
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={handleUpdate} className="flex-1">
                                    Save Changes
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleRegenerateMessage}
                                    disabled={isRegenerating}
                                    className="flex items-center gap-1"
                                >
                                    {isRegenerating ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            Regenerating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            Regenerate with AI
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={handleCancelEdit}>
                                    Cancel
                                </Button>
                            </div>
                        </div>

                        {/* Token Palette */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <Label className="flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    Available Tokens
                                </Label>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowPreview(!showPreview)}
                                >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Preview
                                </Button>
                            </div>

                            {!showPreview ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {AVAILABLE_TOKENS.map((t) => (
                                        <button
                                            key={t.token}
                                            onClick={() => insertToken(t.token, "body")}
                                            className="w-full text-left p-2 rounded border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors"
                                        >
                                            <code className="text-xs text-purple-600 font-mono">
                                                {t.token}
                                            </code>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {t.description}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-medium">Live Preview</h5>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">
                                                Segment:
                                            </span>
                                            <select
                                                value={previewSegment}
                                                onChange={(e) =>
                                                    setPreviewSegment(e.target.value)
                                                }
                                                className="text-xs border rounded px-2 py-1"
                                            >
                                                <option value="no_show">
                                                    No-Show (0%)
                                                </option>
                                                <option value="skimmer">
                                                    Skimmer (1-24%)
                                                </option>
                                                <option value="sampler">
                                                    Sampler (25-49%)
                                                </option>
                                                <option value="engaged">
                                                    Engaged (50-74%)
                                                </option>
                                                <option value="hot">Hot (≥75%)</option>
                                            </select>
                                        </div>
                                    </div>
                                    {formData.channel === "email" &&
                                        formData.subject_line && (
                                            <div className="mb-4">
                                                <span className="text-xs text-gray-600 font-medium">
                                                    Subject:
                                                </span>
                                                <p className="text-sm font-medium mt-1">
                                                    {(() => {
                                                        const segmentData: Record<
                                                            string,
                                                            any
                                                        > = {
                                                            no_show: {
                                                                first_name: "David",
                                                            },
                                                            skimmer: {
                                                                first_name: "Jessica",
                                                            },
                                                            sampler: {
                                                                first_name: "Sarah",
                                                            },
                                                            engaged: {
                                                                first_name: "Marcus",
                                                            },
                                                            hot: {
                                                                first_name: "Alicia",
                                                            },
                                                        };
                                                        const name =
                                                            segmentData[previewSegment]
                                                                ?.first_name || "Sarah";
                                                        return formData.subject_line?.replaceAll(
                                                            "{first_name}",
                                                            name
                                                        );
                                                    })()}
                                                </p>
                                            </div>
                                        )}
                                    <div className="p-4 bg-white rounded border">
                                        <p className="text-sm whitespace-pre-wrap">
                                            {renderPreview()}
                                        </p>
                                        {formData.primary_cta?.text && (
                                            <Button className="mt-4" size="sm">
                                                {formData.primary_cta.text}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Create/Edit Form */}
            {showCreateForm && (
                <Card className="p-6 border-2 border-purple-500">
                    <h4 className="font-semibold mb-4">Create Message Template</h4>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Form Fields */}
                        <div className="space-y-4">
                            <div>
                                <Label>Message Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="Welcome Email"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Channel</Label>
                                    <select
                                        value={formData.channel}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                channel: e.target.value as
                                                    | "email"
                                                    | "sms",
                                            })
                                        }
                                        className="w-full border rounded p-2"
                                    >
                                        <option value="email">📧 Email</option>
                                        <option value="sms">📱 SMS</option>
                                    </select>
                                </div>

                                <div>
                                    <Label>Order</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.message_order || ""}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFormData({
                                                ...formData,
                                                message_order: isNaN(val)
                                                    ? 1
                                                    : Math.max(1, val),
                                            });
                                        }}
                                    />
                                </div>

                                <div>
                                    <Label>Delay (hours)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.send_delay_hours || ""}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFormData({
                                                ...formData,
                                                send_delay_hours: isNaN(val)
                                                    ? 0
                                                    : Math.max(0, val),
                                            });
                                        }}
                                    />
                                </div>
                            </div>

                            {formData.channel === "email" && (
                                <div>
                                    <Label>Subject Line</Label>
                                    <Input
                                        value={formData.subject_line}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                subject_line: e.target.value,
                                            })
                                        }
                                        placeholder="Quick question about {webinar_title}..."
                                    />
                                </div>
                            )}

                            <div>
                                <Label>Message Body</Label>
                                <Textarea
                                    value={formData.body_content}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            body_content: e.target.value,
                                        })
                                    }
                                    rows={8}
                                    placeholder="Hey {first_name}! I noticed you watched {watch_pct}% of the webinar..."
                                />
                            </div>

                            <div>
                                <Label>Call-to-Action Text</Label>
                                <Input
                                    value={formData.primary_cta?.text}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            primary_cta: {
                                                ...formData.primary_cta!,
                                                text: e.target.value,
                                            },
                                        })
                                    }
                                    placeholder="Get Started Now"
                                />
                            </div>

                            <div>
                                <Label>CTA URL</Label>
                                <Input
                                    value={formData.primary_cta?.url}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            primary_cta: {
                                                ...formData.primary_cta!,
                                                url: e.target.value,
                                            },
                                        })
                                    }
                                    placeholder="https://example.com/offer"
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={handleCreate} className="flex-1">
                                    Create Message
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateForm(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>

                        {/* Token Palette */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <Label className="flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    Available Tokens
                                </Label>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowPreview(!showPreview)}
                                >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Preview
                                </Button>
                            </div>

                            {!showPreview ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {AVAILABLE_TOKENS.map((t) => (
                                        <button
                                            key={t.token}
                                            onClick={() => insertToken(t.token, "body")}
                                            className="w-full text-left p-2 rounded border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors"
                                        >
                                            <code className="text-xs text-purple-600 font-mono">
                                                {t.token}
                                            </code>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {t.description}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-medium">Live Preview</h5>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">
                                                Segment:
                                            </span>
                                            <select
                                                value={previewSegment}
                                                onChange={(e) =>
                                                    setPreviewSegment(e.target.value)
                                                }
                                                className="text-xs border rounded px-2 py-1"
                                            >
                                                <option value="no_show">
                                                    No-Show (0%)
                                                </option>
                                                <option value="skimmer">
                                                    Skimmer (1-24%)
                                                </option>
                                                <option value="sampler">
                                                    Sampler (25-49%)
                                                </option>
                                                <option value="engaged">
                                                    Engaged (50-74%)
                                                </option>
                                                <option value="hot">Hot (≥75%)</option>
                                            </select>
                                        </div>
                                    </div>
                                    {formData.channel === "email" &&
                                        formData.subject_line && (
                                            <div className="mb-4">
                                                <span className="text-xs text-gray-600 font-medium">
                                                    Subject:
                                                </span>
                                                <p className="text-sm font-medium mt-1">
                                                    {(() => {
                                                        const segmentData: Record<
                                                            string,
                                                            any
                                                        > = {
                                                            no_show: {
                                                                first_name: "David",
                                                            },
                                                            skimmer: {
                                                                first_name: "Jessica",
                                                            },
                                                            sampler: {
                                                                first_name: "Sarah",
                                                            },
                                                            engaged: {
                                                                first_name: "Marcus",
                                                            },
                                                            hot: {
                                                                first_name: "Alicia",
                                                            },
                                                        };
                                                        const name =
                                                            segmentData[previewSegment]
                                                                ?.first_name || "Sarah";
                                                        return formData.subject_line?.replaceAll(
                                                            "{first_name}",
                                                            name
                                                        );
                                                    })()}
                                                </p>
                                            </div>
                                        )}
                                    <div className="p-4 bg-white rounded border">
                                        <p className="text-sm whitespace-pre-wrap">
                                            {renderPreview()}
                                        </p>
                                        {formData.primary_cta?.text && (
                                            <Button className="mt-4" size="sm">
                                                {formData.primary_cta.text}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Messages List */}
            <div className="space-y-3">
                {filteredMessages.length === 0 ? (
                    <Card className="p-12 text-center">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold mb-2">
                            {messages.length === 0
                                ? "No Messages Yet"
                                : "No Matching Messages"}
                        </h4>
                        <p className="text-gray-600 mb-4">
                            {messages.length === 0
                                ? "Add your first message template to this sequence"
                                : "Try adjusting your filters to see more messages"}
                        </p>
                        {messages.length === 0 && (
                            <Button onClick={() => setShowCreateForm(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create First Message
                            </Button>
                        )}
                    </Card>
                ) : (
                    filteredMessages
                        .sort((a, b) => a.message_order - b.message_order)
                        .map((message) => (
                            <Card
                                key={message.id}
                                className="p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-semibold text-purple-600">
                                            {message.message_order}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <h5 className="font-medium">
                                                    {message.name}
                                                </h5>
                                                {selectedSequenceFilter !==
                                                    "current" && (
                                                    <Badge
                                                        variant="default"
                                                        className="bg-indigo-100 text-indigo-800"
                                                    >
                                                        {getSequenceName(
                                                            message.sequence_id
                                                        )}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline">
                                                    {message.channel === "email" ? (
                                                        <Mail className="h-3 w-3 mr-1" />
                                                    ) : (
                                                        <MessageSquare className="h-3 w-3 mr-1" />
                                                    )}
                                                    {message.channel}
                                                </Badge>
                                                <Badge variant="secondary">
                                                    +{message.send_delay_hours}h
                                                </Badge>
                                            </div>

                                            {message.subject_line && (
                                                <p className="text-sm font-medium text-gray-700 mb-1">
                                                    {message.subject_line}
                                                </p>
                                            )}

                                            <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line">
                                                {message.body_content}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleStartEdit(message)}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </Card>
                        ))
                )}
            </div>
        </div>
    );
}
