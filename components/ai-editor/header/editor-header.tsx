"use client";

/**
 * Editor Header
 * Full header bar with project title, toolbar, and publish button
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
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
    Minimize2,
    RefreshCw,
    Share2,
    ChevronDown,
    Check,
    Loader2,
} from "lucide-react";
import { PublishModal } from "../publish-modal";

interface EditorHeaderProps {
    title: string;
    onTitleChange: (title: string) => void;
    status: "draft" | "published" | "saving";
    version: number;
    deviceMode: "desktop" | "tablet" | "mobile";
    onDeviceModeChange: (mode: "desktop" | "tablet" | "mobile") => void;
    onUndo: () => void;
    canUndo: boolean;
    onRefreshPreview?: () => void;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    onShowCodeView?: () => void;
    onShowVersionHistory?: () => void;
    onPublish?: (
        slug: string,
        domainId?: string
    ) => Promise<{ success: boolean; publishedUrl?: string }>;
    onGetShareUrl?: () => string;
    pageId?: string;
    projectId?: string;
    currentSlug?: string;
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
    onRefreshPreview,
    isFullscreen = false,
    onToggleFullscreen,
    onShowCodeView,
    onShowVersionHistory,
    onPublish,
    onGetShareUrl,
    pageId,
    projectId,
    currentSlug,
}: EditorHeaderProps) {
    const { toast } = useToast();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

    const handleShare = async () => {
        if (!onGetShareUrl) return;

        const shareUrl = onGetShareUrl();
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast({
                title: "Link copied",
                description: "Share link has been copied to your clipboard.",
            });
        } catch {
            toast({
                title: "Copy failed",
                description: "Could not copy link. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handlePublishClick = () => {
        setIsPublishModalOpen(true);
    };

    const handlePublish = async (slug: string, domainId?: string) => {
        if (!onPublish) {
            return { success: false };
        }
        return onPublish(slug, domainId);
    };

    const deviceIcons = {
        desktop: Monitor,
        tablet: Tablet,
        mobile: Smartphone,
    };

    const DeviceIcon = deviceIcons[deviceMode];

    return (
        <>
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={onShowVersionHistory}
                                >
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={onShowCodeView}
                                >
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={onToggleFullscreen}
                                >
                                    {isFullscreen ? (
                                        <Minimize2 className="h-4 w-4" />
                                    ) : (
                                        <Maximize2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Refresh */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={onRefreshPreview}
                                >
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleShare}
                                >
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copy Share Link</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Publish Button */}
                        <Button
                            onClick={handlePublishClick}
                            className="h-8 bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                            Publish
                        </Button>
                    </div>
                </TooltipProvider>
            </header>

            {/* Publish Modal */}
            {pageId && projectId && (
                <PublishModal
                    isOpen={isPublishModalOpen}
                    onClose={() => setIsPublishModalOpen(false)}
                    pageId={pageId}
                    pageTitle={title}
                    currentSlug={currentSlug}
                    currentStatus={status}
                    onPublish={handlePublish}
                    projectId={projectId}
                />
            )}
        </>
    );
}
