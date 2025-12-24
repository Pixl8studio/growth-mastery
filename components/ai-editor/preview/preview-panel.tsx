"use client";

/**
 * Preview Panel
 * Live preview of the generated landing page with device frames
 */

// Internal utilities
import { cn } from "@/lib/utils";

// Feature code
import { DeviceFrame } from "./device-frame";
import { PreviewIframe } from "./preview-iframe";

interface PreviewPanelProps {
    html: string;
    deviceMode: "desktop" | "tablet" | "mobile";
    isProcessing: boolean;
    refreshKey?: number;
}

export function PreviewPanel({
    html,
    deviceMode,
    isProcessing,
    refreshKey,
}: PreviewPanelProps) {
    return (
        <div
            className={cn(
                "flex h-full flex-col bg-muted/30",
                "transition-opacity duration-300",
                isProcessing && "opacity-90"
            )}
        >
            {/* Preview Area */}
            <div className="flex flex-1 items-center justify-center overflow-auto p-4">
                <DeviceFrame mode={deviceMode}>
                    <PreviewIframe
                        html={html}
                        deviceMode={deviceMode}
                        isProcessing={isProcessing}
                        refreshKey={refreshKey}
                    />
                </DeviceFrame>
            </div>
        </div>
    );
}
