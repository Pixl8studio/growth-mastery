"use client";

/**
 * Publish toggle component for pages
 * Allows toggling published status with optimistic updates
 */

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

interface PublishToggleProps {
    pageId: string;
    pageType: "registration" | "watch" | "enrollment";
    initialPublished: boolean;
    onToggle?: (published: boolean) => void;
}

export function PublishToggle({
    pageId,
    pageType,
    initialPublished,
    onToggle,
}: PublishToggleProps) {
    const [published, setPublished] = useState(initialPublished);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleToggle = async (newValue: boolean) => {
        const previousValue = published;
        setPublished(newValue);
        setIsLoading(true);

        try {
            const response = await fetch(`/api/pages/${pageType}/${pageId}/publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ published: newValue }),
            });

            if (!response.ok) {
                throw new Error("Failed to update publish status");
            }

            logger.info(
                { pageId, pageType, published: newValue },
                "Page publish status updated"
            );

            toast({
                title: newValue ? "Page published" : "Page unpublished",
                description: newValue
                    ? "Your page is now live and visible to visitors"
                    : "Your page is now hidden from visitors",
            });

            onToggle?.(newValue);
        } catch (error) {
            logger.error(
                { error, pageId, pageType },
                "Failed to toggle publish status"
            );
            setPublished(previousValue);
            toast({
                title: "Error",
                description: "Failed to update publish status. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <Switch
                id={`publish-${pageId}`}
                checked={published}
                onCheckedChange={handleToggle}
                disabled={isLoading}
            />
            <Label
                htmlFor={`publish-${pageId}`}
                className="text-sm font-medium text-gray-700"
            >
                {published ? "Published" : "Draft"}
            </Label>
        </div>
    );
}
