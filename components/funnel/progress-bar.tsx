/**
 * Progress Bar Component
 * Shows completion percentage for funnel steps
 */

import { Progress } from "@/components/ui/progress";
import { FUNNEL_CONFIG } from "@/lib/config";

interface ProgressBarProps {
    currentStep: number;
    className?: string;
}

export function ProgressBar({ currentStep, className }: ProgressBarProps) {
    const percentage = Math.round((currentStep / FUNNEL_CONFIG.totalSteps) * 100);

    return (
        <div className={className}>
            <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                    Step {currentStep} of {FUNNEL_CONFIG.totalSteps}
                </span>
                <span className="text-muted-foreground">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
        </div>
    );
}
