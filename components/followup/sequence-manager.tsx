/**
 * Sequence Manager Component
 *
 * Manages follow-up sequences and messages.
 * Automatically generates AI-powered templates when creating sequences.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";

interface SequenceManagerProps {
    funnelProjectId: string;
    offerId?: string;
}

interface GeneratedSequence {
    sequence_id: string;
    message_ids: string[];
    generation_method: "ai" | "default";
    message_count: number;
}

export function SequenceManager({ funnelProjectId, offerId }: SequenceManagerProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedSequence, setGeneratedSequence] =
        useState<GeneratedSequence | null>(null);

    const handleGenerateSequence = async (useDefaults = false) => {
        if (!offerId) {
            setError("Please select an offer first");
            return;
        }

        setIsGenerating(true);
        setError(null);

        logger.info(
            { funnelProjectId, offerId, useDefaults },
            "Generating follow-up sequence"
        );

        try {
            const response = await fetch("/api/followup/sequences/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    funnel_project_id: funnelProjectId,
                    offer_id: offerId,
                    use_defaults: useDefaults,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate sequence");
            }

            const data = await response.json();

            logger.info(
                {
                    sequenceId: data.sequence_id,
                    messageCount: data.message_count,
                    method: data.generation_method,
                },
                "Sequence generated successfully"
            );

            setGeneratedSequence(data);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to generate sequence";
            logger.error({ error: err }, "Sequence generation failed");
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerate = () => {
        setGeneratedSequence(null);
        handleGenerateSequence(false);
    };

    const handleUseDefaults = () => {
        setGeneratedSequence(null);
        handleGenerateSequence(true);
    };

    return (
        <Card className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold">AI Follow-Up Sequences</h2>
                <p className="text-muted-foreground mt-1">
                    Automatically generate personalized message sequences based on your
                    deck and offer
                </p>
            </div>

            {!generatedSequence && (
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <div className="max-w-md mx-auto">
                            <h3 className="text-lg font-semibold mb-2">
                                Generate Your First Sequence
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                Our AI will analyze your webinar deck and offer to
                                create a professional 3-day follow-up sequence with
                                personalized messages.
                            </p>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => handleGenerateSequence(false)}
                                    disabled={isGenerating || !offerId}
                                    size="lg"
                                    className="w-full"
                                >
                                    {isGenerating ? (
                                        <>
                                            <span className="animate-spin mr-2">
                                                ⏳
                                            </span>
                                            Generating AI Templates...
                                        </>
                                    ) : (
                                        <>✨ Generate AI-Powered Sequence</>
                                    )}
                                </Button>

                                <Button
                                    onClick={handleUseDefaults}
                                    disabled={isGenerating || !offerId}
                                    variant="outline"
                                    className="w-full"
                                >
                                    Use Default Templates
                                </Button>
                            </div>

                            {!offerId && (
                                <p className="text-sm text-amber-600 mt-4">
                                    Please complete the offer configuration step first
                                </p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 font-semibold">
                                Generation Error
                            </p>
                            <p className="text-red-600 text-sm mt-1">{error}</p>
                            <Button
                                onClick={handleUseDefaults}
                                variant="outline"
                                size="sm"
                                className="mt-3"
                            >
                                Try Default Templates Instead
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {generatedSequence && (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-green-800 font-semibold flex items-center gap-2">
                                    ✅ Sequence Generated Successfully
                                    <Badge
                                        variant={
                                            generatedSequence.generation_method === "ai"
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {generatedSequence.generation_method === "ai"
                                            ? "AI-Powered"
                                            : "Default Template"}
                                    </Badge>
                                </p>
                                <p className="text-green-700 text-sm mt-1">
                                    Created {generatedSequence.message_count}{" "}
                                    personalized messages ready to send
                                </p>
                            </div>
                            <Button
                                onClick={handleRegenerate}
                                variant="outline"
                                size="sm"
                            >
                                🔄 Regenerate
                            </Button>
                        </div>
                    </div>

                    <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold">
                                    3-Day Discount Sequence
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {generatedSequence.message_count} touches over 72
                                    hours
                                </p>
                            </div>
                            <Badge>Active</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-3 space-y-1">
                            <div>📨 4 emails + 1 SMS</div>
                            <div>
                                🎯 Adapts to: No-Show, Skimmer, Sampler, Engaged, Hot
                            </div>
                            <div>⏰ Triggers: Webinar end</div>
                            <div>
                                🎨 Personalization: Uses watch %, challenge notes, goals
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-primary font-semibold">What Happens Next?</p>
                        <ul className="text-primary text-sm mt-2 space-y-1 list-disc list-inside">
                            <li>
                                Messages will automatically personalize for each
                                prospect
                            </li>
                            <li>
                                Timing adapts based on their webinar watch percentage
                            </li>
                            <li>You can edit any message in the sequence editor</li>
                            <li>
                                Sequences activate when prospects complete your webinar
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </Card>
    );
}
