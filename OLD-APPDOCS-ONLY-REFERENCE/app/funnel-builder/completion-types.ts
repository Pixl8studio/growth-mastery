/**
 * Shared types and utilities for funnel completion tracking
 */

export interface StepCompletion {
    step: number;
    isCompleted: boolean;
    hasContent: boolean;
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(
    completionStatus: StepCompletion[]
): number {
    const completableSteps = 11; // Steps 1-11 (Step 12 is analytics/viewing)
    const completedSteps = completionStatus.filter(
        (s) => s.step !== 12 && s.isCompleted
    ).length;

    return Math.round((completedSteps / completableSteps) * 100);
}
