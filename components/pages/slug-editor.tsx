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
            const response = await fetch(`/api/pages/${pageType}/${pageId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vanity_slug: formattedSlug }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update slug");
            }

            logger.info(
                { pageId, pageType, slug: formattedSlug },
                "Slug updated successfully"
            );

            toast({
                title: "Slug updated",
                description: `Your page URL is now /${username}/${formattedSlug}`,
            });

            setSlug(formattedSlug);
            setIsEditing(false);
            onUpdate?.(formattedSlug);
        } catch (error) {
            logger.error({ error, pageId, pageType }, "Failed to update slug");
            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to update slug. Please try again.",
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

    const handleCopySlug = async () => {
        if (!slug) return;

        try {
            await navigator.clipboard.writeText(slug);
            toast({
                title: "Slug copied!",
                description: "The slug has been copied to your clipboard",
            });
        } catch (error) {
            logger.error({ error }, "Failed to copy slug");
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
                    <p className="mt-1 text-xs text-gray-500">
                        URL will be: /{username}/{formatSlug(slug)}
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

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1">
                {slug ? (
                    <code className="text-sm text-gray-700">
                        /{username}/{slug}
                    </code>
                ) : (
                    <span className="text-sm text-gray-500 italic">No slug set</span>
                )}
            </div>
            <div className="flex gap-1">
                {slug && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySlug}
                        className="h-8 px-2"
                        title="Copy slug"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 px-2"
                    title="Edit slug"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
