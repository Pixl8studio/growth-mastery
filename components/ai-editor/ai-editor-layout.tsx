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
import { EditorHeader } from "./header/editor-header";
import { useEditor } from "./hooks/use-editor";
import { PreviewPanel } from "./preview/preview-panel";

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

    // Editor state from hook
    const {
        html,
        setHtml,
        title,
        setTitle,
        messages,
        isProcessing,
        sendMessage,
        suggestedActions,
        lastEditSummary,
        status,
        version,
        undo,
        canUndo,
    } = useEditor({
        pageId,
        projectId,
        pageType,
        initialHtml,
        initialTitle,
    });

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
                pageId={pageId}
                pageType={pageType}
            />

            {/* Main split-pane container */}
            <div ref={containerRef} className="relative flex flex-1 overflow-hidden">
                {/* Left Panel - Chat */}
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
                        suggestedActions={suggestedActions}
                        lastEditSummary={lastEditSummary}
                    />
                </div>

                {/* Resize Handle */}
                <div
                    onMouseDown={handleMouseDown}
                    className={cn(
                        "group absolute top-0 z-10 flex h-full w-1 cursor-col-resize items-center justify-center",
                        "hover:bg-primary/20 active:bg-primary/30",
                        "transition-colors duration-150",
                        isDragging && "bg-primary/30"
                    )}
                    style={{ left: `${splitPosition}%`, transform: "translateX(-50%)" }}
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

                {/* Right Panel - Preview */}
                <div
                    className="flex flex-1 flex-col overflow-hidden bg-background"
                    style={{ width: `${100 - splitPosition}%` }}
                >
                    <PreviewPanel
                        html={html}
                        deviceMode={deviceMode}
                        isProcessing={isProcessing}
                    />
                </div>
            </div>
        </div>
    );
}
