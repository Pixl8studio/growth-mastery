/**
 * Variant Inline Editor Modal
 * Comprehensive variant editing with full controls matching message template editor complexity
 * Includes: token insertion, media upload, alt text, CTA config, link strategy, approval workflow, preflight validation
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    X,
    Save,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Eye,
    Upload,
    Link as LinkIcon,
    Hash,
    Image as ImageIcon,
} from "lucide-react";
import { TokenInsertionMenu } from "./token-insertion-menu";
import { ComplianceValidator } from "./compliance-validator";
import { MediaLibraryModal } from "./media-library-modal";
import { PlatformPreviewModal } from "./platform-preview-modal";
import { UTMBuilder } from "./utm-builder";
import type { PostVariant } from "@/types/marketing";

interface VariantInlineEditorProps {
    isOpen: boolean;
    onClose: () => void;
    variant: PostVariant;
    onSave: (updates: Partial<PostVariant>) => void;
    funnelProjectId: string;
}

export function VariantInlineEditor({
    isOpen,
    onClose,
    variant,
    onSave,
    funnelProjectId,
}: VariantInlineEditorProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [showMediaLibrary, setShowMediaLibrary] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Content Fields
    const [copyText, setCopyText] = useState(variant.copy_text || "");
    const [caption, setCaption] = useState(variant.caption || "");
    const [hashtags, setHashtags] = useState<string[]>(variant.hashtags || []);
    const [newHashtag, setNewHashtag] = useState("");

    // Media Fields
    const [mediaUrls, setMediaUrls] = useState<string[]>(variant.media_urls || []);
    const [altText, setAltText] = useState(variant.alt_text || "");

    // CTA Configuration
    const [ctaText, setCtaText] = useState(
        (variant.cta_config as any)?.text || "Learn More"
    );
    const [ctaType, setCtaType] = useState(
        (variant.cta_config as any)?.type || "bio_link"
    );
    const [ctaUrl, setCtaUrl] = useState((variant.cta_config as any)?.url || "");
    const [dmKeyword, setDmKeyword] = useState(
        (variant.cta_config as any)?.dm_keyword || ""
    );
    const [commentTrigger, setCommentTrigger] = useState(
        (variant.cta_config as any)?.comment_trigger || ""
    );

    // Link Strategy
    const [primaryUrl, setPrimaryUrl] = useState(
        (variant.link_strategy as any)?.primary_url || ""
    );
    const [trackingEnabled, setTrackingEnabled] = useState(
        (variant.link_strategy as any)?.tracking_enabled ?? true
    );

    // Approval Workflow
    const [approvalStatus, setApprovalStatus] = useState(
        variant.approval_status || "pending"
    );
    const [approvalNotes, setApprovalNotes] = useState(
        variant.approval_notes || ""
    );

    // Character Count
    const characterCount = copyText.length;
    const platformLimits: Record<string, number> = {
        instagram: 2200,
        facebook: 63206,
        linkedin: 3000,
        twitter: 280,
    };
    const charLimit = platformLimits[variant.platform] || 2200;
    const charWarning = characterCount > charLimit * 0.9;
    const charError = characterCount > charLimit;

    const handleSave = async () => {
        if (charError) {
            toast({
                title: "Character Limit Exceeded",
                description: `${variant.platform} has a ${charLimit} character limit`,
                variant: "destructive",
            });
            return;
        }

        setSaving(true);

        try {
            const updates = {
                copy_text: copyText,
                caption,
                hashtags,
                media_urls: mediaUrls,
                alt_text: altText,
                cta_config: {
                    text: ctaText,
                    type: ctaType,
                    url: ctaUrl,
                    dm_keyword: dmKeyword,
                    comment_trigger: commentTrigger,
                },
                link_strategy: {
                    ...(variant.link_strategy as any),
                    primary_url: primaryUrl,
                    tracking_enabled: trackingEnabled,
                },
                approval_status: approvalStatus,
                approval_notes: approvalNotes,
            };

            await onSave(updates);

            toast({
                title: "Changes Saved",
                description: "Variant has been updated",
            });

            onClose();
        } catch (error) {
            logger.error({ error }, "Failed to save variant");
            toast({
                title: "Save Failed",
                description: "Please try again",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndSchedule = async () => {
        await handleSave();
        // Open scheduling modal would be called here
    };

    const handleSaveAndApprove = async () => {
        setApprovalStatus("approved");
        await handleSave();
    };

    const handleInsertToken = (token: string) => {
        setCopyText(copyText + token);
    };

    const addHashtag = () => {
        if (newHashtag && !hashtags.includes(newHashtag)) {
            setHashtags([...hashtags, newHashtag.replace("#", "")]);
            setNewHashtag("");
        }
    };

    const removeHashtag = (tag: string) => {
        setHashtags(hashtags.filter((t) => t !== tag));
    };

    const handleSelectMedia = (urls: string[]) => {
        setMediaUrls(urls);
        setShowMediaLibrary(false);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
                <div className="bg-white rounded-lg w-full max-w-5xl max-h-[95vh] flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Edit Variant</h2>
                            <p className="text-sm text-gray-600 capitalize">
                                {variant.platform} • {variant.format_type || "post"}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => setShowPreview(true)}
                                variant="outline"
                                size="sm"
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                            </Button>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Copy Text Editor */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Copy Text</Label>
                                <div className="flex items-center gap-3">
                                    <TokenInsertionMenu onInsertToken={handleInsertToken} />
                                    <span
                                        className={`text-sm ${
                                            charError
                                                ? "text-red-600 font-semibold"
                                                : charWarning
                                                  ? "text-orange-600"
                                                  : "text-gray-600"
                                        }`}
                                    >
                                        {characterCount} / {charLimit}
                                    </span>
                                </div>
                            </div>
                            <Textarea
                                value={copyText}
                                onChange={(e) => setCopyText(e.target.value)}
                                placeholder="Write your post copy..."
                                className={`min-h-[200px] ${charError ? "border-red-500" : ""}`}
                            />
                            {charError && (
                                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" />
                                    Character limit exceeded for {variant.platform}
                                </p>
                            )}
                        </div>

                        {/* Hashtags */}
                        <div>
                            <Label className="mb-2 block flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                Hashtags ({hashtags.length})
                            </Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={newHashtag}
                                    onChange={(e) => setNewHashtag(e.target.value)}
                                    onKeyPress={(e) =>
                                        e.key === "Enter" && addHashtag()
                                    }
                                    placeholder="Add hashtag"
                                    className="flex-1"
                                />
                                <Button onClick={addHashtag} variant="outline" size="sm">
                                    Add
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {hashtags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                                    >
                                        #{tag}
                                        <button
                                            onClick={() => removeHashtag(tag)}
                                            className="hover:text-blue-900"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Media Section */}
                        <div>
                            <Label className="mb-2 block flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Media
                            </Label>
                            <Button
                                onClick={() => setShowMediaLibrary(true)}
                                variant="outline"
                                size="sm"
                                className="w-full mb-3"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Select from Media Library
                            </Button>

                            {mediaUrls.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {mediaUrls.map((url, index) => (
                                        <div
                                            key={index}
                                            className="relative aspect-square rounded border overflow-hidden"
                                        >
                                            <img
                                                src={url}
                                                alt={`Media ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={() =>
                                                    setMediaUrls(
                                                        mediaUrls.filter((_, i) => i !== index)
                                                    )
                                                }
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <Label className="mb-1 block text-sm">
                                    Alt Text (Required for Accessibility)
                                </Label>
                                <Input
                                    value={altText}
                                    onChange={(e) => setAltText(e.target.value)}
                                    placeholder="Describe the image for screen readers..."
                                />
                            </div>
                        </div>

                        {/* Caption (if separate from copy) */}
                        {variant.platform === "instagram" && (
                            <div>
                                <Label className="mb-2 block">
                                    Caption (Separate from Copy)
                                </Label>
                                <Textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Optional caption text..."
                                    rows={3}
                                />
                            </div>
                        )}

                        {/* CTA Configuration */}
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <LinkIcon className="h-4 w-4" />
                                Call-to-Action
                            </h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-sm mb-1 block">CTA Text</Label>
                                        <Input
                                            value={ctaText}
                                            onChange={(e) => setCtaText(e.target.value)}
                                            placeholder="Learn More"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm mb-1 block">CTA Type</Label>
                                        <select
                                            value={ctaType}
                                            onChange={(e) => setCtaType(e.target.value)}
                                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                                        >
                                            <option value="bio_link">Bio Link</option>
                                            <option value="dm_keyword">DM Keyword</option>
                                            <option value="comment_trigger">
                                                Comment Trigger
                                            </option>
                                            <option value="external_url">External URL</option>
                                        </select>
                                    </div>
                                </div>

                                {ctaType === "external_url" && (
                                    <div>
                                        <Label className="text-sm mb-1 block">CTA URL</Label>
                                        <Input
                                            value={ctaUrl}
                                            onChange={(e) => setCtaUrl(e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>
                                )}

                                {ctaType === "dm_keyword" && (
                                    <div>
                                        <Label className="text-sm mb-1 block">
                                            DM Keyword
                                        </Label>
                                        <Input
                                            value={dmKeyword}
                                            onChange={(e) => setDmKeyword(e.target.value)}
                                            placeholder="e.g., REGISTER"
                                        />
                                    </div>
                                )}

                                {ctaType === "comment_trigger" && (
                                    <div>
                                        <Label className="text-sm mb-1 block">
                                            Comment Trigger
                                        </Label>
                                        <Input
                                            value={commentTrigger}
                                            onChange={(e) => setCommentTrigger(e.target.value)}
                                            placeholder="e.g., Type INFO below"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Link Strategy */}
                        <div className="p-4 border rounded-lg bg-blue-50">
                            <h3 className="font-semibold mb-3">Link Tracking</h3>
                            <UTMBuilder
                                baseUrl={primaryUrl}
                                onUrlChange={setPrimaryUrl}
                                defaultCampaign={(variant as any).content_brief?.name || ""}
                            />
                        </div>

                        {/* Approval Workflow */}
                        <div className="p-4 border rounded-lg bg-purple-50">
                            <h3 className="font-semibold mb-3">Approval Workflow</h3>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm mb-1 block">
                                        Approval Status
                                    </Label>
                                    <select
                                        value={approvalStatus}
                                        onChange={(e) => setApprovalStatus(e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                                    >
                                        <option value="pending">Pending Review</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                <div>
                                    <Label className="text-sm mb-1 block">
                                        Approval Notes
                                    </Label>
                                    <Textarea
                                        value={approvalNotes}
                                        onChange={(e) => setApprovalNotes(e.target.value)}
                                        placeholder="Add notes about this variant..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preflight Validation */}
                        <ComplianceValidator
                            variantId={variant.id}
                            embedded={true}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t flex justify-between">
                        <Button onClick={onClose} variant="outline">
                            Cancel
                        </Button>
                        <div className="flex gap-3">
                            <Button
                                onClick={handleSave}
                                disabled={saving || charError}
                                variant="outline"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button
                                onClick={handleSaveAndSchedule}
                                disabled={saving || charError}
                                variant="outline"
                            >
                                <Calendar className="h-4 w-4 mr-2" />
                                Save & Schedule
                            </Button>
                            <Button
                                onClick={handleSaveAndApprove}
                                disabled={saving || charError}
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Save & Approve
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Media Library Modal */}
            {showMediaLibrary && (
                <MediaLibraryModal
                    isOpen={showMediaLibrary}
                    onClose={() => setShowMediaLibrary(false)}
                    onSelectMedia={handleSelectMedia}
                    multiSelect={true}
                    funnelProjectId={funnelProjectId}
                />
            )}

            {/* Preview Modal */}
            {showPreview && (
                <PlatformPreviewModal
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    content={{
                        copy_text: copyText,
                        platform: variant.platform,
                        hashtags,
                        media_urls: mediaUrls,
                        cta_text: ctaText,
                    }}
                />
            )}
        </>
    );
}

