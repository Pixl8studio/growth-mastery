/**
 * Post Variant Card
 * Display and edit individual platform post variants
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    Edit2,
    Save,
    Calendar,
    Send,
    CheckCircle2,
    AlertTriangle,
    X,
} from "lucide-react";
import type { PostVariant, PreflightStatus } from "@/types/marketing";

interface PostVariantCardProps {
    variant: PostVariant;
    onUpdate: () => void;
    onSchedule: () => void;
}

export function PostVariantCard({
    variant,
    onUpdate,
    onSchedule,
}: PostVariantCardProps) {
    const { toast } = useToast();
    const [editing, setEditing] = useState(false);
    const [copyText, setCopyText] = useState(variant.copy_text);
    const [altText, setAltText] = useState(variant.alt_text || "");
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);

    const preflight = variant.preflight_status as PreflightStatus;
    const allChecksPassed = preflight.passed;

    const platformIcons: Record<string, string> = {
        instagram: "📸",
        facebook: "👍",
        linkedin: "💼",
        twitter: "🐦",
    };

    const platformColors: Record<string, string> = {
        instagram: "border-pink-500 bg-pink-50",
        facebook: "border-blue-600 bg-blue-50",
        linkedin: "border-blue-700 bg-blue-50",
        twitter: "border-sky-500 bg-sky-50",
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            const response = await fetch(`/api/marketing/variants/${variant.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    copy_text: copyText,
                    alt_text: altText,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Variant Updated",
                    description: "Your changes have been saved",
                });
                setEditing(false);
                onUpdate();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Failed to save variant");
            toast({
                title: "Save Failed",
                description: "Unable to save changes",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSchedule = () => {
        // This would open a scheduling modal
        // For now, just call parent callback
        toast({
            title: "Scheduling",
            description: "Calendar scheduling coming soon",
        });
        onSchedule();
    };

    const handlePublish = async () => {
        if (!allChecksPassed) {
            toast({
                title: "Preflight Failed",
                description:
                    "Content must pass all validation checks before publishing",
                variant: "destructive",
            });
            return;
        }

        setPublishing(true);

        try {
            const response = await fetch("/api/marketing/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    post_variant_id: variant.id,
                    platform: variant.platform,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Published Successfully",
                    description: `Your content is now live on ${variant.platform}`,
                });
                onUpdate();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Publishing failed");
            toast({
                title: "Publishing Failed",
                description:
                    error instanceof Error ? error.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setPublishing(false);
        }
    };

    return (
        <Card className={`p-4 border-2 ${platformColors[variant.platform] || ""}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{platformIcons[variant.platform]}</span>
                    <div>
                        <div className="font-semibold capitalize">
                            {variant.platform}
                        </div>
                        <div className="text-xs text-gray-600">
                            {variant.story_angle} • {variant.format_type}
                        </div>
                    </div>
                </div>

                {!editing && (
                    <Button onClick={() => setEditing(true)} variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="mb-4">
                {editing ? (
                    <div className="space-y-3">
                        <Textarea
                            value={copyText}
                            onChange={(e) => setCopyText(e.target.value)}
                            className="min-h-[150px]"
                        />
                        {variant.media_urls && variant.media_urls.length > 0 && (
                            <div>
                                <label className="text-sm font-medium mb-1 block">
                                    Alt Text
                                </label>
                                <Input
                                    value={altText}
                                    onChange={(e) => setAltText(e.target.value)}
                                    placeholder="Describe the image for accessibility..."
                                />
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button onClick={handleSave} disabled={saving} size="sm">
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                                onClick={() => {
                                    setEditing(false);
                                    setCopyText(variant.copy_text);
                                    setAltText(variant.alt_text || "");
                                }}
                                variant="outline"
                                size="sm"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm whitespace-pre-wrap bg-white p-3 rounded border">
                        {variant.copy_text}
                    </div>
                )}
            </div>

            {/* Hashtags */}
            {variant.hashtags && variant.hashtags.length > 0 && (
                <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                        {variant.hashtags.slice(0, 5).map((tag, i) => (
                            <span
                                key={i}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                            >
                                {tag}
                            </span>
                        ))}
                        {variant.hashtags.length > 5 && (
                            <span className="text-xs px-2 py-1 text-gray-600">
                                +{variant.hashtags.length - 5} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Preflight Status */}
            <div className="mb-4">
                <div className="text-xs font-medium mb-2">Preflight Checks:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                        {preflight.compliance_check === "passed" ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        )}
                        <span>Compliance</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {preflight.accessibility_check === "passed" ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        )}
                        <span>Accessibility</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {preflight.brand_voice_check === "passed" ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        )}
                        <span>Brand Voice</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {preflight.character_limit_check === "passed" ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        )}
                        <span>Length</span>
                    </div>
                </div>

                {preflight.issues && preflight.issues.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <div className="font-medium text-yellow-800 mb-1">Issues:</div>
                        <ul className="list-disc list-inside text-yellow-700">
                            {preflight.issues.slice(0, 2).map((issue, i) => (
                                <li key={i}>{issue}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Actions */}
            {!editing && (
                <div className="flex gap-2">
                    <Button
                        onClick={handleSchedule}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                    >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule
                    </Button>
                    <Button
                        onClick={handlePublish}
                        disabled={!allChecksPassed || publishing}
                        size="sm"
                        className="flex-1"
                    >
                        <Send className="h-4 w-4 mr-2" />
                        {publishing ? "Publishing..." : "Publish Now"}
                    </Button>
                </div>
            )}
        </Card>
    );
}
