/**
 * Sequence Builder Component
 *
 * Create, edit, and manage follow-up message sequences with visual timeline.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Mail,
    MessageSquare,
    Clock,
    Users,
    Plus,
    Trash2,
    Edit2,
    Play,
    Pause,
    Sparkles,
} from "lucide-react";
import { logger } from "@/lib/client-logger";

interface Sequence {
    id: string;
    name: string;
    description?: string;
    sequence_type: string;
    trigger_event: string;
    trigger_delay_hours: number;
    deadline_hours: number;
    total_messages: number;
    target_segments: string[];
    requires_manual_approval: boolean;
    is_active: boolean;
    message_count?: number; // Actual generated messages
}

interface SequenceBuilderProps {
    sequences: Sequence[];
    onCreateSequence: (sequence: Partial<Sequence>) => Promise<void>;
    onUpdateSequence: (id: string, updates: Partial<Sequence>) => Promise<void>;
    onDeleteSequence: (id: string) => Promise<void>;
    onSelectSequence?: (sequenceId: string) => void;
    onReloadSequences?: () => Promise<void>;
    funnelProjectId?: string;
    offerId?: string;
}

export function SequenceBuilder({
    sequences,
    onCreateSequence,
    onUpdateSequence,
    onDeleteSequence,
    onSelectSequence,
    onReloadSequences,
    funnelProjectId,
    offerId,
}: SequenceBuilderProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [generatingMessagesFor, setGeneratingMessagesFor] = useState<string | null>(
        null
    );
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationStatus, setGenerationStatus] = useState("");
    const [formData, setFormData] = useState<Partial<Sequence>>({
        name: "",
        description: "",
        sequence_type: "3_day_discount",
        trigger_event: "webinar_completed",
        trigger_delay_hours: 1,
        deadline_hours: 72,
        total_messages: 5,
        target_segments: ["sampler", "engaged", "hot"],
        requires_manual_approval: false,
        is_active: true,
    });

    const handleCreate = async () => {
        await onCreateSequence(formData);
        setShowCreateForm(false);
        setFormData({
            name: "",
            description: "",
            sequence_type: "3_day_discount",
            trigger_event: "webinar_completed",
            trigger_delay_hours: 1,
            deadline_hours: 72,
            total_messages: 5,
            target_segments: ["sampler", "engaged", "hot"],
            requires_manual_approval: false,
            is_active: true,
        });
    };

    const handleGenerateMessagesForSequence = async (sequenceId: string) => {
        setGeneratingMessagesFor(sequenceId);
        setGenerationProgress(0);
        setGenerationStatus("Initializing...");

        logger.info({ sequenceId }, "🎨 Generating messages for sequence");

        try {
            // Update progress as we go
            setGenerationStatus("Generating message 1 of 5...");
            setGenerationProgress(10);

            const response = await fetch(
                `/api/followup/sequences/${sequenceId}/generate-messages`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                }
            );

            setGenerationProgress(90);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate messages");
            }

            const data = await response.json();

            logger.info(
                {
                    sequenceId,
                    messagesGenerated: data.messages_generated,
                    errors: data.errors?.length || 0,
                },
                "✅ Messages generated"
            );

            setGenerationProgress(100);
            setGenerationStatus(
                `✅ Generated ${data.messages_generated} of ${data.total_attempted} messages!`
            );

            // Reload sequences to update message counts
            if (onReloadSequences) {
                await onReloadSequences();
            }

            // Auto-select to show the messages
            if (onSelectSequence) {
                setTimeout(() => {
                    onSelectSequence(sequenceId);
                }, 1000);
            }
        } catch (err) {
            logger.error({ error: err, sequenceId }, "❌ Message generation failed");
            setGenerationStatus(
                `Error: ${err instanceof Error ? err.message : "Generation failed"}`
            );
            setGenerationProgress(0);
        } finally {
            setTimeout(() => {
                setGeneratingMessagesFor(null);
                setGenerationProgress(0);
                setGenerationStatus("");
            }, 3000);
        }
    };

    const handleStartEdit = (sequence: Sequence) => {
        setEditingId(sequence.id);
        setFormData({
            name: sequence.name,
            description: sequence.description,
            sequence_type: sequence.sequence_type,
            trigger_event: sequence.trigger_event,
            trigger_delay_hours: sequence.trigger_delay_hours,
            deadline_hours: sequence.deadline_hours,
            total_messages: sequence.total_messages,
            target_segments: sequence.target_segments,
            requires_manual_approval: sequence.requires_manual_approval,
            is_active: sequence.is_active,
        });
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        await onUpdateSequence(editingId, formData);
        setEditingId(null);
        setFormData({
            name: "",
            description: "",
            sequence_type: "3_day_discount",
            trigger_event: "webinar_completed",
            trigger_delay_hours: 1,
            deadline_hours: 72,
            total_messages: 5,
            target_segments: ["sampler", "engaged", "hot"],
            requires_manual_approval: false,
            is_active: true,
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            name: "",
            description: "",
            sequence_type: "3_day_discount",
            trigger_event: "webinar_completed",
            trigger_delay_hours: 1,
            deadline_hours: 72,
            total_messages: 5,
            target_segments: ["sampler", "engaged", "hot"],
            requires_manual_approval: false,
            is_active: true,
        });
    };

    const getSegmentBadgeColor = (segment: string) => {
        const colors: Record<string, string> = {
            hot: "bg-red-100 text-red-800",
            engaged: "bg-orange-100 text-orange-800",
            sampler: "bg-yellow-100 text-yellow-800",
            skimmer: "bg-blue-100 text-blue-800",
            no_show: "bg-gray-100 text-gray-800",
        };
        return colors[segment] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Message Sequences</h3>
                    <p className="text-sm text-gray-600">
                        Create sequences, then generate AI-powered messages for each one
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Sequence
                </Button>
            </div>

            {/* Edit Form */}
            {editingId && (
                <Card className="p-6 border-2 border-orange-500 mb-6">
                    <h4 className="font-semibold mb-4 text-orange-700">
                        Edit Sequence
                    </h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Sequence Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="3-Day Discount Sequence"
                                />
                            </div>

                            <div>
                                <Label>Type</Label>
                                <select
                                    value={formData.sequence_type}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sequence_type: e.target.value,
                                        })
                                    }
                                    className="w-full border rounded p-2"
                                >
                                    <option value="3_day_discount">
                                        3-Day Discount
                                    </option>
                                    <option value="nurture">Nurture</option>
                                    <option value="reactivation">Reactivation</option>
                                    <option value="upsell">Upsell</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                placeholder="Brief description of this sequence..."
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Trigger Delay (hours)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.trigger_delay_hours || ""}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({
                                            ...formData,
                                            trigger_delay_hours: isNaN(val)
                                                ? 0
                                                : Math.max(0, val),
                                        });
                                    }}
                                />
                            </div>

                            <div>
                                <Label>Deadline (hours)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.deadline_hours || ""}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({
                                            ...formData,
                                            deadline_hours: isNaN(val)
                                                ? 72
                                                : Math.max(1, val),
                                        });
                                    }}
                                />
                            </div>

                            <div>
                                <Label>Total Messages</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.total_messages || ""}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({
                                            ...formData,
                                            total_messages: isNaN(val)
                                                ? 1
                                                : Math.max(1, val),
                                        });
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Min: 1 | Recommended: 3-8 for best flow
                                </p>
                            </div>
                        </div>

                        <div>
                            <Label>Target Segments</Label>
                            <div className="flex gap-2 mt-2">
                                {[
                                    "no_show",
                                    "skimmer",
                                    "sampler",
                                    "engaged",
                                    "hot",
                                ].map((segment) => (
                                    <label
                                        key={segment}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.target_segments?.includes(
                                                segment
                                            )}
                                            onChange={(e) => {
                                                const current =
                                                    formData.target_segments || [];
                                                if (e.target.checked) {
                                                    setFormData({
                                                        ...formData,
                                                        target_segments: [
                                                            ...current,
                                                            segment,
                                                        ],
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        target_segments: current.filter(
                                                            (s) => s !== segment
                                                        ),
                                                    });
                                                }
                                            }}
                                        />
                                        <Badge
                                            className={getSegmentBadgeColor(segment)}
                                        >
                                            {segment.replace("_", " ")}
                                        </Badge>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.requires_manual_approval}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        requires_manual_approval: e.target.checked,
                                    })
                                }
                            />
                            <Label>Require manual approval before sending</Label>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={handleUpdate}
                                className="flex-1"
                                disabled={
                                    !formData.total_messages ||
                                    formData.total_messages < 1
                                }
                            >
                                Save Changes
                            </Button>
                            <Button variant="outline" onClick={handleCancelEdit}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Create Form */}
            {showCreateForm && (
                <Card className="p-6 border-2 border-blue-500">
                    <h4 className="font-semibold mb-4">Create New Sequence</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Sequence Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="3-Day Discount Sequence"
                                />
                            </div>

                            <div>
                                <Label>Type</Label>
                                <select
                                    value={formData.sequence_type}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            sequence_type: e.target.value,
                                        })
                                    }
                                    className="w-full border rounded p-2"
                                >
                                    <option value="3_day_discount">
                                        3-Day Discount
                                    </option>
                                    <option value="nurture">Nurture</option>
                                    <option value="reactivation">Reactivation</option>
                                    <option value="upsell">Upsell</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                placeholder="Brief description of this sequence..."
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Trigger Delay (hours)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.trigger_delay_hours || ""}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({
                                            ...formData,
                                            trigger_delay_hours: isNaN(val)
                                                ? 0
                                                : Math.max(0, val),
                                        });
                                    }}
                                />
                            </div>

                            <div>
                                <Label>Deadline (hours)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.deadline_hours || ""}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({
                                            ...formData,
                                            deadline_hours: isNaN(val)
                                                ? 72
                                                : Math.max(1, val),
                                        });
                                    }}
                                />
                            </div>

                            <div>
                                <Label>Total Messages</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.total_messages || ""}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({
                                            ...formData,
                                            total_messages: isNaN(val)
                                                ? 1
                                                : Math.max(1, val),
                                        });
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Min: 1 | Recommended: 3-8 for best flow
                                </p>
                            </div>
                        </div>

                        <div>
                            <Label>Target Segments</Label>
                            <div className="flex gap-2 mt-2">
                                {[
                                    "no_show",
                                    "skimmer",
                                    "sampler",
                                    "engaged",
                                    "hot",
                                ].map((segment) => (
                                    <label
                                        key={segment}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.target_segments?.includes(
                                                segment
                                            )}
                                            onChange={(e) => {
                                                const current =
                                                    formData.target_segments || [];
                                                if (e.target.checked) {
                                                    setFormData({
                                                        ...formData,
                                                        target_segments: [
                                                            ...current,
                                                            segment,
                                                        ],
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        target_segments: current.filter(
                                                            (s) => s !== segment
                                                        ),
                                                    });
                                                }
                                            }}
                                        />
                                        <Badge
                                            className={getSegmentBadgeColor(segment)}
                                        >
                                            {segment.replace("_", " ")}
                                        </Badge>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.requires_manual_approval}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        requires_manual_approval: e.target.checked,
                                    })
                                }
                            />
                            <Label>Require manual approval before sending</Label>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={handleCreate}
                                className="flex-1"
                                disabled={
                                    !formData.total_messages ||
                                    formData.total_messages < 1
                                }
                            >
                                Create Sequence
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowCreateForm(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Sequences List */}
            <div className="space-y-4">
                {sequences.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold mb-2">No Sequences Yet</h4>
                        <p className="text-gray-600 mb-4">
                            Create your first follow-up sequence to start automating
                            engagement
                        </p>
                        <Button onClick={() => setShowCreateForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Sequence
                        </Button>
                    </Card>
                ) : (
                    sequences.map((sequence) => (
                        <Card
                            key={sequence.id}
                            className="p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="text-lg font-semibold">
                                            {sequence.name}
                                        </h4>
                                        {sequence.is_active ? (
                                            <Badge className="bg-green-100 text-green-800">
                                                <Play className="h-3 w-3 mr-1" />
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                <Pause className="h-3 w-3 mr-1" />
                                                Paused
                                            </Badge>
                                        )}
                                        {sequence.requires_manual_approval && (
                                            <Badge variant="outline">
                                                Manual Approval
                                            </Badge>
                                        )}
                                    </div>
                                    {sequence.description && (
                                        <p className="text-sm text-gray-600">
                                            {sequence.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {/* Generate or Regenerate Messages Button */}
                                    {(sequence.message_count || 0) === 0 ? (
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                handleGenerateMessagesForSequence(
                                                    sequence.id
                                                )
                                            }
                                            disabled={
                                                generatingMessagesFor === sequence.id ||
                                                !sequence.total_messages ||
                                                sequence.total_messages < 1
                                            }
                                            className="flex items-center gap-1"
                                        >
                                            {generatingMessagesFor === sequence.id ? (
                                                <>
                                                    <span className="animate-spin">
                                                        ⏳
                                                    </span>
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4" />
                                                    {!sequence.total_messages ||
                                                    sequence.total_messages < 1
                                                        ? "Set Message Count First"
                                                        : "Generate Messages"}
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <>
                                            {(sequence.message_count || 0) !==
                                                sequence.total_messages && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (
                                                            confirm(
                                                                `This will delete ${sequence.message_count || 0} existing messages and generate ${sequence.total_messages} new ones. Continue?`
                                                            )
                                                        ) {
                                                            handleGenerateMessagesForSequence(
                                                                sequence.id
                                                            );
                                                        }
                                                    }}
                                                    disabled={
                                                        generatingMessagesFor ===
                                                        sequence.id
                                                    }
                                                    className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                                                >
                                                    {generatingMessagesFor ===
                                                    sequence.id ? (
                                                        <>
                                                            <span className="animate-spin">
                                                                ⏳
                                                            </span>
                                                            Regenerating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="h-4 w-4" />
                                                            Regenerate (
                                                            {sequence.message_count ||
                                                                0}{" "}
                                                            → {sequence.total_messages})
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            {onSelectSequence && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        onSelectSequence(sequence.id)
                                                    }
                                                >
                                                    <MessageSquare className="h-4 w-4 mr-1" />
                                                    View Messages (
                                                    {sequence.message_count})
                                                </Button>
                                            )}
                                        </>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleStartEdit(sequence)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDeleteSequence(sequence.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Sequence Details */}
                            <div className="grid grid-cols-4 gap-4 text-sm mt-4">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">
                                        {sequence.message_count || 0} of{" "}
                                        {sequence.total_messages} messages
                                        {sequence.message_count !==
                                            sequence.total_messages && (
                                            <span className="text-orange-600 ml-1">
                                                ⚠️
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">
                                        {sequence.deadline_hours}h duration
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">
                                        {sequence.target_segments.length} segments
                                    </span>
                                </div>
                                <div>
                                    <Badge variant="secondary">
                                        {sequence.sequence_type}
                                    </Badge>
                                </div>
                            </div>

                            {/* Message Count Mismatch Warning */}
                            {sequence.message_count !== sequence.total_messages &&
                                (sequence.message_count || 0) > 0 && (
                                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                                        <p className="text-orange-800 font-medium flex items-center gap-2">
                                            <span>⚠️</span>
                                            Message Count Mismatch
                                        </p>
                                        <p className="text-orange-700 mt-1">
                                            This sequence has{" "}
                                            {sequence.message_count || 0} generated
                                            messages but is configured for{" "}
                                            {sequence.total_messages}. Click
                                            "Regenerate" to update to the correct count.
                                        </p>
                                    </div>
                                )}

                            {/* Target Segments */}
                            <div className="flex gap-2 mt-4">
                                <span className="text-sm text-gray-600">Targets:</span>
                                {sequence.target_segments.map((segment) => (
                                    <Badge
                                        key={segment}
                                        className={getSegmentBadgeColor(segment)}
                                    >
                                        {segment.replace("_", " ")}
                                    </Badge>
                                ))}
                            </div>

                            {/* Generation Progress */}
                            {generatingMessagesFor === sequence.id && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-blue-900">
                                            {generationStatus}
                                        </span>
                                        <span className="text-sm text-blue-600">
                                            {generationProgress}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-blue-100 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${generationProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Timeline Visualization */}
                            <div className="mt-6 pt-4 border-t">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium">
                                        Timeline
                                    </span>
                                </div>
                                <div className="relative">
                                    <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200" />
                                    <div className="flex justify-between relative">
                                        {Array.from({
                                            length: sequence.total_messages,
                                        }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex flex-col items-center"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium mb-2">
                                                    {i + 1}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    +{i * 12}h
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
