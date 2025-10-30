/**
 * Funnel Progression Timeline Component
 * Show contact's progression through the funnel stages
 */

"use client";

interface FunnelProgressionTimelineProps {
    contact: {
        current_stage: string;
        stages_completed: unknown;
        created_at: string;
        video_watched_at: string | null;
    };
}

export function FunnelProgressionTimeline({ contact }: FunnelProgressionTimelineProps) {
    const stages = [
        {
            key: "registered",
            title: "Registered",
            description: "Submitted registration form",
            icon: "📝",
        },
        {
            key: "watched",
            title: "Watched Video",
            description: "Viewed pitch video",
            icon: "▶️",
        },
        {
            key: "enrolled",
            title: "Viewed Enrollment",
            description: "Visited enrollment page",
            icon: "📄",
        },
        {
            key: "purchased",
            title: "Purchased",
            description: "Completed purchase",
            icon: "✅",
        },
    ];

    const stagesCompleted = Array.isArray(contact.stages_completed)
        ? contact.stages_completed
        : [];

    const isStageCompleted = (stageKey: string): boolean => {
        return stagesCompleted.includes(stageKey);
    };

    const isCurrentStage = (stageKey: string): boolean => {
        return contact.current_stage === stageKey;
    };

    const getDropOffStage = (): string | null => {
        const currentIndex = stages.findIndex((s) => s.key === contact.current_stage);
        if (currentIndex === stages.length - 1) {
            return null; // No drop-off, completed all stages
        }
        return stages[currentIndex + 1]?.key || null;
    };

    const dropOffStage = getDropOffStage();

    return (
        <div className="space-y-4">
            {/* Timeline */}
            <div className="relative">
                {stages.map((stage, index) => {
                    const isCompleted = isStageCompleted(stage.key);
                    const isCurrent = isCurrentStage(stage.key);
                    const isDropOff = stage.key === dropOffStage;
                    const isLast = index === stages.length - 1;

                    return (
                        <div key={stage.key} className="relative pb-8">
                            {/* Connector Line */}
                            {!isLast && (
                                <div
                                    className={`absolute left-4 top-8 h-full w-0.5 ${
                                        isCompleted ? "bg-green-500" : "bg-gray-300"
                                    }`}
                                />
                            )}

                            {/* Stage Item */}
                            <div className="relative flex items-start space-x-4">
                                {/* Icon Circle */}
                                <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-lg ${
                                        isCompleted
                                            ? "border-green-500 bg-green-500 text-white"
                                            : isCurrent
                                              ? "border-primary bg-primary/5 text-primary"
                                              : isDropOff
                                                ? "border-red-500 bg-red-50 text-red-600"
                                                : "border-border bg-muted/50 text-muted-foreground"
                                    }`}
                                >
                                    {stage.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-0.5">
                                    <div className="flex items-center justify-between">
                                        <h4
                                            className={`text-sm font-semibold ${
                                                isCompleted || isCurrent
                                                    ? "text-foreground"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {stage.title}
                                        </h4>
                                        {isCompleted && (
                                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                                Completed
                                            </span>
                                        )}
                                        {isCurrent && !isCompleted && (
                                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                Current
                                            </span>
                                        )}
                                        {isDropOff && (
                                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                                                ⚠ Didn&apos;t reach
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        {stage.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Drop-off Analysis */}
            {dropOffStage && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-start space-x-3">
                        <div className="text-2xl">⚠️</div>
                        <div className="flex-1">
                            <h5 className="text-sm font-semibold text-yellow-900">
                                Drop-off Point Detected
                            </h5>
                            <p className="mt-1 text-sm text-yellow-800">
                                Contact stopped at &quot;{contact.current_stage}&quot;
                                stage and hasn&apos;t progressed to &quot;
                                {stages.find((s) => s.key === dropOffStage)?.title ||
                                    dropOffStage}
                                &quot;. Consider:
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                                {contact.current_stage === "registered" && (
                                    <>
                                        <li>
                                            • Sending a reminder email to watch the
                                            video
                                        </li>
                                        <li>
                                            • Improving video thumbnail and description
                                        </li>
                                    </>
                                )}
                                {contact.current_stage === "watched" && (
                                    <>
                                        <li>
                                            • Following up with a personalized message
                                        </li>
                                        <li>• Highlighting the offer benefits</li>
                                    </>
                                )}
                                {contact.current_stage === "enrolled" && (
                                    <>
                                        <li>• Addressing potential pricing concerns</li>
                                        <li>• Offering a limited-time incentive</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {contact.current_stage === "purchased" && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start space-x-3">
                        <div className="text-2xl">🎉</div>
                        <div className="flex-1">
                            <h5 className="text-sm font-semibold text-green-900">
                                Conversion Complete!
                            </h5>
                            <p className="mt-1 text-sm text-green-800">
                                This contact has successfully completed the entire
                                funnel and made a purchase. Great job!
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
