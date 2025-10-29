/**
 * Agent Configuration Form Component
 *
 * Comprehensive form for configuring AI follow-up agent settings including
 * voice, personality, knowledge base, and scoring rules.
 */

"use client";

import { useState, useEffect } from "react";
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
    scoring_config: {
        watch_weight?: number;
        offer_click_weight?: number;
        email_engagement_weight?: number;
        reply_weight?: number;
        hot_threshold?: number;
        engaged_threshold?: number;
        sampler_threshold?: number;
        skimmer_threshold?: number;
    };
}

interface AgentConfigFormProps {
    config: AgentConfig | null;
    onSave: (config: AgentConfig) => Promise<void>;
    saving?: boolean;
}

export function AgentConfigForm({ config, onSave, saving }: AgentConfigFormProps) {
    const [formData, setFormData] = useState<AgentConfig>(() => {
        if (config) {
            return {
                ...config,
                knowledge_base:
                    typeof config.knowledge_base === "object" &&
                    config.knowledge_base !== null
                        ? config.knowledge_base
                        : {
                              brand_voice: "",
                              product_knowledge: "",
                              objection_responses: "",
                              blacklist_topics: "",
                          },
                scoring_config:
                    typeof config.scoring_config === "object" &&
                    config.scoring_config !== null
                        ? config.scoring_config
                        : {
                              watch_weight: 45,
                              offer_click_weight: 25,
                              email_engagement_weight: 5,
                              reply_weight: 15,
                              hot_threshold: 75,
                              engaged_threshold: 50,
                              sampler_threshold: 25,
                              skimmer_threshold: 1,
                          },
            };
        }
        return {
            name: "Main Follow-Up Agent",
            voice_config: {
                tone: "conversational",
                personality: "helpful",
                empathy_level: "moderate",
                urgency_level: "gentle",
            },
            knowledge_base: {
                brand_voice: "",
                product_knowledge: "",
                objection_responses: "",
                blacklist_topics: "",
            },
            scoring_config: {
                watch_weight: 45,
                offer_click_weight: 25,
                email_engagement_weight: 5,
                reply_weight: 15,
                hot_threshold: 75,
                engaged_threshold: 50,
                sampler_threshold: 25,
                skimmer_threshold: 1,
            },
        };
    });

    // Update formData when config prop changes
    useEffect(() => {
        if (config) {
            setFormData({
                ...config,
                knowledge_base:
                    typeof config.knowledge_base === "object" &&
                    config.knowledge_base !== null
                        ? config.knowledge_base
                        : {
                              brand_voice: "",
                              product_knowledge: "",
                              objection_responses: "",
                              blacklist_topics: "",
                          },
                scoring_config:
                    typeof config.scoring_config === "object" &&
                    config.scoring_config !== null
                        ? config.scoring_config
                        : {
                              watch_weight: 45,
                              offer_click_weight: 25,
                              email_engagement_weight: 5,
                              reply_weight: 15,
                              hot_threshold: 75,
                              engaged_threshold: 50,
                              sampler_threshold: 25,
                              skimmer_threshold: 1,
                          },
            });
        }
    }, [config]);

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
                <TabsList className="grid w-full grid-cols-5">
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
                    <TabsTrigger value="sender">📧 Sender</TabsTrigger>
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
                            value={
                                typeof formData.knowledge_base === "object" &&
                                formData.knowledge_base !== null
                                    ? (formData.knowledge_base.brand_voice as string) ||
                                      ""
                                    : ""
                            }
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    knowledge_base: {
                                        ...formData.knowledge_base,
                                        brand_voice: e.target.value,
                                    },
                                })
                            }
                            placeholder="Describe your brand's voice and communication style..."
                            rows={4}
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Product/Service Knowledge</Label>
                        <Textarea
                            value={
                                typeof formData.knowledge_base === "object" &&
                                formData.knowledge_base !== null
                                    ? (formData.knowledge_base
                                          .product_knowledge as string) || ""
                                    : ""
                            }
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    knowledge_base: {
                                        ...formData.knowledge_base,
                                        product_knowledge: e.target.value,
                                    },
                                })
                            }
                            placeholder="Key facts about your product/service that the AI should know..."
                            rows={4}
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Common Objection Responses</Label>
                        <Textarea
                            value={
                                typeof formData.knowledge_base === "object" &&
                                formData.knowledge_base !== null
                                    ? (formData.knowledge_base
                                          .objection_responses as string) || ""
                                    : ""
                            }
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    knowledge_base: {
                                        ...formData.knowledge_base,
                                        objection_responses: e.target.value,
                                    },
                                })
                            }
                            placeholder="How should the AI handle common objections like price, timing, etc.?"
                            rows={4}
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>Do Not Mention (Blacklist)</Label>
                        <Textarea
                            value={
                                typeof formData.knowledge_base === "object" &&
                                formData.knowledge_base !== null
                                    ? (formData.knowledge_base
                                          .blacklist_topics as string) || ""
                                    : ""
                            }
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    knowledge_base: {
                                        ...formData.knowledge_base,
                                        blacklist_topics: e.target.value,
                                    },
                                })
                            }
                            placeholder="Topics or phrases the AI should avoid..."
                            rows={2}
                            className="mt-2"
                        />
                    </div>
                </TabsContent>

                {/* Scoring Configuration */}
                <TabsContent value="scoring" className="space-y-4 mt-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Configure how prospect intent scores are calculated and
                        weighted.
                    </p>

                    <div>
                        <Label>Watch Percentage Weight</Label>
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.scoring_config?.watch_weight ?? 45}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    scoring_config: {
                                        ...formData.scoring_config,
                                        watch_weight: parseInt(e.target.value) || 0,
                                    },
                                })
                            }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            How much weight to give webinar watch percentage (0-100)
                        </p>
                    </div>

                    <div>
                        <Label>Offer Click Weight</Label>
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.scoring_config?.offer_click_weight ?? 25}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    scoring_config: {
                                        ...formData.scoring_config,
                                        offer_click_weight:
                                            parseInt(e.target.value) || 0,
                                    },
                                })
                            }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            How much weight to give clicking on offer CTAs
                        </p>
                    </div>

                    <div>
                        <Label>Email Engagement Weight</Label>
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={
                                formData.scoring_config?.email_engagement_weight ?? 5
                            }
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    scoring_config: {
                                        ...formData.scoring_config,
                                        email_engagement_weight:
                                            parseInt(e.target.value) || 0,
                                    },
                                })
                            }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            How much weight to give email opens and clicks
                        </p>
                    </div>

                    <div>
                        <Label>Reply Weight</Label>
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.scoring_config?.reply_weight ?? 15}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    scoring_config: {
                                        ...formData.scoring_config,
                                        reply_weight: parseInt(e.target.value) || 0,
                                    },
                                })
                            }
                        />
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
                                    value={formData.scoring_config?.hot_threshold ?? 75}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            scoring_config: {
                                                ...formData.scoring_config,
                                                hot_threshold:
                                                    parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Badge variant="secondary">Engaged (50-74)</Badge>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                        formData.scoring_config?.engaged_threshold ?? 50
                                    }
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            scoring_config: {
                                                ...formData.scoring_config,
                                                engaged_threshold:
                                                    parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Badge variant="secondary">Sampler (25-49)</Badge>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                        formData.scoring_config?.sampler_threshold ?? 25
                                    }
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            scoring_config: {
                                                ...formData.scoring_config,
                                                sampler_threshold:
                                                    parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Badge variant="secondary">Skimmer (1-24)</Badge>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                        formData.scoring_config?.skimmer_threshold ?? 1
                                    }
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            scoring_config: {
                                                ...formData.scoring_config,
                                                skimmer_threshold:
                                                    parseInt(e.target.value) || 0,
                                            },
                                        })
                                    }
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Sender Configuration */}
                <TabsContent value="sender" className="space-y-4 mt-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Configure sender identity and Twilio SMS integration for
                        follow-up messages.
                    </p>

                    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                            📧 Email Sender Identity
                        </h4>

                        <div>
                            <Label>From Name</Label>
                            <Input
                                type="text"
                                placeholder="Your Name or Company"
                                className="mt-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                The name that appears in the "From" field of emails
                            </p>
                        </div>

                        <div>
                            <Label>From Email</Label>
                            <Input
                                type="email"
                                placeholder="noreply@yourdomain.com"
                                className="mt-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Must be a verified domain.{" "}
                                <a href="#" className="text-blue-600 hover:underline">
                                    Learn about DNS setup →
                                </a>
                            </p>
                        </div>

                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800">
                                ⚠️ <strong>Domain Verification Required:</strong> Before
                                sending emails, you need to verify your domain by adding
                                SPF, DKIM, and DMARC records to your DNS settings.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                            📱 Twilio SMS Configuration
                        </h4>

                        <div>
                            <Label>Twilio Account SID</Label>
                            <Input
                                type="text"
                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="mt-2 font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Find this in your{" "}
                                <a
                                    href="https://console.twilio.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-600 hover:underline"
                                >
                                    Twilio Console
                                </a>
                            </p>
                        </div>

                        <div>
                            <Label>Twilio Auth Token</Label>
                            <Input
                                type="password"
                                placeholder="••••••••••••••••••••••••••••••••"
                                className="mt-2 font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Keep this secret - never share your auth token
                            </p>
                        </div>

                        <div>
                            <Label>Twilio Phone Number</Label>
                            <Input
                                type="tel"
                                placeholder="+1 234 567 8900"
                                className="mt-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Your Twilio phone number in E.164 format (e.g.,
                                +12345678900)
                            </p>
                        </div>

                        <Button variant="outline" className="w-full">
                            Test Connection
                        </Button>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm text-blue-800">
                                💡 <strong>Don't have Twilio yet?</strong> Sign up at{" "}
                                <a
                                    href="https://www.twilio.com/try-twilio"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                >
                                    twilio.com
                                </a>{" "}
                                to get started with SMS messaging.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">
                            📋 Quick Setup Checklist
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">□</span>
                                <span>
                                    Configure email sender identity (name & email)
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">□</span>
                                <span>
                                    Verify your email domain with SPF/DKIM/DMARC records
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">□</span>
                                <span>
                                    Add Twilio credentials (Account SID, Auth Token,
                                    Phone Number)
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">□</span>
                                <span>
                                    Test connection to verify credentials work correctly
                                </span>
                            </li>
                        </ul>
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
