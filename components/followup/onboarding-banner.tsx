/**
 * Onboarding Banner Component
 *
 * Step-by-step guide for first-time setup of AI Follow-Up Engine.
 * Tracks progress and shows checkmarks as steps complete.
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
}

interface OnboardingBannerProps {
    senderVerified: boolean;
    hasSequences: boolean;
    hasMessages: boolean;
    onClose?: () => void;
}

export function OnboardingBanner({
    senderVerified,
    hasSequences,
    hasMessages,
    onClose,
}: OnboardingBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check localStorage for dismissed state
        const isDismissed =
            localStorage.getItem("followup-onboarding-dismissed") === "true";
        setDismissed(isDismissed);
    }, []);

    const steps: OnboardingStep[] = [
        {
            id: "verify",
            title: "Configure Email Sender",
            description: "Connect Gmail or configure SendGrid for email sending",
            completed: senderVerified,
        },
        {
            id: "sequence",
            title: "Select/Create Sequence",
            description:
                "Choose a pre-built sequence or create your own follow-up campaign",
            completed: hasSequences,
        },
        {
            id: "preview",
            title: "Review & Test Messages",
            description:
                "Preview your messages and send a test to verify everything works",
            completed: hasMessages,
        },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const allComplete = completedCount === steps.length;

    const handleDismiss = () => {
        localStorage.setItem("followup-onboarding-dismissed", "true");
        setDismissed(true);
        if (onClose) {
            onClose();
        }
    };

    // Don't show if dismissed or all complete
    if (dismissed || allComplete) {
        return null;
    }

    return (
        <Card className="relative overflow-hidden border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-primary/5">
            <div className="absolute top-0 right-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="m-2 hover:bg-card/50"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-6 pr-12">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                        Welcome to AI Follow-Up Engine! 👋
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Let's set up your automated follow-up system in three simple
                        steps
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Setup Progress</span>
                        <span>
                            {completedCount} of {steps.length} complete
                        </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-primary/50 transition-all duration-500"
                            style={{
                                width: `${(completedCount / steps.length) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Steps */}
                <div className="grid gap-3 md:grid-cols-3">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={cn(
                                "p-4 rounded-lg border-2 transition-all",
                                step.completed
                                    ? "bg-green-50 border-green-200"
                                    : "bg-card border-border"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    {step.completed ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span
                                            className={cn(
                                                "text-xs font-medium px-2 py-0.5 rounded",
                                                step.completed
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            Step {index + 1}
                                        </span>
                                        {step.completed && (
                                            <span className="text-xs text-green-600 font-medium">
                                                ✓ Done
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-semibold text-foreground mb-1">
                                        {step.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Next Step Hint */}
                {!allComplete && (
                    <div className="mt-4 p-3 bg-card rounded-lg border border-purple-200">
                        <p className="text-sm text-foreground">
                            <strong className="text-purple-700">Next step:</strong>{" "}
                            {!steps[0].completed && (
                                <>
                                    Go to the <strong>Sender Setup</strong> tab to
                                    configure your email sender
                                </>
                            )}
                            {steps[0].completed && !steps[1].completed && (
                                <>
                                    Check the <strong>Sequences</strong> tab to review
                                    or create your campaign
                                </>
                            )}
                            {steps[0].completed &&
                                steps[1].completed &&
                                !steps[2].completed && (
                                    <>
                                        Use the <strong>Test Message to Self</strong>{" "}
                                        button to verify everything works
                                    </>
                                )}
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
