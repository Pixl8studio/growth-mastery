"use client";

/**
 * Node Editor Modal
 * Full-screen (80% viewport) modal for editing funnel node content
 * Features:
 * - Collapsible AI chat drawer on left (35% width)
 * - Editable form fields in center
 * - Auto-save with indicator
 * - Industry benchmarks display
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
    X,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Cloud,
    Loader2,
    BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
    FunnelNodeType,
    FunnelNodeDefinition,
    FunnelNodeData,
    PathwayType,
    FunnelBenchmark,
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

interface NodeEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodeType: FunnelNodeType;
    nodeData: FunnelNodeData | null;
    pathwayType: PathwayType;
    projectId: string;
    businessContext: Record<string, unknown>;
    onContentUpdate: (content: Record<string, unknown>) => Promise<void>;
}

// Node-specific subheadlines that guide users on what this step is about
const NODE_SUBHEADLINES: Record<FunnelNodeType, string> = {
    traffic_source:
        "Where your ideal customers come from. We'll work on this later in the funnel building process.",
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
}: NodeEditorModalProps) {
    const [isChatExpanded, setIsChatExpanded] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const nodeDefinition = getNodeDefinition(nodeType);
    const benchmark = getBenchmarkForNode(nodeType, pathwayType);
    const subheadline =
        NODE_SUBHEADLINES[nodeType] || nodeDefinition?.description || "";

    // Get current content (prefer refined, fallback to draft)
    const currentContent =
        nodeData?.refined_content && Object.keys(nodeData.refined_content).length > 0
            ? nodeData.refined_content
            : nodeData?.draft_content || {};

    // Auto-save handler with debounce
    const handleContentChange = useCallback(
        async (newContent: Record<string, unknown>) => {
            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set saving indicator after small delay (avoid flicker)
            const savingTimeout = setTimeout(() => setIsSaving(true), 500);

            // Debounce the actual save
            saveTimeoutRef.current = setTimeout(async () => {
                try {
                    await onContentUpdate(newContent);
                    setLastSaved(new Date());
                } catch (error) {
                    console.error("Failed to save content:", error);
                } finally {
                    clearTimeout(savingTimeout);
                    setIsSaving(false);
                }
            }, 1000);
        },
        [onContentUpdate]
    );

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    if (!nodeDefinition) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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

                        {/* Auto-save indicator */}
                        <div className="flex items-center gap-4">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    <span>Saving...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Cloud className="h-3 w-3 text-green-500" />
                                                    <span className="text-green-600">
                                                        Autosave On
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {lastSaved
                                            ? `Last saved ${lastSaved.toLocaleTimeString()}`
                                            : "Changes are saved automatically"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <button
                                onClick={onClose}
                                className="rounded-md p-1.5 hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
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
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
