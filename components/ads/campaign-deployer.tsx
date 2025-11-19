"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, Users, DollarSign, Sparkles, CheckCircle } from "lucide-react";
import type { AdVariation } from "@/types/ads";

interface CampaignDeployerProps {
    adAccountId: string;
    variations: AdVariation[];
    audienceConfig: any;
    dailyBudget: number;
    onDeploy: () => void;
    deploying: boolean;
    deployed: boolean;
}

export function CampaignDeployer({
    adAccountId,
    variations,
    audienceConfig,
    dailyBudget,
    onDeploy,
    deploying,
    deployed,
}: CampaignDeployerProps) {
    if (deployed) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Campaign Summary */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Campaign Summary</h3>
                    </div>

                    <Separator />

                    <div className="grid gap-4">
                        {/* Ad Account */}
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium">Ad Account</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {adAccountId}
                                </p>
                            </div>
                            <Badge variant="outline">Active</Badge>
                        </div>

                        {/* Objective */}
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium">
                                    Campaign Objective
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Lead Generation - Webinar Registrations
                                </p>
                            </div>
                        </div>

                        {/* Variations */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <p className="text-sm font-medium">
                                    Ad Variations ({variations.length})
                                </p>
                            </div>
                            <div className="space-y-2">
                                {variations.map((variation) => (
                                    <div
                                        key={variation.id}
                                        className="rounded-lg border bg-accent/50 p-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                Variation {variation.variation_number}
                                            </span>
                                            <Badge variant="secondary">
                                                {variation.framework}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {variation.primary_text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Audience */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-primary" />
                                <p className="text-sm font-medium">Target Audience</p>
                            </div>
                            <div className="rounded-lg border bg-accent/50 p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium capitalize">
                                        {audienceConfig.type} Targeting
                                    </span>
                                </div>
                                {audienceConfig.type === "interest" && (
                                    <p className="text-sm text-muted-foreground">
                                        {audienceConfig.description}
                                    </p>
                                )}
                                {audienceConfig.type === "lookalike" && (
                                    <p className="text-sm text-muted-foreground">
                                        Lookalike audience from:{" "}
                                        {audienceConfig.source_file}
                                    </p>
                                )}
                                <div className="mt-2 flex gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        United States
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        Ages 25-65
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Budget */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-4 w-4 text-primary" />
                                <p className="text-sm font-medium">Budget & Spend</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg border bg-accent/50 p-3">
                                    <p className="text-xs text-muted-foreground">
                                        Daily
                                    </p>
                                    <p className="text-lg font-bold mt-1">
                                        ${(dailyBudget / 100).toFixed(2)}
                                    </p>
                                </div>
                                <div className="rounded-lg border bg-accent/50 p-3">
                                    <p className="text-xs text-muted-foreground">
                                        Weekly Est.
                                    </p>
                                    <p className="text-lg font-bold mt-1">
                                        ${((dailyBudget * 7) / 100).toFixed(2)}
                                    </p>
                                </div>
                                <div className="rounded-lg border bg-accent/50 p-3">
                                    <p className="text-xs text-muted-foreground">
                                        Monthly Est.
                                    </p>
                                    <p className="text-lg font-bold mt-1">
                                        ${((dailyBudget * 30) / 100).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* AI Optimization Notice */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm">
                                AI Optimization Enabled
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Once deployed, our AI will monitor performance every 12
                                hours and automatically optimize based on:
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                <li>
                                    • Pause underperforming ads (CPL &gt; 2x average)
                                </li>
                                <li>• Scale winning ads (CPL &lt; 0.5x average)</li>
                                <li>• Generate new variations when ads fatigue</li>
                                <li>• Expand audiences for high performers</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Deployment Info */}
            {!deployed && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                        <p className="text-sm text-orange-800">
                            <strong>Important:</strong> Once you launch this campaign,
                            ads will start running immediately and your daily budget
                            will be charged. You can pause or stop the campaign at any
                            time from the Analytics dashboard.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
