/**
 * Experiment Creator Modal
 * A/B testing setup with experiment configuration, variant generation, and test scheduling
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { X, Sparkles, Target, Calendar } from "lucide-react";
import type { PostVariant } from "@/types/marketing";

interface ExperimentCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    funnelProjectId: string;
    variants?: PostVariant[];
    onExperimentCreated: () => void;
}

export function ExperimentCreatorModal({
    isOpen,
    onClose,
    funnelProjectId,
    variants = [],
    onExperimentCreated,
}: ExperimentCreatorModalProps) {
    const { toast } = useToast();
    const [creating, setCreating] = useState(false);
    const [generatingVariantB, setGeneratingVariantB] = useState(false);

    // Experiment Setup
    const [experimentName, setExperimentName] = useState("");
    const [experimentType, setExperimentType] = useState("hook");
    const [baseVariantId, setBaseVariantId] = useState("");
    const [autoGenerateVariantB, setAutoGenerateVariantB] = useState(true);
    const [variantBContent, setVariantBContent] = useState("");

    // Test Configuration
    const [sampleSize, setSampleSize] = useState(100);
    const [distributionSplit, setDistributionSplit] = useState(50);
    const [successMetric, setSuccessMetric] = useState("opt_ins");
    const [minConfidence, setMinConfidence] = useState(95);
    const [testDuration, setTestDuration] = useState(7);
    const [autoDeclareWinner, setAutoDeclareWinner] = useState(true);

    // Platform & Scheduling
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram"]);
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [testSpace, setTestSpace] = useState<"sandbox" | "production">("sandbox");

    const handleCreateExperiment = async () => {
        if (!experimentName || !baseVariantId) {
            toast({
                title: "Required Fields",
                description: "Please provide experiment name and base variant",
                variant: "destructive",
            });
            return;
        }

        setCreating(true);

        try {
            const response = await fetch("/api/marketing/experiments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    funnel_project_id: funnelProjectId,
                    name: experimentName,
                    experiment_type: experimentType,
                    variant_a_id: baseVariantId,
                    auto_generate_variant_b: autoGenerateVariantB,
                    variant_b_content: autoGenerateVariantB ? null : variantBContent,
                    config: {
                        sample_size: sampleSize,
                        distribution_split: distributionSplit,
                        success_metric: successMetric,
                        min_confidence_threshold: minConfidence / 100,
                        test_duration_days: testDuration,
                        auto_declare_winner: autoDeclareWinner,
                        platforms: selectedPlatforms,
                        space: testSpace,
                    },
                    start_date: startDate
                        ? new Date(`${startDate}T${startTime}`).toISOString()
                        : null,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Experiment Created",
                    description: `${experimentName} is now ${data.experiment.status}`,
                });
                onExperimentCreated();
                onClose();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Failed to create experiment");
            toast({
                title: "Creation Failed",
                description:
                    error instanceof Error ? error.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setCreating(false);
        }
    };

    const togglePlatform = (platform: string) => {
        if (selectedPlatforms.includes(platform)) {
            setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
        } else {
            setSelectedPlatforms([...selectedPlatforms, platform]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Target className="h-6 w-6 text-purple-500" />
                            <div>
                                <h2 className="text-2xl font-bold">
                                    Create A/B Test Experiment
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Test different variations to optimize performance
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-muted-foreground"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Section 1: Experiment Setup */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Experiment Setup</h3>

                            <div>
                                <Label className="mb-2 block">
                                    Experiment Name{" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={experimentName}
                                    onChange={(e) => setExperimentName(e.target.value)}
                                    placeholder="e.g., Hook Test - Question vs Statement"
                                />
                            </div>

                            <div>
                                <Label className="mb-2 block">Experiment Type</Label>
                                <select
                                    value={experimentType}
                                    onChange={(e) => setExperimentType(e.target.value)}
                                    className="w-full rounded-md border border-border px-3 py-2"
                                >
                                    <option value="hook">
                                        Hook Test (Different Opening Lines)
                                    </option>
                                    <option value="cta">
                                        CTA Test (Different Calls to Action)
                                    </option>
                                    <option value="length">
                                        Length Test (Short vs Long Copy)
                                    </option>
                                    <option value="tone">
                                        Tone Test (Different Tone Settings)
                                    </option>
                                    <option value="format">
                                        Format Test (Post vs Carousel)
                                    </option>
                                </select>
                            </div>

                            <div>
                                <Label className="mb-2 block">
                                    Base Variant (Variant A){" "}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    value={baseVariantId}
                                    onChange={(e) => setBaseVariantId(e.target.value)}
                                    className="w-full rounded-md border border-border px-3 py-2"
                                >
                                    <option value="">Select a variant...</option>
                                    {variants.map((variant) => (
                                        <option key={variant.id} value={variant.id}>
                                            {variant.platform} -{" "}
                                            {variant.copy_text.substring(0, 50)}...
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label className="font-medium">
                                        Auto-Generate Variant B
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        AI creates alternative based on experiment type
                                    </p>
                                </div>
                                <Switch
                                    checked={autoGenerateVariantB}
                                    onCheckedChange={setAutoGenerateVariantB}
                                />
                            </div>

                            {!autoGenerateVariantB && (
                                <div>
                                    <Label className="mb-2 block">
                                        Variant B Content (Manual)
                                    </Label>
                                    <Textarea
                                        value={variantBContent}
                                        onChange={(e) =>
                                            setVariantBContent(e.target.value)
                                        }
                                        placeholder="Enter alternative content for Variant B..."
                                        rows={4}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Section 2: Test Configuration */}
                        <div className="space-y-4 pt-6 border-t">
                            <h3 className="font-semibold text-lg">
                                Test Configuration
                            </h3>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <Label>Sample Size (Posts per Variant)</Label>
                                    <span className="text-sm text-muted-foreground">
                                        {sampleSize}
                                    </span>
                                </div>
                                <Slider
                                    value={[sampleSize]}
                                    onValueChange={([value]) => setSampleSize(value)}
                                    min={10}
                                    max={500}
                                    step={10}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <Label>Distribution Split (A vs B)</Label>
                                    <span className="text-sm text-muted-foreground">
                                        {distributionSplit}% / {100 - distributionSplit}
                                        %
                                    </span>
                                </div>
                                <Slider
                                    value={[distributionSplit]}
                                    onValueChange={([value]) =>
                                        setDistributionSplit(value)
                                    }
                                    min={20}
                                    max={80}
                                    step={10}
                                />
                            </div>

                            <div>
                                <Label className="mb-2 block">Success Metric</Label>
                                <select
                                    value={successMetric}
                                    onChange={(e) => setSuccessMetric(e.target.value)}
                                    className="w-full rounded-md border border-border px-3 py-2"
                                >
                                    <option value="engagement">
                                        Engagement Rate (Likes, Comments, Shares)
                                    </option>
                                    <option value="opt_ins">
                                        Opt-ins / Registrations
                                    </option>
                                    <option value="clicks">Link Clicks</option>
                                    <option value="oi_1000">O/I-1000 Score</option>
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <Label>Minimum Confidence Threshold</Label>
                                    <span className="text-sm text-muted-foreground">
                                        {minConfidence}%
                                    </span>
                                </div>
                                <Slider
                                    value={[minConfidence]}
                                    onValueChange={([value]) => setMinConfidence(value)}
                                    min={80}
                                    max={99}
                                    step={1}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Winner declared only when this confidence level is
                                    reached
                                </p>
                            </div>

                            <div>
                                <Label className="mb-2 block">
                                    Test Duration (Days)
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="90"
                                    value={testDuration}
                                    onChange={(e) =>
                                        setTestDuration(parseInt(e.target.value) || 7)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label className="font-medium">
                                        Auto-Declare Winner
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Automatically declare winner when confidence is
                                        reached
                                    </p>
                                </div>
                                <Switch
                                    checked={autoDeclareWinner}
                                    onCheckedChange={setAutoDeclareWinner}
                                />
                            </div>
                        </div>

                        {/* Section 3: Platform & Scheduling */}
                        <div className="space-y-4 pt-6 border-t">
                            <h3 className="font-semibold text-lg">
                                Platform & Scheduling
                            </h3>

                            <div>
                                <Label className="mb-2 block">Test Platforms</Label>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        {
                                            id: "instagram",
                                            label: "Instagram",
                                            icon: "📸",
                                        },
                                        {
                                            id: "facebook",
                                            label: "Facebook",
                                            icon: "👍",
                                        },
                                        {
                                            id: "linkedin",
                                            label: "LinkedIn",
                                            icon: "💼",
                                        },
                                        { id: "twitter", label: "Twitter", icon: "🐦" },
                                    ].map((platform) => (
                                        <div
                                            key={platform.id}
                                            onClick={() => togglePlatform(platform.id)}
                                            className={`p-3 border rounded-lg cursor-pointer text-center transition-colors ${
                                                selectedPlatforms.includes(platform.id)
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-border"
                                            }`}
                                        >
                                            <div className="text-2xl mb-1">
                                                {platform.icon}
                                            </div>
                                            <div className="text-xs font-medium">
                                                {platform.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-2 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Start Date
                                    </Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        min={new Date().toISOString().split("T")[0]}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-2 block">Start Time</Label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block">Space</Label>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => setTestSpace("sandbox")}
                                        variant={
                                            testSpace === "sandbox"
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                        className="flex-1"
                                    >
                                        Sandbox (Testing)
                                    </Button>
                                    <Button
                                        onClick={() => setTestSpace("production")}
                                        variant={
                                            testSpace === "production"
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                        className="flex-1"
                                    >
                                        Production (Live)
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <h4 className="font-semibold text-purple-900 mb-2">
                                Experiment Summary
                            </h4>
                            <div className="space-y-1 text-sm text-purple-800">
                                <div>
                                    • Test {sampleSize} posts per variant (
                                    {distributionSplit}% / {100 - distributionSplit}%
                                    split)
                                </div>
                                <div>• Run for {testDuration} days</div>
                                <div>
                                    • Measure success by{" "}
                                    {successMetric.replace("_", " ")}
                                </div>
                                <div>
                                    • Declare winner at {minConfidence}% confidence
                                </div>
                                <div className="capitalize">
                                    • Test on {selectedPlatforms.join(", ")}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            <Button
                                onClick={onClose}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button variant="outline" className="flex-1">
                                Save as Draft
                            </Button>
                            <Button
                                onClick={handleCreateExperiment}
                                disabled={
                                    creating ||
                                    !experimentName ||
                                    !baseVariantId ||
                                    selectedPlatforms.length === 0
                                }
                                className="flex-1"
                            >
                                {creating ? (
                                    "Creating..."
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Create Experiment
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
