/**
 * Dependency Warning Component
 * Shows warning when prerequisite steps are not completed
 */

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DependencyWarningProps {
    missingStep: number;
    missingStepName: string;
    projectId: string;
    message?: string;
}

export function DependencyWarning({
    missingStep,
    missingStepName,
    projectId,
    message,
}: DependencyWarningProps) {
    return (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
            <div className="flex">
                <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                        Prerequisite Required
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                        <p>
                            {message ||
                                `Please complete Step ${missingStep}: ${missingStepName} before proceeding with this step.`}
                        </p>
                    </div>
                    <div className="mt-4">
                        <Link href={`/funnel-builder/${projectId}/step/${missingStep}`}>
                            <Button size="sm" variant="outline">
                                Go to {missingStepName} →
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
