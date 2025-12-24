"use client";

/**
 * Version History Panel
 * Slide-out panel for browsing and restoring page versions
 */

import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, History } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useVersionHistory } from "../hooks/use-version-history";
import { VersionListItem } from "./version-list-item";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VersionHistoryPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pageId: string;
    onRestore: (html: string, version: number) => void;
}

export function VersionHistoryPanel({
    open,
    onOpenChange,
    pageId,
    onRestore,
}: VersionHistoryPanelProps) {
    const { toast } = useToast();
    const { versions, pagination, isLoading, error, fetchVersions, restoreVersion } =
        useVersionHistory({ pageId });

    const [isRestoring, setIsRestoring] = useState(false);
    const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

    // Fetch versions when panel opens
    useEffect(() => {
        if (open) {
            fetchVersions();
        }
    }, [open, fetchVersions]);

    const handleRestore = async (versionId: string) => {
        setIsRestoring(true);
        setConfirmRestore(null);

        const result = await restoreVersion(versionId);

        if (result) {
            onRestore(result.html, result.version);
            toast({
                title: "Version restored",
                description: `Page has been restored to version ${result.version}.`,
            });
            onOpenChange(false);
        } else {
            toast({
                title: "Failed to restore",
                description: "Could not restore to this version. Please try again.",
                variant: "destructive",
            });
        }

        setIsRestoring(false);
    };

    const handlePageChange = (newPage: number) => {
        fetchVersions(newPage);
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Version History
                        </SheetTitle>
                        <SheetDescription>
                            Browse and restore previous versions of this page
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 flex flex-col h-[calc(100vh-180px)]">
                        {/* Version List */}
                        <div className="flex-1 overflow-auto space-y-2 pr-2">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-destructive">{error}</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => fetchVersions()}
                                    >
                                        Retry
                                    </Button>
                                </div>
                            ) : versions.length === 0 ? (
                                <div className="text-center py-8">
                                    <History className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        No version history yet
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Versions are created when you edit the page
                                    </p>
                                </div>
                            ) : (
                                versions.map((version, index) => (
                                    <VersionListItem
                                        key={version.id}
                                        version={version}
                                        isLatest={index === 0 && pagination?.page === 1}
                                        onRestore={() => setConfirmRestore(version.id)}
                                        isRestoring={isRestoring}
                                    />
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between border-t pt-4 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        handlePageChange(pagination.page - 1)
                                    }
                                    disabled={pagination.page === 1 || isLoading}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        handlePageChange(pagination.page + 1)
                                    }
                                    disabled={
                                        pagination.page === pagination.totalPages ||
                                        isLoading
                                    }
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Restore Confirmation Dialog */}
            <AlertDialog
                open={!!confirmRestore}
                onOpenChange={(open) => !open && setConfirmRestore(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restore this version?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will replace your current page content with this
                            version. Your current content will be saved as a new version
                            before restoring.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() =>
                                confirmRestore && handleRestore(confirmRestore)
                            }
                            disabled={isRestoring}
                        >
                            {isRestoring ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Restoring...
                                </>
                            ) : (
                                "Restore"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
