/**
 * Enhanced Content Generator / Brief Editor
 * Comprehensive brief creator with 9 sections exposing all database fields
 * Transform from basic form to full brief editor matching sequence builder complexity
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    Sparkles,
    Loader2,
    FileText,
    Target,
    Zap,
    Link as LinkIcon,
    Image as ImageIcon,
    Settings,
    ChevronDown,
    ChevronUp,
    Save,
    Trash2,
    Upload,
} from "lucide-react";
import { PostVariantCard } from "./post-variant-card";
import { UTMBuilder } from "./utm-builder";
import type { StoryAngle, PostVariant } from "@/types/marketing";

interface ContentGeneratorEnhancedProps {
    profileId: string;
    funnelProjectId: string;
    onContentGenerated: () => void;
}

export function ContentGeneratorEnhanced({
    profileId,
    funnelProjectId,
    onContentGenerated,
}: ContentGeneratorEnhancedProps) {
    const { toast } = useToast();

    // Section 1: Brief Metadata
    const [briefName, setBriefName] = useState("");
    const [briefDescription, setBriefDescription] = useState("");
    const [campaignTags, setCampaignTags] = useState<string[]>([]);
    const [space, setSpace] = useState<"sandbox" | "production">("sandbox");
    const [newTag, setNewTag] = useState("");

    // Section 2: Goal & Audience
    const [goal, setGoal] = useState("drive_registrations");
    const [customGoal, setCustomGoal] = useState("");
    const [icpDescription, setIcpDescription] = useState("");
    const [transformationFocus, setTransformationFocus] = useState("");
    const [targetFunnelStep, setTargetFunnelStep] = useState("step_1_registration");
    const [expectedOptInRate, setExpectedOptInRate] = useState("");

    // Section 3: Content Strategy
    const [topic, setTopic] = useState("");
    const [preferredFramework, setPreferredFramework] = useState("founder_saga");
    const [anglePreference, setAnglePreference] = useState("");
    const [hookStyle, setHookStyle] = useState("question");
    const [emotionalTones, setEmotionalTones] = useState<string[]>(["inspiring"]);
    const [contentLength, setContentLength] = useState<"short" | "medium" | "long">(
        "medium"
    );

    // Section 4: Platform Configuration
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
        "instagram",
        "facebook",
        "linkedin",
        "twitter",
    ]);
    const [platformConfigs, setPlatformConfigs] = useState<Record<string, any>>({
        instagram: {
            format: "post",
            charTarget: 150,
            hashtagCount: 15,
            ctaStyle: "bio_link",
        },
        facebook: {
            format: "post",
            charTarget: 250,
            hashtagCount: 5,
            ctaStyle: "external",
        },
        linkedin: {
            format: "post",
            charTarget: 300,
            hashtagCount: 3,
            ctaStyle: "external",
        },
        twitter: {
            format: "post",
            charTarget: 280,
            hashtagCount: 2,
            ctaStyle: "external",
        },
    });

    // Section 5: CTA & Link Strategy
    const [primaryCtaText, setPrimaryCtaText] = useState("Register Now");
    const [ctaType, setCtaType] = useState("external_url");
    const [primaryUrl, setPrimaryUrl] = useState("");
    const [utmSource, setUtmSource] = useState("social");
    const [utmMedium, setUtmMedium] = useState("organic");
    const [utmCampaign, setUtmCampaign] = useState("");
    const [utmContent, setUtmContent] = useState("");
    const [linkShortener, setLinkShortener] = useState(false);
    const [trackingEnabled, setTrackingEnabled] = useState(true);

    // Section 6: Media Preferences
    const [includeMedia, setIncludeMedia] = useState(true);
    const [mediaType, setMediaType] = useState("photo");
    const [customMedia, setCustomMedia] = useState<string[]>([]);
    const [aiImageGeneration, setAiImageGeneration] = useState(true);
    const [altTextAutoGen, setAltTextAutoGen] = useState(true);

    // Section 7: Generation Configuration
    const [variantCount, setVariantCount] = useState(3);
    const [applyEchoMode, setApplyEchoMode] = useState(true);
    const [includeMediaSuggestions, setIncludeMediaSuggestions] = useState(true);
    const [generateABVariants, setGenerateABVariants] = useState(false);
    const [experimentType, setExperimentType] = useState("hook");

    // Section 8: Advanced Options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [toneConstraints, setToneConstraints] = useState("");
    const [excludedKeywords, setExcludedKeywords] = useState("");
    const [requiredKeywords, setRequiredKeywords] = useState("");
    const [readingLevel, setReadingLevel] = useState("8th_grade");
    const [emojiUsage, setEmojiUsage] = useState("moderate");

    // Generation state
    const [generating, setGenerating] = useState(false);
    const [storyAngles, setStoryAngles] = useState<StoryAngle[]>([]);
    const [variants, setVariants] = useState<PostVariant[]>([]);
    const [currentBriefId, setCurrentBriefId] = useState<string | null>(null);
    const [generationProgress, setGenerationProgress] = useState(0);

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
        setVariants([]);
        setGenerationProgress(0);

        try {
            // Step 1: Create comprehensive brief
            setGenerationProgress(10);
            const briefResponse = await fetch("/api/marketing/briefs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: briefName,
                    goal: goal === "custom" ? customGoal : goal,
                    topic,
                    funnel_project_id: funnelProjectId,
                    marketing_profile_id: profileId,
                    icp_description: icpDescription || null,
                    transformation_focus: transformationFocus || null,
                    target_platforms: selectedPlatforms,
                    preferred_framework: preferredFramework,
                    funnel_entry_point: targetFunnelStep,
                    space,
                    tone_constraints: toneConstraints || null,
                    generation_config: {
                        generate_variants: true,
                        variant_count: variantCount,
                        include_media_suggestions: includeMediaSuggestions,
                        apply_echo_mode: applyEchoMode,
                        generate_ab_variants: generateABVariants,
                        experiment_type: experimentType,
                    },
                    metadata: {
                        description: briefDescription,
                        campaign_tags: campaignTags,
                        expected_opt_in_rate: expectedOptInRate,
                        content_strategy: {
                            angle_preference: anglePreference,
                            hook_style: hookStyle,
                            emotional_tones: emotionalTones,
                            content_length: contentLength,
                        },
                        platform_configs: platformConfigs,
                        cta_config: {
                            primary_cta_text: primaryCtaText,
                            cta_type: ctaType,
                            primary_url: primaryUrl,
                        },
                        link_strategy: {
                            utm_parameters: {
                                utm_source: utmSource,
                                utm_medium: utmMedium,
                                utm_campaign:
                                    utmCampaign ||
                                    briefName.toLowerCase().replace(/\s+/g, "_"),
                                utm_content: utmContent,
                            },
                            link_shortener: linkShortener,
                            tracking_enabled: trackingEnabled,
                        },
                        media_preferences: {
                            include_media: includeMedia,
                            media_type: mediaType,
                            custom_media: customMedia,
                            ai_image_generation: aiImageGeneration,
                            alt_text_auto_gen: altTextAutoGen,
                        },
                        advanced_options: {
                            excluded_keywords: excludedKeywords,
                            required_keywords: requiredKeywords,
                            reading_level: readingLevel,
                            emoji_usage: emojiUsage,
                        },
                    },
                }),
            });

            const briefData = await briefResponse.json();

            if (!briefData.success) {
                throw new Error(briefData.error || "Failed to create brief");
            }

            setCurrentBriefId(briefData.brief.id);
            setGenerationProgress(30);

            // Step 2: Generate content
            setGenerationProgress(40);
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

            setGenerationProgress(90);
            const generateData = await generateResponse.json();

            if (!generateData.success) {
                throw new Error(generateData.error || "Failed to generate content");
            }

            setStoryAngles(generateData.story_angles || []);
            setVariants(generateData.variants || []);
            setGenerationProgress(100);

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
            setGenerationProgress(0);
        }
    };

    const togglePlatform = (platform: string) => {
        if (selectedPlatforms.includes(platform)) {
            setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
        } else {
            setSelectedPlatforms([...selectedPlatforms, platform]);
        }
    };

    const updatePlatformConfig = (platform: string, key: string, value: any) => {
        setPlatformConfigs({
            ...platformConfigs,
            [platform]: {
                ...platformConfigs[platform],
                [key]: value,
            },
        });
    };

    const addTag = () => {
        if (newTag && !campaignTags.includes(newTag)) {
            setCampaignTags([...campaignTags, newTag]);
            setNewTag("");
        }
    };

    const removeTag = (tag: string) => {
        setCampaignTags(campaignTags.filter((t) => t !== tag));
    };

    const toggleEmotionalTone = (tone: string) => {
        if (emotionalTones.includes(tone)) {
            setEmotionalTones(emotionalTones.filter((t) => t !== tone));
        } else {
            setEmotionalTones([...emotionalTones, tone]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Section 1: Brief Metadata */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">Brief Metadata</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label className="mb-2 block">
                            Brief Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={briefName}
                            onChange={(e) => setBriefName(e.target.value)}
                            placeholder="e.g., Q4 Lead Gen Campaign"
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Description</Label>
                        <Textarea
                            value={briefDescription}
                            onChange={(e) => setBriefDescription(e.target.value)}
                            placeholder="Optional: Describe the purpose and goals of this content brief..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Campaign Tags</Label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && addTag()}
                                placeholder="Add tag and press Enter"
                                className="flex-1"
                            />
                            <Button onClick={addTag} variant="outline" size="sm">
                                Add
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {campaignTags.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                                >
                                    {tag}
                                    <button
                                        onClick={() => removeTag(tag)}
                                        className="hover:text-blue-900"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block">Space</Label>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setSpace("sandbox")}
                                variant={space === "sandbox" ? "default" : "outline"}
                                size="sm"
                            >
                                Sandbox (Testing)
                            </Button>
                            <Button
                                onClick={() => setSpace("production")}
                                variant={space === "production" ? "default" : "outline"}
                                size="sm"
                            >
                                Production (Live)
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Section 2: Goal & Audience */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-purple-500" />
                    <h3 className="text-lg font-semibold">Goal & Audience</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label className="mb-2 block">Goal</Label>
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
                            <option value="custom">Custom Goal</option>
                        </select>
                        {goal === "custom" && (
                            <Input
                                value={customGoal}
                                onChange={(e) => setCustomGoal(e.target.value)}
                                placeholder="Describe your custom goal..."
                                className="mt-2"
                            />
                        )}
                    </div>

                    <div>
                        <Label className="mb-2 block">Target Audience (ICP)</Label>
                        <Textarea
                            value={icpDescription}
                            onChange={(e) => setIcpDescription(e.target.value)}
                            placeholder="Describe your ideal customer for this content..."
                            rows={2}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Transformation Focus</Label>
                        <Input
                            value={transformationFocus}
                            onChange={(e) => setTransformationFocus(e.target.value)}
                            placeholder="e.g., From uncertain to confident in pricing"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-2 block">Target Funnel Step</Label>
                            <select
                                value={targetFunnelStep}
                                onChange={(e) => setTargetFunnelStep(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="step_1_registration">
                                    Step 1: Registration
                                </option>
                                <option value="step_2_intake">Step 2: Intake</option>
                                <option value="step_3_watch">
                                    Step 3: Watch Webinar
                                </option>
                                <option value="step_9_offer">Step 9: Offer Page</option>
                            </select>
                        </div>

                        <div>
                            <Label className="mb-2 block">
                                Expected Opt-in Rate (%)
                            </Label>
                            <Input
                                type="number"
                                value={expectedOptInRate}
                                onChange={(e) => setExpectedOptInRate(e.target.value)}
                                placeholder="e.g., 5"
                                min="0"
                                max="100"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Section 3: Content Strategy */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">Content Strategy</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label className="mb-2 block">
                            Topic <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Overcoming imposter syndrome as a new coach"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-2 block">Story Framework</Label>
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
                                <option value="how_to">
                                    How To - Actionable guide
                                </option>
                            </select>
                        </div>

                        <div>
                            <Label className="mb-2 block">Hook Style</Label>
                            <select
                                value={hookStyle}
                                onChange={(e) => setHookStyle(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="question">Question</option>
                                <option value="statement">Bold Statement</option>
                                <option value="statistic">Statistic</option>
                                <option value="story">Story Opening</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block">
                            Angle Preference (Optional)
                        </Label>
                        <Input
                            value={anglePreference}
                            onChange={(e) => setAnglePreference(e.target.value)}
                            placeholder="e.g., Focus on overcoming fear rather than technical skills"
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Emotional Tone</Label>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { id: "inspiring", label: "Inspiring" },
                                { id: "challenging", label: "Challenging" },
                                { id: "empowering", label: "Empowering" },
                                { id: "urgent", label: "Urgent" },
                            ].map((tone) => (
                                <div
                                    key={tone.id}
                                    onClick={() => toggleEmotionalTone(tone.id)}
                                    className={`p-3 border rounded-lg cursor-pointer text-center transition-colors ${
                                        emotionalTones.includes(tone.id)
                                            ? "border-purple-500 bg-purple-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div className="text-sm font-medium">
                                        {tone.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block">Content Length</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                {
                                    value: "short",
                                    label: "Short",
                                    range: "150-250 chars",
                                },
                                {
                                    value: "medium",
                                    label: "Medium",
                                    range: "250-500 chars",
                                },
                                {
                                    value: "long",
                                    label: "Long",
                                    range: "500-1000 chars",
                                },
                            ].map((length) => (
                                <Button
                                    key={length.value}
                                    onClick={() =>
                                        setContentLength(length.value as any)
                                    }
                                    variant={
                                        contentLength === length.value
                                            ? "default"
                                            : "outline"
                                    }
                                    className="flex flex-col h-auto py-3"
                                >
                                    <div className="font-semibold">{length.label}</div>
                                    <div className="text-xs opacity-70">
                                        {length.range}
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Section 4: Platform Configuration - Continuing in next message due to length */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Platform Configuration</h3>
                <div className="space-y-6">
                    <div>
                        <Label className="mb-2 block">Select Platforms</Label>
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

                    {/* Per-Platform Controls */}
                    {selectedPlatforms.map((platform) => (
                        <div
                            key={platform}
                            className="p-4 border rounded-lg bg-gray-50"
                        >
                            <h4 className="font-semibold capitalize mb-3">
                                {platform} Settings
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs mb-1 block">Format</Label>
                                    <select
                                        value={
                                            platformConfigs[platform]?.format || "post"
                                        }
                                        onChange={(e) =>
                                            updatePlatformConfig(
                                                platform,
                                                "format",
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                    >
                                        <option value="post">Post</option>
                                        <option value="carousel">Carousel</option>
                                        <option value="reel">Reel/Video</option>
                                        <option value="story">Story</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs mb-1 block">
                                        CTA Style
                                    </Label>
                                    <select
                                        value={
                                            platformConfigs[platform]?.ctaStyle ||
                                            "bio_link"
                                        }
                                        onChange={(e) =>
                                            updatePlatformConfig(
                                                platform,
                                                "ctaStyle",
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                    >
                                        <option value="bio_link">Bio Link</option>
                                        <option value="dm_keyword">DM Keyword</option>
                                        <option value="comment">Comment</option>
                                        <option value="external">External Link</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-3 space-y-2">
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <Label>
                                            Char Target:{" "}
                                            {platformConfigs[platform]?.charTarget ||
                                                150}
                                        </Label>
                                    </div>
                                    <Slider
                                        value={[
                                            platformConfigs[platform]?.charTarget ||
                                                150,
                                        ]}
                                        onValueChange={([value]) =>
                                            updatePlatformConfig(
                                                platform,
                                                "charTarget",
                                                value
                                            )
                                        }
                                        min={50}
                                        max={1000}
                                        step={10}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <Label>
                                            Hashtags:{" "}
                                            {platformConfigs[platform]?.hashtagCount ||
                                                10}
                                        </Label>
                                    </div>
                                    <Slider
                                        value={[
                                            platformConfigs[platform]?.hashtagCount ||
                                                10,
                                        ]}
                                        onValueChange={([value]) =>
                                            updatePlatformConfig(
                                                platform,
                                                "hashtagCount",
                                                value
                                            )
                                        }
                                        min={0}
                                        max={30}
                                        step={1}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Section 5: CTA & Link Strategy */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <LinkIcon className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold">CTA & Link Strategy</h3>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-2 block">Primary CTA Text</Label>
                            <Input
                                value={primaryCtaText}
                                onChange={(e) => setPrimaryCtaText(e.target.value)}
                                placeholder="Register Now"
                            />
                        </div>
                        <div>
                            <Label className="mb-2 block">CTA Type</Label>
                            <select
                                value={ctaType}
                                onChange={(e) => setCtaType(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="bio_link">Bio Link</option>
                                <option value="dm_keyword">DM Keyword</option>
                                <option value="comment_trigger">Comment Trigger</option>
                                <option value="external_url">External URL</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block">Primary URL (Funnel Page)</Label>
                        <Input
                            value={primaryUrl}
                            onChange={(e) => setPrimaryUrl(e.target.value)}
                            placeholder="https://yourdomain.com/register"
                        />
                    </div>

                    <UTMBuilder
                        baseUrl={primaryUrl}
                        onUrlChange={(url) => {
                            /* Handle URL change if needed */
                        }}
                        defaultCampaign={briefName.toLowerCase().replace(/\s+/g, "_")}
                        defaultSource={utmSource}
                        defaultMedium={utmMedium}
                        defaultContent={utmContent}
                    />

                    <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                            <Label className="font-medium">Link Shortener</Label>
                            <p className="text-xs text-gray-600">
                                Use short links for tracking
                            </p>
                        </div>
                        <Switch
                            checked={linkShortener}
                            onCheckedChange={setLinkShortener}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-medium">Tracking Enabled</Label>
                            <p className="text-xs text-gray-600">
                                Track clicks and conversions
                            </p>
                        </div>
                        <Switch
                            checked={trackingEnabled}
                            onCheckedChange={setTrackingEnabled}
                        />
                    </div>
                </div>
            </Card>

            {/* Section 6: Media Preferences */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="h-5 w-5 text-pink-500" />
                    <h3 className="text-lg font-semibold">Media Preferences</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-medium">Include Media</Label>
                            <p className="text-xs text-gray-600">
                                Add images or videos to posts
                            </p>
                        </div>
                        <Switch
                            checked={includeMedia}
                            onCheckedChange={setIncludeMedia}
                        />
                    </div>

                    {includeMedia && (
                        <>
                            <div>
                                <Label className="mb-2 block">
                                    Media Type Preference
                                </Label>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { value: "photo", label: "Photo" },
                                        { value: "graphic", label: "Graphic" },
                                        {
                                            value: "illustration",
                                            label: "Illustration",
                                        },
                                        { value: "mixed", label: "Mixed" },
                                    ].map((type) => (
                                        <Button
                                            key={type.value}
                                            onClick={() => setMediaType(type.value)}
                                            variant={
                                                mediaType === type.value
                                                    ? "default"
                                                    : "outline"
                                            }
                                            size="sm"
                                        >
                                            {type.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block">
                                    Custom Media (Optional)
                                </Label>
                                <Button variant="outline" size="sm" className="w-full">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Media from Library
                                </Button>
                                <p className="text-xs text-gray-600 mt-1">
                                    Or let AI suggest appropriate images
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t">
                                <div>
                                    <Label className="font-medium">
                                        AI Image Generation
                                    </Label>
                                    <p className="text-xs text-gray-600">
                                        Generate custom images with AI
                                    </p>
                                </div>
                                <Switch
                                    checked={aiImageGeneration}
                                    onCheckedChange={setAiImageGeneration}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="font-medium">
                                        Auto-Generate Alt Text
                                    </Label>
                                    <p className="text-xs text-gray-600">
                                        Accessibility descriptions
                                    </p>
                                </div>
                                <Switch
                                    checked={altTextAutoGen}
                                    onCheckedChange={setAltTextAutoGen}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Card>

            {/* Section 7: Generation Configuration */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold">Generation Configuration</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Variant Count per Platform</Label>
                            <span className="text-sm text-gray-600">
                                {variantCount}
                            </span>
                        </div>
                        <Slider
                            value={[variantCount]}
                            onValueChange={([value]) => setVariantCount(value)}
                            min={1}
                            max={5}
                            step={1}
                        />
                        <p className="text-xs text-gray-600 mt-1">
                            Generate {variantCount} version
                            {variantCount !== 1 ? "s" : ""} per platform
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                            <Label className="font-medium">Apply Echo Mode</Label>
                            <p className="text-xs text-gray-600">
                                Use your voice mirroring from Profile
                            </p>
                        </div>
                        <Switch
                            checked={applyEchoMode}
                            onCheckedChange={setApplyEchoMode}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-medium">
                                Include Media Suggestions
                            </Label>
                            <p className="text-xs text-gray-600">
                                AI suggests relevant images
                            </p>
                        </div>
                        <Switch
                            checked={includeMediaSuggestions}
                            onCheckedChange={setIncludeMediaSuggestions}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                            <Label className="font-medium">Generate A/B Variants</Label>
                            <p className="text-xs text-gray-600">
                                Create variants for testing
                            </p>
                        </div>
                        <Switch
                            checked={generateABVariants}
                            onCheckedChange={setGenerateABVariants}
                        />
                    </div>

                    {generateABVariants && (
                        <div>
                            <Label className="mb-2 block">Experiment Type</Label>
                            <select
                                value={experimentType}
                                onChange={(e) => setExperimentType(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="hook">
                                    Hook Test (Different Openings)
                                </option>
                                <option value="cta">
                                    CTA Test (Different Calls-to-Action)
                                </option>
                                <option value="length">
                                    Length Test (Short vs Long)
                                </option>
                                <option value="tone">
                                    Tone Test (Different Tones)
                                </option>
                            </select>
                        </div>
                    )}
                </div>
            </Card>

            {/* Section 8: Advanced Options (Accordion) */}
            <Card className="p-6">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold">Advanced Options</h3>
                    </div>
                    {showAdvanced ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                </button>

                {showAdvanced && (
                    <div className="mt-4 space-y-4 pt-4 border-t">
                        <div>
                            <Label className="mb-2 block">
                                Tone Constraints (Override Profile)
                            </Label>
                            <Textarea
                                value={toneConstraints}
                                onChange={(e) => setToneConstraints(e.target.value)}
                                placeholder="e.g., Use more urgency, avoid humor..."
                                rows={2}
                            />
                        </div>

                        <div>
                            <Label className="mb-2 block">Excluded Keywords</Label>
                            <Textarea
                                value={excludedKeywords}
                                onChange={(e) => setExcludedKeywords(e.target.value)}
                                placeholder="Words to avoid (comma separated)..."
                                rows={2}
                            />
                        </div>

                        <div>
                            <Label className="mb-2 block">Required Keywords</Label>
                            <Textarea
                                value={requiredKeywords}
                                onChange={(e) => setRequiredKeywords(e.target.value)}
                                placeholder="Words that must be included (comma separated)..."
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-2 block">
                                    Reading Level Target
                                </Label>
                                <select
                                    value={readingLevel}
                                    onChange={(e) => setReadingLevel(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    <option value="6th_grade">6th Grade</option>
                                    <option value="8th_grade">
                                        8th Grade (Default)
                                    </option>
                                    <option value="10th_grade">10th Grade</option>
                                    <option value="12th_grade">12th Grade</option>
                                </select>
                            </div>

                            <div>
                                <Label className="mb-2 block">Emoji Usage</Label>
                                <select
                                    value={emojiUsage}
                                    onChange={(e) => setEmojiUsage(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    <option value="none">None</option>
                                    <option value="minimal">Minimal</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="heavy">Heavy</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Section 9: Save as Template */}
            <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Save className="h-6 w-6 text-purple-500" />
                        <div>
                            <h3 className="font-semibold">
                                Save This Brief as Template
                            </h3>
                            <p className="text-sm text-gray-600">
                                Reuse these settings for future content
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                    </Button>
                </div>
            </Card>

            {/* Generation Button */}
            <div className="flex justify-end gap-3">
                <Button
                    onClick={handleGenerate}
                    disabled={generating || selectedPlatforms.length === 0}
                    size="lg"
                    className="w-full sm:w-auto"
                >
                    {generating ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Generating... {generationProgress}%
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-5 w-5 mr-2" />
                            Generate Content
                        </>
                    )}
                </Button>
            </div>

            {/* Story Angles Display */}
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
                                funnelProjectId={funnelProjectId}
                                onUpdate={() => {
                                    // Reload variants if needed
                                }}
                                onSchedule={() => {
                                    onContentGenerated();
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
