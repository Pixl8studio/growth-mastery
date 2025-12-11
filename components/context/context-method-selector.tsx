"use client";

import { Card } from "@/components/ui/card";
import { Wand2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextMethod } from "@/types/business-profile";

interface ContextMethodSelectorProps {
    onSelectMethod: (method: ContextMethod) => void;
    selectedMethod?: ContextMethod;
}

interface MethodOption {
    id: ContextMethod;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    gradientFrom: string;
    gradientTo: string;
    glowColor: string;
    recommended?: boolean;
    comingSoon?: boolean;
}

const METHODS: MethodOption[] = [
    {
        id: "wizard",
        title: "AI Assisted Wizard",
        description:
            "Answer questions section by section with AI assistance to generate your content. Our smart wizard guides you through each step.",
        icon: Wand2,
        gradientFrom: "from-purple-500",
        gradientTo: "to-pink-500",
        glowColor: "shadow-purple-500/50",
        recommended: true,
    },
    {
        id: "voice",
        title: "Voice Call",
        description:
            "Have a natural 15-20 minute conversation with our AI assistant who will guide you through all the questions.",
        icon: Phone,
        gradientFrom: "from-blue-500",
        gradientTo: "to-cyan-500",
        glowColor: "shadow-blue-500/50",
        comingSoon: true,
    },
];

export function ContextMethodSelector({
    onSelectMethod,
    selectedMethod,
}: ContextMethodSelectorProps) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold text-foreground">
                    How would you like to build your business profile?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Choose the method that works best for you. Both paths create the
                    same comprehensive business profile.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {METHODS.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.id;
                    const isDisabled = method.comingSoon;

                    return (
                        <Card
                            key={method.id}
                            className={cn(
                                "relative overflow-visible p-6 pt-8 transition-all duration-300",
                                {
                                    "border-2 border-primary ring-2 ring-primary/20":
                                        isSelected,
                                    "hover:scale-[1.02] hover:shadow-xl cursor-pointer":
                                        !isSelected && !isDisabled,
                                    "opacity-60 cursor-not-allowed": isDisabled,
                                }
                            )}
                            onClick={() => !isDisabled && onSelectMethod(method.id)}
                        >
                            {/* Glowing background gradient */}
                            <div
                                className={cn(
                                    "absolute inset-0 opacity-0 transition-opacity duration-300",
                                    "bg-gradient-to-br",
                                    method.gradientFrom,
                                    method.gradientTo,
                                    {
                                        "opacity-5 group-hover:opacity-10":
                                            !isSelected && !isDisabled,
                                        "opacity-10": isSelected,
                                    }
                                )}
                            />

                            {method.recommended && (
                                <span className="absolute -top-2 right-4 z-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-purple-500/30">
                                    Recommended
                                </span>
                            )}
                            {method.comingSoon && (
                                <span className="absolute -top-2 right-4 z-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-amber-500/30">
                                    Coming Soon
                                </span>
                            )}

                            <div className="relative flex flex-col items-center text-center">
                                {/* Icon with glowing gradient background */}
                                <div
                                    className={cn(
                                        "mb-4 flex h-16 w-16 items-center justify-center rounded-full",
                                        "bg-gradient-to-br shadow-lg transition-all duration-300",
                                        method.gradientFrom,
                                        method.gradientTo,
                                        method.glowColor,
                                        {
                                            "shadow-xl scale-110": isSelected,
                                            "hover:shadow-xl hover:scale-105":
                                                !isSelected && !isDisabled,
                                        }
                                    )}
                                >
                                    <Icon className="h-8 w-8 text-white" />
                                </div>

                                <h4 className="mb-2 text-lg font-semibold text-foreground">
                                    {method.title}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {method.description}
                                </p>

                                {/* Selection indicator */}
                                {isSelected && (
                                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                                        Selected
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Note about GPT paste mode - accessible via wizard */}
            <p className="text-center text-xs text-muted-foreground">
                Already have content from a trained GPT? The AI Assisted Wizard supports
                pasting and importing your existing content.
            </p>
        </div>
    );
}
