/**
 * Custom hook for loading step completion status
 * Use this in all step pages to track completion
 */

import { useEffect, useState } from "react";
import { getStepCompletionStatus } from "./completion-utils";
import { logger } from "@/lib/client-logger";

export function useStepCompletion(projectId: string) {
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadCompletion = async () => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }

        try {
            const completionStatus = await getStepCompletionStatus(projectId);
            const completed = completionStatus
                .filter((s) => s.isCompleted)
                .map((s) => s.step);
            setCompletedSteps(completed);
        } catch (error) {
            logger.error({ error }, "Failed to load completion status");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCompletion();
    }, [projectId]);

    return { completedSteps, isLoading, refreshCompletion: loadCompletion };
}
