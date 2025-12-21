/**
 * Delete Funnel Confirmation Dialog
 *
 * Requires user to type "DELETE" to confirm funnel deletion.
 * Shows warning about data loss and handles published funnels specially.
 */

"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { softDeleteFunnel, TRASH_RETENTION_DAYS } from "@/app/funnel-builder/actions";
import { logger } from "@/lib/client-logger";

interface DeleteFunnelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    funnelId: string;
    funnelName: string;
    isPublished: boolean;
    onDeleted?: () => void;
}

export function DeleteFunnelDialog({
    open,
    onOpenChange,
    funnelId,
    funnelName,
    isPublished,
    onDeleted,
}: DeleteFunnelDialogProps) {
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isConfirmed = confirmText === "DELETE";

    const handleDelete = async () => {
        if (!isConfirmed) return;

        setIsDeleting(true);
        setError(null);

        try {
            await softDeleteFunnel(funnelId);
            logger.info({ funnelId, funnelName }, "Funnel moved to trash");
            onOpenChange(false);
            setConfirmText("");
            onDeleted?.();
        } catch (err) {
            logger.error({ error: err, funnelId }, "Failed to delete funnel");
            setError(err instanceof Error ? err.message : "Failed to delete funnel");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        if (!isDeleting) {
            onOpenChange(false);
            setConfirmText("");
            setError(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-center text-xl">
                        Delete Funnel
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-foreground">
                            &quot;{funnelName}&quot;
                        </span>
                        ?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Warning message */}
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <p className="text-sm text-destructive">
                            <strong>Warning:</strong> This will move your funnel to
                            trash. All pages, offers, presentations, and funnel data
                            will be permanently deleted after {TRASH_RETENTION_DAYS}{" "}
                            days.
                        </p>
                        {isPublished && (
                            <p className="mt-2 text-sm font-medium text-destructive">
                                This funnel is currently live. Deleting it will
                                immediately unpublish all pages.
                            </p>
                        )}
                    </div>

                    {/* Confirmation input */}
                    <div className="space-y-2">
                        <label
                            htmlFor="confirm-delete"
                            className="text-sm text-muted-foreground"
                        >
                            Type <span className="font-mono font-bold">DELETE</span> to
                            confirm
                        </label>
                        <input
                            id="confirm-delete"
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
                            placeholder="DELETE"
                            disabled={isDeleting}
                            autoComplete="off"
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!isConfirmed || isDeleting}
                    >
                        {isDeleting ? (
                            "Deleting..."
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Funnel
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
