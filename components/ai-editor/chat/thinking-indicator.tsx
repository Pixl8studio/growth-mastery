"use client";

/**
 * Thinking Indicator
 * Shows "Thinking for Xs..." with animated dots while AI processes
 */

import { useState, useEffect } from "react";
import { Lightbulb } from "lucide-react";

export function ThinkingIndicator() {
    const [seconds, setSeconds] = useState(0);
    const [dots, setDots] = useState("");

    // Timer for elapsed seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds((s) => s + 0.1);
        }, 100);

        return () => clearInterval(timer);
    }, []);

    // Animated dots
    useEffect(() => {
        const dotsTimer = setInterval(() => {
            setDots((d) => (d.length >= 3 ? "" : d + "."));
        }, 400);

        return () => clearInterval(dotsTimer);
    }, []);

    return (
        <div className="flex justify-start">
            <div className="max-w-[90%]">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="relative">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        {/* Pulsing glow effect */}
                        <div className="absolute inset-0 animate-ping">
                            <Lightbulb className="h-4 w-4 text-amber-500 opacity-50" />
                        </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        Thinking for {seconds.toFixed(1)}s{dots}
                    </span>
                </div>
            </div>
        </div>
    );
}
