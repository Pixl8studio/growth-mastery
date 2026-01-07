"use client";

/**
 * Node Editor Modal
 * Full-screen modal for editing funnel node content
 * Features:
 * - Collapsible AI chat drawer on left
 * - Editable form fields in center
 * - Blur-based auto-save with user feedback
 * - Industry benchmarks display
 * - Approve button with required field validation
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Cloud,
    Loader2,
    BarChart3,
    BadgeCheck,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/client-logger";
import { useToast } from "@/components/ui/use-toast";
import type {
    FunnelNodeType,
    FunnelNodeDefinition,
    FunnelNodeData,
    PathwayType,
    FunnelBenchmark,
    PaymentOption,
} from "@/types/funnel-map";
import { getBenchmarkForNode, getNodeDefinition } from "@/types/funnel-map";
import { NodeEditorForm } from "./node-editor-form";
import { NodeEditorChatDrawer } from "./node-editor-chat-drawer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

// ============================================
// LAYOUT CONSTANTS
// ============================================
const MODAL_WIDTH_VW = 90;
const MODAL_HEIGHT_VH = 85;
const CHAT_DRAWER_WIDTH_PERCENT = 35;
const COLLAPSED_DRAWER_WIDTH_PX = 48;

// ============================================
// VALIDATION CONSTANTS
// ============================================
/**
 * Minimum valid price for offers.
 * Business rule: $0 offers are considered empty/invalid.
 * Offers must have a positive price to be approved.
 */
const MIN_VALID_PRICE = 0.01;

// ============================================
// NODE TYPE CONSTANTS
// ============================================
// Optional nodes (upsells) - not required but recommended
const OPTIONAL_NODE_TYPES: FunnelNodeType[] = ["upsell_1", "upsell_2"];

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validates a payment option has all required fields properly filled.
 * Returns true if the option is valid, false otherwise.
 */
function isValidPaymentOption(option: PaymentOption): boolean {
    // Must have a non-empty description
    if (!option.description || !option.description.trim()) {
        return false;
    }
    // Must have a positive amount
    if (!option.amount || option.amount < MIN_VALID_PRICE) {
        return false;
    }
    // For fixed_payments, must have valid numberOfPayments
    if (option.paymentType === "fixed_payments") {
        if (!option.numberOfPayments || option.numberOfPayments < 1) {
            return false;
        }
    }
    return true;
}

/**
 * Validates payment_options field content.
 * Handles both array format (correct) and object format (edge case).
 * Returns true if the content is empty/invalid, false if it has valid options.
 */
function isPaymentOptionsEmpty(value: unknown): boolean {
    // Handle array format (expected format)
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return true;
        }
        // Check if at least one option is complete and valid
        const hasValidOption = value.some((opt) =>
            isValidPaymentOption(opt as PaymentOption)
        );
        return !hasValidOption;
    }
    // Handle object format (edge case - shouldn't normally happen)
    if (typeof value === "object" && value !== null) {
        const keys = Object.keys(value);
        if (keys.length === 0) {
            return true;
        }
        // If it's an object, check if it has valid payment option structure
        // This handles cases where payment_options might be stored as { id: option } map
        const hasValidOption = Object.values(value).some((opt) =>
            typeof opt === "object" && opt !== null && isValidPaymentOption(opt as PaymentOption)
        );
        return !hasValidOption;
    }
    // Any other format is considered empty
    return true;
}

interface NodeEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodeType: FunnelNodeType;
    nodeData: FunnelNodeData | null;
    pathwayType: PathwayType;
    projectId: string;
    businessContext: Record<string, unknown>;
    onContentUpdate: (content: Record<string, unknown>) => Promise<void>;
    onApprove?: (content: Record<string, unknown>) => Promise<void>;
}

