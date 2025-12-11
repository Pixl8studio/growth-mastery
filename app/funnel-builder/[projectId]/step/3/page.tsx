"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { BrandWizard, BrandGuidelinesDisplay } from "@/components/brand";
import {
    Palette,
    Link as LinkIcon,
    Save,
    Loader2,
    Wand2,
    CheckCircle2,
    ArrowRight,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
import type { BusinessProfile } from "@/types/business-profile";
import type {
    BrandWizardResponses,
    BrandVoice,
    MessagingFramework,
    BrandApplication,
    BrandFonts,
    DesignPreferences,
    BrandInputMethod,
} from "@/lib/ai/types";
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
    questionnaire_responses: BrandWizardResponses | null;
    is_ai_generated: boolean;
    input_method?: BrandInputMethod;
    fonts?: BrandFonts;
    design_preferences?: DesignPreferences;
    brand_voice?: BrandVoice;
    messaging_framework?: MessagingFramework;
    brand_application?: BrandApplication;
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
    const [activeTab, setActiveTab] = useState<string>("wizard");
    const [showWizard, setShowWizard] = useState(false);

    // Form state for manual entry
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

    const handleSaveManual = async () => {
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
                input_method: "manual" as BrandInputMethod,
            };

            if (brandDesign) {
                const { error } = await supabase
                    .from("brand_designs")
                    .update(brandData)
                    .eq("id", brandDesign.id);

                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from("brand_designs")
                    .insert(brandData)
                    .select()
                    .single();

                if (error) throw error;
                setBrandDesign(data);
            }

            toast({
                title: "Brand design saved",
                description:
                    "Your brand colors and personality have been saved successfully.",
            });

            logger.info({ projectId }, "Brand design saved");
        } catch (error) {
            logger.error({ error }, "Failed to save brand design");
            toast({
                title: "Save failed",
                description: "Could not save brand design. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Check if we have any intake data
    const hasIntakeData =
        transcripts.length > 0 ||
        (businessProfile && (businessProfile.completion_status?.overall ?? 0) > 0);

    const handleWizardComplete = async (responses: BrandWizardResponses) => {
        if (!projectId || !hasIntakeData) {
            toast({
                title: "No intake data",
                description:
                    "Complete your business profile or an AI intake call first to generate brand guidelines.",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        try {
            const requestBody: {
                projectId: string;
                transcriptId?: string;
                businessProfileId?: string;
                comprehensive: boolean;
                inputMethod: BrandInputMethod;
                wizardResponses: BrandWizardResponses;
            } = {
                projectId,
                comprehensive: true,
                inputMethod: "wizard",
                wizardResponses: responses,
            };

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

            const data = await response.json();

            if (!response.ok) {
                const errorMessage =
                    data.error || "Generation failed. Please try again.";
                throw new Error(errorMessage);
            }
            setBrandDesign(data);

            // Update form state
            setPrimaryColor(data.primary_color);
            setSecondaryColor(data.secondary_color || "#8b5cf6");
            setAccentColor(data.accent_color || "#ec4899");
            setBackgroundColor(data.background_color || "#ffffff");
            setTextColor(data.text_color || "#1f2937");
            setDesignStyle(data.design_style || "modern");
            if (data.personality_traits) {
                setTone(data.personality_traits.tone || "professional");
                setMood(data.personality_traits.mood || "confident");
                setEnergy(data.personality_traits.energy || "dynamic");
            }

            setShowWizard(false);

            toast({
                title: "Brand guidelines generated",
                description: "AI has created comprehensive brand guidelines for you!",
            });

            logger.info({ projectId }, "Comprehensive brand guidelines generated");
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Could not generate brand guidelines. Please try again.";
            logger.error(
                { error, errorMessage },
                "Failed to generate brand guidelines"
            );
            toast({
                title: "Generation failed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleScrapeUrl = async () => {
        if (!scrapedUrl) {
            toast({
                title: "URL required",
                description: "Please enter a website URL to extract brand from.",
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

            const hasValidColors =
                data.colors && data.confidence && data.confidence.colors > 0;

            if (hasValidColors) {
                setPrimaryColor(data.colors.primary || primaryColor);
                setSecondaryColor(data.colors.secondary || secondaryColor);
                setAccentColor(data.colors.accent || accentColor);
                setBackgroundColor(data.colors.background || backgroundColor);
                setTextColor(data.colors.text || textColor);

                toast({
                    title: "Colors extracted",
                    description: `Brand colors extracted with ${data.confidence.colors}% confidence!`,
                });

                logger.info(
                    { url: scrapedUrl, confidence: data.confidence.colors },
                    "Colors scraped from URL"
                );

                // Now generate comprehensive guidelines if we have intake data
                if (hasIntakeData) {
                    toast({
                        title: "Generating guidelines",
                        description:
                            "Now generating comprehensive brand guidelines based on extracted colors...",
                    });

                    const requestBody: {
                        projectId: string;
                        transcriptId?: string;
                        businessProfileId?: string;
                        comprehensive: boolean;
                        inputMethod: BrandInputMethod;
                        wizardResponses: Record<string, unknown>;
                    } = {
                        projectId,
                        comprehensive: true,
                        inputMethod: "website",
                        wizardResponses: {
                            extracted_colors: data.colors,
                            source_url: scrapedUrl,
                        },
                    };

                    if (
                        businessProfile &&
                        (businessProfile.completion_status?.overall ?? 0) > 0
                    ) {
                        requestBody.businessProfileId = businessProfile.id;
                    } else if (transcripts.length > 0) {
                        requestBody.transcriptId = transcripts[0].id;
                    }

                    const guidelinesResponse = await fetch(
                        "/api/generate/brand-design",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(requestBody),
                        }
                    );

                    const guidelinesData = await guidelinesResponse.json();

                    if (guidelinesResponse.ok) {
                        setBrandDesign(guidelinesData);
                        toast({
                            title: "Brand guidelines complete",
                            description:
                                "Full brand guidelines have been generated from your website!",
                        });
                    } else {
                        toast({
                            title: "Partial success",
                            description:
                                guidelinesData.error ||
                                "Colors extracted, but full guidelines generation failed. You can try again later.",
                            variant: "destructive",
                        });
                    }
                }
            } else {
                toast({
                    title: "No colors found",
                    description:
                        "Could not extract brand colors from the website. The site may use external stylesheets.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            logger.error({ error, url: scrapedUrl }, "Failed to scrape colors");
            toast({
                title: "Extraction failed",
                description: "Could not extract brand from URL. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerate = async (section: string) => {
        if (section === "comprehensive") {
            setShowWizard(true);
        }
        // Future: Add section-specific regeneration
    };

    const hasBrandDesign = !!brandDesign;
    const hasComprehensiveGuidelines =
        brandDesign?.brand_voice || brandDesign?.messaging_framework;

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
                    : "Complete Brand First"
            }
            stepTitle="Brand Design"
            stepDescription="Create comprehensive brand guidelines for your funnel"
        >
            <div className="space-y-8">
                {/* Dependency Warning */}
                {!hasIntakeData && (
                    <DependencyWarning
                        message="You need to complete your business profile or AI intake call first so we can understand your business and generate appropriate brand guidelines."
                        requiredStep={1}
                        requiredStepName="Intake"
                        projectId={projectId}
                    />
                )}

                {/* Show Wizard if active */}
                {showWizard ? (
                    <BrandWizard
                        onComplete={handleWizardComplete}
                        onCancel={() => setShowWizard(false)}
                        isGenerating={isGenerating}
                        initialAudienceDescription={
                            businessProfile?.ideal_customer || undefined
                        }
                    />
                ) : (
                    <>
                        {/* Show existing guidelines if available */}
                        {hasBrandDesign && (
                            <div className="space-y-6">
                                {/* Success Banner */}
                                <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
                                    <CardContent className="flex items-center gap-4 pt-6">
                                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-green-900 dark:text-green-100">
                                                {hasComprehensiveGuidelines
                                                    ? "Comprehensive Brand Guidelines Ready"
                                                    : "Basic Brand Design Saved"}
                                            </h3>
                                            <p className="text-sm text-green-700 dark:text-green-300">
                                                {hasComprehensiveGuidelines
                                                    ? "Your complete brand guidelines are ready to use across all funnel pages."
                                                    : "Upgrade to comprehensive guidelines for voice, messaging, and application rules."}
                                            </p>
                                        </div>
                                        {!hasComprehensiveGuidelines &&
                                            hasIntakeData && (
                                                <Button
                                                    onClick={() => setShowWizard(true)}
                                                    className="shrink-0"
                                                >
                                                    <Wand2 className="h-4 w-4 mr-2" />
                                                    Generate Full Guidelines
                                                </Button>
                                            )}
                                    </CardContent>
                                </Card>

                                {/* Brand Guidelines Display */}
                                <BrandGuidelinesDisplay
                                    guidelines={brandDesign}
                                    onRegenerate={handleRegenerate}
                                />
                            </div>
                        )}

                        {/* Input Methods - Only show if no brand design yet */}
                        {!hasBrandDesign && (
                            <div className="space-y-6">
                                {/* Method Selection Cards */}
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card
                                        className={`cursor-pointer transition-all hover:border-primary ${
                                            activeTab === "wizard"
                                                ? "border-primary ring-2 ring-primary/20"
                                                : ""
                                        }`}
                                        onClick={() => {
                                            setActiveTab("wizard");
                                            if (hasIntakeData) setShowWizard(true);
                                        }}
                                    >
                                        <CardHeader className="text-center">
                                            <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
                                                <Wand2 className="h-6 w-6 text-primary" />
                                            </div>
                                            <CardTitle className="text-lg">
                                                Build Together
                                            </CardTitle>
                                            <CardDescription>
                                                Guided questionnaire to create
                                                comprehensive brand guidelines
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="text-center">
                                            <span className="inline-flex items-center text-xs text-primary font-medium">
                                                Recommended
                                                <ArrowRight className="h-3 w-3 ml-1" />
                                            </span>
                                        </CardContent>
                                    </Card>

                                    <Card
                                        className={`cursor-pointer transition-all hover:border-primary ${
                                            activeTab === "website"
                                                ? "border-primary ring-2 ring-primary/20"
                                                : ""
                                        }`}
                                        onClick={() => setActiveTab("website")}
                                    >
                                        <CardHeader className="text-center">
                                            <div className="mx-auto p-3 rounded-full bg-purple-500/10 w-fit">
                                                <LinkIcon className="h-6 w-6 text-purple-500" />
                                            </div>
                                            <CardTitle className="text-lg">
                                                Extract from Website
                                            </CardTitle>
                                            <CardDescription>
                                                Analyze your existing website to extract
                                                brand elements
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="text-center">
                                            <span className="inline-flex items-center text-xs text-muted-foreground">
                                                Have a website already?
                                            </span>
                                        </CardContent>
                                    </Card>

                                    <Card
                                        className={`cursor-pointer transition-all hover:border-primary ${
                                            activeTab === "manual"
                                                ? "border-primary ring-2 ring-primary/20"
                                                : ""
                                        }`}
                                        onClick={() => setActiveTab("manual")}
                                    >
                                        <CardHeader className="text-center">
                                            <div className="mx-auto p-3 rounded-full bg-orange-500/10 w-fit">
                                                <Palette className="h-6 w-6 text-orange-500" />
                                            </div>
                                            <CardTitle className="text-lg">
                                                I Know My Brand
                                            </CardTitle>
                                            <CardDescription>
                                                Manually enter your brand colors and
                                                style preferences
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="text-center">
                                            <span className="inline-flex items-center text-xs text-muted-foreground">
                                                Have brand guidelines?
                                            </span>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Tab Content */}
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <TabsList className="hidden">
                                        <TabsTrigger value="wizard">Wizard</TabsTrigger>
                                        <TabsTrigger value="website">
                                            Website
                                        </TabsTrigger>
                                        <TabsTrigger value="manual">Manual</TabsTrigger>
                                    </TabsList>

                                    {/* Wizard Tab - Start Button */}
                                    <TabsContent value="wizard">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>
                                                    Build Your Brand Together
                                                </CardTitle>
                                                <CardDescription>
                                                    Answer a few questions about your
                                                    brand personality, audience, and
                                                    preferences. AI will generate
                                                    comprehensive guidelines including
                                                    colors, voice, messaging, and
                                                    application rules.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                {hasIntakeData ? (
                                                    <Button
                                                        onClick={() =>
                                                            setShowWizard(true)
                                                        }
                                                        size="lg"
                                                        className="w-full"
                                                    >
                                                        <Wand2 className="mr-2 h-5 w-5" />
                                                        Start Brand Wizard
                                                    </Button>
                                                ) : (
                                                    <p className="text-sm text-amber-600 text-center py-4">
                                                        Complete your business profile
                                                        or AI intake call first to use
                                                        the brand wizard.
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {/* Website Extraction Tab */}
                                    <TabsContent value="website">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>
                                                    Extract Brand from Website
                                                </CardTitle>
                                                <CardDescription>
                                                    Enter your website URL and
                                                    we&apos;ll analyze it to extract
                                                    colors, fonts, and design patterns.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="url">
                                                        Website URL
                                                    </Label>
                                                    <Input
                                                        id="url"
                                                        type="url"
                                                        value={scrapedUrl}
                                                        onChange={(e) =>
                                                            setScrapedUrl(
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="https://yourwebsite.com"
                                                    />
                                                </div>
                                                <Button
                                                    onClick={handleScrapeUrl}
                                                    disabled={
                                                        isGenerating || !scrapedUrl
                                                    }
                                                    size="lg"
                                                    className="w-full"
                                                >
                                                    {isGenerating ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Analyzing Website...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <LinkIcon className="mr-2 h-4 w-4" />
                                                            Extract Brand Elements
                                                        </>
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {/* Manual Entry Tab */}
                                    <TabsContent value="manual" className="space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Brand Colors</CardTitle>
                                                <CardDescription>
                                                    Enter your brand colors manually
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="primary">
                                                            Primary Color
                                                        </Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="color"
                                                                id="primary"
                                                                value={primaryColor}
                                                                onChange={(e) =>
                                                                    setPrimaryColor(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="h-10 w-20"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={primaryColor}
                                                                onChange={(e) =>
                                                                    setPrimaryColor(
                                                                        e.target.value
                                                                    )
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
                                                                    setSecondaryColor(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="h-10 w-20"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={secondaryColor}
                                                                onChange={(e) =>
                                                                    setSecondaryColor(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="#8b5cf6"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="accent">
                                                            Accent Color
                                                        </Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="color"
                                                                id="accent"
                                                                value={accentColor}
                                                                onChange={(e) =>
                                                                    setAccentColor(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="h-10 w-20"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={accentColor}
                                                                onChange={(e) =>
                                                                    setAccentColor(
                                                                        e.target.value
                                                                    )
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
                                                                    setBackgroundColor(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="h-10 w-20"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={backgroundColor}
                                                                onChange={(e) =>
                                                                    setBackgroundColor(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="#ffffff"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="text">
                                                            Text Color
                                                        </Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="color"
                                                                id="text"
                                                                value={textColor}
                                                                onChange={(e) =>
                                                                    setTextColor(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="h-10 w-20"
                                                            />
                                                            <Input
                                                                type="text"
                                                                value={textColor}
                                                                onChange={(e) =>
                                                                    setTextColor(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="#1f2937"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Brand Personality</CardTitle>
                                                <CardDescription>
                                                    Define the personality and feel of
                                                    your brand
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
                                                        onChange={(e) =>
                                                            setBrandName(e.target.value)
                                                        }
                                                        placeholder={
                                                            project?.name ||
                                                            "Your Brand Name"
                                                        }
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="style">
                                                        Design Style
                                                    </Label>
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
                                                            <SelectItem value="bold">
                                                                Bold
                                                            </SelectItem>
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
                                                        <Label htmlFor="tone">
                                                            Tone
                                                        </Label>
                                                        <Select
                                                            value={tone}
                                                            onValueChange={setTone}
                                                        >
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
                                                        <Label htmlFor="mood">
                                                            Mood
                                                        </Label>
                                                        <Select
                                                            value={mood}
                                                            onValueChange={setMood}
                                                        >
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
                                                        <Label htmlFor="energy">
                                                            Energy
                                                        </Label>
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

                                        {/* Live Preview */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Brand Preview</CardTitle>
                                                <CardDescription>
                                                    See how your brand colors work
                                                    together
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div className="flex gap-2">
                                                        <div
                                                            className="flex h-20 flex-1 items-center justify-center rounded-lg text-sm font-medium"
                                                            style={{
                                                                backgroundColor:
                                                                    primaryColor,
                                                                color: backgroundColor,
                                                            }}
                                                        >
                                                            Primary
                                                        </div>
                                                        <div
                                                            className="flex h-20 flex-1 items-center justify-center rounded-lg text-sm font-medium"
                                                            style={{
                                                                backgroundColor:
                                                                    secondaryColor,
                                                                color: backgroundColor,
                                                            }}
                                                        >
                                                            Secondary
                                                        </div>
                                                        <div
                                                            className="flex h-20 flex-1 items-center justify-center rounded-lg text-sm font-medium"
                                                            style={{
                                                                backgroundColor:
                                                                    accentColor,
                                                                color: backgroundColor,
                                                            }}
                                                        >
                                                            Accent
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="rounded-lg border p-6"
                                                        style={{
                                                            backgroundColor:
                                                                backgroundColor,
                                                            borderColor: primaryColor,
                                                        }}
                                                    >
                                                        <h3
                                                            className="mb-2 text-xl font-bold"
                                                            style={{
                                                                color: primaryColor,
                                                            }}
                                                        >
                                                            {brandName ||
                                                                project?.name ||
                                                                "Your Brand"}
                                                        </h3>
                                                        <p
                                                            className="mb-4 text-sm"
                                                            style={{ color: textColor }}
                                                        >
                                                            {designStyle
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                designStyle.slice(
                                                                    1
                                                                )}{" "}
                                                            •{" "}
                                                            {tone
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                tone.slice(1)}{" "}
                                                            •{" "}
                                                            {mood
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                mood.slice(1)}
                                                        </p>
                                                        <button
                                                            className="rounded px-4 py-2 text-sm font-medium"
                                                            style={{
                                                                backgroundColor:
                                                                    primaryColor,
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
                                                onClick={handleSaveManual}
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
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}

                        {/* Edit existing brand design */}
                        {hasBrandDesign && !hasComprehensiveGuidelines && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Update Brand Colors</CardTitle>
                                    <CardDescription>
                                        Fine-tune your brand colors or generate
                                        comprehensive guidelines
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                                        <div className="space-y-2">
                                            <Label>Primary</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="color"
                                                    value={primaryColor}
                                                    onChange={(e) =>
                                                        setPrimaryColor(e.target.value)
                                                    }
                                                    className="h-10 w-14"
                                                />
                                                <Input
                                                    type="text"
                                                    value={primaryColor}
                                                    onChange={(e) =>
                                                        setPrimaryColor(e.target.value)
                                                    }
                                                    className="text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Secondary</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="color"
                                                    value={secondaryColor}
                                                    onChange={(e) =>
                                                        setSecondaryColor(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-10 w-14"
                                                />
                                                <Input
                                                    type="text"
                                                    value={secondaryColor}
                                                    onChange={(e) =>
                                                        setSecondaryColor(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Accent</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="color"
                                                    value={accentColor}
                                                    onChange={(e) =>
                                                        setAccentColor(e.target.value)
                                                    }
                                                    className="h-10 w-14"
                                                />
                                                <Input
                                                    type="text"
                                                    value={accentColor}
                                                    onChange={(e) =>
                                                        setAccentColor(e.target.value)
                                                    }
                                                    className="text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Background</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="color"
                                                    value={backgroundColor}
                                                    onChange={(e) =>
                                                        setBackgroundColor(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="h-10 w-14"
                                                />
                                                <Input
                                                    type="text"
                                                    value={backgroundColor}
                                                    onChange={(e) =>
                                                        setBackgroundColor(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Text</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="color"
                                                    value={textColor}
                                                    onChange={(e) =>
                                                        setTextColor(e.target.value)
                                                    }
                                                    className="h-10 w-14"
                                                />
                                                <Input
                                                    type="text"
                                                    value={textColor}
                                                    onChange={(e) =>
                                                        setTextColor(e.target.value)
                                                    }
                                                    className="text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={handleSaveManual}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Update Colors
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </StepLayout>
    );
}
