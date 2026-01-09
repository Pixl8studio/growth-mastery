/**
 * Shared types and utilities for funnel completion tracking
 */

/**
 * Business profile completion status structure
 * Tracks completion percentage for each section of the profile
 */
export interface BusinessProfileCompletionStatus {
    overall: number;
    sections?: {
        basicInfo?: number;
        targetAudience?: number;
        productService?: number;
        brandVoice?: number;
        goals?: number;
    };
}

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
 */
export function calculateCompletionPercentage(
    completionStatus: StepCompletion[]
): number {
    const completableSteps = 14; // Steps 1-14
    const completedSteps = completionStatus.filter((s) => s.isCompleted).length;

    return Math.round((completedSteps / completableSteps) * 100);
}