// Node-specific subheadlines that guide users on what this step is about
const NODE_SUBHEADLINES: Record<FunnelNodeType, string> = {
    traffic_source: "We'll configure this at a later step.",
    registration:
        "This is where visitors sign up for your masterclass. Create compelling copy that makes them want to learn more. Ask the AI to help you craft headlines and bullet points that convert.",
    registration_confirmation:
        "Confirm their registration and build excitement for the upcoming event. Use this to set expectations and encourage calendar saves.",
    masterclass:
        "The strategic heart of your funnel. Define your presentation content, key teaching points, and the journey from education to offer. The AI can help you structure your content for maximum impact.",
    core_offer:
        "Present your offer using the Irresistible Offer Framework. Define the transformation you provide, who it's for, and why they should act now. Let the AI help you craft compelling copy.",
    checkout:
        "The final step before purchase. Reinforce value, address objections, and make the buying decision easy. The order bump section lets you add a quick win offer.",
    order_bump:
        "A quick-win add-on at checkout. Keep it simple, valuable, and priced as an impulse buy.",
    upsells: "Post-purchase offers to increase order value.",
    upsell_1:
        "Your primary upsell immediately after purchase. Offer something that enhances their results. The AI can help you position it effectively.",
    upsell_2:
        "A secondary offer or downsell. Consider offering a lighter version if they declined the first upsell.",
    call_booking:
        "For high-ticket offers, this is where prospects book a call with you. Make the process simple and set clear expectations.",
    call_booking_confirmation:
        "Confirm their booking and prepare them for the call. Include preparation steps and what to expect.",
    sales_call:
        "Your call script and objection handlers. The AI can help you prepare for common questions and closing techniques.",
    thank_you:
        "Celebrate their purchase and guide next steps. This is the start of your customer relationship.",
};

function BenchmarkDisplay({ benchmark }: { benchmark: FunnelBenchmark }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-slate-600" />
                <h4 className="font-medium text-sm text-slate-700">
                    Industry Benchmarks
                </h4>
            </div>
            <p className="text-xs text-slate-600 mb-3">
                {benchmark.metric_description}
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-md bg-white p-2 border border-slate-200">
                    <div className="text-xs text-slate-500">Low</div>
                    <div className="font-semibold text-slate-700">
                        {benchmark.conversion_rate_low}%
                    </div>
                </div>
                <div className="rounded-md bg-blue-50 p-2 border border-blue-200">
                    <div className="text-xs text-blue-600">Typical</div>
                    <div className="font-semibold text-blue-700">
                        {benchmark.conversion_rate_median}%
                    </div>
                </div>
                <div className="rounded-md bg-green-50 p-2 border border-green-200">
                    <div className="text-xs text-green-600">High</div>
                    <div className="font-semibold text-green-700">
                        {benchmark.conversion_rate_high}%
                    </div>
                </div>
                <div className="rounded-md bg-purple-50 p-2 border border-purple-200">
                    <div className="text-xs text-purple-600">Elite</div>
                    <div className="font-semibold text-purple-700">
                        {benchmark.conversion_rate_elite}%
                    </div>
                </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Source: {benchmark.source}</p>
        </div>
    );
}

