"use client";

/**
 * Step 2: Visual Funnel Co-Creation Experience
 * Interactive flowchart for mapping customer journey with AI-assisted drafts
 */

import { useState, useEffect, useCallback } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { FunnelFlowchart, AIChatPanel } from "@/components/funnel-map";
import {
    Sparkles,
    Loader2,
    ArrowRight,
    Check,
    RefreshCw,
    CreditCard,
    Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";
import { createClient } from "@/lib/supabase/client";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useToast } from "@/components/ui/use-toast";
import type { BusinessProfile } from "@/types/business-profile";
import type {
    FunnelNodeType,
    FunnelNodeData,
    FunnelMapConfig,
    PathwayType,
    ConversationMessage,
} from "@/types/funnel-map";
import {
    PATHWAY_DEFINITIONS,
    getNodesForPathway,
    determinePathwayFromPrice,
} from "@/types/funnel-map";
import { cn } from "@/lib/utils";

export default function Step2Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [project, setProject] = useState<{ name: string; user_id: string } | null>(
        null
    );
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(
        null
    );
    const [mapConfig, setMapConfig] = useState<FunnelMapConfig | null>(null);
    const [nodeData, setNodeData] = useState<Map<FunnelNodeType, FunnelNodeData>>(
        new Map()
    );
    const [selectedNode, setSelectedNode] = useState<FunnelNodeType | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [pathwayType, setPathwayType] = useState<PathwayType>("direct_purchase");

    const { completedSteps } = useStepCompletion(projectId);

    // Resolve params
    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    // Load project and data
    useEffect(() => {
        const loadData = async () => {
            if (!projectId) return;
            setIsLoading(true);

            try {
                const supabase = createClient();

                // Load project
                const { data: projectData } = await supabase
                    .from("funnel_projects")
                    .select("name, user_id")
                    .eq("id", projectId)
                    .single();

                if (projectData) setProject(projectData);

                // Load business profile
                const profileResponse = await fetch(
                    `/api/context/business-profile?projectId=${projectId}`,
                    { credentials: "include" }
                );

                if (profileResponse.ok) {
                    const profileResult = await profileResponse.json();
                    if (profileResult.profile) {
                        setBusinessProfile(profileResult.profile);

                        // Determine pathway from pricing
                        const pricing = profileResult.profile.pricing;
                        const price = pricing?.webinar || pricing?.regular || null;
                        const determinedPathway = determinePathwayFromPrice(price);
                        setPathwayType(determinedPathway);
                    }
                }

                // Load funnel map config
                const { data: configData } = await supabase
                    .from("funnel_map_config")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .single();

                if (configData) {
                    setMapConfig(configData);
                    setPathwayType(configData.pathway_type);
                }

                // Load funnel node data
                const { data: nodesData } = await supabase
                    .from("funnel_node_data")
                    .select("*")
                    .eq("funnel_project_id", projectId);

                if (nodesData) {
                    const nodeMap = new Map<FunnelNodeType, FunnelNodeData>();
                    nodesData.forEach((node) => {
                        nodeMap.set(node.node_type as FunnelNodeType, node);
                    });
                    setNodeData(nodeMap);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load funnel map data");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [projectId]);

    // Generate initial drafts
    const handleGenerateDrafts = async () => {
        setIsGenerating(true);

        try {
            const response = await fetch("/api/funnel-map/generate-drafts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, pathwayType }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to generate drafts");
            }

            const result = await response.json();

            // Update local state with new drafts
            const nodeMap = new Map<FunnelNodeType, FunnelNodeData>();
            result.drafts.forEach(
                (draft: { nodeType: FunnelNodeType; content: Record<string, unknown> }) => {
                    nodeMap.set(draft.nodeType, {
                        id: crypto.randomUUID(),
                        funnel_project_id: projectId,
                        user_id: project?.user_id || "",
                        node_type: draft.nodeType,
                        draft_content: draft.content,
                        refined_content: {},
                        conversation_history: [],
                        status: "draft",
                        is_active: true,
                        pathway_type: result.pathwayType,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
                }
            );
            setNodeData(nodeMap);
            setPathwayType(result.pathwayType);

            toast({
                title: "Drafts Generated!",
                description:
                    "AI has created initial content for your funnel. Click any node to refine it.",
            });

            // Select first node
            const pathwayNodes = getNodesForPathway(result.pathwayType);
            if (pathwayNodes.length > 0) {
                setSelectedNode(pathwayNodes[0].id);
            }
        } catch (error) {
            logger.error({ error }, "Failed to generate funnel drafts");
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description:
                    error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle pathway change
    const handlePathwayChange = async (newPathway: PathwayType) => {
        setPathwayType(newPathway);

        // If drafts were already generated, regenerate for new pathway
        if (mapConfig?.drafts_generated) {
            await handleGenerateDrafts();
        }
    };

    // Handle node selection
    const handleNodeSelect = (nodeType: FunnelNodeType) => {
        setSelectedNode(nodeType);
    };

    // Handle content update from AI chat
    const handleContentUpdate = useCallback(
        (nodeType: FunnelNodeType, content: Record<string, unknown>) => {
            setNodeData((prev) => {
                const newMap = new Map(prev);
                const existingNode = newMap.get(nodeType);

                if (existingNode) {
                    newMap.set(nodeType, {
                        ...existingNode,
                        refined_content: content,
                        status: "refined",
                        updated_at: new Date().toISOString(),
                    });
                }

                return newMap;
            });

            // Save to database
            const supabase = createClient();
            supabase
                .from("funnel_node_data")
                .update({
                    refined_content: content,
                    status: "refined",
                })
                .eq("funnel_project_id", projectId)
                .eq("node_type", nodeType)
                .then(({ error }) => {
                    if (error) {
                        logger.error({ error }, "Failed to save content update");
                    }
                });
        },
        [projectId]
    );

    // Handle conversation update
    const handleConversationUpdate = useCallback(
        (nodeType: FunnelNodeType, messages: ConversationMessage[]) => {
            setNodeData((prev) => {
                const newMap = new Map(prev);
                const existingNode = newMap.get(nodeType);

                if (existingNode) {
                    newMap.set(nodeType, {
                        ...existingNode,
                        conversation_history: messages,
                        status:
                            existingNode.status === "draft"
                                ? "in_progress"
                                : existingNode.status,
                        updated_at: new Date().toISOString(),
                    });
                }

                return newMap;
            });
        },
        []
    );

    // Calculate completion
    const pathwayNodes = getNodesForPathway(pathwayType);
    const completedNodes = pathwayNodes.filter((node) => {
        const data = nodeData.get(node.id);
        return data?.status === "completed" || data?.status === "refined";
    });
    const completionPercentage = Math.round(
        (completedNodes.length / pathwayNodes.length) * 100
    );
    const hasStarted = nodeData.size > 0;
    const canContinue = completionPercentage >= 50; // Require at least 50% completion

    // Check if business profile is complete enough
    const hasBusinessProfile =
        businessProfile && (businessProfile.completion_status?.overall ?? 0) >= 30;

    if (!projectId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <StepLayout
            currentStep={2}
            projectId={projectId}
            funnelName={project?.name}
            completedSteps={completedSteps}
            nextDisabled={!canContinue}
            nextLabel={canContinue ? "Continue to Brand Design" : "Complete Map First"}
            stepTitle="Map Your Funnel"
            stepDescription="Visualize your customer journey with AI-generated content for each step"
        >
            <div className="flex h-[calc(100vh-200px)] min-h-[600px] gap-0">
                {/* Main Content Area */}
                <div
                    className={cn(
                        "flex flex-1 flex-col transition-all duration-300",
                        selectedNode ? "w-[60%]" : "w-full"
                    )}
                >
                    {/* Dependency Warning */}
                    {!hasBusinessProfile && !isLoading && (
                        <div className="mb-4">
                            <DependencyWarning
                                message="Complete your Business Profile first so AI can generate personalized funnel content."
                                requiredStep={1}
                                requiredStepName="Business Profile"
                                projectId={projectId}
                            />
                        </div>
                    )}

                    {/* Pathway Selection */}
                    {hasBusinessProfile && !hasStarted && (
                        <div className="mb-6 rounded-lg border border-border bg-card p-6">
                            <h3 className="mb-4 text-lg font-semibold text-foreground">
                                Choose Your Purchase Pathway
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Based on your offer price, we recommend the{" "}
                                <span className="font-medium text-primary">
                                    {PATHWAY_DEFINITIONS[pathwayType].title}
                                </span>{" "}
                                pathway.
                            </p>

                            <div className="grid gap-4 md:grid-cols-2">
                                {(
                                    Object.entries(PATHWAY_DEFINITIONS) as [
                                        PathwayType,
                                        (typeof PATHWAY_DEFINITIONS)[PathwayType],
                                    ][]
                                ).map(([key, pathway]) => (
                                    <button
                                        key={key}
                                        onClick={() =>
                                            handlePathwayChange(key as PathwayType)
                                        }
                                        className={cn(
                                            "flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all",
                                            pathwayType === key
                                                ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                                pathwayType === key
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            {key === "direct_purchase" ? (
                                                <CreditCard className="h-5 w-5" />
                                            ) : (
                                                <Phone className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">
                                                {pathway.title}
                                            </h4>
                                            <p className="text-sm text-muted-foreground">
                                                {pathway.description}
                                            </p>
                                            <p className="mt-1 text-xs font-medium text-primary">
                                                {pathway.priceThreshold}
                                            </p>
                                        </div>
                                        {pathwayType === key && (
                                            <Check className="ml-auto h-5 w-5 text-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Generate Drafts Button */}
                    {hasBusinessProfile && !hasStarted && (
                        <div className="mb-6 flex justify-center">
                            <Button
                                size="lg"
                                onClick={handleGenerateDrafts}
                                disabled={isGenerating}
                                className="gap-2 px-8"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Generating Your Funnel...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-5 w-5" />
                                        Generate AI Drafts
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-1 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {/* Generating State */}
                    {isGenerating && (
                        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-primary/20 bg-primary/5 p-8">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <Sparkles className="h-8 w-8 animate-pulse text-primary" />
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-foreground">
                                Creating Your Funnel Map
                            </h3>
                            <p className="text-center text-muted-foreground">
                                AI is analyzing your business profile and generating
                                personalized content for each step of your funnel...
                            </p>
                            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>This takes about 30-60 seconds</span>
                            </div>
                        </div>
                    )}

                    {/* Flowchart */}
                    {!isLoading && !isGenerating && hasStarted && (
                        <div className="flex-1">
                            {/* Progress Bar */}
                            <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-card p-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-foreground">
                                        Funnel Completion
                                    </span>
                                    <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                completionPercentage === 100
                                                    ? "bg-green-500"
                                                    : "bg-primary"
                                            )}
                                            style={{
                                                width: `${completionPercentage}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {completedNodes.length}/{pathwayNodes.length}{" "}
                                        nodes refined
                                    </span>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGenerateDrafts}
                                    disabled={isGenerating}
                                    className="gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Regenerate Drafts
                                </Button>
                            </div>

                            {/* React Flow Flowchart */}
                            <FunnelFlowchart
                                pathwayType={pathwayType}
                                nodeData={nodeData}
                                selectedNode={selectedNode}
                                onNodeSelect={handleNodeSelect}
                                isGeneratingDrafts={isGenerating}
                            />
                        </div>
                    )}

                    {/* Empty State (after profile, before generation) */}
                    {!isLoading &&
                        !isGenerating &&
                        !hasStarted &&
                        hasBusinessProfile && (
                            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                    <ArrowRight className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="mb-2 text-xl font-semibold text-foreground">
                                    Ready to Map Your Funnel
                                </h3>
                                <p className="max-w-md text-muted-foreground">
                                    Click "Generate AI Drafts" above to create
                                    personalized content for each step of your customer
                                    journey.
                                </p>
                            </div>
                        )}
                </div>

                {/* AI Chat Panel */}
                {selectedNode && hasStarted && (
                    <div className="w-[40%] min-w-[360px] max-w-[500px]">
                        <AIChatPanel
                            nodeType={selectedNode}
                            nodeData={nodeData.get(selectedNode) || null}
                            projectId={projectId}
                            onClose={() => setSelectedNode(null)}
                            onContentUpdate={handleContentUpdate}
                            onConversationUpdate={handleConversationUpdate}
                        />
                    </div>
                )}
            </div>
        </StepLayout>
    );
}
