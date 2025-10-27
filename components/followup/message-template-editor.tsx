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
import { Mail, MessageSquare, Plus, Eye, Code } from "lucide-react";

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

interface MessageTemplateEditorProps {
    sequenceId: string;
    messages: Message[];
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
    onCreateMessage,
    onUpdateMessage,
    onDeleteMessage,
}: MessageTemplateEditorProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
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

    const renderPreview = () => {
        const sampleData = {
            first_name: "Sarah",
            last_name: "Johnson",
            email: "sarah@example.com",
            watch_pct: "67",
            challenge_notes: "scaling their business",
            goal_notes: "double revenue in 6 months",
            segment: "engaged",
            offer_name: "Business Growth Accelerator",
            offer_price: "$1,997",
            discount_amount: "$500",
            deadline_date: "Friday, Jan 31",
            deadline_time: "23 hours",
            webinar_title: "The Growth Blueprint",
            company_name: "Your Company",
            sender_name: "Alex",
        };

        let preview = formData.body_content || "";
        Object.entries(sampleData).forEach(([key, value]) => {
            preview = preview.replaceAll(`{${key}}`, value);
        });

        return preview;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Message Templates</h3>
                    <p className="text-sm text-gray-600">
                        Create personalized email and SMS messages for this sequence
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
                                        value={formData.message_order}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                message_order: parseInt(e.target.value),
                                            })
                                        }
                                    />
                                </div>

                                <div>
                                    <Label>Delay (hours)</Label>
                                    <Input
                                        type="number"
                                        value={formData.send_delay_hours}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                send_delay_hours: parseInt(
                                                    e.target.value
                                                ),
                                            })
                                        }
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
                                    <h5 className="font-medium mb-3">Live Preview</h5>
                                    {formData.channel === "email" &&
                                        formData.subject_line && (
                                            <div className="mb-4">
                                                <span className="text-xs text-gray-600 font-medium">
                                                    Subject:
                                                </span>
                                                <p className="text-sm font-medium mt-1">
                                                    {formData.subject_line.replaceAll(
                                                        "{first_name}",
                                                        "Sarah"
                                                    )}
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
                {messages.length === 0 ? (
                    <Card className="p-12 text-center">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold mb-2">No Messages Yet</h4>
                        <p className="text-gray-600 mb-4">
                            Add your first message template to this sequence
                        </p>
                        <Button onClick={() => setShowCreateForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Message
                        </Button>
                    </Card>
                ) : (
                    messages
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
                                            <div className="flex items-center gap-2 mb-2">
                                                <h5 className="font-medium">
                                                    {message.name}
                                                </h5>
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

                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {message.body_content}
                                            </p>
                                        </div>
                                    </div>

                                    <Button variant="outline" size="sm">
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
