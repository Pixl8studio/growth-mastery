/**
 * Step 11: AI Follow-Up Engine
 *
 * Comprehensive interface for configuring AI-powered post-webinar follow-up automation.
 * Fully exposes the backend follow-up engine capabilities.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StepLayout } from "@/components/funnel/step-layout";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { useIsMobile } from "@/lib/mobile-utils.client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    Sparkles,
    Mail,
    BookOpen,
    Settings,
    BarChart3,
    Users,
    MessageSquare,
    Target,
    Loader2,
} from "lucide-react";

// Import our comprehensive components
import { AgentConfigForm } from "@/components/followup/agent-config-form";
import { SequenceBuilder } from "@/components/followup/sequence-builder";
import { MessageTemplateEditor } from "@/components/followup/message-template-editor";
import { StoryLibrary } from "@/components/followup/story-library";
import { AnalyticsDashboard } from "@/components/followup/analytics-dashboard";
import { SenderSetupTab } from "@/components/followup/sender-setup-tab";
import { TestMessageModal } from "@/components/followup/test-message-modal";
import { ComingSoonOverlay } from "@/components/ui/coming-soon-overlay";

export default function Step11Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const isMobile = useIsMobile("lg");
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [followupEnabled, setFollowupEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("sender");

    // Redirect mobile users to desktop-required page
    useEffect(() => {
        if (isMobile && projectId) {
            const params = new URLSearchParams({
                feature: "AI Follow-Up Engine",
                description:
                    "The AI Follow-Up Engine requires a desktop computer for configuring sequences, managing templates, and setting up advanced automation workflows.",
                returnPath: `/funnel-builder/${projectId}`,
            });
            router.push(`/desktop-required?${params.toString()}`);
        }
    }, [isMobile, projectId, router]);
    const [generatingBrandVoice, setGeneratingBrandVoice] = useState(false);

    // State for all follow-up data
    const [agentConfig, setAgentConfig] = useState<any>(null);
    const [sequences, setSequences] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [stories, setStories] = useState<any[]>([]);
    const [offer, setOffer] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>({
        sequences: [],
        overall: {
            totalSent: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalReplied: 0,
            totalConverted: 0,
            totalRevenue: 0,
        },
    });
    const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [queuedCount, setQueuedCount] = useState(0);
    const [nextScheduledTime, setNextScheduledTime] = useState<string | null>(null);

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    // Load all follow-up data
    useEffect(() => {
        const loadData = async () => {
            if (!projectId) return;

            try {
                setLoading(true);

                const supabase = createClient();

                // Load offer for this funnel
                const { data: offerData, error: offerError } = await supabase
                    .from("offers")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                if (!offerError && offerData) {
                    setOffer(offerData);
                    logger.info(
                        { offerId: offerData.id, offerName: offerData.name },
                        "Loaded offer for funnel"
                    );
                }

                // Load agent config
                const configRes = await fetch(
                    `/api/followup/agent-configs?funnel_project_id=${projectId}`
                );
                if (configRes.ok) {
                    const configData = await configRes.json();
                    if (configData.configs && configData.configs.length > 0) {
                        setAgentConfig(configData.configs[0]);
                        setFollowupEnabled(true);
                    }
                }

                // Load sequences with message counts
                if (agentConfig) {
                    const { data: sequencesData, error: seqError } = await supabase
                        .from("followup_sequences")
                        .select("*")
                        .eq("agent_config_id", agentConfig.id)
                        .order("created_at", { ascending: false });

                    if (!seqError && sequencesData) {
                        // Get message counts for each sequence
                        const sequencesWithCount = await Promise.all(
                            sequencesData.map(async (seq: any) => {
                                const { count } = await supabase
                                    .from("followup_messages")
                                    .select("*", { count: "exact", head: true })
                                    .eq("sequence_id", seq.id);

                                return {
                                    ...seq,
                                    message_count: count || 0,
                                };
                            })
                        );
                        setSequences(sequencesWithCount);
                        logger.info(
                            {
                                sequenceCount: sequencesWithCount.length,
                                messageCounts: sequencesWithCount.map(
                                    (s) => s.message_count
                                ),
                            },
                            "Loaded sequences with message counts"
                        );
                    }
                }

                // Load stories
                const storiesRes = await fetch(`/api/followup/stories`);
                if (storiesRes.ok) {
                    const storiesData = await storiesRes.json();
                    setStories(storiesData.stories || []);
                }

                // Load analytics
                const analyticsRes = await fetch(
                    `/api/followup/analytics?funnel_project_id=${projectId}`
                );
                if (analyticsRes.ok) {
                    const analyticsData = await analyticsRes.json();
                    // Merge with defaults to ensure structure integrity
                    setAnalytics({
                        sequences: analyticsData.sequences || [],
                        overall: {
                            totalSent: analyticsData.overall?.totalSent || 0,
                            totalOpened: analyticsData.overall?.totalOpened || 0,
                            totalClicked: analyticsData.overall?.totalClicked || 0,
                            totalReplied: analyticsData.overall?.totalReplied || 0,
                            totalConverted: analyticsData.overall?.totalConverted || 0,
                            totalRevenue: analyticsData.overall?.totalRevenue || 0,
                        },
                    });
                }

                // Load queued deliveries count
                if (agentConfig?.id) {
                    const { count: queuedDeliveries } = await supabase
                        .from("followup_deliveries")
                        .select("*", { count: "exact", head: true })
                        .eq("delivery_status", "pending");

                    setQueuedCount(queuedDeliveries || 0);

                    // Get next scheduled delivery
                    const { data: nextDelivery } = await supabase
                        .from("followup_deliveries")
                        .select("scheduled_send_at")
                        .eq("delivery_status", "pending")
                        .order("scheduled_send_at", { ascending: true })
                        .limit(1)
                        .single();

                    if (nextDelivery) {
                        const nextTime = new Date(nextDelivery.scheduled_send_at);
                        const now = new Date();
                        const diffMs = nextTime.getTime() - now.getTime();
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffMins = Math.floor(
                            (diffMs % (1000 * 60 * 60)) / (1000 * 60)
                        );

                        if (diffHours > 0) {
                            setNextScheduledTime(`in ${diffHours}h ${diffMins}m`);
                        } else if (diffMins > 0) {
                            setNextScheduledTime(`in ${diffMins}m`);
                        } else {
                            setNextScheduledTime("now");
                        }
                    }
                }
            } catch (error) {
                logger.error({ error }, "Failed to load follow-up data");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [projectId, agentConfig?.id]);

    // Load messages for selected sequence OR all messages
    useEffect(() => {
        const loadMessages = async () => {
            if (!agentConfig?.id) {
                setMessages([]);
                return;
            }

            try {
                if (selectedSequenceId) {
                    // Load messages for specific sequence
                    const res = await fetch(
                        `/api/followup/sequences/${selectedSequenceId}/messages`
                    );
                    if (res.ok) {
                        const data = await res.json();
                        setMessages(data.messages || []);
                    }
                } else if (sequences.length > 0) {
                    // Load all messages across all sequences
                    const allMessages = await Promise.all(
                        sequences.map(async (seq) => {
                            const res = await fetch(
                                `/api/followup/sequences/${seq.id}/messages`
                            );
                            if (res.ok) {
                                const data = await res.json();
                                return data.messages || [];
                            }
                            return [];
                        })
                    );
                    setMessages(allMessages.flat());
                    logger.info(
                        { totalMessages: allMessages.flat().length },
                        "📨 Loaded all messages across sequences"
                    );
                }
            } catch (error) {
                logger.error({ error }, "Failed to load messages");
            }
        };

        loadMessages();
    }, [selectedSequenceId, sequences, agentConfig]);

    const handleEnableFollowup = async (enabled: boolean) => {
        setFollowupEnabled(enabled);

        if (enabled && !agentConfig) {
            // Create default agent config with auto-populated knowledge base
            try {
                const supabase = createClient();

                // Fetch intake data for business context
                const { data: intakeData } = await supabase
                    .from("vapi_transcripts")
                    .select("extracted_data, transcript_text")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                // Fetch offer data for product details
                const { data: offerData } = await supabase
                    .from("offers")
                    .select("*")
                    .eq("funnel_project_id", projectId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                // Build knowledge base from intake and offer data
                const knowledgeBase: any = {
                    brand_voice: "",
                    product_knowledge: "",
                    objection_responses: "",
                    blacklist_topics: "",
                };

                // Build BusinessContext and ProductKnowledge for brand voice generation
                const businessContext: any = {
                    business_name: "",
                    industry: "",
                    target_audience: "",
                    main_challenge: "",
                    desired_outcome: "",
                };

                const productKnowledge: any = {
                    product_name: "",
                    tagline: "",
                    promise: "",
                    features: [],
                    guarantee: "",
                };

                // Populate business context from intake data
                if (intakeData?.extracted_data) {
                    const extracted = intakeData.extracted_data as any;
                    businessContext.business_name = extracted.businessName || "";
                    businessContext.industry = extracted.industry || "";
                    businessContext.target_audience = extracted.targetAudience || "";
                    businessContext.main_challenge = extracted.mainProblem || "";
                    businessContext.desired_outcome = extracted.desiredOutcome || "";
                }

                // Populate product knowledge from offer data
                if (offerData) {
                    productKnowledge.product_name = offerData.name || "";
                    productKnowledge.tagline = offerData.tagline || "";
                    productKnowledge.promise = offerData.promise || "";
                    productKnowledge.features = Array.isArray(offerData.features)
                        ? offerData.features.map((f: any) =>
                              typeof f === "string" ? f : f.title || ""
                          )
                        : [];
                    productKnowledge.guarantee = offerData.guarantee || "";

                    // Build product knowledge text for knowledge base
                    const productDetails = [];
                    productDetails.push(`Product: ${offerData.name}`);
                    if (offerData.tagline) {
                        productDetails.push(`Tagline: ${offerData.tagline}`);
                    }
                    if (offerData.promise) {
                        productDetails.push(`Promise: ${offerData.promise}`);
                    }
                    if (offerData.description) {
                        productDetails.push(`Description: ${offerData.description}`);
                    }
                    if (offerData.price) {
                        productDetails.push(
                            `Price: ${offerData.currency || "USD"} ${offerData.price}`
                        );
                    }

                    // Add features if available
                    if (offerData.features && Array.isArray(offerData.features)) {
                        productDetails.push("\nKey Features:");
                        offerData.features.forEach((feature: any) => {
                            const featureText =
                                typeof feature === "string"
                                    ? feature
                                    : feature.title || "";
                            if (featureText) {
                                productDetails.push(`- ${featureText}`);
                            }
                        });
                    }

                    // Add guarantee if available
                    if (offerData.guarantee) {
                        productDetails.push(`\nGuarantee: ${offerData.guarantee}`);
                    }

                    knowledgeBase.product_knowledge = productDetails.join("\n");

                    // Add basic objection responses based on offer
                    const objections = [];
                    objections.push(
                        "Price: Focus on the value and transformation, not just the cost. " +
                            (offerData.promise
                                ? `Highlight: ${offerData.promise}`
                                : "Emphasize ROI and long-term benefits.")
                    );
                    objections.push(
                        "Timing: Acknowledge their concerns while emphasizing why now is the best time to start."
                    );
                    if (offerData.guarantee) {
                        objections.push(
                            `Trust: We offer ${offerData.guarantee} to remove all risk from your decision.`
                        );
                    }
                    knowledgeBase.objection_responses = objections.join("\n\n");
                }

                // Generate brand voice guidelines using AI
                setGeneratingBrandVoice(true);
                toast({
                    title: "Generating Brand Voice...",
                    description:
                        "Creating personalized guidelines from your intake and offer data",
                });

                try {
                    const brandVoiceResponse = await fetch(
                        "/api/followup/generate-brand-voice",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                businessContext,
                                productKnowledge,
                            }),
                        }
                    );

                    if (brandVoiceResponse.ok) {
                        const brandVoiceData = await brandVoiceResponse.json();
                        if (brandVoiceData.success && brandVoiceData.brandVoice) {
                            knowledgeBase.brand_voice = brandVoiceData.brandVoice;
                            logger.info({}, "✅ Brand voice guidelines auto-populated");
                            toast({
                                title: "✨ Brand Voice Generated",
                                description:
                                    "Your personalized brand voice guidelines are ready",
                            });
                        }
                    }
                } catch (brandVoiceError) {
                    logger.error(
                        { error: brandVoiceError },
                        "Failed to auto-generate brand voice, using fallback"
                    );
                    toast({
                        title: "Using Default Voice Guidelines",
                        description:
                            "AI generation failed, but we've created a good starting point for you",
                        variant: "default",
                    });
                    // Fallback: use basic brand voice guidelines
                    knowledgeBase.brand_voice = `Brand Voice Guidelines:

Tone: Professional yet approachable, empathetic to customer challenges.

Key Themes:
- Focus on the transformation and results
${businessContext.main_challenge ? `- Lead with empathy for ${businessContext.main_challenge}` : ""}
${productKnowledge.product_name ? `- Emphasize the value of ${productKnowledge.product_name}` : ""}

Approach:
- Use clear, jargon-free language
- Share authentic stories and experiences
- Always connect features to benefits
- End with clear calls-to-action`;
                } finally {
                    setGeneratingBrandVoice(false);
                }

                const response = await fetch("/api/followup/agent-configs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        funnel_project_id: projectId,
                        name: "Main Follow-Up Agent",
                        voice_config: {
                            tone: "conversational",
                            personality: "helpful",
                            empathy_level: "moderate",
                            urgency_level: "gentle",
                        },
                        knowledge_base: knowledgeBase,
                    }),
                });

                const data = await response.json();
                if (data.success) {
                    setAgentConfig(data.config);

                    // Create default post-webinar sequence via API
                    try {
                        const defaultSequenceResponse = await fetch(
                            "/api/followup/sequences/create-default",
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    agent_config_id: data.config.id,
                                    offer_data: offerData,
                                    intake_data: intakeData?.extracted_data || null,
                                }),
                            }
                        );

                        const sequenceData = await defaultSequenceResponse.json();

                        toast({
                            title: "✨ AI Follow-Up Enabled",
                            description: sequenceData.success
                                ? "Agent configured with your business context, offer details, and default sequence"
                                : "Agent configured - you can add sequences manually",
                        });

                        logger.info(
                            {
                                hasIntake: !!intakeData,
                                hasOffer: !!offerData,
                                sequenceCreated: sequenceData.success,
                            },
                            "Created agent with auto-populated knowledge base"
                        );
                    } catch (seqError) {
                        logger.error(
                            { error: seqError },
                            "Failed to create default sequence, but agent config succeeded"
                        );
                        toast({
                            title: "✨ AI Follow-Up Enabled",
                            description:
                                "Agent configured with your business context and offer details",
                        });
                    }
                }
            } catch (error) {
                logger.error({ error }, "Failed to create agent config");
                toast({
                    title: "Error",
                    description: "Failed to enable AI follow-up. Please try again.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleSaveAgentConfig = async (config: any) => {
        try {
            const method = agentConfig ? "PUT" : "POST";
            const url = agentConfig
                ? `/api/followup/agent-configs/${agentConfig.id}`
                : "/api/followup/agent-configs";

            logger.info(
                { method, url, hasConfig: !!agentConfig },
                "Saving agent config"
            );

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...config,
                    funnel_project_id: projectId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error(
                    { status: response.status, error: errorData },
                    "Failed to save agent config"
                );
                throw new Error(errorData.error || "Failed to save configuration");
            }

            const data = await response.json();

            if (data.success) {
                setAgentConfig(data.config);
                logger.info(
                    { configId: data.config?.id },
                    "Agent config saved successfully"
                );
                toast({
                    title: "✅ Configuration Saved",
                    description: "Your AI agent settings have been saved",
                });
            } else {
                throw new Error(data.error || "Configuration save failed");
            }
        } catch (error) {
            logger.error({ error }, "❌ Failed to save agent config");
            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to save configuration",
                variant: "destructive",
            });
        }
    };

    const handleCreateSequence = async (sequence: any) => {
        try {
            if (!agentConfig?.id) {
                throw new Error(
                    "Agent configuration is required before creating sequences"
                );
            }

            logger.info({ sequenceName: sequence.name }, "Creating sequence");

            const response = await fetch("/api/followup/sequences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...sequence,
                    agent_config_id: agentConfig.id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                logger.error(
                    { status: response.status, error: errorData },
                    "Failed to create sequence"
                );
                throw new Error(errorData.error || "Failed to create sequence");
            }

            const data = await response.json();

            if (data.success) {
                const newSequence = data.sequence;
                setSequences([...sequences, newSequence]);
                logger.info(
                    { sequenceId: newSequence?.id },
                    "Sequence created successfully"
                );

                toast({
                    title: "✅ Sequence Created",
                    description: `${newSequence.name} has been created successfully`,
                });
            } else {
                throw new Error(data.error || "Sequence creation failed");
            }
        } catch (error) {
            logger.error({ error }, "❌ Failed to create sequence");
            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to create sequence",
                variant: "destructive",
            });
        }
    };

    const handleUpdateSequence = async (id: string, updates: any) => {
        try {
            const response = await fetch(`/api/followup/sequences/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            const data = await response.json();

            if (data.success) {
                setSequences(
                    sequences.map((seq) => (seq.id === id ? data.sequence : seq))
                );
                toast({
                    title: "✅ Sequence Updated",
                    description: "Sequence has been updated",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to update sequence");
        }
    };

    const handleDeleteSequence = async (id: string) => {
        try {
            const response = await fetch(`/api/followup/sequences/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                setSequences(sequences.filter((seq) => seq.id !== id));
                if (selectedSequenceId === id) {
                    setSelectedSequenceId(null);
                }
                toast({
                    title: "✅ Sequence Deleted",
                    description: "Sequence has been deleted",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to delete sequence");
        }
    };

    const handleCreateMessage = async (message: any) => {
        try {
            const response = await fetch(
                `/api/followup/sequences/${selectedSequenceId}/messages`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(message),
                }
            );

            const data = await response.json();

            if (data.success) {
                setMessages([...messages, data.message]);
                toast({
                    title: "✅ Message Created",
                    description: "Message template has been created",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to create message");
        }
    };

    const handleUpdateMessage = async (id: string, updates: any) => {
        try {
            const response = await fetch(
                `/api/followup/sequences/${selectedSequenceId}/messages/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update message");
            }

            const data = await response.json();

            if (data.success) {
                setMessages(
                    messages.map((msg) => (msg.id === id ? data.message : msg))
                );
                toast({
                    title: "✅ Message Updated",
                    description: "Message template has been updated",
                });
            } else {
                throw new Error(data.error || "Update failed");
            }
        } catch (error) {
            logger.error({ error }, "❌ Failed to update message");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to update message",
                variant: "destructive",
            });
        }
    };

    const handleDeleteMessage = async (id: string) => {
        try {
            const response = await fetch(
                `/api/followup/sequences/${selectedSequenceId}/messages/${id}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete message");
            }

            setMessages(messages.filter((msg) => msg.id !== id));
            toast({
                title: "✅ Message Deleted",
                description: "Message template has been deleted",
            });
        } catch (error) {
            logger.error({ error }, "❌ Failed to delete message");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to delete message",
                variant: "destructive",
            });
        }
    };

    const handleCreateStory = async (story: any) => {
        try {
            const response = await fetch("/api/followup/stories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(story),
            });

            const data = await response.json();

            if (data.success) {
                setStories([...stories, data.story]);
                toast({
                    title: "✅ Story Added",
                    description: "Story has been added to your library",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to create story");
        }
    };

    const handleUpdateStory = async (id: string, updates: any) => {
        try {
            const response = await fetch(`/api/followup/stories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update story");
            }

            const data = await response.json();

            if (data.success) {
                setStories(
                    stories.map((story) => (story.id === id ? data.story : story))
                );
                toast({
                    title: "✅ Story Updated",
                    description: "Story has been updated",
                });
            } else {
                throw new Error(data.error || "Update failed");
            }
        } catch (error) {
            logger.error({ error }, "❌ Failed to update story");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to update story",
                variant: "destructive",
            });
        }
    };

    const handleDeleteStory = async (id: string) => {
        try {
            const response = await fetch(`/api/followup/stories/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete story");
            }

            setStories(stories.filter((story) => story.id !== id));
            toast({
                title: "✅ Story Deleted",
                description: "Story has been deleted",
            });
        } catch (error) {
            logger.error({ error }, "❌ Failed to delete story");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to delete story",
                variant: "destructive",
            });
        }
    };

    const reloadSequences = async () => {
        if (!agentConfig?.id) return;

        try {
            const supabase = createClient();

            const { data: sequencesData, error: seqError } = await supabase
                .from("followup_sequences")
                .select("*")
                .eq("agent_config_id", agentConfig.id)
                .order("created_at", { ascending: false });

            if (!seqError && sequencesData) {
                // Get message counts for each sequence
                const sequencesWithCount = await Promise.all(
                    sequencesData.map(async (seq: any) => {
                        const { count } = await supabase
                            .from("followup_messages")
                            .select("*", { count: "exact", head: true })
                            .eq("sequence_id", seq.id);

                        return {
                            ...seq,
                            message_count: count || 0,
                        };
                    })
                );
                setSequences(sequencesWithCount);
                logger.info(
                    {
                        sequenceCount: sequencesWithCount.length,
                        messageCounts: sequencesWithCount.map(
                            (s) => `${s.name}: ${s.message_count} messages`
                        ),
                    },
                    "✅ Sequences reloaded with updated message counts"
                );
            }
        } catch (error) {
            logger.error({ error }, "Failed to reload sequences");
        }
    };

    const handleSelectSequence = async (sequenceId: string) => {
        logger.info({ sequenceId }, "Selecting sequence");
        setSelectedSequenceId(sequenceId);
        setActiveTab("messages");

        // Reload sequences to ensure counts are fresh
        await reloadSequences();
    };

    if (loading) {
        return (
            <StepLayout
                stepTitle="AI Follow-Up Engine"
                stepDescription="Automate post-webinar engagement"
                currentStep={11}
                projectId={projectId}
                completedSteps={completedSteps}
            >
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            Loading follow-up engine...
                        </p>
                    </div>
                </div>
            </StepLayout>
        );
    }

    return (
        <StepLayout
            stepTitle="AI Follow-Up Engine"
            stepDescription="Automate post-webinar engagement with AI-powered sequences"
            currentStep={11}
            projectId={projectId}
            completedSteps={completedSteps}
            nextLabel="Continue to Marketing"
        >
            <ComingSoonOverlay
                featureName="AI Follow-Up Engine"
                description="The AI Follow-Up Engine is currently in development. Soon you'll be able to automate post-webinar engagement with personalized, AI-powered sequences."
            >
                <div className="space-y-6">
                    {/* Enable/Disable Section */}
                    <Card className="p-6 bg-gradient-to-r from-purple-50 to-primary/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Sparkles className="h-6 w-6 text-purple-500" />
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Enable AI Follow-Up
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically nurture prospects with
                                        personalized, AI-powered sequences
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={followupEnabled}
                                onCheckedChange={handleEnableFollowup}
                                disabled={generatingBrandVoice}
                            />
                        </div>

                        {generatingBrandVoice && (
                            <div className="mt-4 flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                                <div>
                                    <p className="text-sm font-medium text-purple-900">
                                        Setting up your AI Follow-Up Engine...
                                    </p>
                                    <p className="text-xs text-purple-700 mt-1">
                                        Analyzing your intake data and offer to create
                                        personalized brand voice guidelines
                                    </p>
                                </div>
                            </div>
                        )}

                        {followupEnabled && (
                            <>
                                <div className="mt-6 grid grid-cols-4 gap-4 text-sm">
                                    <div className="text-center p-3 bg-card rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {sequences.length}
                                        </div>
                                        <div className="text-muted-foreground">
                                            Sequences
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-card rounded-lg">
                                        <div className="text-2xl font-bold text-primary">
                                            {messages.length}
                                        </div>
                                        <div className="text-muted-foreground">
                                            Templates
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-card rounded-lg">
                                        <div className="text-2xl font-bold text-orange-600">
                                            {queuedCount}
                                        </div>
                                        <div className="text-muted-foreground">
                                            Queued
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-card rounded-lg">
                                        <div className="text-sm font-bold text-primary">
                                            {nextScheduledTime || "None"}
                                        </div>
                                        <div className="text-muted-foreground">
                                            Next Send
                                        </div>
                                    </div>
                                </div>

                                {/* Test Message Button */}
                                {agentConfig?.id && (
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            onClick={() => setTestModalOpen(true)}
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                            Test Message to Self
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </Card>

                    {followupEnabled && (
                        <>
                            <Tabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                                className="w-full"
                            >
                                <TabsList className="grid w-full grid-cols-7">
                                    <TabsTrigger value="sender">
                                        <Mail className="h-4 w-4 mr-2" />
                                        Sender
                                    </TabsTrigger>
                                    <TabsTrigger value="agent">
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Agent
                                    </TabsTrigger>
                                    <TabsTrigger value="sequences">
                                        <Target className="h-4 w-4 mr-2" />
                                        Sequences
                                    </TabsTrigger>
                                    <TabsTrigger value="messages">
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Messages
                                    </TabsTrigger>
                                    <TabsTrigger value="stories">
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        Stories
                                    </TabsTrigger>
                                    <TabsTrigger value="analytics">
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        Analytics
                                    </TabsTrigger>
                                    <TabsTrigger value="settings">
                                        <Settings className="h-4 w-4 mr-2" />
                                        Settings
                                    </TabsTrigger>
                                </TabsList>

                                {/* Sender Setup Tab */}
                                <TabsContent value="sender" className="mt-6">
                                    <SenderSetupTab
                                        agentConfigId={agentConfig?.id}
                                        currentSenderName={agentConfig?.sender_name}
                                        currentSenderEmail={agentConfig?.sender_email}
                                        currentSMSSenderId={agentConfig?.sms_sender_id}
                                        emailProviderType={
                                            agentConfig?.email_provider_type
                                        }
                                        gmailUserEmail={agentConfig?.gmail_user_email}
                                        onUpdate={async () => {
                                            // Reload data after sender updates
                                            if (!projectId) return;
                                            const configRes = await fetch(
                                                `/api/followup/agent-configs?funnel_project_id=${projectId}`
                                            );
                                            if (configRes.ok) {
                                                const configData =
                                                    await configRes.json();
                                                if (
                                                    configData.configs &&
                                                    configData.configs.length > 0
                                                ) {
                                                    setAgentConfig(
                                                        configData.configs[0]
                                                    );
                                                }
                                            }
                                        }}
                                    />
                                </TabsContent>

                                {/* Agent Configuration Tab */}
                                <TabsContent value="agent" className="mt-6">
                                    <AgentConfigForm
                                        config={agentConfig}
                                        onSave={handleSaveAgentConfig}
                                        funnelProjectId={projectId}
                                    />
                                </TabsContent>

                                {/* Sequences Tab */}
                                <TabsContent value="sequences" className="mt-6">
                                    <SequenceBuilder
                                        sequences={sequences}
                                        onCreateSequence={handleCreateSequence}
                                        onUpdateSequence={handleUpdateSequence}
                                        onDeleteSequence={handleDeleteSequence}
                                        onSelectSequence={handleSelectSequence}
                                        onReloadSequences={reloadSequences}
                                        funnelProjectId={projectId}
                                        offerId={offer?.id}
                                    />

                                    {sequences.length > 0 && (
                                        <Card className="mt-4 p-4 bg-primary/5 border-primary/20">
                                            <p className="text-sm text-primary">
                                                💡 <strong>Tip:</strong> Click "View
                                                Messages" on any sequence or go to the
                                                Messages tab to view and edit all
                                                message templates.
                                            </p>
                                        </Card>
                                    )}
                                </TabsContent>

                                {/* Messages Tab */}
                                <TabsContent value="messages" className="mt-6">
                                    <MessageTemplateEditor
                                        sequenceId={
                                            selectedSequenceId || sequences[0]?.id || ""
                                        }
                                        messages={messages}
                                        sequences={sequences}
                                        onCreateMessage={handleCreateMessage}
                                        onUpdateMessage={handleUpdateMessage}
                                        onDeleteMessage={handleDeleteMessage}
                                    />
                                </TabsContent>

                                {/* Stories Tab */}
                                <TabsContent value="stories" className="mt-6">
                                    <StoryLibrary
                                        stories={stories}
                                        onCreateStory={handleCreateStory}
                                        onUpdateStory={handleUpdateStory}
                                        onDeleteStory={handleDeleteStory}
                                    />
                                </TabsContent>

                                {/* Analytics Tab */}
                                <TabsContent value="analytics" className="mt-6">
                                    <AnalyticsDashboard data={analytics} />
                                </TabsContent>

                                {/* Settings Tab */}
                                <TabsContent value="settings" className="mt-6">
                                    <div className="space-y-4">
                                        <Card className="p-6">
                                            <h3 className="text-lg font-semibold mb-4">
                                                Follow-Up Settings
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">
                                                            Email Follow-Up
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Automated email sequences
                                                        </div>
                                                    </div>
                                                    <Switch defaultChecked={true} />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">
                                                            SMS Follow-Up
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            High-intent SMS messages
                                                        </div>
                                                    </div>
                                                    <Switch defaultChecked={false} />
                                                </div>
                                                <div className="pt-4 border-t">
                                                    <h4 className="font-medium mb-3">
                                                        Compliance & Limits
                                                    </h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                                CAN-SPAM Compliance:
                                                            </span>
                                                            <span className="font-medium text-green-600">
                                                                ✓ Enabled
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                                Daily Email Limit:
                                                            </span>
                                                            <span className="font-medium">
                                                                500
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                                Daily SMS Limit:
                                                            </span>
                                                            <span className="font-medium">
                                                                100
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                                Opt-out Link:
                                                            </span>
                                                            <span className="font-medium text-green-600">
                                                                ✓ Auto-included
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        <Card className="p-6 bg-gradient-to-r from-green-50 to-primary/5">
                                            <h3 className="text-lg font-semibold mb-4">
                                                System Features
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-purple-600" />
                                                    <span>
                                                        5-Segment Auto-Categorization
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-primary" />
                                                    <span>
                                                        15+ Personalization Tokens
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-green-600" />
                                                    <span>AI Story Selection</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-orange-600" />
                                                    <span>
                                                        Multi-Channel (Email + SMS)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <BarChart3 className="h-4 w-4 text-purple-600" />
                                                    <span>
                                                        Intent Scoring & Tracking
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Target className="h-4 w-4 text-red-600" />
                                                    <span>
                                                        A/B Testing Infrastructure
                                                    </span>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </div>
            </ComingSoonOverlay>

            {/* Test Message Modal */}
            {agentConfig?.id && (
                <TestMessageModal
                    open={testModalOpen}
                    onClose={() => setTestModalOpen(false)}
                    agentConfigId={agentConfig.id}
                    userEmail={agentConfig.sender_email || undefined}
                />
            )}
        </StepLayout>
    );
}
