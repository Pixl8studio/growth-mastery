"use client";

import { Card } from "@/components/ui/card";
import { Wand2, Phone, MessageSquare } from "lucide-react";
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
    color: string;
    recommended?: boolean;
}

const METHODS: MethodOption[] = [
    {
        id: "wizard",
        title: "Build Together Step-by-Step",
        description:
            "Answer questions section by section with AI assistance to generate your content",
        icon: Wand2,
        color: "purple",
        recommended: true,
    },
    {
        id: "voice",
        title: "Complete a Voice Call",
        description:
            "Have a natural 15-20 minute conversation with our AI assistant who will guide you through all the questions",
        icon: Phone,
        color: "blue",
    },
    {
        id: "gpt_paste",
        title: "I Already Have a Trained GPT",
        description:
            "Copy prompts for each section, get answers from your GPT, and paste them back",
        icon: MessageSquare,
        color: "green",
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
                    How would you like to provide your business context?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Choose the method that works best for you. All paths lead to the
                    same comprehensive business profile.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {METHODS.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.id;

                    return (
                        <Card
                            key={method.id}
                            className={cn(
                                "relative cursor-pointer p-6 transition-all hover:shadow-lg",
                                {
                                    "border-2 border-primary bg-primary/5": isSelected,
                                    "hover:border-primary/50": !isSelected,
                                }
                            )}
                            onClick={() => onSelectMethod(method.id)}
                        >
                            {method.recommended && (
                                <span className="absolute -top-2 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                    Recommended
                                </span>
                            )}

                            <div className="flex flex-col items-center text-center">
                                <div
                                    className={cn(
                                        "mb-4 flex h-14 w-14 items-center justify-center rounded-full",
                                        {
                                            "bg-purple-100": method.color === "purple",
                                            "bg-blue-100": method.color === "blue",
                                            "bg-green-100": method.color === "green",
                                        }
                                    )}
                                >
                                    <Icon
                                        className={cn("h-7 w-7", {
                                            "text-purple-600":
                                                method.color === "purple",
                                            "text-blue-600": method.color === "blue",
                                            "text-green-600": method.color === "green",
                                        })}
                                    />
                                </div>

                                <h4 className="mb-2 text-lg font-semibold text-foreground">
                                    {method.title}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {method.description}
                                </p>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
