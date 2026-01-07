"use client";

/**
 * AI Editor Layout
 * Split-pane container with resizable panels (35% chat / 65% preview)
 * Lovable-style conversational editor for landing pages
 */

// External packages
import { useState, useRef, useCallback, useEffect } from "react";

// Internal utilities
import { cn } from "@/lib/utils";

// Feature code
import { ChatPanel } from "./chat/chat-panel";
import { CodeViewerDialog } from "./code-view/code-viewer-dialog";
import { EditorHeader } from "./header/editor-header";
import { useEditor } from "./hooks/use-editor";
import { PreviewPanel } from "./preview/preview-panel";
import { VersionHistoryPanel } from "./version-history/version-history-panel";

interface AIEditorLayoutProps {
    pageId: string;
    projectId: string;
    pageType: "registration" | "watch" | "enrollment";
    initialHtml?: string;
    initialTitle?: string;
}

export function AIEditorLayout({
    pageId,
    projectId,
    pageType,
    initialHtml = "",
    initialTitle = "Untitled Page",
}: AIEditorLayoutProps) {
    // Split pane state
    const [splitPosition, setSplitPosition] = useState(35); // percentage
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Device preview mode
    const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">(
        "desktop"
    );

    // Preview refresh key (increment to force reload)
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
    const handleRefreshPreview = useCallback(() => {
        setPreviewRefreshKey((k) => k + 1);
    }, []);

    // Fullscreen mode
    const [isFullscreen, setIsFullscreen] = useState(false);
    const handleToggleFullscreen = useCallback(() => {
        setIsFullscreen((prev) => !prev);
    }, []);

    // Code view dialog
    const [showCodeView, setShowCodeView] = useState(false);

    // Version history panel
    const [showVersionHistory, setShowVersionHistory] = useState(false);

    // Editor state from hook
    const {
        html,
        setHtml,
        title,
        setTitle,
        messages,
        isProcessing,
        sendMessage,
        selectOption,
        suggestedActions,
        lastEditSummary,
        status,
        version,
        undo,
        canUndo,
        publish,
        getShareUrl,
    } = useEditor({
        pageId,
        projectId,
        pageType,
        initialHtml,
        initialTitle,
    });

    // Restore version callback (needs to be after useEditor)
    const handleRestoreVersion = useCallback(
        (restoredHtml: string, _restoredVersion: number) => {
            setHtml(restoredHtml);
            // Note: version update will be handled by the API
        },
        [setHtml]
    );

    // Handle resize drag
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            const newPosition =
                ((e.clientX - containerRect.left) / containerRect.width) * 100;

            // Clamp between 25% and 50%
            const clampedPosition = Math.min(Math.max(newPosition, 25), 50);
            setSplitPosition(clampedPosition);
        },
        [isDragging]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add/remove event listeners for drag
    useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div className="flex h-screen flex-col bg-background">
            {/* Header */}
            <EditorHeader
                title={title}
                onTitleChange={setTitle}
                status={status}
                version={version}
                deviceMode={deviceMode}
                onDeviceModeChange={setDeviceMode}
                onUndo={undo}
                canUndo={canUndo}
                onRefreshPreview={handleRefreshPreview}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
                onShowCodeView={() => setShowCodeView(true)}
                onShowVersionHistory={() => setShowVersionHistory(true)}
                onPublish={publish}
                onGetShareUrl={getShareUrl}
                pageId={pageId}
                projectId={projectId}
            />

            {/* Main split-pane container */}
            <div ref={containerRef} className="relative flex flex-1 overflow-hidden">
                {/* Left Panel - Chat (hidden in fullscreen) */}
                {!isFullscreen && (
                    <div
                        className={cn(
                            "flex flex-col border-r border-border bg-muted/30",
                            "transition-[width] duration-75",
                            isDragging && "transition-none"
                        )}
                        style={{ width: `${splitPosition}%` }}
                    >
                        <ChatPanel
                            messages={messages}
                            isProcessing={isProcessing}
                            onSendMessage={sendMessage}
                            onSelectOption={selectOption}
                            suggestedActions={suggestedActions}
                            lastEditSummary={lastEditSummary}
                            projectId={projectId}
                        />
                    </div>
                )}

                {/* Resize Handle (hidden in fullscreen) */}
                {!isFullscreen && (
                    <div
                        onMouseDown={handleMouseDown}
                        className={cn(
                            "group absolute top-0 z-10 flex h-full w-1 cursor-col-resize items-center justify-center",
                            "hover:bg-primary/20 active:bg-primary/30",
                            "transition-colors duration-150",
                            isDragging && "bg-primary/30"
                        )}
                        style={{
                            left: `${splitPosition}%`,
                            transform: "translateX(-50%)",
                        }}
                    >
                        {/* Visual grip indicator */}
                        <div
                            className={cn(
                                "h-8 w-1 rounded-full bg-muted-foreground/30",
                                "group-hover:bg-primary/50 group-hover:h-12",
                                "transition-all duration-150"
                            )}
                        />
                    </div>
                )}

                {/* Right Panel - Preview (full width in fullscreen) */}
                <div
                    className="flex flex-1 flex-col overflow-hidden bg-background"
                    style={{ width: isFullscreen ? "100%" : `${100 - splitPosition}%` }}
                >
                    <PreviewPanel
                        html={html}
                        deviceMode={deviceMode}
                        isProcessing={isProcessing}
                        refreshKey={previewRefreshKey}
                    />
                </div>
            </div>

            {/* Code View Dialog */}
            <CodeViewerDialog
                open={showCodeView}
                onOpenChange={setShowCodeView}
                html={html}
                title={title}
            />

            {/* Version History Panel */}
            <VersionHistoryPanel
                open={showVersionHistory}
                onOpenChange={setShowVersionHistory}
                pageId={pageId}
                onRestore={handleRestoreVersion}
            />
        </div>
    );
}
