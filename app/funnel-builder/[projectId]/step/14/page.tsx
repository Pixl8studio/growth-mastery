"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/funnel/step-layout";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import {
    Target,
    Sparkles,
    Users,
    DollarSign,
    CheckCircle,
    AlertCircle,
    Loader2,
    ArrowRight,
} from "lucide-react";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
import { MetaAccountSelector } from "@/components/ads/meta-account-selector";
import { AdVariationsReview } from "@/components/ads/ad-variations-review";
import { AudienceBuilder } from "@/components/ads/audience-builder";
import { CampaignDeployer } from "@/components/ads/campaign-deployer";

type WizardSubStep = "connect" | "variations" | "audience" | "deploy";

export default function Step14Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<any>(null);
    const [currentSubStep, setCurrentSubStep] = useState<WizardSubStep>("connect");

    // Step 1: Meta connection data
    const [metaConnected, setMetaConnected] = useState(false);
    const [selectedAdAccount, setSelectedAdAccount] = useState<string | null>(null);
    const [checkingConnection, setCheckingConnection] = useState(true);

    // Step 2: Ad variations
    const [adVariations, setAdVariations] = useState<any[]>([]);
    const [generatingAds, setGeneratingAds] = useState(false);
    const [selectedVariations, setSelectedVariations] = useState<string[]>([]);

    // Step 3: Audience data
    const [audienceConfig, setAudienceConfig] = useState<any>(null);
    const [dailyBudget, setDailyBudget] = useState(1000); // in cents ($10)

    // Step 4: Campaign deployment
    const [deploying, setDeploying] = useState(false);
    const [deployed, setDeployed] = useState(false);

    // Load completion status
    const { completedSteps, refreshCompletion } = useStepCompletion(projectId);

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    // Load project data
    useEffect(() => {
        if (!projectId) return;

        const loadData = async () => {
            try {
                const supabase = createClient();

                // Load project
                const { data: projectData } = await supabase
                    .from("funnel_projects")
                    .select("*")
                    .eq("id", projectId)
                    .single();

                setProject(projectData);

                // Check if Meta is connected
                await checkMetaConnection();
            } catch (error) {
                logger.error({ error, projectId }, "Error loading step 14 data");
            } finally {
                setCheckingConnection(false);
            }
        };

        loadData();
    }, [projectId]);

    const checkMetaConnection = async () => {
        try {
            const supabase = createClient();

            // Check for Facebook/Meta OAuth connection in marketing_oauth_connections
            const { data: connections } = await supabase
                .from("marketing_oauth_connections")
                .select("*")
                .eq("platform", "facebook")
                .eq("status", "active")
                .limit(1);

            setMetaConnected(Boolean(connections && connections.length > 0));
        } catch (error) {
            logger.error({ error }, "Error checking Meta connection");
            setMetaConnected(false);
        }
    };

    const handleConnectMeta = () => {
        // Redirect to marketing settings to connect Facebook
        toast({
            title: "Connect Facebook First",
            description:
                "You'll be redirected to connect your Facebook account for ads management.",
        });
        router.push(`/funnel-builder/${projectId}/settings?tab=marketing`);
    };

    const handleSelectAdAccount = (adAccountId: string) => {
        setSelectedAdAccount(adAccountId);
    };

    const handleContinueToVariations = async () => {
        if (!selectedAdAccount) {
            toast({
                title: "Select Ad Account",
                description: "Please select a Meta Ad Account to continue.",
                variant: "destructive",
            });
            return;
        }

        setCurrentSubStep("variations");
        await generateAdVariations();
    };

    const generateAdVariations = async () => {
        setGeneratingAds(true);

        try {
            const response = await fetch("/api/ads/variations/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    funnel_project_id: projectId,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate ad variations");
            }

            const data = await response.json();
            setAdVariations(data.variations || []);
        } catch (error) {
            logger.error({ error }, "Error generating ad variations");
            toast({
                title: "Generation Failed",
                description: "Failed to generate ad variations. Please try again.",
                variant: "destructive",
            });
        } finally {
            setGeneratingAds(false);
        }
    };

    const handleSelectVariations = (variationIds: string[]) => {
        setSelectedVariations(variationIds);
    };

    const handleContinueToAudience = () => {
        if (selectedVariations.length === 0) {
            toast({
                title: "Select Variations",
                description: "Please select at least one ad variation to test.",
                variant: "destructive",
            });
            return;
        }

        setCurrentSubStep("audience");
    };

    const handleAudienceConfigured = (config: any, budget: number) => {
        setAudienceConfig(config);
        setDailyBudget(budget);
    };

    const handleContinueToDeploy = () => {
        if (!audienceConfig) {
            toast({
                title: "Configure Audience",
                description: "Please configure your target audience and budget.",
                variant: "destructive",
            });
            return;
        }

        setCurrentSubStep("deploy");
    };

    const handleDeployCampaign = async () => {
        setDeploying(true);

        try {
            const response = await fetch("/api/ads/campaigns/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    funnel_project_id: projectId,
                    ad_account_id: selectedAdAccount,
                    variations: selectedVariations,
                    audience_config: audienceConfig,
                    daily_budget_cents: dailyBudget,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to create campaign");
            }

            const data = await response.json();

            setDeployed(true);
            await refreshCompletion();

            toast({
                title: "Campaign Created! 🎉",
                description: "Your ads are now live and running.",
            });

            // Redirect to analytics after a delay
            setTimeout(() => {
                router.push(`/funnel-builder/${projectId}/step/15`);
            }, 3000);
        } catch (error) {
            logger.error({ error }, "Error deploying campaign");
            toast({
                title: "Deployment Failed",
                description: "Failed to create campaign. Please try again.",
                variant: "destructive",
            });
        } finally {
            setDeploying(false);
        }
    };

    if (checkingConnection) {
        return (
            <StepLayout
                currentStep={14}
                projectId={projectId}
                completedSteps={completedSteps}
                funnelName={project?.name}
                stepTitle="Ads Manager"
                stepDescription="Generate and launch Meta/Instagram ads"
            >
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </StepLayout>
        );
    }

    return (
        <StepLayout
            currentStep={14}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            stepTitle="Self-Optimizing Ads Manager"
            stepDescription="Generate Meta/Instagram ads and launch campaigns with AI optimization"
        >
            <div className="space-y-8">
                {/* Progress Indicator */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { key: "connect", label: "Connect & Setup", icon: Target },
                        { key: "variations", label: "Ad Variations", icon: Sparkles },
                        { key: "audience", label: "Audience & Budget", icon: Users },
                        { key: "deploy", label: "Deploy", icon: CheckCircle },
                    ].map((step, index) => {
                        const isActive = currentSubStep === step.key;
                        const isCompleted =
                            (step.key === "connect" &&
                                metaConnected &&
                                selectedAdAccount) ||
                            (step.key === "variations" &&
                                selectedVariations.length > 0) ||
                            (step.key === "audience" && audienceConfig) ||
                            (step.key === "deploy" && deployed);

                        const Icon = step.icon;

                        return (
                            <div
                                key={step.key}
                                className={`flex flex-col items-center rounded-lg border p-4 ${
                                    isActive
                                        ? "border-primary bg-primary/5"
                                        : isCompleted
                                          ? "border-green-500 bg-green-50"
                                          : "border-border bg-card"
                                }`}
                            >
                                <Icon
                                    className={`mb-2 h-6 w-6 ${
                                        isActive
                                            ? "text-primary"
                                            : isCompleted
                                              ? "text-green-600"
                                              : "text-muted-foreground"
                                    }`}
                                />
                                <span className="text-center text-sm font-medium">
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Sub-Step 1: Connect Meta & Setup */}
                {currentSubStep === "connect" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Connect Your Meta Ad Account</CardTitle>
                            <CardDescription>
                                Select the Meta Ad Account you want to use for this
                                campaign
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {!metaConnected ? (
                                <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
                                    <div className="flex items-start gap-4">
                                        <AlertCircle className="h-6 w-6 text-orange-600" />
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-orange-900">
                                                Facebook/Meta Not Connected
                                            </h3>
                                            <p className="mt-2 text-sm text-orange-800">
                                                To use the Ads Manager, you need to
                                                connect your Facebook account first in
                                                the Marketing settings. This will give
                                                us access to your Meta Ad Accounts.
                                            </p>
                                            <Button
                                                onClick={handleConnectMeta}
                                                className="mt-4"
                                                variant="default"
                                            >
                                                Connect Facebook
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <MetaAccountSelector
                                        projectId={projectId}
                                        onSelectAccount={handleSelectAdAccount}
                                        selectedAccount={selectedAdAccount}
                                    />

                                    {selectedAdAccount && (
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={handleContinueToVariations}
                                                className="gap-2"
                                            >
                                                Generate Ads
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Sub-Step 2: Review Generated Ad Variations */}
                {currentSubStep === "variations" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Generated Ad Variations</CardTitle>
                            <CardDescription>
                                Select 2-3 variations to test. We've generated 5 using
                                proven frameworks
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {generatingAds ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                    <p className="text-muted-foreground">
                                        Generating ad variations using AI...
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <AdVariationsReview
                                        variations={adVariations}
                                        selectedVariations={selectedVariations}
                                        onSelectVariations={handleSelectVariations}
                                    />

                                    <div className="flex justify-between">
                                        <Button
                                            onClick={() => setCurrentSubStep("connect")}
                                            variant="outline"
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleContinueToAudience}
                                            className="gap-2"
                                            disabled={selectedVariations.length === 0}
                                        >
                                            Continue to Audience
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Sub-Step 3: Audience & Budget */}
                {currentSubStep === "audience" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Target Audience & Budget</CardTitle>
                            <CardDescription>
                                Define who will see your ads and how much to spend daily
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <AudienceBuilder
                                projectId={projectId}
                                onConfigured={handleAudienceConfigured}
                                initialBudget={dailyBudget}
                            />

                            <div className="flex justify-between">
                                <Button
                                    onClick={() => setCurrentSubStep("variations")}
                                    variant="outline"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleContinueToDeploy}
                                    className="gap-2"
                                    disabled={!audienceConfig}
                                >
                                    Review & Deploy
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Sub-Step 4: Deploy & Activate */}
                {currentSubStep === "deploy" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Deploy Your Campaign</CardTitle>
                            <CardDescription>
                                Review and launch your ads to start generating leads
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <CampaignDeployer
                                adAccountId={selectedAdAccount!}
                                variations={adVariations.filter((v) =>
                                    selectedVariations.includes(v.id)
                                )}
                                audienceConfig={audienceConfig}
                                dailyBudget={dailyBudget}
                                onDeploy={handleDeployCampaign}
                                deploying={deploying}
                                deployed={deployed}
                            />

                            {!deployed && (
                                <div className="flex justify-between">
                                    <Button
                                        onClick={() => setCurrentSubStep("audience")}
                                        variant="outline"
                                        disabled={deploying}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleDeployCampaign}
                                        className="gap-2"
                                        disabled={deploying}
                                    >
                                        {deploying ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Creating Campaign...
                                            </>
                                        ) : (
                                            <>
                                                <Target className="h-4 w-4" />
                                                Launch Campaign
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {deployed && (
                                <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
                                    <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
                                    <h3 className="text-xl font-bold text-green-900 mb-2">
                                        Campaign Successfully Launched! 🎉
                                    </h3>
                                    <p className="text-green-800 mb-4">
                                        Your ads are now running on Meta/Instagram.
                                        You'll be redirected to analytics to track
                                        performance.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </StepLayout>
    );
}
