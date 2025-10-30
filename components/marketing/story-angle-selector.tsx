/**
 * Story Angle Selector Component
 * Visual selector for story angles after generation
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";
import type { StoryAngle } from "@/types/marketing";

interface StoryAngleSelectorProps {
    angles: StoryAngle[];
    onSelectAngle: (angle: StoryAngle) => void;
    onRegenerateAngles?: () => void;
    selectedAngleId?: string;
}

export function StoryAngleSelector({
    angles,
    onSelectAngle,
    onRegenerateAngles,
    selectedAngleId,
}: StoryAngleSelectorProps) {
    const { toast } = useToast();
    const [selectedAngle, setSelectedAngle] = useState<StoryAngle | null>(
        angles.find((a) => a.angle === selectedAngleId) || null
    );
    const [regenerating, setRegenerating] = useState(false);

    const handleSelectAngle = (angle: StoryAngle) => {
        setSelectedAngle(angle);
        onSelectAngle(angle);
        toast({
            title: "Angle Selected",
            description: `Using "${angle.angle}" for content generation`,
        });
    };

    const handleRegenerate = async () => {
        if (!onRegenerateAngles) return;

        setRegenerating(true);
        try {
            await onRegenerateAngles();
            toast({
                title: "Angles Regenerated",
                description: "New story angles have been generated",
            });
        } catch (error) {
            logger.error({ error }, "Failed to regenerate angles");
            toast({
                title: "Regeneration Failed",
                description: "Please try again",
                variant: "destructive",
            });
        } finally {
            setRegenerating(false);
        }
    };

    if (angles.length === 0) {
        return (
            <Card className="p-12 text-center border-dashed">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Story Angles Yet
                </h3>
                <p className="text-muted-foreground text-sm">
                    Generate content to see story angle options
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Choose Your Story Angle</h3>
                    <p className="text-sm text-muted-foreground">
                        Select the angle that best fits your message
                    </p>
                </div>
                {onRegenerateAngles && (
                    <Button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        variant="outline"
                        size="sm"
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${regenerating ? "animate-spin" : ""}`}
                        />
                        {regenerating ? "Regenerating..." : "Regenerate Angles"}
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {angles.map((angle, index) => (
                    <Card
                        key={index}
                        className={`p-5 cursor-pointer transition-all hover:shadow-lg ${
                            selectedAngle?.angle === angle.angle
                                ? "border-2 border-primary bg-primary/5"
                                : "border border-border hover:border-primary/30"
                        }`}
                        onClick={() => handleSelectAngle(angle)}
                    >
                        {/* Selection Indicator */}
                        {selectedAngle?.angle === angle.angle && (
                            <div className="flex justify-end mb-2">
                                <CheckCircle2 className="h-5 w-5 text-primary-foreground0" />
                            </div>
                        )}

                        {/* Angle Label */}
                        <div className="flex items-start gap-2 mb-3">
                            <span className="text-2xl">
                                {index === 0 ? "🎯" : index === 1 ? "💡" : "✨"}
                            </span>
                            <div className="flex-1">
                                <h4 className="font-semibold text-primary mb-1">
                                    {angle.angle}
                                </h4>
                                <p className="text-xs text-muted-foreground uppercase">
                                    Angle {index + 1}
                                </p>
                            </div>
                        </div>

                        {/* Hook */}
                        <div className="mb-3">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                                HOOK:
                            </div>
                            <p className="text-sm text-foreground font-medium">
                                {angle.hook}
                            </p>
                        </div>

                        {/* Story Outline Preview */}
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                                OUTLINE:
                            </div>
                            <p className="text-xs text-foreground line-clamp-4">
                                {angle.story_outline}
                            </p>
                        </div>

                        {/* Emotional Tone (if available) */}
                        {(angle as any).emotional_tone && (
                            <div className="mt-3 pt-3 border-t">
                                <div className="flex flex-wrap gap-1">
                                    {(angle as any).emotional_tone
                                        .split(",")
                                        .map((tone: string, i: number) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded"
                                            >
                                                {tone.trim()}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Select Button */}
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAngle(angle);
                            }}
                            className="w-full mt-4"
                            size="sm"
                            variant={
                                selectedAngle?.angle === angle.angle
                                    ? "default"
                                    : "outline"
                            }
                        >
                            {selectedAngle?.angle === angle.angle
                                ? "Selected"
                                : "Select This Angle"}
                        </Button>
                    </Card>
                ))}
            </div>

            {selectedAngle && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-primary mb-1">
                                Selected: {selectedAngle.angle}
                            </h4>
                            <p className="text-sm text-primary">
                                Content will be generated using this angle. You can
                                change your selection at any time.
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
