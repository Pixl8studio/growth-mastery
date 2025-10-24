"use client";

/**
 * Share button component for copying page URLs
 * Shows URL slug and provides copy-to-clipboard functionality
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { getPublicPageUrlClient } from "@/lib/get-public-url";

interface ShareButtonProps {
    username: string;
    vanitySlug: string | null;
}

export function ShareButton({ username, vanitySlug }: ShareButtonProps) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    if (!vanitySlug) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link2 className="h-4 w-4" />
                <span>No slug set</span>
            </div>
        );
    }

    const publicUrl = getPublicPageUrlClient(username, vanitySlug);

    const handleCopy = async () => {
        if (!publicUrl) return;

        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            logger.info({ url: publicUrl }, "URL copied to clipboard");

            toast({
                title: "URL copied!",
                description: "The page URL has been copied to your clipboard",
            });

            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            logger.error({ error }, "Failed to copy URL");
            toast({
                title: "Copy failed",
                description: "Failed to copy URL. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <Link2 className="h-4 w-4 text-gray-500" />
            <code className="flex-1 text-sm text-gray-700">
                {username}/{vanitySlug}
            </code>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
                {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                ) : (
                    <Copy className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
}
