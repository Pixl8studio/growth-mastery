"use client";

import { useEffect, useState } from "react";

interface DealConfig {
    discount: string;
    code: string;
    endDate: Date;
}

const DEALS: DealConfig[] = [
    {
        discount: "$2,000",
        code: "PRELAUNCH2000",
        endDate: new Date("2025-11-08T23:59:59"),
    },
    {
        discount: "$1,500",
        code: "PRELAUNCH1500",
        endDate: new Date("2025-11-19T23:59:59"),
    },
];

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

interface CountdownDealBannerProps {
    variant?: "light" | "dark";
}

export function CountdownDealBanner({ variant = "light" }: CountdownDealBannerProps) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
    const [currentDeal, setCurrentDeal] = useState<DealConfig | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => {
            setMounted(true);
        });

        // Find the current active deal
        const now = new Date();
        const activeDeal = DEALS.find((deal) => now < deal.endDate);

        requestAnimationFrame(() => {
            setCurrentDeal(activeDeal || null);
        });

        if (!activeDeal) return;

        const calculateTimeLeft = (): TimeLeft => {
            const difference = activeDeal.endDate.getTime() - new Date().getTime();

            if (difference <= 0) {
                return { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        };

        // Initial calculation
        requestAnimationFrame(() => {
            setTimeLeft(calculateTimeLeft());
        });

        // Update every second
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Don't render anything until mounted (prevents hydration mismatch)
    if (!mounted || !currentDeal || !timeLeft) {
        return null;
    }

    const isExpiringSoon = timeLeft.days === 0 && timeLeft.hours < 24;

    // Color scheme based on variant
    const isDark = variant === "dark";
    const textColor = isDark ? "text-white" : "text-muted-foreground";
    const separatorColor = isDark ? "text-white/50" : "text-muted-foreground";
    const borderColor = isDark ? "border-yellow-400" : "border-yellow-500/50";
    const bgGradient = isDark
        ? "bg-gradient-to-r from-yellow-500/30 to-orange-500/30"
        : "bg-gradient-to-r from-yellow-500/20 to-orange-500/20";
    const badgeBg = isDark ? "bg-yellow-400" : "bg-yellow-500";
    const codeBg = isDark ? "bg-black/50" : "bg-black/30";
    const codeText = isDark ? "text-yellow-400" : "text-yellow-500";

    return (
        <div className="animate-fade-in max-w-2xl mx-auto px-4 mt-6 md:mt-12">
            <div
                className={`relative p-4 md:p-6 rounded-2xl ${bgGradient} border-2 ${borderColor} shadow-glow ${isDark ? "backdrop-blur-sm" : ""}`}
            >
                <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 rounded-full ${badgeBg} text-black text-xs md:text-sm font-bold whitespace-nowrap`}
                >
                    🎉 PRE-LAUNCH SPECIAL
                </div>

                <p
                    className={`text-xl md:text-2xl font-bold mb-1 md:mb-2 ${isDark ? "text-white" : "text-foreground"}`}
                >
                    Save {currentDeal.discount} Today!
                </p>

                <p className={`text-sm md:text-base ${textColor} mb-3`}>
                    Use code{" "}
                    <span
                        className={`font-mono font-bold ${codeText} ${codeBg} px-2 md:px-3 py-1 rounded text-xs md:text-sm`}
                    >
                        {currentDeal.code}
                    </span>{" "}
                    at checkout
                </p>

                {/* Countdown Timer */}
                <div
                    className={`pt-2 mt-2 border-t ${isDark ? "border-yellow-400/30" : "border-yellow-500/30"} text-center`}
                >
                    <p
                        className={`text-[10px] md:text-xs font-semibold mb-1 ${isExpiringSoon ? "text-red-500 animate-pulse" : textColor}`}
                    >
                        {isExpiringSoon ? "⏰ Deal ends soon" : "Act now, deal ends in"}
                    </p>
                    <div className="flex items-center justify-center gap-1 md:gap-1.5">
                        <span className="text-xl md:text-2xl font-bold text-yellow-500 font-mono">
                            {String(timeLeft.days).padStart(2, "0")}
                        </span>
                        <span className={`text-xs md:text-sm ${separatorColor}`}>
                            :
                        </span>
                        <span className="text-xl md:text-2xl font-bold text-yellow-500 font-mono">
                            {String(timeLeft.hours).padStart(2, "0")}
                        </span>
                        <span className={`text-xs md:text-sm ${separatorColor}`}>
                            :
                        </span>
                        <span className="text-xl md:text-2xl font-bold text-yellow-500 font-mono">
                            {String(timeLeft.minutes).padStart(2, "0")}
                        </span>
                        <span className={`text-xs md:text-sm ${separatorColor}`}>
                            :
                        </span>
                        <span className="text-xl md:text-2xl font-bold text-yellow-500 font-mono">
                            {String(timeLeft.seconds).padStart(2, "0")}
                        </span>
                    </div>
                    <p className={`text-[9px] md:text-[10px] ${textColor} mt-1`}>
                        Days : Hours : Mins : Secs
                    </p>
                </div>
            </div>
        </div>
    );
}
