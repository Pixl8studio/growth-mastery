/**
 * Profile Configuration Form
 * Edit brand voice, Echo Mode settings, and story preferences
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { Sparkles, Save, RefreshCw } from "lucide-react";
import type { MarketingProfile, ToneSettings } from "@/types/marketing";

interface ProfileConfigFormProps {
    profile: MarketingProfile;
    onUpdate: () => void;
}

export function ProfileConfigForm({ profile, onUpdate }: ProfileConfigFormProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [calibrating, setCalibrating] = useState(false);

    const [brandVoice, setBrandVoice] = useState(profile.brand_voice || "");
    const [toneSettings, setToneSettings] = useState<ToneSettings>(
        profile.tone_settings as ToneSettings
    );
    const [echoModeEnabled, setEchoModeEnabled] = useState(
        (profile.echo_mode_config as any)?.enabled || false
    );
    const [storyThemes, setStoryThemes] = useState<string[]>(
        profile.story_themes || []
    );
    const [sampleContent, setSampleContent] = useState("");
    const [analyzeUrl, setAnalyzeUrl] = useState("");
    const [analyzingUrl, setAnalyzingUrl] = useState(false);
    const [inputMethod, setInputMethod] = useState<"manual" | "url">("manual");
    const [styleSummary, setStyleSummary] = useState<string | null>(null);
    const [previewParagraph, setPreviewParagraph] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true);

        try {
            const response = await fetch(`/api/marketing/profiles/${profile.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    brand_voice: brandVoice,
                    tone_settings: toneSettings,
                    echo_mode_config: {
                        ...(profile.echo_mode_config as any),
                        enabled: echoModeEnabled,
                    },
                    story_themes: storyThemes,
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

    const handleCalibrateVoice = async () => {
        if (!sampleContent.trim()) {
            toast({
                title: "Sample Content Required",
                description:
                    "Paste 3-5 of your existing social posts to calibrate voice",
                variant: "destructive",
            });
            return;
        }

        setCalibrating(true);

        try {
            // Split sample content by double newlines (separate posts)
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
                    description: `Echo Mode has analyzed your voice characteristics: ${data.echo_mode_config?.voice_characteristics?.join(", ") || ""}`,
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

    const handleAnalyzeUrl = async () => {
        if (!analyzeUrl.trim()) {
            toast({
                title: "URL Required",
                description: "Please enter a social media profile URL or website",
                variant: "destructive",
            });
            return;
        }

        // Basic URL validation
        try {
            new URL(analyzeUrl);
        } catch {
            toast({
                title: "Invalid URL",
                description:
                    "Please enter a valid URL (e.g., https://instagram.com/username)",
                variant: "destructive",
            });
            return;
        }

        setAnalyzingUrl(true);
        setStyleSummary(null);
        setPreviewParagraph(null);

        try {
            const response = await fetch(
                `/api/marketing/profiles/${profile.id}/analyze-url`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: analyzeUrl,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                setStyleSummary(data.styleSummary || null);
                setPreviewParagraph(data.previewParagraph || null);
                toast({
                    title: "Analysis Complete",
                    description: `Voice profile generated from ${data.platform} content (${data.sampleCount} samples)`,
                });
                onUpdate();
            } else {
                throw new Error(data.error || "Failed to analyze URL");
            }
        } catch (error) {
            logger.error({ error, url: analyzeUrl }, "Failed to analyze URL");
            toast({
                title: "Analysis Failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Unable to analyze this URL. Please try pasting content manually.",
                variant: "destructive",
            });
        } finally {
            setAnalyzingUrl(false);
        }
    };

    const toggleStoryTheme = (theme: string) => {
        if (storyThemes.includes(theme)) {
            setStoryThemes(storyThemes.filter((t) => t !== theme));
        } else {
            setStoryThemes([...storyThemes, theme]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Brand Voice */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Brand Voice Guidelines</h3>
                <Textarea
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    placeholder="Describe your brand voice, key messaging themes, and how you want to communicate with your audience..."
                    className="min-h-[200px]"
                />
                <p className="text-sm text-muted-foreground mt-2">
                    Auto-populated from your intake call and offer. Edit to refine your
                    brand voice.
                </p>
            </Card>

            {/* Echo Mode */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            Echo Mode - Voice Mirroring
                        </h3>
                        <p className="text-sm text-muted-foreground">
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
                        {/* Input Method Toggle */}
                        <div className="flex gap-2 border-b border-border pb-2">
                            <button
                                type="button"
                                onClick={() => setInputMethod("manual")}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    inputMethod === "manual"
                                        ? "bg-purple-100 text-purple-700"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Manual Input
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMethod("url")}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    inputMethod === "url"
                                        ? "bg-purple-100 text-purple-700"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Analyze from URL
                            </button>
                        </div>

                        {/* Manual Input Section */}
                        {inputMethod === "manual" && (
                            <div>
                                <Label className="mb-2 block">
                                    Sample Content for Calibration
                                </Label>
                                <Textarea
                                    value={sampleContent}
                                    onChange={(e) => setSampleContent(e.target.value)}
                                    placeholder="Paste 3-5 of your existing social posts (separate with double line breaks)..."
                                    className="min-h-[150px]"
                                />
                                <Button
                                    onClick={handleCalibrateVoice}
                                    disabled={calibrating}
                                    className="mt-2"
                                    size="sm"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 mr-2 ${calibrating ? "animate-spin" : ""}`}
                                    />
                                    {calibrating ? "Analyzing..." : "Calibrate Voice"}
                                </Button>
                            </div>
                        )}

                        {/* URL Analysis Section */}
                        {inputMethod === "url" && (
                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-2 block">
                                        Social Media Profile or Website URL
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="url"
                                            value={analyzeUrl}
                                            onChange={(e) =>
                                                setAnalyzeUrl(e.target.value)
                                            }
                                            placeholder="https://instagram.com/username or https://linkedin.com/in/username or website URL"
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={handleAnalyzeUrl}
                                            disabled={
                                                analyzingUrl || !analyzeUrl.trim()
                                            }
                                            size="default"
                                        >
                                            <RefreshCw
                                                className={`h-4 w-4 mr-2 ${analyzingUrl ? "animate-spin" : ""}`}
                                            />
                                            {analyzingUrl
                                                ? "Analyzing..."
                                                : "Analyze URL"}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Paste a social media profile URL (Instagram,
                                        LinkedIn, Twitter, Facebook) or website to
                                        analyze your writing style. Note: Private
                                        profiles may require manual content paste.
                                    </p>
                                </div>

                                {/* Style Summary Display */}
                                {styleSummary && (
                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <Label className="text-sm font-medium mb-2 block">
                                            Detected Writing Style
                                        </Label>
                                        <p className="text-sm text-purple-900">
                                            {styleSummary}
                                        </p>
                                    </div>
                                )}

                                {/* Preview Paragraph Display */}
                                {previewParagraph && (
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <Label className="text-sm font-medium mb-2 block">
                                            Preview Paragraph
                                        </Label>
                                        <p className="text-sm text-blue-900 italic">
                                            {previewParagraph}
                                        </p>
                                        <p className="text-xs text-blue-700 mt-2">
                                            This preview demonstrates your detected
                                            voice characteristics
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Voice Characteristics Display */}
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

            {/* Tone Console */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Tone Settings</h3>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium">
                                Conversational ↔ Professional
                            </label>
                            <span className="text-sm text-muted-foreground">
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
                            <label className="text-sm font-medium">Warmth</label>
                            <span className="text-sm text-muted-foreground">
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
                            <label className="text-sm font-medium">Urgency</label>
                            <span className="text-sm text-muted-foreground">
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
                            <label className="text-sm font-medium">Empathy</label>
                            <span className="text-sm text-muted-foreground">
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
                            <label className="text-sm font-medium">Confidence</label>
                            <span className="text-sm text-muted-foreground">
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
                </div>
            </Card>

            {/* Story Themes */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                    Preferred Story Frameworks
                </h3>
                <div className="grid grid-cols-2 gap-3">
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
                            onClick={() => toggleStoryTheme(theme.id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                storyThemes.includes(theme.id)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-border"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-4 h-4 rounded border ${
                                        storyThemes.includes(theme.id)
                                            ? "bg-primary/50 border-primary"
                                            : "border-border"
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
                                    <div className="text-xs text-muted-foreground">
                                        {theme.desc}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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
