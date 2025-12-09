"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { Sparkles, Palette, Link as LinkIcon, Save, Loader2 } from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
import type { BusinessProfile } from "@/types/business-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BrandDesign {
    id: string;
    brand_name: string | null;
    primary_color: string;
    secondary_color: string | null;
    accent_color: string | null;
    background_color: string;
    text_color: string;
    scraped_url: string | null;
    design_style: string | null;
    personality_traits: {
        tone?: string;
        mood?: string;
        energy?: string;
        values?: string[];
    };
    questionnaire_responses: any;
    is_ai_generated: boolean;
}

export default function Step3BrandDesignPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [brandDesign, setBrandDesign] = useState<BrandDesign | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [transcripts, setTranscripts] = useState<any[]>([]);
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(
        null
    );

    // Form state
    const [brandName, setBrandName] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#3b82f6");
    const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
    const [accentColor, setAccentColor] = useState("#ec4899");
    const [backgroundColor, setBackgroundColor] = useState("#ffffff");
    const [textColor, setTextColor] = useState("#1f2937");
    const [scrapedUrl, setScrapedUrl] = useState("");
    const [designStyle, setDesignStyle] = useState("modern");
    const [tone, setTone] = useState("professional");
    const [mood, setMood] = useState("confident");
    const [energy, setEnergy] = useState("dynamic");

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    useEffect(() => {
        const loadData = async () => {
            if (!projectId) return;

            try {
                const supabase = createClient();

                // Load project
                const { data: projectData, error: projectError } = await supabase
                    .from("funnel_projects")
                    .select("*")
                    .eq("id", projectId)
                    .single();

                if (projectError) throw projectError;
                setProject(projectData);

                // Load transcripts
                const { data: transcriptsData } = await supabase
                    .from("vapi_transcripts")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false });

                setTranscripts(transcriptsData || []);

                // Load business profile
                try {
                    const profileResponse = await fetch(
                        `/api/context/business-profile?projectId=${projectId}`,
                        { credentials: "include" }
                    );

                    if (profileResponse.ok) {
                        const profileResult = await profileResponse.json();
                        if (
                            profileResult.profile &&
                            profileResult.profile.completion_status?.overall > 0
                        ) {
                            setBusinessProfile(profileResult.profile);
                        }
                    }
                } catch (profileError) {
                    // Non-critical - business profile loading is optional
                    logger.warn(
                        { error: profileError },
                        "Failed to load business profile"
                    );
                }

                // Load existing brand design
                const { data: brandData } = await supabase
                    .from("brand_designs")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .maybeSingle();

                if (brandData) {
                    setBrandDesign(brandData);
                    // Populate form with existing data
                    setBrandName(brandData.brand_name || "");
                    setPrimaryColor(brandData.primary_color);
                    setSecondaryColor(brandData.secondary_color || "#8b5cf6");
                    setAccentColor(brandData.accent_color || "#ec4899");
                    setBackgroundColor(brandData.background_color);
                    setTextColor(brandData.text_color);
                    setScrapedUrl(brandData.scraped_url || "");
                    setDesignStyle(brandData.design_style || "modern");
                    if (brandData.personality_traits) {
                        setTone(brandData.personality_traits.tone || "professional");
                        setMood(brandData.personality_traits.mood || "confident");
                        setEnergy(brandData.personality_traits.energy || "dynamic");
                    }
                }
            } catch (error) {
                logger.error({ error }, "Failed to load brand design data");
            }
        };

        loadData();
    }, [projectId]);

    const handleSave = async () => {
        if (!projectId) return;

        setIsSaving(true);
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            const brandData = {
                funnel_project_id: projectId,
                user_id: user.id,
                brand_name: brandName || project?.name,
                primary_color: primaryColor,
                secondary_color: secondaryColor,
                accent_color: accentColor,
                background_color: backgroundColor,
                text_color: textColor,
                scraped_url: scrapedUrl || null,
                design_style: designStyle,
                personality_traits: {
                    tone,
                    mood,
                    energy,
                },
                is_ai_generated: false,
            };

            if (brandDesign) {
                // Update existing
                const { error } = await supabase
                    .from("brand_designs")
                    .update(brandData)
                    .eq("id", brandDesign.id);

                if (error) throw error;
            } else {
                // Create new
                const { data, error } = await supabase
                    .from("brand_designs")
                    .insert(brandData)
                    .select()
                    .single();

                if (error) throw error;
                setBrandDesign(data);
            }

            toast({
                title: "✅ Brand design saved",
                description:
                    "Your brand colors and personality have been saved successfully.",
            });

            logger.info({ projectId }, "Brand design saved");
        } catch (error) {
            logger.error({ error }, "Failed to save brand design");
            toast({
                title: "❌ Save failed",
                description: "Could not save brand design. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Check if we have any intake data (transcripts or business profile)
    const hasIntakeData =
        transcripts.length > 0 ||
        (businessProfile && (businessProfile.completion_status?.overall ?? 0) > 0);

    const handleAIGenerate = async () => {
        if (!projectId || !hasIntakeData) {
            toast({
                title: "⚠️ No intake data",
                description:
                    "Complete your business profile or an AI intake call first to generate brand design.",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        try {
            // Build request body - prefer business profile if available, otherwise use transcript
            const requestBody: {
                projectId: string;
                transcriptId?: string;
                businessProfileId?: string;
            } = { projectId };

            if (
                businessProfile &&
                (businessProfile.completion_status?.overall ?? 0) > 0
            ) {
                requestBody.businessProfileId = businessProfile.id;
            } else if (transcripts.length > 0) {
                requestBody.transcriptId = transcripts[0].id;
            }

            const response = await fetch("/api/generate/brand-design", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error("Generation failed");
            }

            const data = await response.json();

            // Update form with AI-generated values
            setPrimaryColor(data.primary_color);
            setSecondaryColor(data.secondary_color);
            setAccentColor(data.accent_color);
            setBackgroundColor(data.background_color || "#ffffff");
            setTextColor(data.text_color || "#1f2937");
            setDesignStyle(data.design_style || "modern");
            if (data.personality_traits) {
                setTone(data.personality_traits.tone || "professional");
                setMood(data.personality_traits.mood || "confident");
                setEnergy(data.personality_traits.energy || "dynamic");
            }

            setBrandDesign(data);

            toast({
                title: "✨ Brand design generated",
                description: "AI has created a custom brand palette for you!",
            });

            logger.info({ projectId }, "Brand design generated by AI");
        } catch (error) {
            logger.error({ error }, "Failed to generate brand design");
            toast({
                title: "❌ Generation failed",
                description: "Could not generate brand design. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleScrapeUrl = async () => {
        if (!scrapedUrl) {
            toast({
                title: "⚠️ URL required",
                description: "Please enter a website URL to scrape colors from.",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        try {
            const response = await fetch("/api/scrape/brand-colors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: scrapedUrl }),
            });

            if (!response.ok) {
                throw new Error("Scraping failed");
            }

            const data = await response.json();

            // Check if colors were actually extracted (confidence > 0)
            const hasValidColors =
                data.colors && data.confidence && data.confidence.colors > 0;

            if (hasValidColors) {
                // Update colors from scraped data
                setPrimaryColor(data.colors.primary || primaryColor);
                setSecondaryColor(data.colors.secondary || secondaryColor);
                setAccentColor(data.colors.accent || accentColor);
                setBackgroundColor(data.colors.background || backgroundColor);
                setTextColor(data.colors.text || textColor);

                toast({
                    title: "🎨 Colors extracted",
                    description: `Brand colors extracted with ${data.confidence.colors}% confidence!`,
                });

                logger.info(
                    {
                        url: scrapedUrl,
                        confidence: data.confidence.colors,
                    },
                    "Colors scraped from URL"
                );
            } else {
                // No colors found - show warning instead of success
                toast({
                    title: "⚠️ No colors found",
                    description:
                        "Could not extract brand colors from the website. The site may use external stylesheets or have minimal inline styles.",
                    variant: "destructive",
                });

                logger.warn(
                    {
                        url: scrapedUrl,
                        confidence: data.confidence?.colors || 0,
                    },
                    "No colors found during scraping"
                );
            }
        } catch (error) {
            logger.error({ error, url: scrapedUrl }, "Failed to scrape colors");
            toast({
                title: "❌ Scraping failed",
                description: "Could not extract colors from URL. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const hasBrandDesign = !!brandDesign;

    if (!project) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={3}
            projectId={projectId}
            funnelName={project?.name}
            completedSteps={completedSteps}
            nextDisabled={!hasBrandDesign}
            nextLabel={
                hasBrandDesign
                    ? "Continue to Presentation Structure"
                    : "Save Brand First"
            }
            stepTitle="Brand Design"
            stepDescription="Define your visual identity with colors and personality"
        >
            <div className="space-y-8">
                {/* Dependency Warning */}
                {!hasIntakeData && (
                    <DependencyWarning
                        message="You need to complete your business profile or AI intake call first so we can understand your business and generate appropriate brand styling."
                        requiredStep={1}
                        requiredStepName="Intake"
                        projectId={projectId}
                    />
                )}

                {/* Brand Design Tools */}
                <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="manual">
                            <Palette className="mr-2 h-4 w-4" />
                            Manual Colors
                        </TabsTrigger>
                        <TabsTrigger value="ai">
                            <Sparkles className="mr-2 h-4 w-4" />
                            AI Generate
                        </TabsTrigger>
                        <TabsTrigger value="scrape">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Scrape URL
                        </TabsTrigger>
                    </TabsList>

                    {/* Manual Color Picker */}
                    <TabsContent value="manual" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Choose Your Brand Colors</CardTitle>
                                <CardDescription>
                                    Manually select colors that represent your brand
                                    identity
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="primary">Primary Color</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                id="primary"
                                                value={primaryColor}
                                                onChange={(e) =>
                                                    setPrimaryColor(e.target.value)
                                                }
                                                className="h-10 w-20"
                                            />
                                            <Input
                                                type="text"
                                                value={primaryColor}
                                                onChange={(e) =>
                                                    setPrimaryColor(e.target.value)
                                                }
                                                placeholder="#3b82f6"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="secondary">
                                            Secondary Color
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                id="secondary"
                                                value={secondaryColor}
                                                onChange={(e) =>
                                                    setSecondaryColor(e.target.value)
                                                }
                                                className="h-10 w-20"
                                            />
                                            <Input
                                                type="text"
                                                value={secondaryColor}
                                                onChange={(e) =>
                                                    setSecondaryColor(e.target.value)
                                                }
                                                placeholder="#8b5cf6"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="accent">Accent Color</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                id="accent"
                                                value={accentColor}
                                                onChange={(e) =>
                                                    setAccentColor(e.target.value)
                                                }
                                                className="h-10 w-20"
                                            />
                                            <Input
                                                type="text"
                                                value={accentColor}
                                                onChange={(e) =>
                                                    setAccentColor(e.target.value)
                                                }
                                                placeholder="#ec4899"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="background">
                                            Background Color
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                id="background"
                                                value={backgroundColor}
                                                onChange={(e) =>
                                                    setBackgroundColor(e.target.value)
                                                }
                                                className="h-10 w-20"
                                            />
                                            <Input
                                                type="text"
                                                value={backgroundColor}
                                                onChange={(e) =>
                                                    setBackgroundColor(e.target.value)
                                                }
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="text">Text Color</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                id="text"
                                                value={textColor}
                                                onChange={(e) =>
                                                    setTextColor(e.target.value)
                                                }
                                                className="h-10 w-20"
                                            />
                                            <Input
                                                type="text"
                                                value={textColor}
                                                onChange={(e) =>
                                                    setTextColor(e.target.value)
                                                }
                                                placeholder="#1f2937"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Brand Personality Questionnaire */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Brand Personality</CardTitle>
                                <CardDescription>
                                    Define the personality and feel of your brand
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="brandName">
                                        Brand Name (Optional)
                                    </Label>
                                    <Input
                                        id="brandName"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                        placeholder={project?.name || "Your Brand Name"}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="style">Design Style</Label>
                                    <Select
                                        value={designStyle}
                                        onValueChange={setDesignStyle}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="modern">
                                                Modern
                                            </SelectItem>
                                            <SelectItem value="classic">
                                                Classic
                                            </SelectItem>
                                            <SelectItem value="minimal">
                                                Minimal
                                            </SelectItem>
                                            <SelectItem value="bold">Bold</SelectItem>
                                            <SelectItem value="vibrant">
                                                Vibrant
                                            </SelectItem>
                                            <SelectItem value="elegant">
                                                Elegant
                                            </SelectItem>
                                            <SelectItem value="playful">
                                                Playful
                                            </SelectItem>
                                            <SelectItem value="professional">
                                                Professional
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="tone">Tone</Label>
                                        <Select value={tone} onValueChange={setTone}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="professional">
                                                    Professional
                                                </SelectItem>
                                                <SelectItem value="friendly">
                                                    Friendly
                                                </SelectItem>
                                                <SelectItem value="authoritative">
                                                    Authoritative
                                                </SelectItem>
                                                <SelectItem value="conversational">
                                                    Conversational
                                                </SelectItem>
                                                <SelectItem value="inspirational">
                                                    Inspirational
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="mood">Mood</Label>
                                        <Select value={mood} onValueChange={setMood}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="confident">
                                                    Confident
                                                </SelectItem>
                                                <SelectItem value="calm">
                                                    Calm
                                                </SelectItem>
                                                <SelectItem value="energetic">
                                                    Energetic
                                                </SelectItem>
                                                <SelectItem value="serious">
                                                    Serious
                                                </SelectItem>
                                                <SelectItem value="optimistic">
                                                    Optimistic
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="energy">Energy</Label>
                                        <Select
                                            value={energy}
                                            onValueChange={setEnergy}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="dynamic">
                                                    Dynamic
                                                </SelectItem>
                                                <SelectItem value="stable">
                                                    Stable
                                                </SelectItem>
                                                <SelectItem value="bold">
                                                    Bold
                                                </SelectItem>
                                                <SelectItem value="subtle">
                                                    Subtle
                                                </SelectItem>
                                                <SelectItem value="vibrant">
                                                    Vibrant
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* AI Generation */}
                    <TabsContent value="ai" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Brand Generation</CardTitle>
                                <CardDescription>
                                    Let AI create a custom brand palette based on your
                                    intake call
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {hasIntakeData ? (
                                    <>
                                        <p className="text-sm text-muted-foreground">
                                            AI will analyze your business, industry, and
                                            target audience from your{" "}
                                            {businessProfile &&
                                            (businessProfile.completion_status
                                                ?.overall ?? 0) > 0
                                                ? "business profile"
                                                : "intake call"}{" "}
                                            to generate a cohesive brand identity.
                                        </p>
                                        <Button
                                            onClick={handleAIGenerate}
                                            disabled={isGenerating}
                                            size="lg"
                                            className="w-full"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Generating Brand...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                    Generate Brand Design
                                                </>
                                            )}
                                        </Button>
                                    </>
                                ) : (
                                    <p className="text-sm text-amber-600">
                                        Complete your business profile or AI intake call
                                        first to use AI generation.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* URL Scraper */}
                    <TabsContent value="scrape" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Scrape Website Colors</CardTitle>
                                <CardDescription>
                                    Extract brand colors from an existing website
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="url">Website URL</Label>
                                    <Input
                                        id="url"
                                        type="url"
                                        value={scrapedUrl}
                                        onChange={(e) => setScrapedUrl(e.target.value)}
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <Button
                                    onClick={handleScrapeUrl}
                                    disabled={isGenerating || !scrapedUrl}
                                    size="lg"
                                    className="w-full"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Extracting Colors...
                                        </>
                                    ) : (
                                        <>
                                            <LinkIcon className="mr-2 h-4 w-4" />
                                            Extract Brand Colors
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Live Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Brand Preview</CardTitle>
                        <CardDescription>
                            See how your brand colors work together
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Color Palette Display */}
                            <div className="flex gap-2">
                                <div
                                    className="flex h-20 flex-1 items-center justify-center rounded-lg text-sm font-medium"
                                    style={{
                                        backgroundColor: primaryColor,
                                        color: textColor,
                                    }}
                                >
                                    Primary
                                </div>
                                <div
                                    className="flex h-20 flex-1 items-center justify-center rounded-lg text-sm font-medium"
                                    style={{
                                        backgroundColor: secondaryColor,
                                        color: textColor,
                                    }}
                                >
                                    Secondary
                                </div>
                                <div
                                    className="flex h-20 flex-1 items-center justify-center rounded-lg text-sm font-medium"
                                    style={{
                                        backgroundColor: accentColor,
                                        color: textColor,
                                    }}
                                >
                                    Accent
                                </div>
                            </div>

                            {/* Sample Card */}
                            <div
                                className="rounded-lg border p-6"
                                style={{
                                    backgroundColor: backgroundColor,
                                    borderColor: primaryColor,
                                }}
                            >
                                <h3
                                    className="mb-2 text-xl font-bold"
                                    style={{ color: primaryColor }}
                                >
                                    {brandName || project?.name || "Your Brand"}
                                </h3>
                                <p
                                    className="mb-4 text-sm"
                                    style={{ color: textColor }}
                                >
                                    {designStyle.charAt(0).toUpperCase() +
                                        designStyle.slice(1)}{" "}
                                    • {tone.charAt(0).toUpperCase() + tone.slice(1)} •{" "}
                                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                                </p>
                                <button
                                    className="rounded px-4 py-2 text-sm font-medium"
                                    style={{
                                        backgroundColor: primaryColor,
                                        color: backgroundColor,
                                    }}
                                >
                                    Call to Action
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        size="lg"
                        className="min-w-[200px]"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Brand Design
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </StepLayout>
    );
}
