/**
 * Enhanced Post Variant Card Component
 * Display card with status badges, preflight indicators, quick actions, and inline editor integration
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/client-logger";
import {
    Edit2,
    Calendar,
    Trash2,
    Copy,
    Eye,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    MoreVertical,
} from "lucide-react";
import { VariantInlineEditor } from "./variant-inline-editor";
import { PlatformPreviewModal } from "./platform-preview-modal";
import type { PostVariant } from "@/types/marketing";

interface PostVariantCardEnhancedProps {
    variant: PostVariant;
    onUpdate: () => void;
    onSchedule: () => void;
    funnelProjectId: string;
}

export function PostVariantCardEnhanced({
    variant,
    onUpdate,
    onSchedule,
    funnelProjectId,
}: PostVariantCardEnhancedProps) {
    const { toast } = useToast();
    const [showEditor, setShowEditor] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const preflight = (variant.preflight_status as any) || {
        passed: false,
        compliance_check: "pending",
        accessibility_check: "pending",
        brand_voice_check: "pending",
        character_limit_check: "pending",
        issues: [],
    };

    const platformIcons: Record<string, string> = {
        instagram: "📸",
        facebook: "👍",
        linkedin: "💼",
        twitter: "🐦",
    };

    const platformColors: Record<string, string> = {
        instagram: "from-pink-500 to-purple-500",
        facebook: "from-blue-600 to-blue-700",
        linkedin: "from-blue-700 to-blue-800",
        twitter: "from-sky-500 to-blue-500",
    };

    const approvalStatusConfig: Record<string, { color: string; icon: any }> = {
        pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
        approved: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
        rejected: { color: "bg-red-100 text-red-700", icon: XCircle },
    };

    const handleSaveVariant = async (updates: Partial<PostVariant>) => {
        try {
            const response = await fetch(`/api/marketing/variants/${variant.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Variant Updated",
                    description: "Your changes have been saved",
                });
                onUpdate();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Failed to save variant");
            toast({
                title: "Save Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleDuplicate = async () => {
        try {
            const response = await fetch("/api/marketing/variants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...variant,
                    id: undefined, // Remove ID to create new
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Variant Duplicated",
                    description: "A copy has been created",
                });
                onUpdate();
            }
        } catch (error) {
            logger.error({ error }, "Failed to duplicate variant");
            toast({
                title: "Duplication Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!confirm("Delete this variant?")) return;

        try {
            const response = await fetch(`/api/marketing/variants/${variant.id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Variant Deleted",
                    description: "Variant has been removed",
                });
                onUpdate();
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete variant");
            toast({
                title: "Delete Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleABTest = () => {
        toast({
            title: "A/B Test",
            description: "Experiment creation feature coming soon",
        });
    };

    const ApprovalIcon =
        approvalStatusConfig[variant.approval_status || "pending"]?.icon || Clock;
    const approvalColor =
        approvalStatusConfig[variant.approval_status || "pending"]?.color;

    return (
        <>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header with Platform Badge */}
                <div
                    className={`h-2 bg-gradient-to-r ${platformColors[variant.platform]}`}
                />

                <div className="p-4">
                    {/* Top Row: Platform, Format, Status Badges */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="capitalize">
                                <span className="mr-1">
                                    {platformIcons[variant.platform]}
                                </span>
                                {variant.platform}
                            </Badge>
                            <Badge variant="outline" className="capitalize text-xs">
                                {variant.format_type || "post"}
                            </Badge>
                            {variant.story_framework && (
                                <Badge variant="outline" className="text-xs">
                                    {variant.story_framework.replace("_", " ")}
                                </Badge>
                            )}
                        </div>

                        {/* Actions Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowActions(!showActions)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <MoreVertical className="h-5 w-5" />
                            </button>

                            {showActions && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowActions(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                                        <button
                                            onClick={() => {
                                                handleDuplicate();
                                                setShowActions(false);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Copy className="h-4 w-4" />
                                            Duplicate
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleABTest();
                                                setShowActions(false);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            A/B Test
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleDelete();
                                                setShowActions(false);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 flex items-center gap-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Second Row: Approval Status & Preflight Validation */}
                    <div className="flex items-center gap-2 mb-4">
                        <Badge className={approvalColor}>
                            <ApprovalIcon className="h-3 w-3 mr-1" />
                            {variant.approval_status || "pending"}
                        </Badge>

                        {/* Preflight Status Indicator */}
                        {preflight.passed ? (
                            <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Validated
                            </Badge>
                        ) : preflight.issues?.length > 0 ? (
                            <Badge className="bg-red-100 text-red-700">
                                <XCircle className="h-3 w-3 mr-1" />
                                {preflight.issues.length} Issues
                            </Badge>
                        ) : (
                            <Badge className="bg-gray-100 text-gray-700">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Not Validated
                            </Badge>
                        )}
                    </div>

                    {/* Content Preview */}
                    <div className="mb-4">
                        <p className="text-sm text-gray-900 line-clamp-4">
                            {variant.copy_text}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                            {variant.copy_text.length} characters
                            {variant.hashtags && variant.hashtags.length > 0 && (
                                <> • {variant.hashtags.length} hashtags</>
                            )}
                        </div>
                    </div>

                    {/* Media Indicator */}
                    {variant.media_urls && variant.media_urls.length > 0 && (
                        <div className="mb-4 flex gap-1">
                            {variant.media_urls.slice(0, 3).map((url, index) => (
                                <div
                                    key={index}
                                    className="w-16 h-16 rounded border overflow-hidden"
                                >
                                    <img
                                        src={url}
                                        alt={`Media ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                            {variant.media_urls.length > 3 && (
                                <div className="w-16 h-16 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                                    +{variant.media_urls.length - 3}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            onClick={() => setShowEditor(true)}
                            variant="outline"
                            size="sm"
                        >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                        </Button>
                        <Button
                            onClick={() => setShowPreview(true)}
                            variant="outline"
                            size="sm"
                        >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                        </Button>
                        <Button onClick={onSchedule} variant="outline" size="sm">
                            <Calendar className="h-3 w-3 mr-1" />
                            Schedule
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Inline Editor Modal */}
            {showEditor && (
                <VariantInlineEditor
                    isOpen={showEditor}
                    onClose={() => setShowEditor(false)}
                    variant={variant}
                    onSave={handleSaveVariant}
                    funnelProjectId={funnelProjectId}
                />
            )}

            {/* Preview Modal */}
            {showPreview && (
                <PlatformPreviewModal
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    content={{
                        copy_text: variant.copy_text,
                        platform: variant.platform,
                        hashtags: variant.hashtags,
                        media_urls: variant.media_urls,
                        cta_text: (variant.cta_config as any)?.text,
                    }}
                />
            )}
        </>
    );
}
