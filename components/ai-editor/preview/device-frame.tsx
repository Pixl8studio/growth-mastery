"use client";

/**
 * Device Frame
 * Visual frame wrapper for tablet and mobile preview modes
 */

import { cn } from "@/lib/utils";

interface DeviceFrameProps {
    mode: "desktop" | "tablet" | "mobile";
    children: React.ReactNode;
}

export function DeviceFrame({ mode, children }: DeviceFrameProps) {
    // Desktop mode - no frame, full width
    if (mode === "desktop") {
        return (
            <div className="h-full w-full overflow-hidden rounded-lg border border-border bg-white shadow-lg">
                {children}
            </div>
        );
    }

    // Tablet mode - iPad-style frame
    if (mode === "tablet") {
        return (
            <div className="flex flex-col rounded-[2rem] border-[12px] border-zinc-800 bg-zinc-800 shadow-2xl">
                {/* Camera notch */}
                <div className="flex justify-center py-2">
                    <div className="h-2 w-2 rounded-full bg-zinc-700" />
                </div>

                {/* Screen */}
                <div className="h-[600px] w-[768px] overflow-hidden rounded-sm bg-white">
                    {children}
                </div>

                {/* Home button area */}
                <div className="flex justify-center py-3">
                    <div className="h-8 w-8 rounded-full border-2 border-zinc-700" />
                </div>
            </div>
        );
    }

    // Mobile mode - iPhone-style frame
    return (
        <div className="flex flex-col rounded-[2.5rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl">
            {/* Dynamic Island / Notch */}
            <div className="flex justify-center py-2">
                <div className="h-6 w-24 rounded-full bg-zinc-800" />
            </div>

            {/* Screen */}
            <div className="h-[667px] w-[375px] overflow-hidden rounded-[1rem] bg-white">
                {children}
            </div>

            {/* Home indicator */}
            <div className="flex justify-center py-2">
                <div className="h-1 w-32 rounded-full bg-zinc-600" />
            </div>
        </div>
    );
}
