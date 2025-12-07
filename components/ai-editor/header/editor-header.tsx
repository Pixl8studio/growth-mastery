"use client";

/**
 * Editor Header
 * Full header bar with project title, toolbar, and publish button
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    History,
    Monitor,
    Tablet,
    Smartphone,
    Eye,
    Code2,
    Undo2,
    Maximize2,
    RefreshCw,
    Share2,
    ChevronDown,
    Check,
    Loader2,
} from "lucide-react";

interface EditorHeaderProps {
    title: string;
    onTitleChange: (title: string) => void;
    status: "draft" | "published" | "saving";
    version: number;
    deviceMode: "desktop" | "tablet" | "mobile";
    onDeviceModeChange: (mode: "desktop" | "tablet" | "mobile") => void;
    onUndo: () => void;
    canUndo: boolean;
    pageId: string;
    pageType: "registration" | "watch" | "enrollment";
}

export function EditorHeader({
    title,
    onTitleChange,
    status,
    version,
    deviceMode,
    onDeviceModeChange,
    onUndo,
    canUndo,
    pageId,
    pageType,
}: EditorHeaderProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        setIsPublishing(true);
        // TODO: Implement publish logic
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsPublishing(false);
    };

    const deviceIcons = {
        desktop: Monitor,
        tablet: Tablet,
        mobile: Smartphone,
    };

    const DeviceIcon = deviceIcons[deviceMode];

    return (
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
            {/* Left Section - Title and Status */}
            <div className="flex items-center gap-3">
                {/* Project Title */}
                <div className="flex items-center gap-2">
                    {isEditingTitle ? (
                        <Input
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") setIsEditingTitle(false);
                            }}
                            className="h-8 w-64 text-sm font-medium"
                            autoFocus
                        />
                    ) : (
                        <button
                            onClick={() => setIsEditingTitle(true)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium hover:bg-muted"
                        >
                            {title}
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {status === "saving" ? (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : status === "published" ? (
                        <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span>Published</span>
                        </>
                    ) : (
                        <>
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                            <span>Draft v{version}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Center Section - Toolbar */}
            <TooltipProvider delayDuration={300}>
                <div className="flex items-center gap-1">
                    {/* History */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <History className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Version History</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Device Toggle */}
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                    >
                                        <DeviceIcon className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Device Preview</p>
                            </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="center">
                            <DropdownMenuItem
                                onClick={() => onDeviceModeChange("desktop")}
                            >
                                <Monitor className="mr-2 h-4 w-4" />
                                Desktop
                                {deviceMode === "desktop" && (
                                    <Check className="ml-auto h-4 w-4" />
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDeviceModeChange("tablet")}
                            >
                                <Tablet className="mr-2 h-4 w-4" />
                                Tablet
                                {deviceMode === "tablet" && (
                                    <Check className="ml-auto h-4 w-4" />
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDeviceModeChange("mobile")}
                            >
                                <Smartphone className="mr-2 h-4 w-4" />
                                Mobile
                                {deviceMode === "mobile" && (
                                    <Check className="ml-auto h-4 w-4" />
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Separator */}
                    <div className="mx-1 h-4 w-px bg-border" />

                    {/* Preview Mode */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Preview Mode</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Code View */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Code2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>View Code</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Undo */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={onUndo}
                                disabled={!canUndo}
                            >
                                <Undo2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Undo</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>

            {/* Right Section - Actions */}
            <TooltipProvider delayDuration={300}>
                <div className="flex items-center gap-2">
                    {/* Fullscreen */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Fullscreen</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Refresh */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Refresh Preview</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Share */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Share2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Share</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Publish Button */}
                    <Button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="h-8 bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                        {isPublishing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Publishing...
                            </>
                        ) : (
                            "Publish"
                        )}
                    </Button>
                </div>
            </TooltipProvider>
        </header>
    );
}
