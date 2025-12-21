/**
 * General Settings Component
 *
 * Funnel management settings including rename and delete functionality.
 * Lives in the "General" tab of funnel settings.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Trash2, AlertTriangle } from "lucide-react";
import {
    renameFunnel,
    getFunnelDetails,
    TRASH_RETENTION_DAYS,
} from "@/app/funnel-builder/actions";
import { DeleteFunnelDialog } from "@/components/funnel/delete-funnel-dialog";
import { logger } from "@/lib/client-logger";

interface GeneralSettingsProps {
    projectId: string;
}

export function GeneralSettings({ projectId }: GeneralSettingsProps) {
    const router = useRouter();
    const [funnel, setFunnel] = useState<{
        name: string;
        slug: string;
        status: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadFunnel = async () => {
            try {
                const result = await getFunnelDetails(projectId);
                if (result.success && result.funnel) {
                    setFunnel({
                        name: result.funnel.name,
                        slug: result.funnel.slug,
                        status: result.funnel.status,
                    });
                    setEditedName(result.funnel.name);
                }
            } catch (err) {
                logger.error({ error: err }, "Failed to load funnel details");
            } finally {
                setIsLoading(false);
            }
        };

        loadFunnel();
    }, [projectId]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleStartEditing = () => {
        if (funnel) {
            setEditedName(funnel.name);
        }
        setError(null);
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        if (funnel) {
            setEditedName(funnel.name);
        }
        setError(null);
        setIsEditing(false);
    };

    const handleSaveRename = async () => {
        if (!funnel) return;

        const trimmedName = editedName.trim();

        if (!trimmedName) {
            setError("Name cannot be empty");
            return;
        }

        if (trimmedName === funnel.name) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const result = await renameFunnel(projectId, trimmedName);
            logger.info(
                { projectId, newName: trimmedName, newSlug: result.newSlug },
                "Funnel renamed from settings"
            );
            setFunnel({
                ...funnel,
                name: trimmedName,
                slug: result.newSlug,
            });
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            logger.error({ error: err }, "Failed to rename funnel");
            setError(err instanceof Error ? err.message : "Failed to rename");
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSaveRename();
        } else if (e.key === "Escape") {
            handleCancelEditing();
        }
    };

    const handleDeleted = () => {
        router.push("/funnel-builder");
    };

    if (isLoading) {
        return (
            <div className="rounded-lg border border-border bg-card p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-1/3 rounded bg-muted"></div>
                    <div className="h-10 w-full rounded bg-muted"></div>
                </div>
            </div>
        );
    }

    if (!funnel) {
        return (
            <div className="rounded-lg border border-border bg-card p-6">
                <p className="text-muted-foreground">Failed to load funnel settings</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Funnel Name Section */}
            <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground">Funnel Name</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    The name of your funnel as it appears in your dashboard
                </p>

                <div className="mt-4">
                    {isEditing ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1 rounded-md border border-primary px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    disabled={isSaving}
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleSaveRename}
                                    disabled={isSaving}
                                >
                                    <Check className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleCancelEditing}
                                    disabled={isSaving}
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Note: Renaming will also update the funnel URL slug
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">
                                    {funnel.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Slug: {funnel.slug}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleStartEditing}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-destructive">
                            Danger Zone
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Deleting your funnel will move it to trash. You have{" "}
                            {TRASH_RETENTION_DAYS} days to recover it before permanent
                            deletion.
                        </p>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="mt-4"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Funnel
                        </Button>
                    </div>
                </div>
            </div>

            <DeleteFunnelDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                funnelId={projectId}
                funnelName={funnel.name}
                isPublished={funnel.status === "active"}
                onDeleted={handleDeleted}
            />
        </div>
    );
}
