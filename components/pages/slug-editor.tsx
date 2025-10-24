"use client";

/**
 * Slug editor component for inline editing of vanity slugs
 * Allows users to edit slugs directly in the list view
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

interface SlugEditorProps {
    pageId: string;
    pageType: "registration" | "watch" | "enrollment";
    initialSlug: string | null;
    username: string;
    onUpdate?: (newSlug: string) => void;
}

export function SlugEditor({
    pageId,
    pageType,
    initialSlug,
    username,
    onUpdate,
}: SlugEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [slug, setSlug] = useState(initialSlug || "");
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const formatSlug = (input: string): string => {
        return input
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    };

    const handleSave = async () => {
        const formattedSlug = formatSlug(slug);

        if (!formattedSlug) {
            toast({
                title: "Invalid slug",
                description: "Slug cannot be empty",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);

        try {
            logger.info(
                { pageId, pageType, slug: formattedSlug },
                "Attempting to update slug"
            );

            const url = `/api/pages/${pageType}/${pageId}`;
            const response = await fetch(url, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vanity_slug: formattedSlug }),
            });

            logger.info(
                {
                    status: response.status,
                    statusText: response.statusText,
                    url,
                },
                "Received response from API"
            );

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                logger.error(
                    {
                        status: response.status,
                        statusText: response.statusText,
                        jsonError:
                            jsonError instanceof Error ? jsonError.message : "Unknown",
                    },
                    "Failed to parse API response as JSON"
                );
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            if (!response.ok) {
                logger.error(
                    {
                        status: response.status,
                        statusText: response.statusText,
                        errorData: data,
                        url,
                    },
                    "API returned error response"
                );
                throw new Error(
                    data.error || `Failed to update slug (${response.status})`
                );
            }

            logger.info(
                { pageId, pageType, slug: formattedSlug },
                "Slug updated successfully ✨"
            );

            const fullUrl = `${window.location.origin}/${username}/${formattedSlug}`;

            toast({
                title: "Slug updated ✨",
                description: `Your page URL is now ${fullUrl}`,
            });

            setSlug(formattedSlug);
            setIsEditing(false);
            onUpdate?.(formattedSlug);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            const errorDetails = {
                pageId,
                pageType,
                message: errorMessage,
                errorType: error?.constructor?.name,
            };

            logger.error(errorDetails, "Failed to update slug");

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setSlug(initialSlug || "");
        setIsEditing(false);
    };

    const getPageUrl = () => {
        // Prefer vanity URL if slug is set, otherwise use hard link
        if (slug) {
            return `${window.location.origin}/${username}/${slug}`;
        }
        return `${window.location.origin}/p/${pageId}`;
    };

    const handleCopyUrl = async () => {
        const fullUrl = getPageUrl();

        try {
            await navigator.clipboard.writeText(fullUrl);
            const urlType = slug ? "Vanity URL" : "Page URL";
            toast({
                title: `${urlType} copied! ✨`,
                description: "The URL has been copied to your clipboard",
            });
        } catch (error) {
            logger.error({ error }, "Failed to copy URL");
            toast({
                title: "Copy failed",
                description: "Failed to copy URL. Please try again.",
                variant: "destructive",
            });
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <Input
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="my-page-slug"
                        className="font-mono text-sm"
                        disabled={isSaving}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSave();
                            } else if (e.key === "Escape") {
                                handleCancel();
                            }
                        }}
                        autoFocus
                    />
                    <p className="mt-1 text-xs text-gray-500 truncate">
                        URL will be: {window.location.origin}/{username}/
                        {formatSlug(slug)}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-9 px-2"
                >
                    <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="h-9 px-2"
                >
                    <X className="h-4 w-4 text-red-600" />
                </Button>
            </div>
        );
    }

    const displayUrl = getPageUrl();
    const isVanityUrl = !!slug;

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <code className="text-sm text-gray-700 truncate block">
                        {displayUrl}
                    </code>
                    {!isVanityUrl && (
                        <span className="text-xs text-gray-500 italic whitespace-nowrap">
                            (ID link)
                        </span>
                    )}
                </div>
                {!isVanityUrl && (
                    <p className="text-xs text-gray-500 mt-1">
                        Set a vanity slug for a custom URL
                    </p>
                )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="h-8 px-2"
                    title={isVanityUrl ? "Copy vanity URL" : "Copy page URL"}
                >
                    <Copy className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 px-2"
                    title="Edit vanity slug"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
