/**
 * Shared types and utilities for funnel completion tracking
 */

export interface StepCompletion {
    step: number;
    isCompleted: boolean;
    hasContent: boolean;
}

/**
 * Master step interface
 */
export interface MasterStep {
    id: number;
    title: string;
    description: string;
    icon: string;
    subSteps: number[];
}

/**
 * Master step completion status
 */
export interface MasterStepCompletion {
    masterStepId: number;
    isFullyComplete: boolean;
    isPartiallyComplete: boolean;
    completedCount: number;
    totalCount: number;
    percentage: number;
}

/**
 * Overall master step progress
 */
export interface MasterStepProgress {
    completedMasterSteps: number;
    totalMasterSteps: number;
    percentage: number;
    masterStepCompletions: MasterStepCompletion[];
}

/**
 * Calculate completion percentage
 * Note: Step 15 (Analytics) is not counted in completion as it's always accessible
 */
export function calculateCompletionPercentage(
    completionStatus: StepCompletion[]
): number {
    const completableSteps = 14; // Steps 1-14 (Step 15 is analytics/viewing)
    const completedSteps = completionStatus.filter(
        (s) => s.step !== 15 && s.isCompleted
    ).length;

    return Math.round((completedSteps / completableSteps) * 100);
}
