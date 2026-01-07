"use client";

/**
 * Step 2: Funnel Map
 * Interactive flowchart for mapping customer journey with AI-assisted drafts
 * Features:
 * - Pathway selection (Direct Purchase vs Book a Call)
 * - Auto-generation of drafts on page load
 * - 80% viewport modal editor with AI chat
 */

import { useState, useEffect, useCallback } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { DependencyWarning } from "@/components/funnel/dependency-warning";
import { FunnelFlowchart } from "@/components/funnel-map";
import { NodeEditorModal } from "@/components/funnel-map/node-editor-modal";
import { Sparkles, Loader2, Check, RefreshCw, CreditCard, Phone } from "lucide-react";
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
    RegistrationConfig,
} from "@/types/funnel-map";
import {
    PATHWAY_DEFINITIONS,
    getNodesForPathway,
    determinePathwayFromPrice,
    LOADING_MESSAGES,
    FUNNEL_NODE_DEFINITIONS,
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
    const [showPathwaySelection, setShowPathwaySelection] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [registrationConfig, setRegistrationConfig] =
        useState<RegistrationConfig | null>(null);

    const { completedSteps } = useStepCompletion(projectId);

    // Cycle loading messages during generation
    useEffect(() => {
        if (!isGenerating) return;
        const interval = setInterval(() => {
            setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [isGenerating]);

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

                // Load registration config for conditional nodes
                const { data: regConfig } = await supabase
                    .from("registration_config")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .single();

                if (regConfig) {
                    setRegistrationConfig(regConfig);
                }

                // Load funnel node data
                const { data: nodesData } = await supabase
                    .from("funnel_node_data")
                    .select("*")
                    .eq("funnel_project_id", projectId);

                if (nodesData && nodesData.length > 0) {
                    const nodeMap = new Map<FunnelNodeType, FunnelNodeData>();
                    nodesData.forEach((node) => {
                        nodeMap.set(node.node_type as FunnelNodeType, node);
                    });
                    setNodeData(nodeMap);
                } else {
                    // No drafts yet - show pathway selection
                    setShowPathwaySelection(true);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load funnel map data");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [projectId]);

    // Generate initial drafts (auto-triggered after pathway selection)
    const handleGenerateDrafts = async (selectedPathway?: PathwayType) => {
        const pathway = selectedPathway || pathwayType;
        setIsGenerating(true);
        setShowPathwaySelection(false);
        setLoadingMessageIndex(0);

        try {
            const response = await fetch("/api/funnel-map/generate-drafts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, pathwayType: pathway }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to generate drafts");
            }

            const result = await response.json();

            // Update local state with new drafts
            const nodeMap = new Map<FunnelNodeType, FunnelNodeData>();
            result.drafts.forEach(
                (draft: {
                    nodeType: FunnelNodeType;
                    content: Record<string, unknown>;
                }) => {
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
                        is_approved: false,
                        approved_at: null,
                        approved_content: {},
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

    // Handle pathway selection and auto-generate drafts
    const handlePathwaySelect = async (newPathway: PathwayType) => {
        setPathwayType(newPathway);
        // Auto-generate drafts after pathway selection
        await handleGenerateDrafts(newPathway);
    };

    // Handle node selection - opens modal editor
    const handleNodeSelect = (nodeType: FunnelNodeType) => {
        // Don't open modal for non-clickable nodes
        const nodeDef = FUNNEL_NODE_DEFINITIONS.find((n) => n.id === nodeType);
        if (nodeDef?.isNonClickable) return;

        setSelectedNode(nodeType);
        setIsEditorOpen(true);
    };

    // Handle modal close
    const handleEditorClose = () => {
        setIsEditorOpen(false);
        setSelectedNode(null);
    };

    // Handle content update from modal editor (for selected node)
    const handleModalContentUpdate = useCallback(
        async (content: Record<string, unknown>) => {
            if (!selectedNode) return;

            // Update local state
            setNodeData((prev) => {
                const newMap = new Map(prev);
                const existingNode = newMap.get(selectedNode);

                if (existingNode) {
                    newMap.set(selectedNode, {
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
            const { error } = await supabase
                .from("funnel_node_data")
                .update({
                    refined_content: content,
                    status: "refined",
                })
                .eq("funnel_project_id", projectId)
                .eq("node_type", selectedNode);

            if (error) {
                logger.error({ error }, "Failed to save content update");
            }
        },
        [projectId, selectedNode]
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
            stepTitle="Funnel Map"
            stepDescription="Plan your funnel"
        >
            <div className="flex h-[calc(100vh-200px)] min-h-[600px] flex-col">
                {/* Main Content Area */}
                <div className="flex flex-1 flex-col">
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

                    {/* Pathway Selection - clicking a pathway auto-triggers generation */}
                    {hasBusinessProfile && showPathwaySelection && !isGenerating && (
                        <div className="flex flex-1 flex-col items-center justify-center p-8">
                            <div className="max-w-2xl w-full rounded-lg border border-border bg-card p-8">
                                <h3 className="mb-2 text-xl font-semibold text-foreground text-center">
                                    Choose Your Purchase Pathway
                                </h3>
                                <p className="mb-6 text-sm text-muted-foreground text-center">
                                    Based on your offer price, we recommend the{" "}
                                    <span className="font-medium text-primary">
                                        {PATHWAY_DEFINITIONS[pathwayType].title}
                                    </span>{" "}
                                    pathway. Click to select and begin.
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
                                                handlePathwaySelect(key as PathwayType)
                                            }
                                            className={cn(
                                                "flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all hover:shadow-md",
                                                pathwayType === key
                                                    ? "border-primary bg-primary/5"
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
                                            <div className="flex-1">
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
                                                <Check className="h-5 w-5 text-primary" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-1 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {/* Full-screen Generating State with cycling messages */}
                    {isGenerating && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                            <div className="max-w-md text-center p-8">
                                <div className="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-primary/10">
                                    <Sparkles className="h-10 w-10 animate-pulse text-primary" />
                                </div>
                                <h3 className="mb-4 text-2xl font-semibold text-foreground">
                                    Creating Your Funnel Map
                                </h3>
                                <p className="text-muted-foreground mb-6 h-12 transition-all duration-500">
                                    {LOADING_MESSAGES[loadingMessageIndex]}
                                </p>
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>This takes about 30-60 seconds</span>
                                </div>
                                {/* Progress dots */}
                                <div className="mt-6 flex justify-center gap-1">
                                    {LOADING_MESSAGES.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "h-2 w-2 rounded-full transition-all duration-300",
                                                idx === loadingMessageIndex
                                                    ? "bg-primary w-6"
                                                    : "bg-muted"
                                            )}
                                        />
                                    ))}
                                </div>
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
                                    onClick={() => handleGenerateDrafts()}
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
                                registrationConfig={registrationConfig}
                                showBenchmarks={false}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Node Editor Modal */}
            {selectedNode && (
                <NodeEditorModal
                    isOpen={isEditorOpen}
                    onClose={handleEditorClose}
                    nodeType={selectedNode}
                    nodeData={nodeData.get(selectedNode) || null}
                    pathwayType={pathwayType}
                    projectId={projectId}
                    businessContext={
                        businessProfile
                            ? (businessProfile as unknown as Record<string, unknown>)
                            : {}
                    }
                    onContentUpdate={handleModalContentUpdate}
                />
            )}
        </StepLayout>
    );
}
