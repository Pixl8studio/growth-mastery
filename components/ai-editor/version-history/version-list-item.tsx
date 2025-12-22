"use client";

/**
 * Version List Item
 * Individual version card in the history panel
 */

import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { RotateCcw, Clock } from "lucide-react";
import type { AIEditorVersion } from "../hooks/use-version-history";

interface VersionListItemProps {
    version: AIEditorVersion;
    isLatest: boolean;
    onRestore: (versionId: string) => void;
    isRestoring: boolean;
}

export function VersionListItem({
    version,
    isLatest,
    onRestore,
    isRestoring,
}: VersionListItemProps) {
    const timeAgo = formatDistanceToNow(new Date(version.created_at), {
        addSuffix: true,
    });

    return (
        <div className="group flex items-start justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-muted/50">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-primary/10 px-2 text-xs font-medium text-primary">
                        v{version.version}
                    </span>
                    {isLatest && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Current
                        </span>
                    )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {version.change_description || "No description"}
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{timeAgo}</span>
                </div>
            </div>
            {!isLatest && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRestore(version.id)}
                    disabled={isRestoring}
                >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Restore
                </Button>
            )}
        </div>
    );
}
