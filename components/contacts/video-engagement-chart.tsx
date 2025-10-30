/**
 * Video Engagement Chart Component
 * Visualize video watch progress and drop-off points
 */

"use client";

import { Badge } from "@/components/ui/badge";

interface VideoEngagementChartProps {
    watchPercentage: number;
    completionEvents: number[];
    replayCount: number;
}

export function VideoEngagementChart({
    watchPercentage,
    completionEvents,
    replayCount,
}: VideoEngagementChartProps) {
    const milestones = [0, 25, 50, 75, 100];

    const getMilestoneStatus = (
        milestone: number
    ): "reached" | "dropped" | "pending" => {
        if (completionEvents.includes(milestone)) {
            return "reached";
        }
        if (milestone <= watchPercentage) {
            return "reached";
        }
        if (milestone > watchPercentage && watchPercentage > 0) {
            return "dropped";
        }
        return "pending";
    };

    const getDropOffPoint = (): number | null => {
        if (watchPercentage === 100) return null;
        if (watchPercentage >= 75) return 75;
        if (watchPercentage >= 50) return 50;
        if (watchPercentage >= 25) return 25;
        if (watchPercentage > 0) return 0;
        return null;
    };

    const dropOffPoint = getDropOffPoint();

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium text-foreground">
                        Watch Progress: {watchPercentage}%
                    </h4>
                    {dropOffPoint !== null && watchPercentage < 100 && (
                        <p className="mt-1 text-sm text-red-600">
                            ⚠️ Dropped off after {dropOffPoint}% milestone
                        </p>
                    )}
                    {watchPercentage === 100 && (
                        <p className="mt-1 text-sm text-green-600">
                            ✓ Completed entire video
                        </p>
                    )}
                </div>
                {replayCount > 0 && (
                    <Badge variant="default">
                        {replayCount} {replayCount === 1 ? "replay" : "replays"}
                    </Badge>
                )}
            </div>

            {/* Progress Bar with Milestones */}
            <div className="relative pt-4">
                {/* Milestone markers */}
                <div className="relative h-12">
                    <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gray-200">
                        {/* Progress fill */}
                        <div
                            className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                            style={{ width: `${watchPercentage}%` }}
                        />
                    </div>

                    {/* Milestone dots */}
                    {milestones.map((milestone) => {
                        const status = getMilestoneStatus(milestone);
                        return (
                            <div
                                key={milestone}
                                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${milestone}%` }}
                            >
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                                        status === "reached"
                                            ? "border-green-600 bg-green-600 text-white"
                                            : status === "dropped"
                                              ? "border-red-500 bg-red-50 text-red-600"
                                              : "border-border bg-card text-muted-foreground"
                                    }`}
                                >
                                    {milestone}
                                </div>
                                <div className="mt-1 text-center text-xs text-muted-foreground">
                                    {status === "reached" &&
                                        milestone === dropOffPoint && (
                                            <span className="text-red-600">
                                                Drop-off
                                            </span>
                                        )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Milestone Details */}
            <div className="grid grid-cols-5 gap-4">
                {milestones.map((milestone) => {
                    const status = getMilestoneStatus(milestone);
                    const isDropOff =
                        milestone === dropOffPoint && watchPercentage < 100;

                    return (
                        <div key={milestone} className="text-center">
                            <div className="text-xs font-medium text-muted-foreground">
                                {milestone}%
                            </div>
                            <div className="mt-1">
                                {status === "reached" && !isDropOff && (
                                    <Badge variant="success" className="text-xs">
                                        ✓ Watched
                                    </Badge>
                                )}
                                {status === "reached" && isDropOff && (
                                    <Badge variant="warning" className="text-xs">
                                        ⚠ Left here
                                    </Badge>
                                )}
                                {status === "pending" && (
                                    <Badge variant="secondary" className="text-xs">
                                        Not reached
                                    </Badge>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Insights */}
            <div className="rounded-lg bg-primary/5 p-4">
                <h5 className="mb-2 text-sm font-semibold text-primary">Insights</h5>
                <ul className="space-y-1 text-sm text-primary">
                    {watchPercentage === 0 && (
                        <li>
                            • Contact registered but hasn&apos;t watched the video yet
                        </li>
                    )}
                    {watchPercentage > 0 && watchPercentage < 25 && (
                        <li>
                            • Contact dropped off very early - consider improving video
                            hook
                        </li>
                    )}
                    {watchPercentage >= 25 && watchPercentage < 50 && (
                        <li>• Contact watched opening but lost interest mid-way</li>
                    )}
                    {watchPercentage >= 50 && watchPercentage < 75 && (
                        <li>• Contact showed good interest, consider stronger CTA</li>
                    )}
                    {watchPercentage >= 75 && watchPercentage < 100 && (
                        <li>• High engagement! Contact almost completed the video</li>
                    )}
                    {watchPercentage === 100 && (
                        <li>• Excellent! Contact watched the entire video</li>
                    )}
                    {replayCount > 0 && (
                        <li>
                            • Contact replayed the video {replayCount}{" "}
                            {replayCount === 1 ? "time" : "times"} - very interested!
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
