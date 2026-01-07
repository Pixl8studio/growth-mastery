"use client";

/**
 * Publish Modal
 * Full publishing experience with URL, domain selection, and sharing options
 * Inspired by Lovable's publish interface
 */

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import {
    Globe,
    Copy,
    Check,
    ExternalLink,
    Settings,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/client-logger";

interface CustomDomain {
    id: string;
    domain: string;
    verified: boolean;
}

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    pageId: string;
    pageTitle: string;
    currentSlug?: string;
    currentStatus: "draft" | "published" | "saving";
    onPublish: (
        slug: string,
        domainId?: string
    ) => Promise<{ success: boolean; publishedUrl?: string }>;
    projectId: string;
}

export function PublishModal({
    isOpen,
    onClose,
    pageId: _pageId,
    pageTitle,
    currentSlug,
    currentStatus,
    onPublish,
    projectId: _projectId,
}: PublishModalProps) {
    const { toast } = useToast();
    const [slug, setSlug] = useState(currentSlug || "");
    const [selectedDomain, setSelectedDomain] = useState<string>("default");
    const [customDomains, setCustomDomains] = useState<CustomDomain[]>([]);
    const [isLoadingDomains, setIsLoadingDomains] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [slugError, setSlugError] = useState<string | null>(null);
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Generate slug from title if not provided
    useEffect(() => {
        if (!currentSlug && pageTitle) {
            const generatedSlug = pageTitle
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
                .substring(0, 50);
            setSlug(generatedSlug);
        }
    }, [pageTitle, currentSlug]);

    // Load custom domains
    useEffect(() => {
        async function loadDomains() {
            if (!isOpen) return;

            setIsLoadingDomains(true);
            try {
                const response = await fetch("/api/domains");
                if (response.ok) {
                    const data = await response.json();
                    setCustomDomains(data.domains || []);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load custom domains");
            } finally {
                setIsLoadingDomains(false);
            }
        }

        loadDomains();
    }, [isOpen]);

    // Validate slug
    const validateSlug = useCallback((value: string): boolean => {
        if (!value.trim()) {
            setSlugError("URL slug is required");
            return false;
        }

        if (!/^[a-z0-9-]+$/.test(value)) {
            setSlugError("Only lowercase letters, numbers, and hyphens allowed");
            return false;
        }

        if (value.length < 3) {
            setSlugError("Slug must be at least 3 characters");
            return false;
        }

        if (value.length > 50) {
            setSlugError("Slug must be 50 characters or less");
            return false;
        }

        setSlugError(null);
        return true;
    }, []);

    // Handle slug change
    const handleSlugChange = (value: string) => {
        const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
        setSlug(sanitized);
        validateSlug(sanitized);
    };

    // Get preview URL based on selected domain
    const getPreviewUrl = useCallback(() => {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

        if (selectedDomain === "default") {
            // Default domain - use growthmastery.ai subdomain structure
            return `${baseUrl}/${slug}`;
        }

        // Custom domain
        const domain = customDomains.find((d) => d.id === selectedDomain);
        if (domain?.verified) {
            return `https://${domain.domain}/${slug}`;
        }

        return `${baseUrl}/${slug}`;
    }, [selectedDomain, slug, customDomains]);

    // Handle publish
    const handlePublish = async () => {
        if (!validateSlug(slug)) return;

        setIsPublishing(true);
        try {
            const domainId = selectedDomain !== "default" ? selectedDomain : undefined;
            const result = await onPublish(slug, domainId);

            if (result.success) {
                setPublishedUrl(result.publishedUrl || getPreviewUrl());
                toast({
                    title: "Page published!",
                    description: "Your page is now live.",
                });
            } else {
                toast({
                    title: "Publish failed",
                    description: "Could not publish page. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            logger.error({ error }, "Failed to publish page");
            toast({
                title: "Publish failed",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsPublishing(false);
        }
    };

    // Copy URL to clipboard
    const handleCopy = async () => {
        const url = publishedUrl || getPreviewUrl();
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({
                title: "Link copied",
                description: "URL copied to clipboard.",
            });
        } catch {
            toast({
                title: "Copy failed",
                description: "Could not copy URL.",
                variant: "destructive",
            });
        }
    };

    // Open URL in new tab
    const handleOpenUrl = () => {
        const url = publishedUrl || getPreviewUrl();
        window.open(url, "_blank");
    };

    const verifiedDomains = customDomains.filter((d) => d.verified);
    const isPublished = currentStatus === "published" || publishedUrl;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-emerald-500" />
                        Publish your page
                        {isPublished && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                Live
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Make your page accessible to the world
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Published URL Display */}
                    {isPublished && publishedUrl && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 truncate">
                                    <p className="text-xs font-medium text-emerald-700 mb-1">
                                        Published URL
                                    </p>
                                    <p className="text-sm text-emerald-900 truncate">
                                        {publishedUrl}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={handleCopy}
                                                >
                                                    {copied ? (
                                                        <Check className="h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Copy URL</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={handleOpenUrl}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Open in new tab
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* URL Slug Input */}
                    <div className="space-y-2">
                        <Label htmlFor="slug">Page URL</Label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                    placeholder="my-page"
                                    className={cn(slugError && "border-destructive")}
                                />
                            </div>
                        </div>
                        {slugError && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {slugError}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Preview: {getPreviewUrl()}
                        </p>
                    </div>

                    {/* Domain Selection */}
                    <div className="space-y-2">
                        <Label>Domain</Label>
                        <Select
                            value={selectedDomain}
                            onValueChange={setSelectedDomain}
                            disabled={isLoadingDomains}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select domain" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-muted-foreground" />
                                        growthmastery.ai (default)
                                    </div>
                                </SelectItem>
                                {verifiedDomains.map((domain) => (
                                    <SelectItem key={domain.id} value={domain.id}>
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-emerald-500" />
                                            {domain.domain}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                {verifiedDomains.length === 0
                                    ? "No custom domains configured"
                                    : `${verifiedDomains.length} custom domain${verifiedDomains.length > 1 ? "s" : ""} available`}
                            </p>
                            <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() =>
                                    window.open("/settings/domains", "_blank")
                                }
                            >
                                <Settings className="mr-1 h-3 w-3" />
                                Manage domains
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePublish}
                        disabled={isPublishing || !!slugError}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isPublishing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Publishing...
                            </>
                        ) : isPublished ? (
                            "Update"
                        ) : (
                            "Publish"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
