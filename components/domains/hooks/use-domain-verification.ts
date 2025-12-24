"use client";

/**
 * useDomainVerification Hook
 * Polls domain verification status with automatic retry and exponential backoff
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/client-logger";

interface DomainVerificationState {
    status: "pending" | "verified" | "failed" | "idle";
    isPolling: boolean;
    error: string | null;
    lastCheckedAt: Date | null;
}

interface UseDomainVerificationOptions {
    domainId: string;
    enabled?: boolean;
    initialStatus?: "pending" | "verified" | "failed";
    pollingInterval?: number; // ms, default 30000 (30 seconds)
    maxAttempts?: number; // default 20 (10 minutes at 30s intervals)
    onVerified?: () => void;
    onFailed?: (error: string) => void;
}

interface UseDomainVerificationReturn extends DomainVerificationState {
    startPolling: () => void;
    stopPolling: () => void;
    checkNow: () => Promise<boolean>;
}

export function useDomainVerification({
    domainId,
    enabled = true,
    initialStatus = "pending",
    pollingInterval = 30000,
    maxAttempts = 20,
    onVerified,
    onFailed,
}: UseDomainVerificationOptions): UseDomainVerificationReturn {
    const [state, setState] = useState<DomainVerificationState>({
        status: initialStatus,
        isPolling: false,
        error: null,
        lastCheckedAt: null,
    });

    const attemptCountRef = useRef(0);
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    // Single verification check
    const checkVerification = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch(`/api/domains/${domainId}/verify`, {
                method: "POST",
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Verification check failed");
            }

            const data = await response.json();
            const verified = data.verified === true;
            const verificationStatus = verified ? "verified" : "pending";

            if (mountedRef.current) {
                setState((prev) => ({
                    ...prev,
                    status: verificationStatus,
                    lastCheckedAt: new Date(),
                    error: null,
                }));

                if (verified) {
                    logger.info({ domainId }, "Domain verified successfully");
                    onVerified?.();
                }
            }

            return verified;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

            if (mountedRef.current) {
                setState((prev) => ({
                    ...prev,
                    error: errorMessage,
                    lastCheckedAt: new Date(),
                }));
            }

            logger.error({ error, domainId }, "Domain verification check failed");
            return false;
        }
    }, [domainId, onVerified]);

    // Start polling
    const startPolling = useCallback(() => {
        if (state.status === "verified") {
            return; // Already verified, no need to poll
        }

        attemptCountRef.current = 0;
        setState((prev) => ({ ...prev, isPolling: true, error: null }));

        const poll = async () => {
            if (!mountedRef.current) return;

            attemptCountRef.current += 1;

            const verified = await checkVerification();

            if (verified) {
                // Domain verified, stop polling
                if (mountedRef.current) {
                    setState((prev) => ({ ...prev, isPolling: false }));
                }
                return;
            }

            if (attemptCountRef.current >= maxAttempts) {
                // Max attempts reached
                if (mountedRef.current) {
                    setState((prev) => ({
                        ...prev,
                        isPolling: false,
                        status: "failed",
                        error: "Verification timed out. Please check your DNS settings and try again.",
                    }));
                    onFailed?.(
                        "Verification timed out. Please check your DNS settings and try again."
                    );
                }
                return;
            }

            // Schedule next poll
            pollingTimeoutRef.current = setTimeout(poll, pollingInterval);
        };

        // Start first poll immediately
        poll();
    }, [checkVerification, maxAttempts, pollingInterval, state.status, onFailed]);

    // Stop polling
    const stopPolling = useCallback(() => {
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
        setState((prev) => ({ ...prev, isPolling: false }));
    }, []);

    // Check now (manual check)
    const checkNow = useCallback(async (): Promise<boolean> => {
        return checkVerification();
    }, [checkVerification]);

    // Auto-start polling if enabled and status is pending
    useEffect(() => {
        if (enabled && initialStatus === "pending") {
            startPolling();
        }

        return () => {
            mountedRef.current = false;
            stopPolling();
        };
    }, [enabled, initialStatus, startPolling, stopPolling]);

    return {
        ...state,
        startPolling,
        stopPolling,
        checkNow,
    };
}
