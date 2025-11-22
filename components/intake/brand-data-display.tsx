/**
 * Brand Data Display Component
 * Shows brand colors, fonts, and style information with visual swatches
 */

import { Card } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface BrandData {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    fonts: {
        primary?: string;
        secondary?: string;
        weights: string[];
    };
    style: {
        borderRadius?: string;
        shadows?: boolean;
        gradients?: boolean;
    };
    confidence: {
        colors: number;
        fonts: number;
        overall: number;
    };
}

interface BrandDataDisplayProps {
    brandData: BrandData | null;
}

export function BrandDataDisplay({ brandData }: BrandDataDisplayProps) {
    const [copiedColor, setCopiedColor] = useState<string | null>(null);

    if (!brandData) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                <p>No brand data available for this intake session.</p>
                <p className="mt-2 text-sm">
                    Brand data is automatically extracted from web scraping.
                </p>
            </div>
        );
    }

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedColor(id);
        setTimeout(() => setCopiedColor(null), 2000);
    };

    const getConfidenceBadge = (confidence: number) => {
        if (confidence >= 80)
            return (
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    High ({confidence}%)
                </span>
            );
        if (confidence >= 50)
            return (
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                    Medium ({confidence}%)
                </span>
            );
        return (
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                Low ({confidence}%)
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Overall Confidence */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-foreground">
                            Brand Extraction Confidence
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Overall quality of extracted brand data
                        </p>
                    </div>
                    {getConfidenceBadge(brandData.confidence.overall)}
                </div>
            </Card>

            {/* Colors */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                        Brand Colors
                    </h3>
                    {getConfidenceBadge(brandData.confidence.colors)}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(brandData.colors).map(([key, color]) => (
                        <Card key={key} className="p-4">
                            <div className="space-y-3">
                                {/* Color Label */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium capitalize text-foreground">
                                        {key}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(color, key)}
                                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        title="Copy hex code"
                                    >
                                        {copiedColor === key ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Color Swatch */}
                                <div
                                    className="h-20 w-full rounded-lg border-2 border-border shadow-sm"
                                    style={{ backgroundColor: color }}
                                />

                                {/* Hex Code */}
                                <div className="font-mono text-sm text-muted-foreground">
                                    {color}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Fonts */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                        Typography
                    </h3>
                    {getConfidenceBadge(brandData.confidence.fonts)}
                </div>

                <div className="space-y-4">
                    {/* Primary Font */}
                    {brandData.fonts.primary && (
                        <Card className="p-4">
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Primary Font
                                </div>
                                <div
                                    className="text-2xl font-semibold text-foreground"
                                    style={{ fontFamily: brandData.fonts.primary }}
                                >
                                    {brandData.fonts.primary}
                                </div>
                                <div className="font-mono text-sm text-muted-foreground">
                                    font-family: {brandData.fonts.primary}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Secondary Font */}
                    {brandData.fonts.secondary && (
                        <Card className="p-4">
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Secondary Font
                                </div>
                                <div
                                    className="text-2xl font-semibold text-foreground"
                                    style={{ fontFamily: brandData.fonts.secondary }}
                                >
                                    {brandData.fonts.secondary}
                                </div>
                                <div className="font-mono text-sm text-muted-foreground">
                                    font-family: {brandData.fonts.secondary}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Font Weights */}
                    {brandData.fonts.weights.length > 0 && (
                        <Card className="p-4">
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Font Weights Used
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {brandData.fonts.weights.map((weight, idx) => (
                                        <span
                                            key={idx}
                                            className="rounded-full bg-muted px-3 py-1 text-sm text-foreground"
                                        >
                                            {weight}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Style Properties */}
            <div>
                <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Design Style
                </h3>
                <Card className="p-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">
                                Border Radius
                            </div>
                            <div className="text-lg font-semibold text-foreground">
                                {brandData.style.borderRadius || "Not detected"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">
                                Shadows
                            </div>
                            <div className="text-lg font-semibold text-foreground">
                                {brandData.style.shadows ? "Yes" : "No"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">
                                Gradients
                            </div>
                            <div className="text-lg font-semibold text-foreground">
                                {brandData.style.gradients ? "Yes" : "No"}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
