/**
 * Marketing Settings
 * Manage social connections, publishing preferences, and compliance
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { CheckCircle2, XCircle } from "lucide-react";

interface MarketingSettingsProps {
    funnelProjectId: string;
    profileId: string;
}

export function MarketingSettings({
    funnelProjectId,
    profileId,
}: MarketingSettingsProps) {
    const { toast } = useToast();
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [defaultSpace, setDefaultSpace] = useState<"sandbox" | "production">(
        "sandbox"
    );
    const [autoPublish, setAutoPublish] = useState(false);

    useEffect(() => {
        loadConnections();
    }, [funnelProjectId]);

    const loadConnections = async () => {
        setLoading(true);

        try {
            const supabase = (await import("@/lib/supabase/client")).createClient();

            const { data, error } = await supabase
                .from("funnel_social_connections")
                .select("*")
                .eq("funnel_project_id", funnelProjectId)
                .eq("is_active", true);

            if (!error && data) {
                setConnections(data);
                logger.info({ count: data.length }, "Connections loaded");
            }
        } catch (error) {
            logger.error({ error }, "Failed to load connections");
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (platform: string) => {
        try {
            const response = await fetch(
                `/api/funnel/${funnelProjectId}/integrations/${platform}/connect`
            );

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No authorization URL returned");
            }
        } catch (error) {
            logger.error({ error, platform }, "Failed to initiate connection");
            toast({
                title: "Connection Failed",
                description: `Unable to connect to ${platform}`,
                variant: "destructive",
            });
        }
    };

    const handleDisconnect = async (provider: string) => {
        try {
            const response = await fetch(
                `/api/funnel/${funnelProjectId}/integrations/disconnect`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ provider }),
                }
            );

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Disconnected",
                    description: `${provider} has been disconnected`,
                });
                loadConnections();
            }
        } catch (error) {
            logger.error({ error, provider }, "Failed to disconnect");
            toast({
                title: "Disconnection Failed",
                description: "Unable to disconnect",
                variant: "destructive",
            });
        }
    };

    const isConnected = (platform: string) => {
        return connections.some((c) => c.provider === platform);
    };

    const getConnection = (platform: string) => {
        return connections.find((c) => c.provider === platform);
    };

    const platforms = [
        { id: "instagram", name: "Instagram", icon: "📸", color: "pink" },
        { id: "facebook", name: "Facebook", icon: "👍", color: "blue" },
        { id: "linkedin", name: "LinkedIn", icon: "💼", color: "blue" },
        { id: "twitter", name: "Twitter/X", icon: "🐦", color: "sky" },
    ];

    return (
        <div className="space-y-6">
            {/* Platform Connections */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Platform Connections</h3>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">
                        Loading connections...
                    </div>
                ) : (
                    <div className="space-y-4">
                        {platforms.map((platform) => {
                            const connected = isConnected(platform.id);
                            const connection = getConnection(platform.id);

                            return (
                                <div
                                    key={platform.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">
                                            {platform.icon}
                                        </span>
                                        <div>
                                            <div className="font-medium">
                                                {platform.name}
                                            </div>
                                            {connected && connection && (
                                                <div className="text-sm text-gray-600">
                                                    Connected as{" "}
                                                    {connection.account_name}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {connected ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                <Button
                                                    onClick={() =>
                                                        handleDisconnect(platform.id)
                                                    }
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Disconnect
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-5 w-5 text-gray-400" />
                                                <Button
                                                    onClick={() =>
                                                        handleConnect(platform.id)
                                                    }
                                                    size="sm"
                                                >
                                                    Connect
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Publishing Preferences */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Publishing Preferences</h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">Default Space</div>
                            <div className="text-sm text-gray-600">
                                Where new content is created by default
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setDefaultSpace("sandbox")}
                                variant={
                                    defaultSpace === "sandbox" ? "default" : "outline"
                                }
                                size="sm"
                            >
                                Sandbox
                            </Button>
                            <Button
                                onClick={() => setDefaultSpace("production")}
                                variant={
                                    defaultSpace === "production"
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                            >
                                Production
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                            <div className="font-medium">Auto-Publish</div>
                            <div className="text-sm text-gray-600">
                                Automatically publish scheduled posts without manual
                                approval
                            </div>
                        </div>
                        <Switch
                            checked={autoPublish}
                            onCheckedChange={setAutoPublish}
                        />
                    </div>
                </div>
            </Card>

            {/* Compliance Settings */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Compliance & Safety</h3>

                <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div className="font-medium text-green-900">
                                Compliance Enabled
                            </div>
                        </div>
                        <div className="text-sm text-green-800 space-y-1">
                            <div>✓ Automatic disclaimer detection</div>
                            <div>✓ Alt text enforcement</div>
                            <div>✓ Reading level validation (Grade 8 max)</div>
                            <div>✓ Copyright and licensing checks</div>
                        </div>
                    </div>

                    <div>
                        <div className="text-sm font-medium mb-2">
                            Industry-Specific Disclaimers
                        </div>
                        <div className="text-sm text-gray-600">
                            Automatic disclaimers are added when content includes
                            health, finance, or coaching claims.
                        </div>
                    </div>
                </div>
            </Card>

            {/* Usage Limits */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Usage & Limits</h3>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">Monthly Post Limit</span>
                            <span className="font-medium">Unlimited (Pro+)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full w-1/4"></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                            25 posts this month
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <div className="font-medium text-blue-900 mb-1">
                            Soft Warnings Only
                        </div>
                        <div className="text-blue-800">
                            No hard stops. We'll notify you when approaching limits but
                            never block your content.
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
