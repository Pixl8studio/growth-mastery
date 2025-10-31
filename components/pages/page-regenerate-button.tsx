"use client";

/**
 * Page Regenerate Button Component
 * Global button to regenerate entire page content using AI
 * Shows confirmation modal with options to preserve or replace all content
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

interface PageRegenerateButtonProps {
    pageId: string;
    pageType: "registration" | "enrollment" | "watch";
    onRegenerate?: () => void;
}

export function PageRegenerateButton({
    pageId,
    pageType,
    onRegenerate,
}: PageRegenerateButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [regenerateMode, setRegenerateMode] = useState<"all" | "unedited">("all");
    const { toast } = useToast();

    const handleOpenDialog = () => {
        setIsOpen(true);
    };

    const handleConfirmRegenerate = async () => {
        setIsRegenerating(true);

        try {
            logger.info(
                { pageId, pageType, mode: regenerateMode },
                "Starting page regeneration"
            );

            const response = await fetch(
                `/api/pages/${pageType}/${pageId}/regenerate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        preserveEditedFields: regenerateMode === "unedited",
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to regenerate page");
            }

            const data = await response.json();

            logger.info(
                {
                    pageId,
                    regenerationCount:
                        data.page?.regeneration_metadata?.regeneration_count,
                },
                "Page regenerated successfully"
            );

            toast({
                title: "Page Regenerated! ✨",
                description:
                    "Your page content has been regenerated with fresh AI-powered copy. The page will reload to show the new content.",
            });

            setIsOpen(false);

            // Reload the page to show new content
            setTimeout(() => {
                window.location.reload();
            }, 1500);

            if (onRegenerate) {
                onRegenerate();
            }
        } catch (error) {
            logger.error({ error, pageId, pageType }, "Failed to regenerate page");

            toast({
                title: "Regeneration Failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to regenerate page. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <>
            <Button
                onClick={handleOpenDialog}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isRegenerating}
            >
                <Sparkles className="h-4 w-4" />
                Regenerate Page
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Regenerate Page Content
                        </DialogTitle>
                        <DialogDescription className="pt-4 space-y-4">
                            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-medium mb-1">Important</p>
                                    <p>
                                        This will use AI to regenerate your page content
                                        based on your intake data and the Universal
                                        Framework. Choose how you want to handle
                                        existing content.
                                    </p>
                                </div>
                            </div>

                            <RadioGroup
                                value={regenerateMode}
                                onValueChange={(value) =>
                                    setRegenerateMode(value as "all" | "unedited")
                                }
                                className="space-y-3"
                            >
                                <div className="flex items-start space-x-3 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                                    <RadioGroupItem
                                        value="all"
                                        id="all"
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <Label
                                            htmlFor="all"
                                            className="text-base font-medium cursor-pointer"
                                        >
                                            Regenerate All Content
                                        </Label>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Replace everything with fresh AI-generated
                                            content. Any manual edits will be lost.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                                    <RadioGroupItem
                                        value="unedited"
                                        id="unedited"
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <Label
                                            htmlFor="unedited"
                                            className="text-base font-medium cursor-pointer"
                                        >
                                            Regenerate Unedited Fields Only
                                        </Label>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Preserve fields you've manually edited. Only
                                            regenerate untouched content.
                                        </p>
                                    </div>
                                </div>
                            </RadioGroup>
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isRegenerating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmRegenerate}
                            disabled={isRegenerating}
                            className="gap-2"
                        >
                            {isRegenerating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Regenerating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Regenerate Now
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
