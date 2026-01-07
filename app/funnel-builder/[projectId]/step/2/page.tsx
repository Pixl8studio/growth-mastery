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
import { Sparkles, Loader2, Check, CreditCard, Phone, BadgeCheck } from "lucide-react";
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
    getEffectiveContent,
    getNodeDefinition,
} from "@/types/funnel-map";
import { cn } from "@/lib/utils";

/**
 * Sanitize business context for modal
 * Only includes fields actually needed for AI generation, excluding sensitive metadata
 */
function sanitizeBusinessContext(
    profile: BusinessProfile | null
): Record<string, unknown> {
    if (!profile) return {};
    return {
        // Section 1: Customer & Problem
        ideal_customer: profile.ideal_customer,
        transformation: profile.transformation,
        perceived_problem: profile.perceived_problem,
        root_cause: profile.root_cause,
        daily_pain_points: profile.daily_pain_points,
        secret_desires: profile.secret_desires,
        common_mistakes: profile.common_mistakes,
        limiting_beliefs: profile.limiting_beliefs,
        empowering_truths: profile.empowering_truths,
        // Section 2: Story & Method
        struggle_story: profile.struggle_story,
        breakthrough_moment: profile.breakthrough_moment,
        life_now: profile.life_now,
        credibility_experience: profile.credibility_experience,
        signature_method: profile.signature_method,
        // Section 3: Offer & Proof
        offer_name: profile.offer_name,
        offer_type: profile.offer_type,
        deliverables: profile.deliverables,
        delivery_process: profile.delivery_process,
        problem_solved: profile.problem_solved,
        promise_outcome: profile.promise_outcome,
        pricing: profile.pricing,
        guarantee: profile.guarantee,
        testimonials: profile.testimonials,
        bonuses: profile.bonuses,
        // Section 4: Belief Shifts
        vehicle_belief_shift: profile.vehicle_belief_shift,
        internal_belief_shift: profile.internal_belief_shift,
        external_belief_shift: profile.external_belief_shift,
        poll_questions: profile.poll_questions,
        // Section 5: CTA & Objections
        call_to_action: profile.call_to_action,
        incentive: profile.incentive,
        pricing_disclosure: profile.pricing_disclosure,
        path_options: profile.path_options,
        top_objections: profile.top_objections,
    };
}

/**
 * Check if any nodes in the pathway have empty content that needs regeneration
 * Returns true if any node has fewer than 2 filled fields (needs regeneration)
 */
