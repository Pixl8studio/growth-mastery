/**
 * Enhanced Profile Configuration Form
 * Comprehensive controls matching Agent Config Form depth
 * 7 major sections with 30+ configurable parameters
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    Sparkles,
    Save,
    Palette,
    Upload,
    AlertTriangle,
    Shield,
    Zap,
    RefreshCw,
    Copy,
} from "lucide-react";
import type { MarketingProfile } from "@/types/marketing";

interface ProfileConfigFormProps {
    profile: MarketingProfile;
    onUpdate: () => void;
}

export function ProfileConfigFormEnhanced({
    profile,
    onUpdate,
}: ProfileConfigFormProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [calibrating, setCalibrating] = useState(false);
    const [loadingIntake, setLoadingIntake] = useState(false);
    const [loadingOffer, setLoadingOffer] = useState(false);
    const [copyingFromFollowup, setCopyingFromFollowup] = useState(false);

    // Section 1: Brand Voice
    const [brandVoice, setBrandVoice] = useState(profile.brand_voice || "");

    // Section 2: Visual Identity
    const [primaryColor, setPrimaryColor] = useState(
        (profile.visual_preferences as any)?.brand_colors?.[0] || "#3B82F6"
    );
    const [secondaryColor, setSecondaryColor] = useState(
        (profile.visual_preferences as any)?.brand_colors?.[1] || "#8B5CF6"
    );
    const [logoUrl, setLogoUrl] = useState(
        (profile.visual_preferences as any)?.logo_url || ""
    );
    const [fontPreference, setFontPreference] = useState<string>("sans-serif");
    const [imageryStyle, setImageryStyle] = useState<string>("professional");

    // Section 3: Echo Mode
    const [echoModeEnabled, setEchoModeEnabled] = useState(
        (profile.echo_mode_config as any)?.enabled || false
    );
    const [voiceStrength, setVoiceStrength] = useState(75);
    const [vocabularyLevel, setVocabularyLevel] =
        useState<string>("intermediate");
    const [sampleContent, setSampleContent] = useState("");

    // Section 4: Tone Console (8 sliders)
    const [toneSettings, setToneSettings] = useState({
        conversational_professional:
            profile.tone_settings?.conversational_professional || 50,
        warmth: profile.tone_settings?.warmth || 70,
        urgency: profile.tone_settings?.urgency || 40,
        empathy: profile.tone_settings?.empathy || 60,
        confidence: profile.tone_settings?.confidence || 75,
        humor: (profile.metadata as any)?.tone_extended?.humor || 30,
        authority: (profile.metadata as any)?.tone_extended?.authority || 70,
        vulnerability:
            (profile.metadata as any)?.tone_extended?.vulnerability || 40,
    });

    // Section 5: Story Themes
    const [storyThemes, setStoryThemes] = useState<string[]>(
        profile.story_themes || []
    );
    const [themePriorities, setThemePriorities] = useState<
        Record<string, number>
    >((profile.metadata as any)?.theme_priorities || {
        founder_saga: 3,
        myth_buster: 3,
        philosophy_pov: 3,
        current_event: 3,
        how_to: 3,
    });
    const [storyMixStrategy, setStoryMixStrategy] = useState<string>(
        (profile.metadata as any)?.story_mix_strategy || "balanced"
    );
    const [customStoryPrompts, setCustomStoryPrompts] = useState(
        (profile.metadata as any)?.custom_story_prompts || ""
    );

    // Section 6: Content Restrictions
    const [prohibitedTopics, setProhibitedTopics] = useState(
        (profile.metadata as any)?.content_restrictions?.prohibited_topics || ""
    );
    const [requiredElements, setRequiredElements] = useState(
        (profile.metadata as any)?.content_restrictions?.required_elements || ""
    );
    const [sensitiveTopicsHandling, setSensitiveTopicsHandling] =
        useState<string>(
            (profile.metadata as any)?.content_restrictions
                ?.sensitive_topics_handling || "disclaimer"
        );

    // Section 7: Compliance Configuration
    const [industry, setIndustry] = useState<string>(
        (profile.metadata as any)?.compliance?.industry || "general"
    );
    const [requiredDisclaimers, setRequiredDisclaimers] = useState(
        (profile.metadata as any)?.compliance?.required_disclaimers || ""
    );
    const [autoDisclaimer, setAutoDisclaimer] = useState(
        (profile.metadata as any)?.compliance?.auto_disclaimer ?? true
    );
    const [copyrightPolicy, setCopyrightPolicy] = useState<string>(
        (profile.metadata as any)?.compliance?.copyright_policy || "moderate"
    );
    const [imageLicensingRequired, setImageLicensingRequired] = useState(
        (profile.metadata as any)?.compliance?.image_licensing_required ?? true
    );

    const handleSave = async () => {
        setSaving(true);

        try {
            const response = await fetch(`/api/marketing/profiles/${profile.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    brand_voice: brandVoice,
                    tone_settings: {
                        conversational_professional:
                            toneSettings.conversational_professional,
                        warmth: toneSettings.warmth,
                        urgency: toneSettings.urgency,
                        empathy: toneSettings.empathy,
                        confidence: toneSettings.confidence,
                    },
                    echo_mode_config: {
                        ...(profile.echo_mode_config as any),
                        enabled: echoModeEnabled,
                        voice_strength: voiceStrength,
                        vocabulary_level: vocabularyLevel,
                    },
                    story_themes: storyThemes,
                    visual_preferences: {
                        brand_colors: [primaryColor, secondaryColor],
                        logo_url: logoUrl,
                        font_preference: fontPreference,
                        imagery_style: imageryStyle,
                    },
                    metadata: {
                        ...profile.metadata,
                        tone_extended: {
                            humor: toneSettings.humor,
                            authority: toneSettings.authority,
                            vulnerability: toneSettings.vulnerability,
                        },
                        theme_priorities: themePriorities,
                        story_mix_strategy: storyMixStrategy,
                        custom_story_prompts: customStoryPrompts,
                        content_restrictions: {
                            prohibited_topics: prohibitedTopics,
                            required_elements: requiredElements,
                            sensitive_topics_handling: sensitiveTopicsHandling,
                        },
                        compliance: {
                            industry,
                            required_disclaimers: requiredDisclaimers,
                            auto_disclaimer: autoDisclaimer,
                            copyright_policy: copyrightPolicy,
                            image_licensing_required: imageLicensingRequired,
                        },
                    },
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Profile Updated",
                    description: "Your brand voice settings have been saved",
                });
                onUpdate();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Failed to save profile");
            toast({
                title: "Error",
                description: "Failed to save profile settings",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAutoPopulateFromIntake = async () => {
        setLoadingIntake(true);
        try {
            toast({
                title: "Auto-populate from Intake",
                description: "Feature will populate from intake data",
            });
        } catch (error) {
            logger.error({ error }, "Failed to load intake data");
        } finally {
            setLoadingIntake(false);
        }
    };

    const handleAutoPopulateFromOffer = async () => {
        setLoadingOffer(true);
        try {
            toast({
                title: "Auto-populate from Offer",
                description: "Feature will populate from offer data",
            });
        } catch (error) {
            logger.error({ error }, "Failed to load offer data");
        } finally {
            setLoadingOffer(false);
        }
    };

    const handleCopyFromFollowup = async () => {
        setCopyingFromFollowup(true);
        try {
            toast({
                title: "Copy from Followup Agent",
                description: "Voice settings from Step 11 will be synced",
            });
        } catch (error) {
            logger.error({ error }, "Failed to copy from followup");
        } finally {
            setCopyingFromFollowup(false);
        }
    };

    const applyTonePreset = (preset: string) => {
        const presets = {
            thought_leader: {
                conversational_professional: 70,
                warmth: 50,
                urgency: 30,
                empathy: 60,
                confidence: 90,
                humor: 20,
                authority: 90,
                vulnerability: 30,
            },
            friendly_expert: {
                conversational_professional: 50,
                warmth: 80,
                urgency: 40,
                empathy: 80,
                confidence: 75,
                humor: 60,
                authority: 70,
                vulnerability: 50,
            },
            bold_disruptor: {
                conversational_professional: 30,
                warmth: 60,
                urgency: 80,
                empathy: 50,
                confidence: 95,
                humor: 70,
                authority: 85,
                vulnerability: 20,
            },
        };

        const presetValues = presets[preset as keyof typeof presets];
        if (presetValues) {
            setToneSettings(presetValues);
            toast({
                title: "Tone Preset Applied",
                description: `${preset.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} preset applied`,
            });
        }
    };

    const handleCalibrateVoice = async () => {
        if (!sampleContent.trim()) {
            toast({
                title: "Sample Content Required",
                description: "Paste 3-5 existing social posts to calibrate voice",
                variant: "destructive",
            });
            return;
        }

        setCalibrating(true);

        try {
            const posts = sampleContent
                .split("\n\n")
                .filter((p) => p.trim().length > 50);

            if (posts.length < 2) {
                throw new Error("Please provide at least 2 sample posts");
            }

            const response = await fetch(
                `/api/marketing/profiles/${profile.id}/calibrate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sample_content: posts,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Voice Calibrated",
                    description: `Echo Mode analyzed your voice: ${data.echo_mode_config?.voice_characteristics?.join(", ") || ""}`,
                });
                onUpdate();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Failed to calibrate voice");
            toast({
                title: "Calibration Failed",
                description:
                    error instanceof Error ? error.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setCalibrating(false);
        }
    };

    const toggleStoryTheme = (theme: string) => {
        if (storyThemes.includes(theme)) {
            setStoryThemes(storyThemes.filter((t) => t !== theme));
        } else {
            setStoryThemes([...storyThemes, theme]);
        }
    };

    const updateThemePriority = (theme: string, priority: number) => {
        setThemePriorities({
            ...themePriorities,
            [theme]: priority,
        });
    };

    return (
        <div className="space-y-6">
            {/* Section 1: Brand Voice */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Brand Voice Guidelines</h3>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleAutoPopulateFromIntake}
                            disabled={loadingIntake}
                            variant="outline"
                            size="sm"
                        >
                            <Zap className="h-4 w-4 mr-2" />
                            From Intake
                        </Button>
                        <Button
                            onClick={handleAutoPopulateFromOffer}
                            disabled={loadingOffer}
                            variant="outline"
                            size="sm"
                        >
                            <Zap className="h-4 w-4 mr-2" />
                            From Offer
                        </Button>
                    </div>
                </div>
                <Textarea
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    placeholder="Describe your brand voice, key messaging themes, and how you want to communicate with your audience..."
                    className="min-h-[200px]"
                />
                <p className="text-sm text-gray-600 mt-2">
                    Auto-populated from your intake call and offer. Edit to refine.
                </p>
            </Card>

            {/* Section 2: Visual Identity */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Palette className="h-5 w-5 text-purple-500" />
                    <h3 className="text-lg font-semibold">Visual Identity</h3>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-2 block">Primary Brand Color</Label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="h-10 w-20 rounded border"
                                />
                                <Input
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    placeholder="#3B82F6"
                                    className="flex-1"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="mb-2 block">Secondary Brand Color</Label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="h-10 w-20 rounded border"
                                />
                                <Input
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    placeholder="#8B5CF6"
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block">Logo URL</Label>
                        <div className="flex gap-2">
                            <Input
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                placeholder="https://example.com/logo.png"
                                className="flex-1"
                            />
                            <Button variant="outline" size="sm">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                            </Button>
                        </div>
                        {logoUrl && (
                            <div className="mt-2 p-2 border rounded bg-gray-50">
                                <img
                                    src={logoUrl}
                                    alt="Logo preview"
                                    className="h-16 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display =
                                            "none";
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-2 block">Font Preference</Label>
                            <select
                                value={fontPreference}
                                onChange={(e) => setFontPreference(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="sans-serif">Sans Serif (Modern)</option>
                                <option value="serif">Serif (Traditional)</option>
                                <option value="display">Display (Bold)</option>
                            </select>
                        </div>
                        <div>
                            <Label className="mb-2 block">Brand Imagery Style</Label>
                            <select
                                value={imageryStyle}
                                onChange={(e) => setImageryStyle(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="professional">Professional</option>
                                <option value="casual">Casual</option>
                                <option value="artistic">Artistic</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Section 3: Echo Mode */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            Echo Mode - Voice Mirroring
                        </h3>
                        <p className="text-sm text-gray-600">
                            AI learns your unique writing style and mirrors it
                        </p>
                    </div>
                    <Switch
                        checked={echoModeEnabled}
                        onCheckedChange={setEchoModeEnabled}
                    />
                </div>

                {echoModeEnabled && (
                    <div className="space-y-4">
                        <div>
                            <Label className="mb-2 block">Sample Content for Calibration</Label>
                            <Textarea
                                value={sampleContent}
                                onChange={(e) => setSampleContent(e.target.value)}
                                placeholder="Paste 3-5 existing social posts (separate with double line breaks)..."
                                className="min-h-[150px]"
                            />
                            <Button
                                onClick={handleCalibrateVoice}
                                disabled={calibrating}
                                className="mt-2"
                                size="sm"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${calibrating ? "animate-spin" : ""}`} />
                                {calibrating ? "Analyzing..." : "Calibrate Voice"}
                            </Button>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <Label>Voice Strength (How Strictly to Mirror)</Label>
                                <span className="text-sm text-gray-600">{voiceStrength}%</span>
                            </div>
                            <Slider
                                value={[voiceStrength]}
                                onValueChange={([value]) => setVoiceStrength(value)}
                                min={0}
                                max={100}
                                step={5}
                            />
                        </div>

                        <div>
                            <Label className="mb-2 block">Vocabulary Level</Label>
                            <select
                                value={vocabularyLevel}
                                onChange={(e) => setVocabularyLevel(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="simple">Simple</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>

                        {(profile.echo_mode_config as any)?.voice_characteristics
                            ?.length > 0 && (
                            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                                <p className="text-sm font-medium mb-2">
                                    Voice Characteristics:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {(
                                        profile.echo_mode_config as any
                                    ).voice_characteristics.map((char: string) => (
                                        <span
                                            key={char}
                                            className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                                        >
                                            {char}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Section 4: Tone Console (8 Sliders) */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Tone Settings</h3>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => applyTonePreset("thought_leader")}
                            variant="outline"
                            size="sm"
                        >
                            Thought Leader
                        </Button>
                        <Button
                            onClick={() => applyTonePreset("friendly_expert")}
                            variant="outline"
                            size="sm"
                        >
                            Friendly Expert
                        </Button>
                        <Button
                            onClick={() => applyTonePreset("bold_disruptor")}
                            variant="outline"
                            size="sm"
                        >
                            Bold Disruptor
                        </Button>
                        <Button
                            onClick={handleCopyFromFollowup}
                            disabled={copyingFromFollowup}
                            variant="outline"
                            size="sm"
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            From Step 11
                        </Button>
                    </div>
                </div>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Conversational ↔ Professional</Label>
                            <span className="text-sm text-gray-600">
                                {toneSettings.conversational_professional}
                            </span>
                        </div>
                        <Slider
                            value={[toneSettings.conversational_professional]}
                            onValueChange={([value]) =>
                                setToneSettings({
                                    ...toneSettings,
                                    conversational_professional: value,
                                })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Warmth</Label>
                            <span className="text-sm text-gray-600">
                                {toneSettings.warmth}
                            </span>
                        </div>
                        <Slider
                            value={[toneSettings.warmth]}
                            onValueChange={([value]) =>
                                setToneSettings({ ...toneSettings, warmth: value })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Urgency</Label>
                            <span className="text-sm text-gray-600">
                                {toneSettings.urgency}
                            </span>
                        </div>
                        <Slider
                            value={[toneSettings.urgency]}
                            onValueChange={([value]) =>
                                setToneSettings({ ...toneSettings, urgency: value })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Empathy</Label>
                            <span className="text-sm text-gray-600">
                                {toneSettings.empathy}
                            </span>
                        </div>
                        <Slider
                            value={[toneSettings.empathy]}
                            onValueChange={([value]) =>
                                setToneSettings({ ...toneSettings, empathy: value })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Confidence</Label>
                            <span className="text-sm text-gray-600">
                                {toneSettings.confidence}
                            </span>
                        </div>
                        <Slider
                            value={[toneSettings.confidence]}
                            onValueChange={([value]) =>
                                setToneSettings({ ...toneSettings, confidence: value })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                    </div>

                    {/* NEW SLIDERS */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Humor</Label>
                            <span className="text-sm text-gray-600">
                                {toneSettings.humor}
                            </span>
                        </div>
                        <Slider
                            value={[toneSettings.humor || 30]}
                            onValueChange={([value]) =>
                                setToneSettings({ ...toneSettings, humor: value })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Authority</Label>
                            <span className="text-sm text-gray-600">
                                {toneSettings.authority}
                            </span>
                        </div>
                        <Slider
                            value={[toneSettings.authority || 70]}
                            onValueChange={([value]) =>
                                setToneSettings({ ...toneSettings, authority: value })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Vulnerability</Label>
                            <span className="text-sm text-gray-600">
                                {toneSettings.vulnerability}
                            </span>
                        </div>
                        <Slider
                            value={[toneSettings.vulnerability || 40]}
                            onValueChange={([value]) =>
                                setToneSettings({ ...toneSettings, vulnerability: value })
                            }
                            min={0}
                            max={100}
                            step={1}
                        />
                    </div>
                </div>
            </Card>

            {/* Section 5: Story Theme Preferences */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                    Preferred Story Frameworks
                </h3>
                <div className="space-y-4">
                    {[
                        {
                            id: "founder_saga",
                            label: "Founder Saga",
                            desc: "Personal journey",
                        },
                        {
                            id: "myth_buster",
                            label: "Myth Buster",
                            desc: "Challenge beliefs",
                        },
                        {
                            id: "philosophy_pov",
                            label: "Philosophy POV",
                            desc: "Thought leadership",
                        },
                        {
                            id: "current_event",
                            label: "Current Event",
                            desc: "Timely hooks",
                        },
                        { id: "how_to", label: "How To", desc: "Actionable guides" },
                    ].map((theme) => (
                        <div
                            key={theme.id}
                            className="p-4 border rounded-lg"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div
                                    onClick={() => toggleStoryTheme(theme.id)}
                                    className="flex items-center gap-2 cursor-pointer flex-1"
                                >
                                    <div
                                        className={`w-4 h-4 rounded border ${
                                            storyThemes.includes(theme.id)
                                                ? "bg-blue-500 border-blue-500"
                                                : "border-gray-300"
                                        }`}
                                    >
                                        {storyThemes.includes(theme.id) && (
                                            <svg
                                                className="w-full h-full text-white"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">
                                            {theme.label}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {theme.desc}
                                        </div>
                                    </div>
                                </div>
                                {storyThemes.includes(theme.id) && (
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs">Priority:</Label>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() =>
                                                        updateThemePriority(theme.id, star)
                                                    }
                                                    className={`text-lg ${
                                                        star <= themePriorities[theme.id]
                                                            ? "text-yellow-400"
                                                            : "text-gray-300"
                                                    }`}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 space-y-4">
                    <div>
                        <Label className="mb-2 block">Story Mix Strategy</Label>
                        <select
                            value={storyMixStrategy}
                            onChange={(e) => setStoryMixStrategy(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            <option value="balanced">Balanced Mix</option>
                            <option value="variety-focused">Variety-Focused</option>
                            <option value="framework-dominant">
                                Stick to Top Framework
                            </option>
                        </select>
                    </div>

                    <div>
                        <Label className="mb-2 block">Custom Story Prompts</Label>
                        <Textarea
                            value={customStoryPrompts}
                            onChange={(e) => setCustomStoryPrompts(e.target.value)}
                            placeholder="Add custom story angles or prompts you want the AI to consider..."
                            rows={3}
                        />
                    </div>
                </div>
            </Card>

            {/* Section 6: Content Restrictions */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <h3 className="text-lg font-semibold">Content Restrictions</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label className="mb-2 block">Prohibited Topics (Blacklist)</Label>
                        <Textarea
                            value={prohibitedTopics}
                            onChange={(e) => setProhibitedTopics(e.target.value)}
                            placeholder="Topics to avoid (one per line)..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">
                            Required Elements (Must Include)
                        </Label>
                        <Textarea
                            value={requiredElements}
                            onChange={(e) => setRequiredElements(e.target.value)}
                            placeholder="Elements that must be included in every post (one per line)..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Sensitive Topics Handling</Label>
                        <select
                            value={sensitiveTopicsHandling}
                            onChange={(e) => setSensitiveTopicsHandling(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            <option value="avoid">Avoid Completely</option>
                            <option value="disclaimer">Include with Disclaimer</option>
                            <option value="skip">Skip If Detected</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Section 7: Compliance Configuration */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold">Compliance & Legal</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label className="mb-2 block">Industry</Label>
                        <select
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            <option value="general">General</option>
                            <option value="coaching">Coaching</option>
                            <option value="finance">Finance</option>
                            <option value="health">Health & Wellness</option>
                        </select>
                    </div>

                    <div>
                        <Label className="mb-2 block">Required Disclaimers</Label>
                        <Textarea
                            value={requiredDisclaimers}
                            onChange={(e) => setRequiredDisclaimers(e.target.value)}
                            placeholder="Industry-specific disclaimers to include..."
                            rows={4}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-medium">Auto-Disclaimer</Label>
                            <p className="text-sm text-gray-600">
                                Automatically add disclaimers when needed
                            </p>
                        </div>
                        <Switch
                            checked={autoDisclaimer}
                            onCheckedChange={setAutoDisclaimer}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Copyright Policy</Label>
                        <select
                            value={copyrightPolicy}
                            onChange={(e) => setCopyrightPolicy(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            <option value="strict">Strict (Original Only)</option>
                            <option value="moderate">Moderate (With Attribution)</option>
                            <option value="flexible">Flexible (Fair Use)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-medium">Image Licensing Required</Label>
                            <p className="text-sm text-gray-600">
                                Enforce proper licensing for all images
                            </p>
                        </div>
                        <Switch
                            checked={imageLicensingRequired}
                            onCheckedChange={setImageLicensingRequired}
                        />
                    </div>
                </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} size="lg">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Profile"}
                </Button>
            </div>
        </div>
    );
}

