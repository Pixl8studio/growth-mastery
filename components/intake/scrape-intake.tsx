"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/client-logger";
import { useToast } from "@/components/ui/use-toast";
import { Globe, ExternalLink, Palette, ArrowRight } from "lucide-react";

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
    confidence: {
        colors: number;
        fonts: number;
        overall: number;
    };
}

interface ScrapeIntakeProps {
    projectId: string;
    userId: string;
    onComplete?: () => void;
}

export function ScrapeIntake({ projectId, userId, onComplete }: ScrapeIntakeProps) {
    const [url, setUrl] = useState("");
    const [sessionName, setSessionName] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [brandData, setBrandData] = useState<BrandData | null>(null);
    const { toast } = useToast();

    const validateUrl = (urlString: string): boolean => {
        try {
            const parsedUrl = new URL(urlString);
            return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        } catch {
            return false;
        }
    };

    const handleScrape = async () => {
        if (!validateUrl(url)) {
            toast({
                title: "Invalid URL",
                description: "Please enter a valid HTTP or HTTPS URL.",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        setPreview(null);
        setBrandData(null);

        try {
            const response = await fetch("/api/intake/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    userId,
                    url,
                    sessionName: sessionName.trim() || new URL(url).hostname,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to scrape URL");
            }

            logger.info(
                {
                    intakeId: data.intakeId,
                    url,
                    hasBrandData: !!data.brandData,
                },
                "URL scraped successfully"
            );

            toast({
                title: "Content imported!",
                description: data.brandData
                    ? "Website content and brand colors extracted successfully."
                    : "Website content has been scraped successfully.",
            });

            setPreview(data.preview);
            setBrandData(data.brandData || null);
            setUrl("");
            setSessionName("");

            if (onComplete) {
                setTimeout(() => onComplete(), 1500);
            }
        } catch (error) {
            logger.error({ error, url }, "Failed to scrape URL");
            toast({
                title: "Scraping failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to scrape website. Please check the URL and try again.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        Scrape Website Content
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Import content from your enrollment page, landing page, or
                        website
                    </p>
                </div>

                {/* Session Name */}
                <div>
                    <label
                        htmlFor="sessionName"
                        className="block text-sm font-medium text-foreground"
                    >
                        Session Name (optional)
                    </label>
                    <input
                        type="text"
                        id="sessionName"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="e.g., Sales Page Copy"
                        className="mt-1 block w-full rounded-md border border-border px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                    />
                </div>

                {/* URL Input */}
                <div>
                    <label
                        htmlFor="url"
                        className="block text-sm font-medium text-foreground"
                    >
                        Website URL <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1">
                        <Globe className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="url"
                            id="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/your-page"
                            className="block w-full rounded-md border border-border py-2 pl-10 pr-3 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                        />
                    </div>
                    {url && validateUrl(url) && (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center text-xs text-primary hover:text-primary"
                        >
                            Preview in new tab
                            <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                    )}
                </div>

                {/* Scrape Button */}
                <Button
                    onClick={handleScrape}
                    disabled={!url || isProcessing}
                    className="w-full"
                    size="lg"
                >
                    {isProcessing ? (
                        <>
                            <span className="mr-2">Scraping...</span>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        </>
                    ) : (
                        "Scrape and Import"
                    )}
                </Button>

                {/* Preview */}
                {preview && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <h4 className="mb-2 flex items-center text-sm font-semibold text-green-900">
                            ✅ Preview
                        </h4>
                        <p className="text-sm text-green-800">{preview}</p>
                    </div>
                )}

                {/* Brand Data Preview */}
                {brandData && (
                    <Card className="border-primary/20 bg-primary/5 p-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="flex items-center text-base font-semibold text-primary">
                                        <Palette className="mr-2 h-5 w-5" />
                                        Brand Colors Extracted
                                    </h4>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Confidence: {brandData.confidence.overall}% •{" "}
                                        {brandData.fonts.primary
                                            ? `Font: ${brandData.fonts.primary}`
                                            : ""}
                                    </p>
                                </div>
                                <a
                                    href={`/funnel-builder/${projectId}/step/3`}
                                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                                >
                                    Use in Step 3
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            </div>

                            {/* Color Palette */}
                            <div className="grid grid-cols-5 gap-2">
                                <div className="space-y-1">
                                    <div
                                        className="h-16 w-full rounded-lg border-2 border-white shadow-sm"
                                        style={{ backgroundColor: brandData.colors.primary }}
                                    />
                                    <p className="text-center text-xs font-medium text-foreground">
                                        Primary
                                    </p>
                                    <p className="text-center text-xs text-muted-foreground">
                                        {brandData.colors.primary}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <div
                                        className="h-16 w-full rounded-lg border-2 border-white shadow-sm"
                                        style={{ backgroundColor: brandData.colors.secondary }}
                                    />
                                    <p className="text-center text-xs font-medium text-foreground">
                                        Secondary
                                    </p>
                                    <p className="text-center text-xs text-muted-foreground">
                                        {brandData.colors.secondary}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <div
                                        className="h-16 w-full rounded-lg border-2 border-white shadow-sm"
                                        style={{ backgroundColor: brandData.colors.accent }}
                                    />
                                    <p className="text-center text-xs font-medium text-foreground">
                                        Accent
                                    </p>
                                    <p className="text-center text-xs text-muted-foreground">
                                        {brandData.colors.accent}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <div
                                        className="h-16 w-full rounded-lg border-2 border-border shadow-sm"
                                        style={{ backgroundColor: brandData.colors.background }}
                                    />
                                    <p className="text-center text-xs font-medium text-foreground">
                                        Background
                                    </p>
                                    <p className="text-center text-xs text-muted-foreground">
                                        {brandData.colors.background}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <div
                                        className="h-16 w-full rounded-lg border-2 border-border shadow-sm"
                                        style={{ backgroundColor: brandData.colors.text }}
                                    />
                                    <p className="text-center text-xs font-medium text-foreground">
                                        Text
                                    </p>
                                    <p className="text-center text-xs text-muted-foreground">
                                        {brandData.colors.text}
                                    </p>
                                </div>
                            </div>

                            {/* Sample Preview */}
                            <div
                                className="rounded-lg border p-4"
                                style={{
                                    backgroundColor: brandData.colors.background,
                                    borderColor: brandData.colors.primary,
                                }}
                            >
                                <h5
                                    className="mb-2 text-lg font-bold"
                                    style={{ color: brandData.colors.primary }}
                                >
                                    Sample Heading
                                </h5>
                                <p
                                    className="mb-3 text-sm"
                                    style={{ color: brandData.colors.text }}
                                >
                                    This is how your brand colors will look together. These
                                    colors were automatically extracted from your website and can
                                    be used in Step 3 (Brand Design).
                                </p>
                                <button
                                    className="rounded px-4 py-2 text-sm font-medium"
                                    style={{
                                        backgroundColor: brandData.colors.primary,
                                        color: brandData.colors.background,
                                    }}
                                >
                                    Call to Action
                                </button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Help Text */}
                <div className="rounded-lg bg-primary/5 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-primary">💡 Tips</h4>
                    <ul className="space-y-1 text-sm text-primary">
                        <li>
                            • Works best with enrollment pages, sales pages, or landing
                            pages
                        </li>
                        <li>
                            • We automatically extract brand colors and fonts from your
                            website
                        </li>
                        <li>
                            • Make sure the page is publicly accessible (no login
                            required)
                        </li>
                        <li>
                            • You can scrape multiple pages by repeating this process
                        </li>
                        <li>
                            • Extracted brand colors can be used directly in Step 3 (Brand
                            Design)
                        </li>
                    </ul>
                </div>
            </div>
        </Card>
    );
}
