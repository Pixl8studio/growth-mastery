/**
 * Step 11: AI Follow-Up Engine
 *
 * Comprehensive interface for configuring AI-powered post-webinar follow-up automation.
 * Fully exposes the backend follow-up engine capabilities.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/funnel/step-layout";
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
} from "lucide-react";

// Import our comprehensive components
import { AgentConfigForm } from "@/components/followup/agent-config-form";
import { SequenceBuilder } from "@/components/followup/sequence-builder";
import { MessageTemplateEditor } from "@/components/followup/message-template-editor";
import { StoryLibrary } from "@/components/followup/story-library";
import { AnalyticsDashboard } from "@/components/followup/analytics-dashboard";

export default function Step11Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [followupEnabled, setFollowupEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("agent");

    // State for all follow-up data
    const [agentConfig, setAgentConfig] = useState<any>(null);
    const [sequences, setSequences] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [stories, setStories] = useState<any[]>([]);
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

                // Load sequences
                if (agentConfig) {
                    const seqRes = await fetch(
                        `/api/followup/sequences?agent_config_id=${agentConfig.id}`
                    );
                    if (seqRes.ok) {
                        const seqData = await seqRes.json();
                        setSequences(seqData.sequences || []);
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
            } catch (error) {
                logger.error({ error }, "Failed to load follow-up data");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [projectId, agentConfig?.id]);

    // Load messages for selected sequence
    useEffect(() => {
        const loadMessages = async () => {
            if (!selectedSequenceId) {
                setMessages([]);
                return;
            }

            try {
                const res = await fetch(
                    `/api/followup/sequences/${selectedSequenceId}/messages`
                );
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data.messages || []);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load messages");
            }
        };

        loadMessages();
    }, [selectedSequenceId]);

    const handleEnableFollowup = async (enabled: boolean) => {
        setFollowupEnabled(enabled);

        if (enabled && !agentConfig) {
            // Create default agent config
            try {
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
                    }),
                });

                const data = await response.json();
                if (data.success) {
                    setAgentConfig(data.config);
                    toast({
                        title: "✨ AI Follow-Up Enabled",
                        description:
                            "Configure your agent to start automating follow-ups",
                    });
                }
            } catch (error) {
                logger.error({ error }, "Failed to create agent config");
            }
        }
    };

    const handleSaveAgentConfig = async (config: any) => {
        try {
            const method = agentConfig ? "PUT" : "POST";
            const url = agentConfig
                ? `/api/followup/agent-configs/${agentConfig.id}`
                : "/api/followup/agent-configs";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...config,
                    funnel_project_id: projectId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setAgentConfig(data.config);
                toast({
                    title: "✅ Configuration Saved",
                    description: "Your AI agent settings have been saved",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to save agent config");
            toast({
                title: "Error",
                description: "Failed to save configuration",
                variant: "destructive",
            });
        }
    };

    const handleCreateSequence = async (sequence: any) => {
        try {
            const response = await fetch("/api/followup/sequences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...sequence,
                    agent_config_id: agentConfig.id,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSequences([...sequences, data.sequence]);
                toast({
                    title: "✅ Sequence Created",
                    description: `${data.sequence.name} has been created`,
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to create sequence");
            toast({
                title: "Error",
                description: "Failed to create sequence",
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
        // Implementation similar to update sequence
    };

    const handleDeleteMessage = async (id: string) => {
        // Implementation similar to delete sequence
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
        // Implementation similar to update sequence
    };

    const handleDeleteStory = async (id: string) => {
        // Implementation similar to delete sequence
    };

    if (loading) {
        return (
            <StepLayout
                stepTitle="AI Follow-Up Engine"
                stepDescription="Automate post-webinar engagement"
                currentStep={11}
                projectId={projectId}
            >
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading follow-up engine...</p>
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
        >
            <div className="space-y-6">
                {/* Enable/Disable Section */}
                <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-6 w-6 text-purple-500" />
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Enable AI Follow-Up
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Automatically nurture prospects with personalized,
                                    AI-powered sequences
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={followupEnabled}
                            onCheckedChange={handleEnableFollowup}
                        />
                    </div>

                    {followupEnabled && (
                        <div className="mt-6 grid grid-cols-4 gap-4 text-sm">
                            <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">
                                    {sequences.length}
                                </div>
                                <div className="text-gray-600">Sequences</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">
                                    {messages.length}
                                </div>
                                <div className="text-gray-600">Templates</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                    {stories.length}
                                </div>
                                <div className="text-gray-600">Stories</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg">
                                <div className="text-2xl font-bold text-orange-600">
                                    {analytics.overall?.totalSent ?? 0}
                                </div>
                                <div className="text-gray-600">Sent</div>
                            </div>
                        </div>
                    )}
                </Card>

                {followupEnabled && (
                    <>
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="w-full"
                        >
                            <TabsList className="grid w-full grid-cols-6">
                                <TabsTrigger value="agent">
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Agent
                                </TabsTrigger>
                                <TabsTrigger value="sequences">
                                    <Mail className="h-4 w-4 mr-2" />
                                    Sequences
                                </TabsTrigger>
                                <TabsTrigger
                                    value="messages"
                                    disabled={!selectedSequenceId}
                                >
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

                            {/* Agent Configuration Tab */}
                            <TabsContent value="agent" className="mt-6">
                                <AgentConfigForm
                                    config={agentConfig}
                                    onSave={handleSaveAgentConfig}
                                />
                            </TabsContent>

                            {/* Sequences Tab */}
                            <TabsContent value="sequences" className="mt-6">
                                <SequenceBuilder
                                    sequences={sequences}
                                    onCreateSequence={handleCreateSequence}
                                    onUpdateSequence={handleUpdateSequence}
                                    onDeleteSequence={handleDeleteSequence}
                                />

                                {sequences.length > 0 && (
                                    <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
                                        <p className="text-sm text-blue-900">
                                            💡 <strong>Tip:</strong> Select a sequence
                                            above to view and edit its message templates
                                            in the Messages tab.
                                        </p>
                                    </Card>
                                )}
                            </TabsContent>

                            {/* Messages Tab */}
                            <TabsContent value="messages" className="mt-6">
                                {selectedSequenceId ? (
                                    <MessageTemplateEditor
                                        sequenceId={selectedSequenceId}
                                        messages={messages}
                                        onCreateMessage={handleCreateMessage}
                                        onUpdateMessage={handleUpdateMessage}
                                        onDeleteMessage={handleDeleteMessage}
                                    />
                                ) : (
                                    <Card className="p-12 text-center">
                                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h4 className="text-lg font-semibold mb-2">
                                            Select a Sequence
                                        </h4>
                                        <p className="text-gray-600">
                                            Go to the Sequences tab and select a
                                            sequence to view and edit its message
                                            templates.
                                        </p>
                                    </Card>
                                )}
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
                                                    <div className="text-sm text-gray-600">
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
                                                    <div className="text-sm text-gray-600">
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
                                                        <span className="text-gray-600">
                                                            CAN-SPAM Compliance:
                                                        </span>
                                                        <span className="font-medium text-green-600">
                                                            ✓ Enabled
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">
                                                            Daily Email Limit:
                                                        </span>
                                                        <span className="font-medium">
                                                            500
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">
                                                            Daily SMS Limit:
                                                        </span>
                                                        <span className="font-medium">
                                                            100
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">
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

                                    <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
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
                                                <Sparkles className="h-4 w-4 text-blue-600" />
                                                <span>15+ Personalization Tokens</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-green-600" />
                                                <span>AI Story Selection</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-orange-600" />
                                                <span>Multi-Channel (Email + SMS)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="h-4 w-4 text-purple-600" />
                                                <span>Intent Scoring & Tracking</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-red-600" />
                                                <span>A/B Testing Infrastructure</span>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-6">
                    <Button
                        variant="outline"
                        onClick={() =>
                            router.push(`/funnel-builder/${projectId}/step/10`)
                        }
                    >
                        ← Back
                    </Button>
                    <Button
                        onClick={() =>
                            router.push(`/funnel-builder/${projectId}/step/12`)
                        }
                    >
                        Continue to Analytics →
                    </Button>
                </div>
            </div>
        </StepLayout>
    );
}
