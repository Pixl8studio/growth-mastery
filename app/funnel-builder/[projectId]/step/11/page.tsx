/**
 * Step 11: AI Follow-Up Engine
 *
 * Configure AI-powered post-webinar follow-up automation.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "@/components/funnel/step-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { Sparkles, Mail, BookOpen, Settings } from "lucide-react";

export default function Step11Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const router = useRouter();
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [followupEnabled, setFollowupEnabled] = useState(false);
    const [agentConfig, setAgentConfig] = useState({
        name: "Main Follow-Up Agent",
        tone: "conversational",
        personality: "helpful",
        empathy_level: "moderate",
        urgency_level: "gentle",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    const handleEnableFollowup = async (enabled: boolean) => {
        setFollowupEnabled(enabled);

        if (enabled) {
            toast({
                title: "✨ AI Follow-Up Enabled",
                description:
                    "Configure your agent below to start automating follow-ups",
            });
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);

        try {
            const response = await fetch("/api/followup/agent-configs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    funnel_project_id: projectId,
                    name: agentConfig.name,
                    voice_config: {
                        tone: agentConfig.tone,
                        personality: agentConfig.personality,
                        empathy_level: agentConfig.empathy_level,
                        urgency_level: agentConfig.urgency_level,
                    },
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "✅ Configuration Saved",
                    description: "Your AI follow-up settings have been saved",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to save agent config");
            toast({
                title: "Error",
                description: "Failed to save configuration",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <StepLayout
            stepTitle="AI Follow-Up Engine"
            stepDescription="Automate post-webinar engagement"
            currentStep={11}
            projectId={projectId}
        >
            <div className="space-y-6">
                {/* Enable/Disable Section */}
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-6 w-6 text-blue-500" />
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Enable AI Follow-Up
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Automatically nurture prospects with personalized
                                    sequences
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={followupEnabled}
                            onCheckedChange={handleEnableFollowup}
                        />
                    </div>
                </Card>

                {followupEnabled && (
                    <>
                        <Tabs defaultValue="agent" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="agent">
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Agent
                                </TabsTrigger>
                                <TabsTrigger value="sequences">
                                    <Mail className="h-4 w-4 mr-2" />
                                    Sequences
                                </TabsTrigger>
                                <TabsTrigger value="settings">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Settings
                                </TabsTrigger>
                            </TabsList>

                            {/* Agent Configuration */}
                            <TabsContent value="agent" className="space-y-4 mt-4">
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">
                                        AI Agent Personality
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <Label>Agent Name</Label>
                                            <Input
                                                value={agentConfig.name}
                                                onChange={(e) =>
                                                    setAgentConfig({
                                                        ...agentConfig,
                                                        name: e.target.value,
                                                    })
                                                }
                                                placeholder="Main Follow-Up Agent"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Tone</Label>
                                                <select
                                                    value={agentConfig.tone}
                                                    onChange={(e) =>
                                                        setAgentConfig({
                                                            ...agentConfig,
                                                            tone: e.target.value,
                                                        })
                                                    }
                                                    className="w-full border rounded p-2"
                                                >
                                                    <option value="conversational">
                                                        Conversational
                                                    </option>
                                                    <option value="professional">
                                                        Professional
                                                    </option>
                                                    <option value="casual">
                                                        Casual
                                                    </option>
                                                </select>
                                            </div>

                                            <div>
                                                <Label>Personality</Label>
                                                <select
                                                    value={agentConfig.personality}
                                                    onChange={(e) =>
                                                        setAgentConfig({
                                                            ...agentConfig,
                                                            personality: e.target.value,
                                                        })
                                                    }
                                                    className="w-full border rounded p-2"
                                                >
                                                    <option value="helpful">
                                                        Helpful
                                                    </option>
                                                    <option value="friendly">
                                                        Friendly
                                                    </option>
                                                    <option value="expert">
                                                        Expert
                                                    </option>
                                                </select>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleSaveConfig}
                                            disabled={saving}
                                        >
                                            {saving
                                                ? "Saving..."
                                                : "Save Configuration"}
                                        </Button>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* Sequences */}
                            <TabsContent value="sequences" className="mt-4">
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">
                                        Message Sequences
                                    </h3>
                                    <div className="border rounded p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-semibold">
                                                    3-Day Discount Sequence
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    Default automated sequence
                                                </p>
                                            </div>
                                            <Badge>Active</Badge>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <div>📨 5 touches (4 Email + 1 SMS)</div>
                                            <div>⏰ 72 hours duration</div>
                                            <div>🎯 Targets: Sampler, Engaged, Hot</div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* Settings */}
                            <TabsContent value="settings" className="mt-4">
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
                                            <div className="text-sm space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">
                                                        CAN-SPAM Compliance:
                                                    </span>
                                                    <Badge variant="default">
                                                        Enabled
                                                    </Badge>
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
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        {/* Features Highlight */}
                        <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
                            <h3 className="text-lg font-semibold mb-4">
                                AI Follow-Up Features
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>✨ 5-Segment Auto-Categorization</div>
                                <div>💬 15+ Personalization Tokens</div>
                                <div>🤖 AI Story Selection</div>
                                <div>📧 Multi-Channel (Email + SMS)</div>
                            </div>
                        </Card>
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
