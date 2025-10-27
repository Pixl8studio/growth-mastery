"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
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
                console.error("Failed to load completion status:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCompletion();
    }, [project.id]);

    return (
        <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
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
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {/* Completion Percentage */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Completion</span>
                            <span className="font-medium text-blue-600">
                                {isLoading ? "..." : `${completionPercentage}%`}
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last updated</span>
                        <span className="font-medium text-gray-900">
                            {formatDate(project.updated_at)}
                        </span>
                    </div>
                </div>

                <div className="mt-6 flex space-x-2">
                    <Link href={`/funnel-builder/${project.id}`} className="flex-1">
                        <Button variant="default" className="w-full" size="sm">
                            Continue
                        </Button>
                    </Link>
                    {project.status === "active" && (
                        <Link
                            href={`/funnel-builder/${project.id}/analytics`}
                            className="flex-1"
                        >
                            <Button variant="outline" className="w-full" size="sm">
                                Analytics
                            </Button>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
