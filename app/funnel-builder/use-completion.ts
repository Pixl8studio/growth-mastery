/**
 * Custom hook for loading step completion status
 * Use this in all step pages to track completion
 */

import { useEffect, useState } from "react";
import { getStepCompletionStatus } from "./completion-utils";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Real-time subscription to completion updates
    useEffect(() => {
        if (!projectId) return;

        const supabase = createClient();

        // Subscribe to changes in relevant tables
        const channel = supabase
            .channel("completion-updates")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    filter: `funnel_project_id=eq.${projectId}`,
                },
                () => {
                    logger.info({ projectId }, "Completion status changed, refreshing");
                    loadCompletion();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    return { completedSteps, isLoading, refreshCompletion: loadCompletion };
}
