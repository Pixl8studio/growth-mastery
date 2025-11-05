/**
 * Type definitions for auto-generation progress tracking
 */

export interface GenerationProgressItem {
    step: number;
    stepName: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    error?: string;
    completedAt?: string;
}

export interface GenerationStatusResponse {
    isGenerating: boolean;
    currentStep: number | null;
    completedSteps: number[];
    failedSteps: Array<{ step: number; error: string }>;
    progress: GenerationProgressItem[];
    startedAt: string | null;
}

export interface AutoGenerationStatus {
    is_generating: boolean;
    current_step: number | null;
    generated_steps: number[];
    generation_errors: Array<{ step: number; error: string }>;
    progress: GenerationProgressItem[];
    started_at: string;
    last_generated_at?: string;
    intake_id_used?: string;
    regeneration_count?: number;
}