function checkForEmptyNodes(
    nodesData: FunnelNodeData[],
    pathway: PathwayType
): boolean {
    const pathwayNodes = getNodesForPathway(pathway);

    for (const nodeDef of pathwayNodes) {
        // Skip non-clickable nodes (like traffic_source)
        if (nodeDef.isNonClickable) continue;

        const nodeData = nodesData.find((n) => n.node_type === nodeDef.id);

        // If node doesn't exist in data, it needs generation
        if (!nodeData) {
            return true;
        }

        // Get the effective content (draft, refined, or approved)
        const content = getEffectiveContent(nodeData);

        // If content is empty object or has very few fields, needs regeneration
        const filledFields = Object.entries(content).filter(([, value]) => {
            if (value === null || value === undefined) return false;
            if (typeof value === "string" && !value.trim()) return false;
            if (Array.isArray(value) && value.length === 0) return false;
            return true;
        });

        // If less than 2 fields filled, consider it empty and needing regeneration
        if (filledFields.length < 2) {
            return true;
        }
    }

    return false;
}

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
    const [needsRegeneration, setNeedsRegeneration] = useState(false);

    const { completedSteps } = useStepCompletion(projectId);

    // Auto-trigger regeneration when empty nodes detected
    useEffect(() => {
        if (needsRegeneration && !isGenerating && pathwayType) {
            setNeedsRegeneration(false);
            // Small delay to let the UI settle
            const timer = setTimeout(() => {
                handleGenerateDrafts(pathwayType);
            }, 500);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsRegeneration, isGenerating, pathwayType]);

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

                    // Check if any nodes have empty content that needs regeneration
                    const determinedPathway =
                        configData?.pathway_type ||
                        determinePathwayFromPrice(
                            businessProfile?.pricing?.webinar ||
                                businessProfile?.pricing?.regular ||
                                null
                        );

                    const hasEmptyNodes = checkForEmptyNodes(
                        nodesData,
                        determinedPathway
                    );

                    if (hasEmptyNodes) {
                        // Auto-trigger regeneration for funnels with empty fields
                        logger.info(
                            { projectId },
                            "Detected empty fields, auto-triggering regeneration"
                        );
                        setNodeData(nodeMap); // Show existing data while regenerating
                        setNeedsRegeneration(true);
                    } else {
                        setNodeData(nodeMap);
                    }
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

    // Handle node approval from modal
    const handleNodeApprove = useCallback(
        async (content: Record<string, unknown>) => {
            if (!selectedNode) return;

            const now = new Date().toISOString();
            const supabase = createClient();

            // Save previous state for rollback
            const previousNodeData = nodeData.get(selectedNode);

            // Save to database first (don't update local state until DB succeeds)
            const { error } = await supabase
                .from("funnel_node_data")
                .update({
                    refined_content: content,
                    approved_content: content,
                    status: "completed",
                    is_approved: true,
                    approved_at: now,
                })
                .eq("funnel_project_id", projectId)
                .eq("node_type", selectedNode);

            if (error) {
                logger.error({ error }, "Failed to approve node");
                toast({
                    variant: "destructive",
                    title: "Approval Failed",
                    description: "Failed to save approval. Please try again.",
                });
                return;
            }

            // If approving registration, update registration config
            // This controls whether the Registration Confirmation node appears in the flowchart
            // - "live" or "scheduled" → confirmation node appears
            // - "immediate" → confirmation node hidden
            if (selectedNode === "registration" && content.access_type) {
                // Validate access_type before upsert
                const validAccessTypes = ["immediate", "live", "scheduled"] as const;
                const accessType = content.access_type as string;

                if (!validAccessTypes.includes(accessType as typeof validAccessTypes[number])) {
                    logger.error(
                        { accessType, validTypes: validAccessTypes },
                        "Invalid access_type value"
                    );
                    toast({
                        variant: "destructive",
                        title: "Invalid Access Type",
                        description: "Please select a valid access type (Immediate, Live Event, or Scheduled).",
                    });
                    return;
                }

                const { error: configError } = await supabase
                    .from("registration_config")
                    .upsert(
                        {
                            funnel_project_id: projectId,
                            user_id: project?.user_id || "",
                            access_type: accessType,
                            event_datetime: (content.event_datetime as string) || null,
                            updated_at: now,
                        },
                        { onConflict: "funnel_project_id" }
                    );

                if (configError) {
                    logger.error(
                        { configError },
                        "Failed to update registration config"
                    );
                    // Rollback the approval since registration config failed
                    await supabase
                        .from("funnel_node_data")
                        .update({
                            is_approved: previousNodeData?.is_approved ?? false,
                            approved_at: previousNodeData?.approved_at ?? null,
                            approved_content:
                                previousNodeData?.approved_content ?? null,
                        })
                        .eq("funnel_project_id", projectId)
                        .eq("node_type", selectedNode);

                    toast({
                        variant: "destructive",
                        title: "Approval Failed",
                        description:
                            "Could not update registration settings. Please try again.",
                    });
                    return;
                }

                // Update local registration config state
                setRegistrationConfig((prev) => ({
                    ...prev,
                    id: prev?.id || "",
                    funnel_project_id: projectId,
                    user_id: project?.user_id || "",
                    access_type: content.access_type as
                        | "immediate"
                        | "live"
                        | "scheduled",
                    event_datetime: (content.event_datetime as string) || null,
                    event_timezone: prev?.event_timezone || "UTC",
                    headline: prev?.headline || null,
                    subheadline: prev?.subheadline || null,
                    bullet_points: prev?.bullet_points || [],
                    cta_text: prev?.cta_text || "Register Now",
                    confirmation_headline: prev?.confirmation_headline || null,
                    confirmation_message: prev?.confirmation_message || null,
                    calendar_integration: prev?.calendar_integration || {},
                    theme_overrides: prev?.theme_overrides || {},
                    created_at: prev?.created_at || now,
                    updated_at: now,
                }));
            }

            // Update local state only after all DB operations succeed
            setNodeData((prev) => {
                const newMap = new Map(prev);
                const existingNode = newMap.get(selectedNode);

                if (existingNode) {
                    newMap.set(selectedNode, {
                        ...existingNode,
                        refined_content: content,
                        approved_content: content,
                        status: "completed",
                        is_approved: true,
                        approved_at: now,
                        updated_at: now,
                    });
                }

                return newMap;
            });

            toast({
                title: "Step Approved!",
                description: `${getNodeDefinition(selectedNode)?.title || "Step"} has been approved.`,
            });
        },
        [projectId, selectedNode, project?.user_id, toast, nodeData]
    );

    // Core nodes that MUST be approved before continuing
    const CORE_NODE_TYPES: FunnelNodeType[] = [
        "registration",
        "masterclass",
        "core_offer",
        "checkout",
    ];

    // Calculate approval progress
    const pathwayNodes = getNodesForPathway(pathwayType, registrationConfig);
    const approvedNodes = pathwayNodes.filter((node) => {
        const data = nodeData.get(node.id);
        return data?.is_approved === true;
    });
    const hasStarted = nodeData.size > 0;

    // Check if all core nodes are approved
    const coreNodesApproved = CORE_NODE_TYPES.every((nodeType) => {
        const data = nodeData.get(nodeType);
        return data?.is_approved === true;
    });
    const canContinue = coreNodesApproved;

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
            nextLabel={
                canContinue ? "Continue to Brand Design" : "Approve Core Steps First"
            }
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
                        <div className="flex flex-col h-full">
                            {/* Approval Progress Bar - Centered */}
                            <div className="mb-4 flex items-center justify-center rounded-lg border border-border bg-card p-4">
                                <div className="flex items-center gap-4">
                                    <BadgeCheck className="h-5 w-5 text-primary" />
                                    <span className="text-sm font-medium text-foreground">
                                        Funnel Progress
                                    </span>
                                    <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                approvedNodes.length ===
                                                    pathwayNodes.length
                                                    ? "bg-green-500"
                                                    : "bg-primary"
                                            )}
                                            style={{
                                                width: `${pathwayNodes.length > 0 ? (approvedNodes.length / pathwayNodes.length) * 100 : 0}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {approvedNodes.length}/{pathwayNodes.length}{" "}
                                        steps approved
                                    </span>
                                </div>
                            </div>

                            {/* React Flow Flowchart - Fixed height to leave room for navigation buttons */}
                            <div className="flex-1 min-h-[400px] mb-4">
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
                    businessContext={sanitizeBusinessContext(businessProfile)}
                    onContentUpdate={handleModalContentUpdate}
                    onApprove={handleNodeApprove}
                />
            )}
        </StepLayout>
    );
}
