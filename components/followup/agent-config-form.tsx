/**
 * Agent Configuration Form Component
 *
 * Comprehensive form for configuring AI follow-up agent settings including
 * voice, personality, knowledge base, and scoring rules.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, Target, Sparkles } from "lucide-react";

interface AgentConfig {
    name: string;
    voice_config: {
        tone: string;
        personality: string;
        empathy_level: string;
        urgency_level: string;
    };
    knowledge_base: Record<string, unknown>;
    scoring_rules: Record<string, unknown>;
}

interface AgentConfigFormProps {
    config: AgentConfig | null;
    onSave: (config: AgentConfig) => Promise<void>;
    saving?: boolean;
}

export function AgentConfigForm({ config, onSave, saving }: AgentConfigFormProps) {
    const [formData, setFormData] = useState<AgentConfig>(
        config || {
            name: "Main Follow-Up Agent",
            voice_config: {
                tone: "conversational",
                personality: "helpful",
                empathy_level: "moderate",
                urgency_level: "gentle",
            },
            knowledge_base: {},
            scoring_rules: {},
        }
    );

    const handleSave = async () => {
        await onSave(formData);
    };

    return (
        <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold">AI Agent Configuration</h3>
            </div>

            <Tabs defaultValue="voice" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="voice">
                        <Brain className="h-4 w-4 mr-2" />
                        Voice
                    </TabsTrigger>
                    <TabsTrigger value="knowledge">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Knowledge
                    </TabsTrigger>
                    <TabsTrigger value="scoring">
                        <Target className="h-4 w-4 mr-2" />
                        Scoring
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Preview
                    </TabsTrigger>
                </TabsList>

                {/* Voice Configuration */}
                <TabsContent value="voice" className="space-y-4 mt-4">
                    <div>
                        <Label>Agent Name</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="Main Follow-Up Agent"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Tone</Label>
                            <select
                                value={formData.voice_config.tone}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        voice_config: {
                                            ...formData.voice_config,
                                            tone: e.target.value,
                                        },
                                    })
                                }
                                className="w-full border rounded p-2"
                            >
                                <option value="conversational">Conversational</option>
                                <option value="professional">Professional</option>
                                <option value="casual">Casual</option>
                                <option value="formal">Formal</option>
                                <option value="friendly">Friendly</option>
                            </select>
                        </div>

                        <div>
                            <Label>Personality</Label>
                            <select
                                value={formData.voice_config.personality}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        voice_config: {
                                            ...formData.voice_config,
                                            personality: e.target.value,
                                        },
                                    })
                                }
                                className="w-full border rounded p-2"
                            >
                                <option value="helpful">Helpful</option>
                                <option value="friendly">Friendly</option>
                                <option value="expert">Expert</option>
                                <option value="enthusiastic">Enthusiastic</option>
                                <option value="consultative">Consultative</option>
                            </select>
                        </div>

                        <div>
                            <Label>Empathy Level</Label>
                            <select
                                value={formData.voice_config.empathy_level}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        voice_config: {
                                            ...formData.voice_config,
                                            empathy_level: e.target.value,
                                        },
                                    })
                                }
                                className="w-full border rounded p-2"
                            >
                                <option value="low">Low</option>
                                <option value="moderate">Moderate</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div>
                            <Label>Urgency Level</Label>
                            <select
                                value={formData.voice_config.urgency_level}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        voice_config: {
                                            ...formData.voice_config,
                                            urgency_level: e.target.value,
                                        },
                                    })
                                }
                                className="w-full border rounded p-2"
                            >
                                <option value="gentle">Gentle</option>
                                <option value="moderate">Moderate</option>
                                <option value="strong">Strong</option>
                            </select>
                        </div>
                    </div>
                </TabsContent>

                {/* Knowledge Base */}
                <TabsContent value="knowledge" className="space-y-4 mt-4">
                    <div>
                        <Label>Brand Voice Guidelines</Label>
                        <Textarea
                            placeholder="Describe your brand's voice and communication style..."
                            rows={4}
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Product/Service Knowledge</Label>
                        <Textarea
                            placeholder="Key facts about your product/service that the AI should know..."
                            rows={4}
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Common Objection Responses</Label>
                        <Textarea
                            placeholder="How should the AI handle common objections like price, timing, etc.?"
                            rows={4}
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Do Not Mention (Blacklist)</Label>
                        <Textarea
                            placeholder="Topics or phrases the AI should avoid..."
                            rows={2}
                            className="mt-2"
                        />
                    </div>
                </TabsContent>

                {/* Scoring Rules */}
                <TabsContent value="scoring" className="space-y-4 mt-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Configure how prospect intent scores are calculated and
                        weighted.
                    </p>

                    <div>
                        <Label>Watch Percentage Weight</Label>
                        <Input type="number" min="0" max="100" defaultValue="30" />
                        <p className="text-xs text-gray-500 mt-1">
                            How much weight to give webinar watch percentage (0-100)
                        </p>
                    </div>

                    <div>
                        <Label>Offer Click Weight</Label>
                        <Input type="number" min="0" max="100" defaultValue="40" />
                        <p className="text-xs text-gray-500 mt-1">
                            How much weight to give clicking on offer CTAs
                        </p>
                    </div>

                    <div>
                        <Label>Email Engagement Weight</Label>
                        <Input type="number" min="0" max="100" defaultValue="20" />
                        <p className="text-xs text-gray-500 mt-1">
                            How much weight to give email opens and clicks
                        </p>
                    </div>

                    <div>
                        <Label>Reply Weight</Label>
                        <Input type="number" min="0" max="100" defaultValue="50" />
                        <p className="text-xs text-gray-500 mt-1">
                            How much weight to give direct replies to messages
                        </p>
                    </div>

                    <div className="pt-4 border-t">
                        <Label>Segmentation Thresholds</Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                                <Badge variant="secondary">Hot (75-100)</Badge>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    defaultValue="75"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Badge variant="secondary">Engaged (50-74)</Badge>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    defaultValue="50"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Badge variant="secondary">Sampler (25-49)</Badge>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    defaultValue="25"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Badge variant="secondary">Skimmer (1-24)</Badge>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    defaultValue="1"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Preview */}
                <TabsContent value="preview" className="mt-4">
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <h4 className="font-semibold mb-3">Agent Summary</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Name:</span>
                                <span className="font-medium">{formData.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tone:</span>
                                <Badge>{formData.voice_config.tone}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Personality:</span>
                                <Badge>{formData.voice_config.personality}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Empathy:</span>
                                <Badge>{formData.voice_config.empathy_level}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Urgency:</span>
                                <Badge>{formData.voice_config.urgency_level}</Badge>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-white rounded border border-blue-200">
                            <p className="text-sm font-medium mb-2">
                                Sample Message Preview:
                            </p>
                            <p className="text-sm text-gray-700 italic">
                                "Hey [First Name]! I noticed you watched [watch %]% of
                                the webinar. Based on what you shared about [challenge],
                                I think you'll love [offer name]..."
                            </p>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="px-6">
                    {saving ? "Saving..." : "Save Agent Configuration"}
                </Button>
            </div>
        </Card>
    );
}