export function NodeEditorModal({
    isOpen,
    onClose,
    nodeType,
    nodeData,
    pathwayType,
    projectId,
    businessContext,
    onContentUpdate,
    onApprove,
}: NodeEditorModalProps) {
    const { toast } = useToast();
    const [isChatExpanded, setIsChatExpanded] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showValidation, setShowValidation] = useState(false);
    // Local content state for immediate UI updates
    const [localContent, setLocalContent] = useState<Record<string, unknown>>({});
    const pendingContentRef = useRef<Record<string, unknown> | null>(null);

    // Get node definition - null check happens after all hooks
    const nodeDefinition = getNodeDefinition(nodeType);
    const benchmark = getBenchmarkForNode(nodeType, pathwayType);
    const subheadline = nodeDefinition
        ? NODE_SUBHEADLINES[nodeType] || nodeDefinition.description || ""
        : "";

    const isApproved = nodeData?.is_approved ?? false;
    const isOptionalNode = OPTIONAL_NODE_TYPES.includes(nodeType);

    // Initialize local content from nodeData
    useEffect(() => {
        const initialContent =
            nodeData?.refined_content &&
            Object.keys(nodeData.refined_content).length > 0
                ? nodeData.refined_content
                : nodeData?.draft_content || {};
        setLocalContent(initialContent);
        setShowValidation(false);
        setSaveError(false);
    }, [nodeData, nodeType]);

    // Get current content - local state takes priority for immediate UI updates
    // Fix issue #6: Only depend on specific nodeData fields, not entire object
    const currentContent = useMemo(() => {
        return Object.keys(localContent).length > 0
            ? localContent
            : nodeData?.refined_content &&
                Object.keys(nodeData.refined_content).length > 0
              ? nodeData.refined_content
              : nodeData?.draft_content || {};
    }, [localContent, nodeData?.refined_content, nodeData?.draft_content]);

    // Check if all required fields are filled
    const requiredFieldsStatus = useMemo(() => {
        if (!nodeDefinition) return { allFilled: false, emptyFields: [] as string[] };
        const emptyFields: string[] = [];
        for (const field of nodeDefinition.fields) {
            if (field.required) {
                const value = currentContent[field.key];
                let isEmpty = false;

                if (value === null || value === undefined) {
                    isEmpty = true;
                } else if (typeof value === "string") {
                    isEmpty = !value.trim();
                } else if (field.type === "payment_options") {
                    // For payment_options: validate structure and required fields
                    isEmpty = isPaymentOptionsEmpty(value);
                } else if (Array.isArray(value)) {
                    // For list fields: must have at least one item
                    isEmpty = value.length === 0;
                } else if (field.type === "pricing" && typeof value === "object") {
                    // For pricing fields: check if the price meets minimum threshold
                    const priceObj = value as Record<string, number>;
                    const priceValue = priceObj.webinar ?? priceObj.regular ?? 0;
                    isEmpty = !priceValue || priceValue < MIN_VALID_PRICE;
                }

                if (isEmpty) {
                    emptyFields.push(field.key);
                }
            }
        }
        return { allFilled: emptyFields.length === 0, emptyFields };
    }, [nodeDefinition, currentContent]);

    const canApprove = !isApproved && requiredFieldsStatus.allFilled;

    // Handle content change - update local state immediately, save on blur
    const handleContentChange = useCallback((newContent: Record<string, unknown>) => {
        // Update local state immediately for responsive UI
        setLocalContent(newContent);
        // Store pending content for blur-based save
        pendingContentRef.current = newContent;
        // Clear any previous save error when user makes changes
        setSaveError(false);
    }, []);

    // Save content to database (called on blur)
    // Fix issue #3: Show toast on save failures
    const saveContent = useCallback(async () => {
        const contentToSave = pendingContentRef.current;
        if (!contentToSave) return;

        setIsSaving(true);
        setSaveError(false);
        try {
            await onContentUpdate(contentToSave);
            setLastSaved(new Date());
            pendingContentRef.current = null;
        } catch (error) {
            logger.error({ error, nodeType }, "Auto-save failed");
            setSaveError(true);
            setLastSaved(null);
            toast({
                variant: "destructive",
                title: "Auto-save Failed",
                description: "Your changes weren't saved. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    }, [onContentUpdate, toast, nodeType]);

    // Handle blur event - trigger save
    const handleFieldBlur = useCallback(() => {
        if (pendingContentRef.current) {
            saveContent();
        }
    }, [saveContent]);

    // Handle approve button click
    const handleApprove = useCallback(async () => {
        if (!canApprove || !onApprove) {
            // Show validation indicators if trying to approve with empty required fields
            setShowValidation(true);
            return;
        }

        setIsApproving(true);
        try {
            // Save any pending content first
            if (pendingContentRef.current) {
                await onContentUpdate(pendingContentRef.current);
                pendingContentRef.current = null;
            }
            // Then approve
            await onApprove(currentContent);
            onClose();
        } catch (error) {
            logger.error({ error, nodeType }, "Failed to approve");
            toast({
                variant: "destructive",
                title: "Approval Failed",
                description: "Could not approve this step. Please try again.",
            });
        } finally {
            setIsApproving(false);
        }
    }, [
        canApprove,
        onApprove,
        currentContent,
        onContentUpdate,
        onClose,
        toast,
        nodeType,
    ]);

    // Save any pending content before closing
    const handleClose = useCallback(() => {
        if (pendingContentRef.current) {
            saveContent();
        }
        onClose();
    }, [saveContent, onClose]);

    // Null check for nodeDefinition - after all hooks are called (React rules of hooks)
    if (!nodeDefinition) {
        logger.warn({ nodeType }, "Node definition not found");
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            {/* Modal size: 90vw x 85vh (see LAYOUT_CONSTANTS) */}
            <DialogContent
                className="max-w-[90vw] w-[90vw] h-[85vh] p-0 gap-0 flex flex-col"
                onInteractOutside={(e) => e.preventDefault()}
            >
                {/* Header */}
                <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-semibold">
                                {nodeDefinition.title}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                                {subheadline}
                            </p>
                        </div>

                        {/* Approve button, Auto-save indicator */}
                        <div className="flex items-center gap-4 mr-8">
                            {/* Approve button - show for non-approved nodes with onApprove handler */}
                            {onApprove && !isApproved && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span>
                                                <Button
                                                    onClick={handleApprove}
                                                    disabled={
                                                        !canApprove || isApproving
                                                    }
                                                    className={cn(
                                                        "gap-2",
                                                        canApprove
                                                            ? "bg-green-600 hover:bg-green-700 text-white"
                                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                                    )}
                                                    size="sm"
                                                >
                                                    {isApproving ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <BadgeCheck className="h-4 w-4" />
                                                    )}
                                                    {isApproving
                                                        ? "Approving..."
                                                        : "Approve"}
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {isApproved
                                                ? "This step is already approved"
                                                : canApprove
                                                  ? "Approve this step content"
                                                  : isOptionalNode
                                                    ? "Fill required fields to approve. Upsells are optional but recommended for maximum revenue."
                                                    : "Fill all required fields to approve"}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}

                            {/* Already approved indicator */}
                            {isApproved && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                    <BadgeCheck className="h-4 w-4" />
                                    <span>Approved</span>
                                </div>
                            )}

                            {/* Auto-save indicator */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    <span>Saving...</span>
                                                </>
                                            ) : saveError ? (
                                                <>
                                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                                    <span className="text-red-600">
                                                        Save failed
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Cloud className="h-3 w-3 text-green-500" />
                                                    <span className="text-green-600">
                                                        Saved
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {saveError
                                            ? "Changes weren't saved. Click on a field and try again."
                                            : lastSaved
                                              ? `Last saved ${lastSaved.toLocaleTimeString()}`
                                              : "Changes are saved when you leave a field"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </DialogHeader>

                {/* Main content area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Chat drawer - LEFT side */}
                    <div
                        className={cn(
                            "flex-shrink-0 border-r border-border transition-all duration-300 ease-in-out overflow-hidden",
                            isChatExpanded ? "w-[35%]" : "w-12"
                        )}
                    >
                        {isChatExpanded ? (
                            <div className="h-full flex flex-col">
                                {/* Chat header with collapse button */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-primary" />
                                        <span className="font-medium text-sm">
                                            AI Assistant
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setIsChatExpanded(false)}
                                        className="rounded-md p-1 hover:bg-muted transition-colors"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Chat content */}
                                <div className="flex-1 overflow-hidden">
                                    <NodeEditorChatDrawer
                                        nodeType={nodeType}
                                        nodeDefinition={nodeDefinition}
                                        projectId={projectId}
                                        currentContent={currentContent}
                                        businessContext={businessContext}
                                        onSuggestedChanges={handleContentChange}
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Collapsed state - vertical tab */
                            <button
                                onClick={() => setIsChatExpanded(true)}
                                className="h-full w-full flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                            >
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col items-center gap-1">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    <span className="text-xs text-muted-foreground [writing-mode:vertical-lr] rotate-180">
                                        AI Assistant
                                    </span>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Form fields - CENTER */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-6 max-w-3xl mx-auto">
                            {/* Benchmark display */}
                            {benchmark && (
                                <div className="mb-6">
                                    <BenchmarkDisplay benchmark={benchmark} />
                                </div>
                            )}

                            {/* Form fields */}
                            <NodeEditorForm
                                nodeDefinition={nodeDefinition}
                                content={currentContent}
                                onChange={handleContentChange}
                                onBlur={handleFieldBlur}
                                showValidation={showValidation}
                                emptyRequiredFields={requiredFieldsStatus.emptyFields}
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
