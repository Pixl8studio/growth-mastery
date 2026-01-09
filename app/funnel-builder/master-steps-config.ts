/**
 * Master Step Configuration
 * Defines the 5 master steps and their sub-step mappings
 */

/**
 * Total number of funnel steps in the wizard.
 * Update this constant when adding or removing steps.
 */
export const TOTAL_FUNNEL_STEPS = 12;

export interface MasterStepConfig {
    id: number;
    title: string;
    description: string;
    icon: string;
    subSteps: number[];
}

export const MASTER_STEPS: MasterStepConfig[] = [
    {
        id: 1,
        title: "Business Profile",
        description: "Define your business, offer, and brand identity",
        icon: "building",
        subSteps: [1, 2, 3],
    },
    {
        id: 2,
        title: "Presentation Materials",
        description: "Create your pitch presentation and video content",
        icon: "presentation",
        subSteps: [4, 5, 6],
    },
    {
        id: 3,
        title: "Funnel Pages",
        description: "Build enrollment, watch room, and registration pages",
        icon: "layout",
        subSteps: [7, 8, 9],
    },
    {
        id: 4,
        title: "Traffic Agents",
        description: "Set up AI follow-up, content engine, and ads",
        icon: "users",
        subSteps: [10, 11, 12],
    },
];

/**
 * Get the master step for a given sub-step number
 */
export function getMasterStepForSubStep(subStep: number): MasterStepConfig | null {
    return MASTER_STEPS.find((master) => master.subSteps.includes(subStep)) || null;
}

/**
 * Get master step by ID
 */
export function getMasterStepById(id: number): MasterStepConfig | null {
    return MASTER_STEPS.find((master) => master.id === id) || null;
}

/**
 * Calculate completion status for a master step
 */
export function calculateMasterStepCompletion(
    masterStep: MasterStepConfig,
    completedSubSteps: number[]
): {
    isFullyComplete: boolean;
    isPartiallyComplete: boolean;
    completedCount: number;
    totalCount: number;
    percentage: number;
} {
    const completedCount = masterStep.subSteps.filter((step) =>
        completedSubSteps.includes(step)
    ).length;
    const totalCount = masterStep.subSteps.length;
    const isFullyComplete = completedCount === totalCount;
    const isPartiallyComplete = completedCount > 0 && completedCount < totalCount;
    const percentage =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
        isFullyComplete,
        isPartiallyComplete,
        completedCount,
        totalCount,
        percentage,
    };
}

/**
 * Get the first incomplete sub-step in a master step
 */
export function getFirstIncompleteSubStep(
    masterStep: MasterStepConfig,
    completedSubSteps: number[]
): number {
    const incompleteStep = masterStep.subSteps.find(
        (step) => !completedSubSteps.includes(step)
    );
    return incompleteStep || masterStep.subSteps[0];
}

/**
 * Calculate overall funnel completion based on master steps
 */
export function calculateOverallCompletion(completedSubSteps: number[]): {
    completedMasterSteps: number;
    totalMasterSteps: number;
    percentage: number;
} {
    const completedMasterSteps = MASTER_STEPS.filter((master) => {
        const completion = calculateMasterStepCompletion(master, completedSubSteps);
        return completion.isFullyComplete;
    }).length;

    return {
        completedMasterSteps,
        totalMasterSteps: MASTER_STEPS.length,
        percentage: Math.round((completedMasterSteps / MASTER_STEPS.length) * 100),
    };
}
