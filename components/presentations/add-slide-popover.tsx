/**
 * AddSlidePopover Component
 * Popover menu for adding new slides with three options:
 * - Generate with AI (opens dialog for prompt input)
 * - Duplicate Current Slide
 * - Blank Slide (with layout picker)
 *
 * Related: GitHub Issue #327 - Enhanced Presentation Generator
 */

"use client";

import { useState, useCallback } from "react";
import {
    Plus,
    Sparkles,
    Copy,
    FileText,
    LayoutTemplate,
    Type,
    Quote,
    BarChart3,
    ArrowLeftRight,
    ListOrdered,
    Megaphone,
    PanelLeft,
    PanelRight,
    List,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/client-logger";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { SlideLayoutType } from "./slide-types";

// Layout configuration for the layout picker
const LAYOUT_CONFIG: {
    type: SlideLayoutType;
    label: string;
    description: string;
    icon: typeof Type;
}[] = [
    {
        type: "title",
        label: "Title",
        description: "Big title slide",
        icon: Type,
    },
    {
        type: "section",
        label: "Section",
        description: "Section header",
        icon: LayoutTemplate,
    },
    {
        type: "content_left",
        label: "Content Left",
        description: "Content on left",
        icon: PanelLeft,
    },
    {
        type: "content_right",
        label: "Content Right",
        description: "Content on right",
        icon: PanelRight,
    },
    {
        type: "bullets",
        label: "Bullets",
        description: "Bullet points",
        icon: List,
    },
    {
        type: "quote",
        label: "Quote",
        description: "Testimonial",
        icon: Quote,
    },
    {
        type: "statistics",
        label: "Statistics",
        description: "Data & metrics",
        icon: BarChart3,
    },
    {
        type: "comparison",
        label: "Comparison",
        description: "Before/after",
        icon: ArrowLeftRight,
    },
    {
        type: "process",
        label: "Process",
        description: "Step-by-step",
        icon: ListOrdered,
    },
    {
        type: "cta",
        label: "Call to Action",
        description: "Action slide",
        icon: Megaphone,
    },
];

interface AddSlidePopoverProps {
    /** Called when duplicating the current slide */
    onDuplicateCurrent: () => void;
    /** Called when adding a blank slide with a specific layout */
    onAddBlankSlide: (layoutType: SlideLayoutType) => void;
    /** Called when generating a slide with AI */
    onGenerateWithAI: (prompt: string, layoutType?: SlideLayoutType) => Promise<void>;
    /** Whether generation is currently in progress */
    isGenerating?: boolean;
    /** Additional class names */
    className?: string;
}

export function AddSlidePopover({
    onDuplicateCurrent,
    onAddBlankSlide,
    onGenerateWithAI,
    isGenerating = false,
    className,
}: AddSlidePopoverProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [selectedLayout, setSelectedLayout] = useState<SlideLayoutType | "auto">(
        "auto"
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAIGenerate = useCallback(async () => {
        if (!aiPrompt.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onGenerateWithAI(
                aiPrompt.trim(),
                selectedLayout === "auto" ? undefined : selectedLayout
            );
            setIsDialogOpen(false);
            setAiPrompt("");
            setSelectedLayout("auto");
        } catch (error) {
            logger.error(
                { error, aiPrompt, selectedLayout },
                "AI slide generation failed in popover"
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [aiPrompt, selectedLayout, onGenerateWithAI]); // isSubmitting not needed - checked inside

    const handleBlankSlideClick = useCallback(
        (layoutType: SlideLayoutType) => {
            logger.info({ layoutType }, "Blank slide added via popover");
            onAddBlankSlide(layoutType);
        },
        [onAddBlankSlide]
    );

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className={cn(
                            "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                            isGenerating && "pointer-events-none opacity-50",
                            className
                        )}
                        disabled={isGenerating}
                        aria-label="Add new slide to presentation"
                    >
                        <Plus className="h-4 w-4" />
                        Add Slide
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                    {/* Generate with AI */}
                    <DropdownMenuItem
                        className="flex cursor-pointer items-center gap-2"
                        onSelect={() => setIsDialogOpen(true)}
                    >
                        <Sparkles className="h-4 w-4 text-primary" />
                        <div className="flex flex-col">
                            <span className="font-medium">Generate with AI</span>
                            <span className="text-xs text-muted-foreground">
                                Describe what you need
                            </span>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Duplicate Current */}
                    <DropdownMenuItem
                        className="flex cursor-pointer items-center gap-2"
                        onSelect={onDuplicateCurrent}
                    >
                        <Copy className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span>Duplicate Current</span>
                            <span className="text-xs text-muted-foreground">
                                Copy as starting point
                            </span>
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Blank Slide with layout submenu */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="flex cursor-pointer items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span>Blank Slide</span>
                                <span className="text-xs text-muted-foreground">
                                    Choose a layout
                                </span>
                            </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-48">
                            {LAYOUT_CONFIG.map((layout) => {
                                const Icon = layout.icon;
                                return (
                                    <DropdownMenuItem
                                        key={layout.type}
                                        className="flex cursor-pointer items-center gap-2"
                                        onSelect={() => handleBlankSlideClick(layout.type)}
                                    >
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span>{layout.label}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {layout.description}
                                            </span>
                                        </div>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* AI Generation Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Generate Slide with AI
                        </DialogTitle>
                        <DialogDescription>
                            Describe what this slide should cover. AI will generate
                            content that matches your presentation style.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-prompt">What should this slide cover?</Label>
                            <Textarea
                                id="ai-prompt"
                                placeholder="Add a testimonial from Sarah about the transformation she experienced..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="min-h-24 resize-none"
                                maxLength={500}
                            />
                            <p className="text-right text-xs text-muted-foreground">
                                {aiPrompt.length}/500
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="layout-select">Layout (optional)</Label>
                            <Select
                                value={selectedLayout}
                                onValueChange={(value) =>
                                    setSelectedLayout(value as SlideLayoutType | "auto")
                                }
                            >
                                <SelectTrigger id="layout-select">
                                    <SelectValue placeholder="Auto-detect" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">
                                        Auto-detect best layout
                                    </SelectItem>
                                    {LAYOUT_CONFIG.map((layout) => (
                                        <SelectItem key={layout.type} value={layout.type}>
                                            {layout.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAIGenerate}
                            disabled={!aiPrompt.trim() || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2
                                        className="mr-2 h-4 w-4 animate-spin"
                                        role="status"
                                        aria-label="Generating slide"
                                    />
                                    <span>Generating...</span>
                                    <span className="sr-only">
                                        Generating slide with AI, please wait
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
