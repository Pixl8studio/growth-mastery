/**
 * Toggle switch for publishing/unpublishing pages
 */

"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import type { PageListItem } from "@/types/pages";
import { togglePagePublish } from "@/app/pages/actions";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/client-logger";

interface PublishToggleProps {
    page: PageListItem;
}

export function PublishToggle({ page }: PublishToggleProps) {
    const router = useRouter();
    const [isPublished, setIsPublished] = useState(page.is_published);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async (checked: boolean) => {
        setIsLoading(true);
        setIsPublished(checked);

        try {
            await togglePagePublish(page.type, page.id, checked);
            logger.info(
                { pageId: page.id, isPublished: checked },
                "Page publish status toggled"
            );
            router.refresh();
        } catch (error) {
            logger.error({ error, pageId: page.id }, "Failed to toggle publish status");
            // Revert on error
            setIsPublished(!checked);
            alert("Failed to update publish status. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Switch
                checked={isPublished}
                onCheckedChange={handleToggle}
                disabled={isLoading}
                aria-label={isPublished ? "Unpublish page" : "Publish page"}
            />
            <span className="text-xs text-muted-foreground">
                {isPublished ? "Live" : "Draft"}
            </span>
        </div>
    );
}
