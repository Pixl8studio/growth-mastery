/**
 * Custom hook for loading step completion status
 * Use this in all step pages to track completion
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getStepCompletionStatus } from "./completion-utils";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useStepCompletion(projectId: string) {
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Track subscription state to prevent cleanup race condition (Issue #335)
    const channelRef = useRef<RealtimeChannel | null>(null);
    const isSubscribedRef = useRef(false);
    const shouldUnsubscribeRef = useRef(false);

    const loadCompletion = useCallback(async () => {
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
    }, [projectId]);

    useEffect(() => {
        loadCompletion();
    }, [loadCompletion]);

    // Real-time subscription to completion updates
    useEffect(() => {
        if (!projectId) return;

        const supabase = createClient();

        // Reset state for new subscription
        isSubscribedRef.current = false;
        shouldUnsubscribeRef.current = false;

        // Subscribe to changes in relevant tables
        const channel = supabase
            .channel(`completion-updates-${projectId}`)
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
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    isSubscribedRef.current = true;
                    // Check if cleanup was requested while we were connecting
                    if (shouldUnsubscribeRef.current && channelRef.current) {
                        logger.info(
                            { projectId },
                            "Deferred channel cleanup after subscription completed"
                        );
                        supabase.removeChannel(channelRef.current);
                        channelRef.current = null;
                    }
                } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    logger.warn(
                        { projectId, status },
                        "Supabase channel subscription failed"
                    );
                    isSubscribedRef.current = false;
                }
            });

        channelRef.current = channel;

        return () => {
            // Only remove channel if it's fully subscribed
            // Otherwise, mark for deferred cleanup to avoid WebSocket race condition
            if (isSubscribedRef.current && channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            } else if (channelRef.current) {
                // Connection not yet established - defer cleanup
                shouldUnsubscribeRef.current = true;
                logger.info(
                    { projectId },
                    "Deferring channel cleanup until subscription completes"
                );
            }
            isSubscribedRef.current = false;
        };
    }, [projectId, loadCompletion]);

    return { completedSteps, isLoading, refreshCompletion: loadCompletion };
}
