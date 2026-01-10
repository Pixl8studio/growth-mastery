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

export default function Step11Page({
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
                logger.error({ error, projectId }, "Error loading step 11 data");
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
        if (!metaConnected) {
            toast({
                title: "Connect Facebook First",
                description: "Connect your Facebook account to generate ads.",
                variant: "destructive",
            });
            return;
        }

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
        if (!metaConnected) {
            setCurrentSubStep("audience");
            return;
        }

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
        if (!metaConnected) {
            setCurrentSubStep("deploy");
            return;
        }

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
        if (!metaConnected) {
            toast({
                title: "Connect Facebook to Deploy",
                description:
                    "Connect your Facebook account to launch real ad campaigns.",
                variant: "destructive",
            });
            return;
        }

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
                description:
                    "Your ads are now live and running. Your funnel is complete!",
            });
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
                currentStep={17}
                projectId={projectId}
                completedSteps={completedSteps}
                funnelName={project?.name}
                stepTitle="Meta Ads Manager"
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
            currentStep={17}
            projectId={projectId}
            completedSteps={completedSteps}
            funnelName={project?.name}
            stepTitle="Meta Ads Manager"
            stepDescription="Generate Meta/Instagram ads and launch campaigns with AI optimization"
            nextLabel="Continue to Marketing Content"
        >
            <div className="space-y-8">
                {/* Progress Indicator */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { key: "connect", label: "Connect & Setup", icon: Target },
                        {
                            key: "variations",
                            label: "Ad Variations",
                            icon: Sparkles,
                        },
                        {
                            key: "audience",
                            label: "Audience & Budget",
                            icon: Users,
                        },
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
                                <>
                                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
                                        <div className="flex items-start gap-4">
                                            <AlertCircle className="h-6 w-6 text-orange-600" />
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-orange-900">
                                                    Facebook/Meta Not Connected
                                                </h3>
                                                <p className="mt-2 text-sm text-orange-800">
                                                    To launch real ad campaigns, you
                                                    need to connect your Facebook
                                                    account first. This will give us
                                                    access to your Meta Ad Accounts.
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

                                    {/* Preview/Explore Mode */}
                                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                                        <div className="flex items-start gap-4">
                                            <Sparkles className="h-6 w-6 text-primary" />
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-primary">
                                                    Preview the Ads Manager
                                                </h3>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    Want to see how the Ads Manager
                                                    works before connecting? Click below
                                                    to explore the wizard and see
                                                    example ad variations.
                                                </p>
                                                <Button
                                                    onClick={() =>
                                                        setCurrentSubStep("variations")
                                                    }
                                                    className="mt-4"
                                                    variant="outline"
                                                >
                                                    Explore Ads Manager
                                                    <ArrowRight className="h-4 w-4 ml-2" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </>
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
                            {!metaConnected && adVariations.length === 0 && (
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4">
                                    <p className="text-sm text-muted-foreground">
                                        <strong className="text-primary">
                                            Preview Mode:
                                        </strong>{" "}
                                        Connect Facebook to generate real ads from your
                                        funnel data. For now, click "Continue" to
                                        explore the interface.
                                    </p>
                                </div>
                            )}

                            {generatingAds ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                    <p className="text-muted-foreground">
                                        Generating ad variations using AI...
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {adVariations.length > 0 ? (
                                        <AdVariationsReview
                                            variations={adVariations}
                                            selectedVariations={selectedVariations}
                                            onSelectVariations={handleSelectVariations}
                                        />
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <p className="mb-4">
                                                Ad variations will appear here after
                                                generation
                                            </p>
                                            <p className="text-sm">
                                                Connect Facebook and select an ad
                                                account to generate 5 AI-powered ad
                                                variations
                                            </p>
                                        </div>
                                    )}

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
                            {!metaConnected && (
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                    <p className="text-sm text-muted-foreground">
                                        <strong className="text-primary">
                                            Preview Mode:
                                        </strong>{" "}
                                        This is how you'll configure your target
                                        audience and daily budget. Connect Facebook to
                                        save real settings.
                                    </p>
                                </div>
                            )}

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
                            {!metaConnected && (
                                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-orange-900">
                                                Connect Facebook to Deploy
                                            </p>
                                            <p className="text-sm text-orange-800 mt-1">
                                                You're in preview mode. Connect your
                                                Facebook account to launch real
                                                campaigns on Meta/Instagram.
                                            </p>
                                            <Button
                                                onClick={handleConnectMeta}
                                                className="mt-3"
                                                size="sm"
                                            >
                                                Connect Now
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <CampaignDeployer
                                adAccountId={selectedAdAccount || "preview-mode"}
                                variations={adVariations.filter((v) =>
                                    selectedVariations.includes(v.id)
                                )}
                                audienceConfig={
                                    audienceConfig || {
                                        type: "interest",
                                        description: "Preview audience",
                                    }
                                }
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
                                        disabled={deploying || !metaConnected}
                                    >
                                        {deploying ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Creating Campaign...
                                            </>
                                        ) : !metaConnected ? (
                                            <>
                                                <Target className="h-4 w-4" />
                                                Connect to Launch
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
                                        Your ads are now running on Meta/Instagram. Your
                                        complete funnel is ready! Track performance from
                                        the main dashboard.
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
