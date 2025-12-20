"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Copy, MoreVertical, Settings, Trash2 } from "lucide-react";
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

interface ProjectCardProps {
    project: {
        id: string;
        name: string;
        status: string;
        current_step: number;
        updated_at: string;
    };
}

export function ProjectCard({ project }: ProjectCardProps) {
    const [completionPercentage, setCompletionPercentage] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

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

    return (
        <Card className="shadow-soft hover:shadow-float transition-smooth hover:-translate-y-2 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg flex-1 min-w-0 truncate">
                        {project.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    aria-label="Funnel options"
                                >
                                    <MoreVertical className="h-5 w-5" />
                                </button>
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
                                <DropdownMenuItem className="flex items-center gap-2">
                                    <Copy className="h-4 w-4" />
                                    Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-2">
                                    <Archive className="h-4 w-4" />
                                    Archive
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="flex items-center gap-2 text-red-600 focus:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
    );
}
