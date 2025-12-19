/**
 * Presentation-related constants and types
 *
 * These are shared across frontend and backend to ensure consistency
 * in presentation generation limits and status handling.
 */

/**
 * Maximum number of presentations allowed per funnel.
 * This limit helps manage resource usage and prevents abuse.
 */
export const PRESENTATION_LIMIT = 3;

/**
 * Presentation status values.
 * Used for type-safe status transitions throughout the application.
 */
export const PresentationStatus = {
    DRAFT: "draft",
    GENERATING: "generating",
    COMPLETED: "completed",
    FAILED: "failed",
    PAUSED: "paused",
} as const;

export type PresentationStatusType =
    (typeof PresentationStatus)[keyof typeof PresentationStatus];

/**
 * Check if a presentation counts toward the generation quota.
 * Failed presentations don't count, but paused ones do since they
 * represent in-progress work that can be resumed.
 */
export function countsTowardQuota(status: PresentationStatusType): boolean {
    return status !== PresentationStatus.FAILED;
}

/**
 * Check if a presentation can be resumed.
 */
export function canResume(status: PresentationStatusType): boolean {
    return (
        status === PresentationStatus.PAUSED || status === PresentationStatus.GENERATING
    );
}

/**
 * Check if a presentation is in a terminal state.
 */
export function isTerminalState(status: PresentationStatusType): boolean {
    return (
        status === PresentationStatus.COMPLETED || status === PresentationStatus.FAILED
    );
}
