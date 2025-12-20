"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Archive,
    Check,
    Copy,
    MoreVertical,
    Pencil,
    Settings,
    Trash2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { logger } from "@/lib/client-logger";
import { getStepCompletionStatus } from "@/app/funnel-builder/completion-utils";
import { calculateCompletionPercentage } from "@/app/funnel-builder/completion-types";
import { renameFunnel } from "@/app/funnel-builder/actions";
import { DeleteFunnelDialog } from "@/components/funnel/delete-funnel-dialog";

type ProjectStatus = "active" | "archived" | "draft";

interface ProjectCardProps {
    project: {
        id: string;
        name: string;
        status: ProjectStatus;
        current_step: number;
        updated_at: string;
    };
}

export function ProjectCard({ project }: ProjectCardProps) {
    const router = useRouter();
    const [completionPercentage, setCompletionPercentage] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(project.name);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadCompletion = async () => {
            try {
                const completionStatus = await getStepCompletionStatus(project.id);
                const percentage = calculateCompletionPercentage(completionStatus);
                setCompletionPercentage(percentage);
            } catch (error) {
                logger.error(
                    { error, projectId: project.id },
                    "Failed to load completion status"
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadCompletion();
    }, [project.id]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleStartEditing = () => {
        setEditedName(project.name);
        setError(null);
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setEditedName(project.name);
        setError(null);
        setIsEditing(false);
    };

    const handleSaveRename = async () => {
        const trimmedName = editedName.trim();

        if (!trimmedName) {
            setError("Name cannot be empty");
            return;
        }

        if (trimmedName === project.name) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const result = await renameFunnel(project.id, trimmedName);
            logger.info(
                { projectId: project.id, newName: trimmedName, newSlug: result.newSlug },
                "Funnel renamed"
            );
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            logger.error({ error: err, projectId: project.id }, "Failed to rename funnel");
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

    const handleDuplicate = async () => {
        // TODO: Implement duplicate functionality
        // - Call API to duplicate project
        // - Navigate to new project or show success toast
        logger.info({ projectId: project.id }, "Duplicate project clicked");
    };

    const handleArchive = async () => {
        if (
            !confirm(
                `Archive "${project.name}"? You can restore it later from the archived projects list.`
            )
        ) {
            return;
        }

        // TODO: Implement archive functionality
        // - Call API to update project status to 'archived'
        // - Refresh the project list or remove from current view
        logger.info({ projectId: project.id }, "Archive project confirmed");
    };

    const handleDeleted = () => {
        router.refresh();
    };

    return (
        <>
            <Card className="shadow-soft hover:shadow-float transition-smooth hover:-translate-y-2 border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={editedName}
                                            onChange={(e) => setEditedName(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            onBlur={() => {
                                                if (!isSaving) {
                                                    // Delay to allow button clicks to register
                                                    setTimeout(() => {
                                                        if (!isSaving) {
                                                            handleCancelEditing();
                                                        }
                                                    }, 150);
                                                }
                                            }}
                                            className="w-full rounded-md border border-primary px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                            disabled={isSaving}
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 shrink-0"
                                            onClick={handleSaveRename}
                                            disabled={isSaving}
                                        >
                                            <Check className="h-4 w-4 text-primary" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 shrink-0"
                                            onClick={handleCancelEditing}
                                            disabled={isSaving}
                                        >
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                    {error && (
                                        <p className="text-xs text-destructive">{error}</p>
                                    )}
                                </div>
                            ) : (
                                <CardTitle className="text-lg truncate">
                                    {project.name}
                                </CardTitle>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Badge
                                variant={
                                    project.status === "active"
                                        ? "success"
                                        : project.status === "archived"
                                          ? "secondary"
                                          : "default"
                                }
                            >
                                {project.status}
                            </Badge>

                            {!isEditing && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            aria-label="Funnel options"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">Open menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href={`/funnel-builder/${project.id}/settings`}
                                                className="flex items-center gap-2"
                                            >
                                                <Settings className="h-4 w-4" />
                                                Settings
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleStartEditing}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="flex items-center gap-2"
                                            onClick={handleDuplicate}
                                        >
                                            <Copy className="h-4 w-4" />
                                            Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="flex items-center gap-2"
                                            onClick={handleArchive}
                                        >
                                            <Archive className="h-4 w-4" />
                                            Archive
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => setShowDeleteDialog(true)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {/* Completion Percentage */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Completion</span>
                                <span className="font-medium text-primary">
                                    {isLoading ? "..." : `${completionPercentage}%`}
                                </span>
                            </div>
                            {/* Progress Bar */}
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                                <div
                                    className="h-full rounded-full gradient-emerald transition-all duration-500 shadow-soft"
                                    style={{ width: `${completionPercentage}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Last updated</span>
                            <span
                                className="font-medium text-foreground"
                                suppressHydrationWarning
                            >
                                {formatDate(project.updated_at)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 flex space-x-2">
                        <Link href={`/funnel-builder/${project.id}`} className="flex-1">
                            <Button
                                variant="default"
                                className="w-full transition-smooth"
                                size="sm"
                            >
                                Continue
                            </Button>
                        </Link>
                        {project.status === "active" && (
                            <Link
                                href={`/funnel-builder/${project.id}/analytics`}
                                className="flex-1"
                            >
                                <Button
                                    variant="outline"
                                    className="w-full transition-smooth"
                                    size="sm"
                                >
                                    Analytics
                                </Button>
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>

            <DeleteFunnelDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                funnelId={project.id}
                funnelName={project.name}
                isPublished={project.status === "active"}
                onDeleted={handleDeleted}
            />
        </>
    );
}
