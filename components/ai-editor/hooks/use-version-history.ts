"use client";

/**
 * useVersionHistory Hook
 * Manages version history state for the AI editor
 */

import { useState, useCallback } from "react";
import { logger } from "@/lib/client-logger";

export interface AIEditorVersion {
    id: string;
    version: number;
    change_description: string | null;
    created_at: string;
    html_content?: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

interface UseVersionHistoryOptions {
    pageId: string;
}

interface UseVersionHistoryReturn {
    versions: AIEditorVersion[];
    pagination: Pagination | null;
    isLoading: boolean;
    error: string | null;
    fetchVersions: (page?: number) => Promise<void>;
    getVersionHtml: (versionId: string) => Promise<string | null>;
    restoreVersion: (
        versionId: string
    ) => Promise<{ html: string; version: number } | null>;
}

export function useVersionHistory({
    pageId,
}: UseVersionHistoryOptions): UseVersionHistoryReturn {
    const [versions, setVersions] = useState<AIEditorVersion[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchVersions = useCallback(
        async (page = 1) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/ai-editor/pages/${pageId}/versions?page=${page}`
                );

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Failed to fetch versions");
                }

                const data = await response.json();
                setVersions(data.versions);
                setPagination(data.pagination);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to fetch versions";
                setError(message);
                logger.error({ error: err, pageId }, "Failed to fetch version history");
            } finally {
                setIsLoading(false);
            }
        },
        [pageId]
    );

    const getVersionHtml = useCallback(
        async (versionId: string): Promise<string | null> => {
            try {
                const response = await fetch(
                    `/api/ai-editor/pages/${pageId}/versions/${versionId}`
                );

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Failed to fetch version");
                }

                const data = await response.json();
                return data.version.html_content;
            } catch (err) {
                logger.error(
                    { error: err, pageId, versionId },
                    "Failed to get version HTML"
                );
                return null;
            }
        },
        [pageId]
    );

    const restoreVersion = useCallback(
        async (
            versionId: string
        ): Promise<{ html: string; version: number } | null> => {
            try {
                const response = await fetch(
                    `/api/ai-editor/pages/${pageId}/versions/${versionId}`,
                    {
                        method: "POST",
                    }
                );

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Failed to restore version");
                }

                const data = await response.json();
                return {
                    html: data.page.html_content,
                    version: data.page.version,
                };
            } catch (err) {
                logger.error(
                    { error: err, pageId, versionId },
                    "Failed to restore version"
                );
                return null;
            }
        },
        [pageId]
    );

    return {
        versions,
        pagination,
        isLoading,
        error,
        fetchVersions,
        getVersionHtml,
        restoreVersion,
    };
}
