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
} from "lucide-react";

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
}

interface SequenceBuilderProps {
    sequences: Sequence[];
    onCreateSequence: (sequence: Partial<Sequence>) => Promise<void>;
    onUpdateSequence: (id: string, updates: Partial<Sequence>) => Promise<void>;
    onDeleteSequence: (id: string) => Promise<void>;
}

export function SequenceBuilder({
    sequences,
    onCreateSequence,
    onUpdateSequence,
    onDeleteSequence,
}: SequenceBuilderProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
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
                        Create and manage automated follow-up sequences
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
                                    value={formData.trigger_delay_hours}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            trigger_delay_hours: parseInt(
                                                e.target.value
                                            ),
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Deadline (hours)</Label>
                                <Input
                                    type="number"
                                    value={formData.deadline_hours}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            deadline_hours: parseInt(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Total Messages</Label>
                                <Input
                                    type="number"
                                    value={formData.total_messages}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            total_messages: parseInt(e.target.value),
                                        })
                                    }
                                />
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
                            <Button onClick={handleCreate} className="flex-1">
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
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingId(sequence.id)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDeleteSequence(sequence.id)}
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
                                        {sequence.total_messages} messages
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
