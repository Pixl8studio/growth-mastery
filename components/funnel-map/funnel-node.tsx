"use client";

/**
 * Custom Funnel Node Component
 * Renders individual nodes in the funnel flowchart
 *
 * Enhanced with Issue #407 features:
 * - Explicit approval workflow
 * - Industry benchmarks display
 * - Draft regeneration
 * - New node type icons
 */

import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import {
    Globe,
    UserPlus,
    Play,
    Gift,
    CreditCard,
    TrendingUp,
    Calendar,
    Phone,
    Heart,
    Check,
    Loader2,
    Sparkles,
    CheckCircle,
    CalendarCheck,
    Plus,
    ArrowUp,
    RefreshCw,
    BadgeCheck,
    BarChart3,
} from "lucide-react";
import type {
    FunnelNodeDefinition,
    FunnelNodeData,
    NodeStatus,
    FunnelBenchmark,
    PathwayType,
} from "@/types/funnel-map";
import { getBenchmarkForNode } from "@/types/funnel-map";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Icon mapping - extended with new icons for Issue #407
const ICONS: Record<string, React.ElementType> = {
    Globe,
    UserPlus,
    Play,
    Gift,
    CreditCard,
    TrendingUp,
    Calendar,
    Phone,
    Heart,
    CheckCircle,
    CalendarCheck,
    Plus,
    ArrowUp,
};

export interface FunnelNodeDataProps {
    definition: FunnelNodeDefinition;
    nodeData?: FunnelNodeData;
    isSelected: boolean;
    colors: {
        bg: string;
        border: string;
        text: string;
    };
    status: NodeStatus;
    isGenerating: boolean;
    onSelect: () => void;
    onApprove?: () => void;
    onRegenerate?: () => void;
    pathwayType: PathwayType;
    showBenchmarks?: boolean;
}

interface FunnelNodeComponentProps {
    data: FunnelNodeDataProps;
}

function BenchmarkIndicator({
    benchmark,
    className,
}: {
    benchmark: FunnelBenchmark;
    className?: string;
}) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 cursor-help",
                            className
                        )}
                    >
                        <BarChart3 className="h-3 w-3" />
                        <span>{benchmark.conversion_rate_median}%</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-2">
                        <p className="font-medium">{benchmark.metric_description}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <span className="text-muted-foreground">Low:</span>
                            <span>{benchmark.conversion_rate_low}%</span>
                            <span className="text-muted-foreground">Typical:</span>
                            <span className="font-medium text-blue-600">
                                {benchmark.conversion_rate_median}%
                            </span>
                            <span className="text-muted-foreground">High:</span>
                            <span className="text-green-600">
                                {benchmark.conversion_rate_high}%
                            </span>
                            <span className="text-muted-foreground">Elite:</span>
                            <span className="text-purple-600">
                                {benchmark.conversion_rate_elite}%
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Source: {benchmark.source}
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function FunnelNodeComponent({ data }: FunnelNodeComponentProps) {
    const {
        definition,
        nodeData,
        isSelected,
        colors,
        status,
        isGenerating,
        onSelect,
        onApprove,
        onRegenerate,
        pathwayType,
        showBenchmarks = false, // Default to false - benchmarks now shown in modal only
    } = data;
    const Icon = ICONS[definition.icon] || Globe;
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Check if this is a non-clickable node (like Traffic Source)
    const isNonClickable = definition.isNonClickable ?? false;

    const isApproved = nodeData?.is_approved ?? false;
    const benchmark = showBenchmarks
        ? getBenchmarkForNode(definition.id, pathwayType)
        : undefined;

    const handleRegenerate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onRegenerate && !isRegenerating) {
            setIsRegenerating(true);
            try {
                await onRegenerate();
            } finally {
                setIsRegenerating(false);
            }
        }
    };

    // Status badge - only show generating state (approved shown via checkmark indicator)
    const getStatusBadge = () => {
        if (isGenerating || isRegenerating) {
            return (
                <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {isRegenerating ? "Regenerating..." : "Generating..."}
                </span>
            );
        }
        // No status badges - approval state shown via checkmark indicator in top-right
        return null;
    };

    return (
        <>
            <Handle
                type="target"
                position={Position.Top}
                className="!h-2 !w-2 !border-2 !border-slate-300 !bg-white"
            />

            <div
                onClick={isNonClickable ? undefined : onSelect}
                className={cn(
                    "group relative rounded-xl border-2 p-4 shadow-sm transition-all duration-200",
                    // Only show pointer cursor and hover effects for clickable nodes
                    !isNonClickable &&
                        "cursor-pointer hover:shadow-lg hover:-translate-y-0.5",
                    isNonClickable && "cursor-default opacity-80",
                    colors.bg,
                    isSelected && !isNonClickable
                        ? "ring-2 ring-primary ring-offset-2 border-primary"
                        : colors.border,
                    (isGenerating || isRegenerating) && "animate-pulse",
                    isApproved && "ring-2 ring-green-500/30"
                )}
                style={{ width: 280 }}
            >
                {/* Header */}
                <div className="flex items-start gap-3">
                    <div
                        className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                            colors.bg,
                            colors.text
                        )}
                        style={{
                            backgroundColor: isSelected
                                ? "hsl(var(--primary) / 0.1)"
                                : undefined,
                        }}
                    >
                        <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3
                                className={cn(
                                    "font-semibold leading-tight",
                                    isSelected ? "text-primary" : "text-foreground"
                                )}
                            >
                                {definition.title}
                            </h3>
                            {/* Benchmark indicator next to title */}
                            {benchmark && <BenchmarkIndicator benchmark={benchmark} />}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {definition.description}
                        </p>
                    </div>
                </div>

                {/* Status - only shows generating state */}
                {getStatusBadge() && <div className="mt-3">{getStatusBadge()}</div>}

                {/* Framework badge */}
                {definition.framework && (
                    <div className="mt-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            <Sparkles className="h-3 w-3" />
                            {definition.framework}
                        </span>
                    </div>
                )}

                {/* Regenerate button (not shown for non-clickable nodes) */}
                {!isNonClickable &&
                    !isGenerating &&
                    !isRegenerating &&
                    onRegenerate &&
                    nodeData && (
                        <div className="mt-3 border-t border-slate-200 pt-3">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={handleRegenerate}
                                            className={cn(
                                                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                                                "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            )}
                                        >
                                            <RefreshCw className="h-3 w-3" />
                                            Regenerate
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Generate new AI draft for this node</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}

                {/* Selection indicator */}
                {isSelected && !isApproved && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                        <Check className="h-3 w-3" />
                    </div>
                )}

                {/* Approved indicator */}
                {isApproved && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                        <BadgeCheck className="h-3 w-3" />
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!h-2 !w-2 !border-2 !border-slate-300 !bg-white"
            />
        </>
    );
}

export const FunnelNode = memo(FunnelNodeComponent);
