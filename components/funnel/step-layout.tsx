/**
 * Step Layout Component
 * Layout wrapper for funnel builder steps
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FUNNEL_CONFIG } from "@/lib/config";

interface StepLayoutProps {
    projectId: string;
    currentStep: number;
    stepTitle: string;
    stepDescription: string;
    funnelName?: string;
    children: React.ReactNode;
    nextDisabled?: boolean;
    nextLabel?: string;
    onNext?: () => void | Promise<void>;
}

export function StepLayout({
    projectId,
    currentStep,
    stepTitle,
    stepDescription,
    funnelName,
    children,
    nextDisabled = false,
    nextLabel = "Continue",
    onNext,
}: StepLayoutProps) {
    const router = useRouter();

    const handleNext = async () => {
        if (onNext) {
            await onNext();
        } else {
            // Default: go to next step
            const nextStep = currentStep + 1;
            if (nextStep <= FUNNEL_CONFIG.totalSteps) {
                router.push(`/funnel-builder/${projectId}/step/${nextStep}`);
            }
        }
    };

    const handlePrevious = () => {
        const prevStep = currentStep - 1;
        if (prevStep >= 1) {
            router.push(`/funnel-builder/${projectId}/step/${prevStep}`);
        } else {
            router.push(`/funnel-builder/${projectId}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/funnel-builder"
                                className="text-xl font-bold text-gray-900"
                            >
                                Genie AI
                            </Link>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-600">
                                {funnelName || "Funnel"}
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href={`/funnel-builder/${projectId}`}>
                                <Button variant="outline" size="sm">
                                    Overview
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Step Progress */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span className="font-medium">
                                Step {currentStep} of {FUNNEL_CONFIG.totalSteps}
                            </span>
                            <span className="text-gray-500">
                                {Math.round(
                                    (currentStep / FUNNEL_CONFIG.totalSteps) * 100
                                )}
                                % Complete
                            </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{
                                    width: `${(currentStep / FUNNEL_CONFIG.totalSteps) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{stepTitle}</CardTitle>
                        <CardDescription>{stepDescription}</CardDescription>
                    </CardHeader>
                    <CardContent>{children}</CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentStep === 1}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Previous
                    </Button>

                    <Button onClick={handleNext} disabled={nextDisabled}>
                        {nextLabel}
                        {currentStep < FUNNEL_CONFIG.totalSteps && (
                            <ArrowRight className="ml-2 h-4 w-4" />
                        )}
                    </Button>
                </div>
            </main>
        </div>
    );
}
