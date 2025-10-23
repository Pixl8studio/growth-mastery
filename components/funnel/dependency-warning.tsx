"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface DependencyWarningProps {
    message: string;
    requiredStep: number;
    requiredStepName: string;
    projectId: string;
}

export function DependencyWarning({
    message,
    requiredStep,
    requiredStepName,
    projectId,
}: DependencyWarningProps) {
    return (
        <div className="mb-8 rounded-lg border-2 border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h3 className="mb-2 text-lg font-semibold text-amber-900">
                        ⚠️ Missing Prerequisites
                    </h3>
                    <p className="mb-4 text-amber-800">{message}</p>
                    <Link href={`/funnel-builder/${projectId}/step/${requiredStep}`}>
                        <button className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700">
                            Go to Step {requiredStep}: {requiredStepName} →
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
