/**
 * Content Generator
 * Create content briefs and generate platform-optimized posts
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { Sparkles, Loader2 } from "lucide-react";
import { PostVariantCard } from "./post-variant-card";
import type { StoryAngle, PostVariant } from "@/types/marketing";

interface ContentGeneratorProps {
    profileId: string;
    funnelProjectId: string;
    onContentGenerated: () => void;
}

export function ContentGenerator({
    profileId,
    funnelProjectId,
    onContentGenerated,
}: ContentGeneratorProps) {
    const { toast } = useToast();

    // Brief form state
    const [briefName, setBriefName] = useState("");
    const [topic, setTopic] = useState("");
    const [goal, setGoal] = useState("drive_registrations");
    const [icpDescription, setIcpDescription] = useState("");
    const [transformationFocus, setTransformationFocus] = useState("");
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
        "instagram",
        "facebook",
        "linkedin",
        "twitter",
    ]);
    const [preferredFramework, setPreferredFramework] = useState("founder_saga");

    // Generation state
    const [generating, setGenerating] = useState(false);
    const [storyAngles, setStoryAngles] = useState<StoryAngle[]>([]);
    const [selectedAngle, setSelectedAngle] = useState<StoryAngle | null>(null);
    const [variants, setVariants] = useState<PostVariant[]>([]);
    const [currentBriefId, setCurrentBriefId] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!briefName || !topic) {
            toast({
                title: "Required Fields",
                description: "Please provide a name and topic for your content",
                variant: "destructive",
            });
            return;
        }

        setGenerating(true);
        setStoryAngles([]);
        setSelectedAngle(null);
        setVariants([]);

        try {
            // Step 1: Create brief
            const briefResponse = await fetch("/api/marketing/briefs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: briefName,
                    goal,
                    topic,
                    funnel_project_id: funnelProjectId,
                    marketing_profile_id: profileId,
                    icp_description: icpDescription || null,
                    transformation_focus: transformationFocus || null,
                    target_platforms: selectedPlatforms,
                    preferred_framework: preferredFramework,
                }),
            });

            const briefData = await briefResponse.json();

            if (!briefData.success) {
                throw new Error(briefData.error || "Failed to create brief");
            }

            setCurrentBriefId(briefData.brief.id);

            // Step 2: Generate content
            const generateResponse = await fetch(
                `/api/marketing/briefs/${briefData.brief.id}/generate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        platforms: selectedPlatforms,
                    }),
                }
            );

            const generateData = await generateResponse.json();

            if (!generateData.success) {
                throw new Error(generateData.error || "Failed to generate content");
            }

            setStoryAngles(generateData.story_angles || []);
            setVariants(generateData.variants || []);

            toast({
                title: "Content Generated",
                description: `Created ${generateData.variants?.length || 0} platform variants`,
            });

            logger.info(
                {
                    briefId: briefData.brief.id,
                    variantCount: generateData.variants?.length,
                },
                "Content generated"
            );

            onContentGenerated();
        } catch (error) {
            logger.error({ error }, "Content generation failed");
            toast({
                title: "Generation Failed",
                description:
                    error instanceof Error ? error.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setGenerating(false);
        }
    };

    const togglePlatform = (platform: string) => {
        if (selectedPlatforms.includes(platform)) {
            setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
        } else {
            setSelectedPlatforms([...selectedPlatforms, platform]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Brief Input Form */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Create Content Brief</h3>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Brief Name *
                        </label>
                        <Input
                            value={briefName}
                            onChange={(e) => setBriefName(e.target.value)}
                            placeholder="e.g., Q4 Lead Gen Campaign"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Topic *
                        </label>
                        <Input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Overcoming imposter syndrome as a new coach"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">Goal</label>
                        <select
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            <option value="drive_registrations">
                                Drive Registrations
                            </option>
                            <option value="build_awareness">Build Awareness</option>
                            <option value="nurture_leads">Nurture Leads</option>
                            <option value="establish_authority">
                                Establish Authority
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Target Audience (ICP)
                        </label>
                        <Textarea
                            value={icpDescription}
                            onChange={(e) => setIcpDescription(e.target.value)}
                            placeholder="Describe your ideal customer for this content..."
                            rows={2}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Transformation Focus
                        </label>
                        <Input
                            value={transformationFocus}
                            onChange={(e) => setTransformationFocus(e.target.value)}
                            placeholder="e.g., From uncertain to confident in pricing"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Target Platforms
                        </label>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { id: "instagram", label: "Instagram", icon: "📸" },
                                { id: "facebook", label: "Facebook", icon: "👍" },
                                { id: "linkedin", label: "LinkedIn", icon: "💼" },
                                { id: "twitter", label: "Twitter/X", icon: "🐦" },
                            ].map((platform) => (
                                <div
                                    key={platform.id}
                                    onClick={() => togglePlatform(platform.id)}
                                    className={`p-3 border rounded-lg cursor-pointer text-center transition-colors ${
                                        selectedPlatforms.includes(platform.id)
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-2xl mb-1">{platform.icon}</div>
                                    <div className="text-xs font-medium">
                                        {platform.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Story Framework Preference
                        </label>
                        <select
                            value={preferredFramework}
                            onChange={(e) => setPreferredFramework(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            <option value="founder_saga">
                                Founder Saga - Personal journey
                            </option>
                            <option value="myth_buster">
                                Myth Buster - Challenge beliefs
                            </option>
                            <option value="philosophy_pov">
                                Philosophy POV - Thought leadership
                            </option>
                            <option value="current_event">
                                Current Event - Timely relevance
                            </option>
                            <option value="how_to">How To - Actionable guide</option>
                        </select>
                    </div>
                </div>

                <Button
                    onClick={handleGenerate}
                    disabled={generating || selectedPlatforms.length === 0}
                    className="mt-6 w-full"
                    size="lg"
                >
                    {generating ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Generating Content...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-5 w-5 mr-2" />
                            Generate Content
                        </>
                    )}
                </Button>
            </Card>

            {/* Story Angles (if generated) */}
            {storyAngles.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        Story Angles Generated
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        {storyAngles.map((angle, index) => (
                            <div
                                key={index}
                                className="p-4 border rounded-lg hover:border-blue-500 transition-colors"
                            >
                                <div className="font-semibold text-blue-600 mb-2">
                                    {angle.angle}
                                </div>
                                <div className="text-sm text-gray-700 mb-3">
                                    <strong>Hook:</strong> {angle.hook}
                                </div>
                                <div className="text-xs text-gray-600">
                                    {angle.story_outline.substring(0, 150)}...
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Generated Variants */}
            {variants.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                        Platform Variants ({variants.length})
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                        {variants.map((variant) => (
                            <PostVariantCard
                                key={variant.id}
                                variant={variant}
                                onUpdate={() => {
                                    // Reload variants
                                    if (currentBriefId) {
                                        fetch(
                                            `/api/marketing/briefs/${currentBriefId}/variants`
                                        )
                                            .then((res) => res.json())
                                            .then((data) => {
                                                if (data.success) {
                                                    setVariants(data.variants);
                                                }
                                            });
                                    }
                                }}
                                onSchedule={() => {
                                    onContentGenerated();
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!generating && variants.length === 0 && (
                <Card className="p-12 text-center border-dashed">
                    <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Ready to Create Content
                    </h3>
                    <p className="text-gray-600">
                        Fill out the brief above and click Generate to create
                        platform-optimized content
                    </p>
                </Card>
            )}
        </div>
    );
}
