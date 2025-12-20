/**
 * Trash Page
 *
 * Shows soft-deleted funnels with options to restore or permanently delete.
 * Funnels in trash are automatically deleted after 30 days.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertTriangle,
    Trash2,
    RotateCcw,
    Clock,
    FolderOpen,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    getDeletedFunnels,
    restoreFunnel,
    permanentlyDeleteFunnel,
} from "@/app/funnel-builder/actions";
import { logger } from "@/lib/client-logger";

interface DeletedFunnel {
    id: string;
    name: string;
    deleted_at: string;
    updated_at: string;
}

function getDaysUntilPermanentDeletion(deletedAt: string): number {
    const deletedDate = new Date(deletedAt);
    const expirationDate = new Date(deletedDate);
    expirationDate.setDate(expirationDate.getDate() + 30);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

function formatDeletedDate(deletedAt: string): string {
    return new Date(deletedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function TrashPage() {
    const [funnels, setFunnels] = useState<DeletedFunnel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<{
        open: boolean;
        funnel: DeletedFunnel | null;
    }>({ open: false, funnel: null });
    const [confirmText, setConfirmText] = useState("");

    useEffect(() => {
        loadFunnels();
    }, []);

    const loadFunnels = async () => {
        try {
            const result = await getDeletedFunnels();
            if (result.success) {
                setFunnels(result.funnels);
            }
        } catch (err) {
            logger.error({ error: err }, "Failed to load deleted funnels");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (funnel: DeletedFunnel) => {
        setActionInProgress(funnel.id);
        try {
            await restoreFunnel(funnel.id);
            logger.info({ funnelId: funnel.id }, "Funnel restored");
            setFunnels((prev) => prev.filter((f) => f.id !== funnel.id));
        } catch (err) {
            logger.error({ error: err }, "Failed to restore funnel");
        } finally {
            setActionInProgress(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!permanentDeleteDialog.funnel || confirmText !== "DELETE") return;

        const funnel = permanentDeleteDialog.funnel;
        setActionInProgress(funnel.id);

        try {
            await permanentlyDeleteFunnel(funnel.id);
            logger.info({ funnelId: funnel.id }, "Funnel permanently deleted");
            setFunnels((prev) => prev.filter((f) => f.id !== funnel.id));
            setPermanentDeleteDialog({ open: false, funnel: null });
            setConfirmText("");
        } catch (err) {
            logger.error({ error: err }, "Failed to permanently delete funnel");
        } finally {
            setActionInProgress(null);
        }
    };

    const openPermanentDeleteDialog = (funnel: DeletedFunnel) => {
        setPermanentDeleteDialog({ open: true, funnel });
        setConfirmText("");
    };

    const closePermanentDeleteDialog = () => {
        if (!actionInProgress) {
            setPermanentDeleteDialog({ open: false, funnel: null });
            setConfirmText("");
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Trash</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Deleted funnels are kept for 30 days before permanent deletion
                    </p>
                </div>
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-24 rounded-lg bg-muted"
                        ></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Trash</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Deleted funnels are kept for 30 days before permanent deletion
                </p>
            </div>

            {funnels.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <FolderOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                        <h3 className="text-lg font-medium text-foreground">
                            Trash is empty
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Deleted funnels will appear here for 30 days
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {funnels.map((funnel) => {
                        const daysLeft = getDaysUntilPermanentDeletion(funnel.deleted_at);
                        const isActionInProgress = actionInProgress === funnel.id;

                        return (
                            <Card key={funnel.id} className="border-border/50">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-base">
                                                {funnel.name}
                                            </CardTitle>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Deleted {formatDeletedDate(funnel.deleted_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span
                                                className={
                                                    daysLeft <= 7
                                                        ? "text-destructive font-medium"
                                                        : "text-muted-foreground"
                                                }
                                            >
                                                {daysLeft} days left
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRestore(funnel)}
                                            disabled={isActionInProgress}
                                        >
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            {isActionInProgress ? "Restoring..." : "Restore"}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => openPermanentDeleteDialog(funnel)}
                                            disabled={isActionInProgress}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Permanently
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Permanent Delete Confirmation Dialog */}
            <Dialog
                open={permanentDeleteDialog.open}
                onOpenChange={closePermanentDeleteDialog}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-center text-xl">
                            Permanently Delete Funnel
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Are you sure you want to permanently delete{" "}
                            <span className="font-semibold text-foreground">
                                &quot;{permanentDeleteDialog.funnel?.name}&quot;
                            </span>
                            ?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                            <p className="text-sm text-destructive">
                                <strong>This action cannot be undone.</strong> All pages,
                                offers, presentations, and associated data will be permanently
                                deleted.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="confirm-permanent-delete"
                                className="text-sm text-muted-foreground"
                            >
                                Type <span className="font-mono font-bold">DELETE</span> to
                                confirm
                            </label>
                            <input
                                id="confirm-permanent-delete"
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
                                placeholder="DELETE"
                                disabled={!!actionInProgress}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={closePermanentDeleteDialog}
                            disabled={!!actionInProgress}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handlePermanentDelete}
                            disabled={confirmText !== "DELETE" || !!actionInProgress}
                        >
                            {actionInProgress ? (
                                "Deleting..."
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Permanently
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
