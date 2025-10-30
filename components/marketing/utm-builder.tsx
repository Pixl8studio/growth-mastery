/**
 * UTM Builder Component
 * Form component for building UTM tracking parameters
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Copy, RefreshCw, CheckCircle2 } from "lucide-react";

interface UTMBuilderProps {
    baseUrl: string;
    onUrlChange: (url: string) => void;
    defaultCampaign?: string;
    defaultSource?: string;
    defaultMedium?: string;
    defaultContent?: string;
}

export function UTMBuilder({
    baseUrl,
    onUrlChange,
    defaultCampaign = "",
    defaultSource = "social",
    defaultMedium = "organic",
    defaultContent = "",
}: UTMBuilderProps) {
    const { toast } = useToast();
    const [utmSource, setUtmSource] = useState(defaultSource);
    const [utmMedium, setUtmMedium] = useState(defaultMedium);
    const [utmCampaign, setUtmCampaign] = useState(defaultCampaign);
    const [utmContent, setUtmContent] = useState(defaultContent);
    const [autoGenerate, setAutoGenerate] = useState(true);
    const [copied, setCopied] = useState(false);

    const buildFinalUrl = () => {
        if (!baseUrl) return "";

        const params = new URLSearchParams();
        if (utmSource) params.append("utm_source", utmSource);
        if (utmMedium) params.append("utm_medium", utmMedium);
        if (utmCampaign) params.append("utm_campaign", utmCampaign);
        if (utmContent) params.append("utm_content", utmContent);

        const separator = baseUrl.includes("?") ? "&" : "?";
        return params.toString()
            ? `${baseUrl}${separator}${params.toString()}`
            : baseUrl;
    };

    const finalUrl = buildFinalUrl();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(finalUrl);
            setCopied(true);
            toast({
                title: "Copied to Clipboard",
                description: "URL with UTM parameters copied",
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast({
                title: "Copy Failed",
                description: "Unable to copy to clipboard",
                variant: "destructive",
            });
        }
    };

    const handleReset = () => {
        setUtmSource("social");
        setUtmMedium("organic");
        setUtmCampaign(defaultCampaign);
        setUtmContent("");
        toast({
            title: "Reset to Defaults",
            description: "UTM parameters have been reset",
        });
    };

    // Update parent when URL changes
    const handleUpdate = () => {
        onUrlChange(finalUrl);
    };

    return (
        <Card className="p-4">
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">UTM Parameters</Label>
                    <Button onClick={handleReset} variant="ghost" size="sm">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reset
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs mb-1 block">
                            Source <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={utmSource}
                            onChange={(e) => {
                                setUtmSource(e.target.value);
                                handleUpdate();
                            }}
                            placeholder="social"
                            className="h-8 text-sm"
                        />
                    </div>

                    <div>
                        <Label className="text-xs mb-1 block">
                            Medium <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={utmMedium}
                            onChange={(e) => {
                                setUtmMedium(e.target.value);
                                handleUpdate();
                            }}
                            placeholder="organic"
                            className="h-8 text-sm"
                        />
                    </div>

                    <div>
                        <Label className="text-xs mb-1 block">
                            Campaign <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={utmCampaign}
                            onChange={(e) => {
                                setUtmCampaign(e.target.value);
                                handleUpdate();
                            }}
                            placeholder="Q4_lead_gen"
                            className="h-8 text-sm"
                        />
                    </div>

                    <div>
                        <Label className="text-xs mb-1 block">Content</Label>
                        <Input
                            value={utmContent}
                            onChange={(e) => {
                                setUtmContent(e.target.value);
                                handleUpdate();
                            }}
                            placeholder="variant_a"
                            className="h-8 text-sm"
                        />
                    </div>
                </div>

                <div className="pt-2 border-t">
                    <Label className="text-xs mb-2 block">Final URL</Label>
                    <div className="flex gap-2">
                        <Input
                            value={finalUrl}
                            readOnly
                            className="h-8 text-xs bg-gray-50 font-mono"
                        />
                        <Button
                            onClick={handleCopy}
                            variant="outline"
                            size="sm"
                            className="h-8"
                        >
                            {copied ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                                <Copy className="h-3 w-3" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Use this URL in your social posts to track campaign performance
                    </p>
                </div>
            </div>
        </Card>
    );
}
