"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LayoutDashboard } from "lucide-react";
import { StepperNav } from "./stepper-nav";
import { GenerationProgressTracker } from "@/components/layout/generation-progress-tracker";
import { getMasterStepForSubStep } from "@/app/funnel-builder/master-steps-config";

interface StepLayoutProps {
    children: ReactNode;
    currentStep: number;
    stepTitle?: string;
    stepDescription?: string;
    completedSteps?: number[]; // Steps that have generated content
    funnelName?: string;
    funnelId?: string;
    projectId: string;
    onNext?: () => void;
    onPrevious?: () => void;
    nextDisabled?: boolean;
    nextLabel?: string;
    showSaveButton?: boolean;
    onSave?: () => void;
    saveLabel?: string;
}

const getNextStepHref = (currentStep: number, projectId: string) => {
    const nextStep = currentStep + 1;
    if (nextStep > 12) return `/funnel-builder/${projectId}`;
    return `/funnel-builder/${projectId}/step/${nextStep}`;
};

const getPreviousStepHref = (currentStep: number, projectId: string) => {
    const prevStep = currentStep - 1;
    if (prevStep < 1) return `/funnel-builder/${projectId}`;
    return `/funnel-builder/${projectId}/step/${prevStep}`;
};

export function StepLayout({
    children,
    currentStep,
    stepTitle,
    stepDescription,
    completedSteps = [],
    funnelName,
    funnelId: _funnelId,
    projectId,
    onNext,
    onPrevious,
    nextDisabled = false,
    nextLabel = "Continue",
    showSaveButton = false,
    onSave,
    saveLabel = "Save Progress",
}: StepLayoutProps) {
    const nextHref = getNextStepHref(currentStep, projectId);
    const previousHref = getPreviousStepHref(currentStep, projectId);
    const masterStep = getMasterStepForSubStep(currentStep);

    return (
        <div className="min-h-screen bg-muted/50">
            {/* Step Navigation Sidebar */}
            <div className="fixed left-0 top-0 h-screen w-64 overflow-y-auto border-r border-border bg-card">
                <div className="p-6">
                    {/* Back to Dashboard Button */}
                    <Link
                        href={`/funnel-builder/${projectId}`}
                        className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:border-border"
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Back to Dashboard</span>
                    </Link>

                    {/* Funnel Info */}
                    <div className="mb-6">
                        <h2 className="truncate text-lg font-semibold text-foreground">
                            {funnelName || "Funnel Builder"}
                        </h2>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                Step {currentStep} of 15
                            </p>
                            {masterStep && (
                                <p className="text-xs text-primary font-medium">
                                    {masterStep.title}
                                </p>
                            )}
                        </div>
                    </div>

                    <StepperNav
                        projectId={projectId}
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="ml-64 min-h-screen">
                <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Step Header */}
                    {(stepTitle || stepDescription) && (
                        <div className="mb-8 text-center">
                            {stepTitle && (
                                <h1 className="mb-3 text-3xl font-bold text-foreground">
                                    {stepTitle}
                                </h1>
                            )}
                            {stepDescription && (
                                <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                                    {stepDescription}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Step Content */}
                    {children}

                    {/* Navigation Buttons */}
                    <div className="mt-8 flex items-center justify-between">
                        {/* Previous Button */}
                        <div>
                            {currentStep > 1 ? (
                                onPrevious ? (
                                    <button
                                        onClick={onPrevious}
                                        className="inline-flex items-center rounded-lg border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted/50"
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Previous
                                    </button>
                                ) : (
                                    <Link href={previousHref}>
                                        <button className="inline-flex items-center rounded-lg border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted/50">
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Previous
                                        </button>
                                    </Link>
                                )
                            ) : (
                                <Link href={`/funnel-builder/${projectId}`}>
                                    <button className="inline-flex items-center rounded-lg border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted/50">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Dashboard
                                    </button>
                                </Link>
                            )}
                        </div>

                        {/* Save & Next Buttons */}
                        <div className="flex items-center space-x-3">
                            {showSaveButton && (
                                <button
                                    onClick={onSave}
                                    className="inline-flex items-center rounded-lg border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted/50"
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    {saveLabel}
                                </button>
                            )}

                            {currentStep < 12 ? (
                                onNext ? (
                                    <button
                                        onClick={onNext}
                                        disabled={nextDisabled}
                                        className={`inline-flex items-center rounded-lg px-6 py-3 font-medium transition-colors ${
                                            nextDisabled
                                                ? "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                                : "bg-primary text-white hover:bg-primary/90"
                                        }`}
                                    >
                                        {nextLabel}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </button>
                                ) : (
                                    <Link href={nextHref}>
                                        <button
                                            disabled={nextDisabled}
                                            className={`inline-flex items-center rounded-lg px-6 py-3 font-medium transition-colors ${
                                                nextDisabled
                                                    ? "cursor-not-allowed bg-gray-300 text-muted-foreground"
                                                    : "bg-primary text-white hover:bg-primary/90"
                                            }`}
                                        >
                                            {nextLabel}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </button>
                                    </Link>
                                )
                            ) : (
                                <Link href={`/funnel-builder/${projectId}`}>
                                    <button className="inline-flex items-center rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700">
                                        Complete Funnel
                                        <Check className="ml-2 h-4 w-4" />
                                    </button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Generation Progress Tracker */}
            <GenerationProgressTracker projectId={projectId} />
        </div>
    );
}
