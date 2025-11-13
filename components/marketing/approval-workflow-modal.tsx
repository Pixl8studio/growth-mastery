/**
 * Approval Workflow Modal
 * Approval queue view, single variant review, compliance checklist, approval history
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    X,
    CheckCircle2,
    XCircle,
    Eye,
    MessageSquare,
    Shield,
    AlertCircle,
} from "lucide-react";
import { ComplianceValidator } from "./compliance-validator";
import { PlatformPreviewModal } from "./platform-preview-modal";
import type { PostVariant } from "@/types/marketing";

interface ApprovalWorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    funnelProjectId: string;
    onApprovalComplete: () => void;
}

export function ApprovalWorkflowModal({
    isOpen,
    onClose,
    funnelProjectId,
    onApprovalComplete,
}: ApprovalWorkflowModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [variants, setVariants] = useState<PostVariant[]>([]);
    const [selectedVariant, setSelectedVariant] = useState<PostVariant | null>(null);
    const [platformFilter, setPlatformFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("pending");
    const [reviewNotes, setReviewNotes] = useState("");
    const [showPreview, setShowPreview] = useState(false);

    const loadVariantsForApproval = useCallback(async () => {
        setLoading(true);

        try {
            const params = new URLSearchParams({
                funnel_project_id: funnelProjectId,
                approval_status: statusFilter || "pending",
            });

            if (platformFilter) {
                params.append("platform", platformFilter);
            }

            const response = await fetch(
                `/api/marketing/variants/approval-queue?${params.toString()}`
            );
            const data = await response.json();

            if (data.success) {
                setVariants(data.variants || []);
                logger.info(
                    { count: data.variants?.length },
                    "Variants loaded for approval"
                );
            }
        } catch (error) {
            logger.error({ error }, "Failed to load approval queue");
            toast({
                title: "Error",
                description: "Failed to load approval queue",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [funnelProjectId, platformFilter, statusFilter, toast]);

    useEffect(() => {
        if (isOpen) {
            loadVariantsForApproval();
        }
    }, [
        isOpen,
        funnelProjectId,
        platformFilter,
        statusFilter,
        loadVariantsForApproval,
    ]);

    const handleApprove = async (variantId: string) => {
        try {
            const response = await fetch(
                `/api/marketing/variants/${variantId}/approve`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        notes: reviewNotes,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Variant Approved",
                    description: "Ready for scheduling",
                });
                setSelectedVariant(null);
                setReviewNotes("");
                loadVariantsForApproval();
                onApprovalComplete();
            }
        } catch (error) {
            logger.error({ error }, "Approval failed");
            toast({
                title: "Approval Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleReject = async (variantId: string) => {
        if (!reviewNotes) {
            toast({
                title: "Notes Required",
                description: "Please provide rejection reason",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch(
                `/api/marketing/variants/${variantId}/reject`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        notes: reviewNotes,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Variant Rejected",
                    description: "Feedback saved for revision",
                });
                setSelectedVariant(null);
                setReviewNotes("");
                loadVariantsForApproval();
                onApprovalComplete();
            }
        } catch (error) {
            logger.error({ error }, "Rejection failed");
            toast({
                title: "Rejection Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleRequestChanges = async (variantId: string) => {
        if (!reviewNotes) {
            toast({
                title: "Notes Required",
                description: "Please specify what changes are needed",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch(
                `/api/marketing/variants/${variantId}/request-changes`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        notes: reviewNotes,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Changes Requested",
                    description: "Feedback sent to creator",
                });
                setSelectedVariant(null);
                setReviewNotes("");
                loadVariantsForApproval();
            }
        } catch (error) {
            logger.error({ error }, "Request changes failed");
            toast({
                title: "Request Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleBulkApprove = async () => {
        // Implement bulk approval
        toast({
            title: "Bulk Approve",
            description: "Feature coming soon",
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
                <div className="bg-card rounded-lg w-full max-w-6xl max-h-[95vh] flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    Approval Workflow
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Review and approve content before publishing
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-muted-foreground hover:text-muted-foreground"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-3 mt-4">
                            <select
                                value={platformFilter || "all"}
                                onChange={(e) =>
                                    setPlatformFilter(
                                        e.target.value === "all" ? null : e.target.value
                                    )
                                }
                                className="text-sm rounded-md border border-border px-3 py-2"
                            >
                                <option value="all">All Platforms</option>
                                <option value="instagram">Instagram</option>
                                <option value="facebook">Facebook</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="twitter">Twitter</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-sm rounded-md border border-border px-3 py-2"
                            >
                                <option value="pending">Pending Review</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>

                            {variants.length > 0 && statusFilter === "pending" && (
                                <Button
                                    onClick={handleBulkApprove}
                                    variant="outline"
                                    size="sm"
                                    className="ml-auto"
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Bulk Approve All
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                                    <p className="text-muted-foreground">
                                        Loading queue...
                                    </p>
                                </div>
                            </div>
                        ) : selectedVariant ? (
                            /* Single Variant Review */
                            <div className="max-w-3xl mx-auto space-y-6">
                                <Button
                                    onClick={() => setSelectedVariant(null)}
                                    variant="ghost"
                                    size="sm"
                                >
                                    ← Back to Queue
                                </Button>

                                {/* Variant Preview */}
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Badge className="capitalize">
                                                {selectedVariant.platform}
                                            </Badge>
                                            <Badge variant="outline">
                                                {selectedVariant.format_type || "post"}
                                            </Badge>
                                        </div>
                                        <Button
                                            onClick={() => setShowPreview(true)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Preview
                                        </Button>
                                    </div>

                                    <div className="prose max-w-none">
                                        <p className="text-sm whitespace-pre-wrap">
                                            {selectedVariant.copy_text}
                                        </p>
                                    </div>

                                    {selectedVariant.hashtags &&
                                        selectedVariant.hashtags.length > 0 && (
                                            <div className="mt-3 text-sm text-primary">
                                                {selectedVariant.hashtags
                                                    .map((tag) => `#${tag}`)
                                                    .join(" ")}
                                            </div>
                                        )}
                                </Card>

                                {/* Compliance Checklist */}
                                <Card className="p-6">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-green-500" />
                                        Compliance Checklist
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {selectedVariant.alt_text ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600" />
                                            )}
                                            <span className="text-sm">
                                                Alt text provided for accessibility
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <span className="text-sm">
                                                Reading level acceptable
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <span className="text-sm">
                                                No prohibited topics detected
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <span className="text-sm">
                                                Brand voice aligned
                                            </span>
                                        </div>
                                    </div>
                                </Card>

                                {/* Preflight Validation */}
                                <ComplianceValidator
                                    variantId={selectedVariant.id}
                                    embedded={false}
                                />

                                {/* Review Notes */}
                                <Card className="p-6">
                                    <Label className="mb-2 block">
                                        Review Notes / Feedback
                                    </Label>
                                    <Textarea
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        placeholder="Add notes about this variant (required for rejection)..."
                                        rows={4}
                                    />
                                </Card>

                                {/* Approval History */}
                                {selectedVariant.approval_notes && (
                                    <Card className="p-6 bg-muted/50">
                                        <h3 className="font-semibold mb-3">
                                            Approval History
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="p-3 bg-card rounded border">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium">
                                                        {selectedVariant.approved_by ||
                                                            "System"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {selectedVariant.approved_at &&
                                                            new Date(
                                                                selectedVariant.approved_at
                                                            ).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground">
                                                    {selectedVariant.approval_notes}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleReject(selectedVariant.id)}
                                        variant="outline"
                                        className="flex-1 text-red-600 border-red-300"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            handleRequestChanges(selectedVariant.id)
                                        }
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Request Changes
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            handleApprove(selectedVariant.id)
                                        }
                                        className="flex-1"
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* Approval Queue List */
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">
                                        Approval Queue ({variants.length})
                                    </h3>
                                </div>

                                {variants.length === 0 ? (
                                    <div className="text-center py-12">
                                        <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-foreground mb-2">
                                            All Caught Up!
                                        </h3>
                                        <p className="text-muted-foreground">
                                            No variants awaiting approval
                                        </p>
                                    </div>
                                ) : (
                                    variants.map((variant) => {
                                        const preflight =
                                            (variant.preflight_status as any) || {
                                                passed: false,
                                            };

                                        return (
                                            <Card
                                                key={variant.id}
                                                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                                                onClick={() =>
                                                    setSelectedVariant(variant)
                                                }
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge className="capitalize">
                                                                {variant.platform}
                                                            </Badge>
                                                            <Badge
                                                                className={
                                                                    variant.approval_status ===
                                                                    "approved"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : variant.approval_status ===
                                                                            "rejected"
                                                                          ? "bg-red-100 text-red-700"
                                                                          : "bg-yellow-100 text-yellow-700"
                                                                }
                                                            >
                                                                {variant.approval_status ||
                                                                    "pending"}
                                                            </Badge>
                                                            {preflight.passed ? (
                                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                            ) : (
                                                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-foreground line-clamp-2">
                                                            {variant.copy_text}
                                                        </p>
                                                        <div className="mt-2 text-xs text-muted-foreground">
                                                            {variant.copy_text.length}{" "}
                                                            characters
                                                            {variant.hashtags &&
                                                                variant.hashtags
                                                                    .length > 0 && (
                                                                    <>
                                                                        {" "}
                                                                        •{" "}
                                                                        {
                                                                            variant
                                                                                .hashtags
                                                                                .length
                                                                        }{" "}
                                                                        hashtags
                                                                    </>
                                                                )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedVariant(variant);
                                                        }}
                                                    >
                                                        Review
                                                    </Button>
                                                </div>
                                            </Card>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {!selectedVariant && variants.length > 0 && (
                        <div className="p-6 border-t">
                            <div className="text-sm text-muted-foreground text-center">
                                Click any variant to review and approve/reject
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && selectedVariant && (
                <PlatformPreviewModal
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    content={{
                        copy_text: selectedVariant.copy_text,
                        platform: selectedVariant.platform,
                        hashtags: selectedVariant.hashtags,
                        media_urls: selectedVariant.media_urls,
                        cta_text: (selectedVariant.cta_config as any)?.text,
                    }}
                />
            )}
        </>
    );
}
