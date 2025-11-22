"use client";

/**
 * Field AI Rewrite Button Component
 * Inline button for regenerating individual field content with 3 AI-generated options
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
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

interface FieldAIRewriteButtonProps {
    pageId: string;
    pageType: "registration" | "enrollment" | "watch";
    fieldContent: string;
    fieldType: "heading" | "subheading" | "body" | "cta";
    onRewrite: (newContent: string) => void;
}

interface RewriteOption {
    id: string;
    content: string;
    style: string;
}

export function FieldAIRewriteButton({
    pageId,
    pageType,
    fieldContent,
    fieldType,
    onRewrite,
}: FieldAIRewriteButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [options, setOptions] = useState<RewriteOption[]>([]);
    const [selectedOption, setSelectedOption] = useState<string>("");
    const { toast } = useToast();

    const handleOpenDialog = async () => {
        setIsOpen(true);
        setIsGenerating(true);
        setOptions([]);
        setSelectedOption("");

        try {
            logger.info({ pageId, pageType, fieldType }, "Generating field rewrites");

            const response = await fetch(
                `/api/pages/${pageType}/${pageId}/rewrite-field`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        fieldContent,
                        fieldType,
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to generate rewrites");
            }

            const data = await response.json();
            setOptions(data.options);
            setSelectedOption(data.options[0].id); // Select first option by default

            logger.info({ optionsCount: data.options.length }, "Rewrites generated");
        } catch (error) {
            logger.error({ error }, "Failed to generate rewrites");
            toast({
                title: "Generation Failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate rewrites",
                variant: "destructive",
            });
            setIsOpen(false);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApplyRewrite = () => {
        const selected = options.find((opt) => opt.id === selectedOption);
        if (selected) {
            onRewrite(selected.content);
            toast({
                title: "Content Updated",
                description: "Your selected rewrite has been applied.",
            });
            setIsOpen(false);
        }
    };

    const handleKeepOriginal = () => {
        setIsOpen(false);
        toast({
            title: "Original Kept",
            description: "No changes were made to the content.",
        });
    };

    return (
        <>
            <Button
                size="sm"
                variant="ghost"
                onClick={handleOpenDialog}
                className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                title="Generate AI rewrites"
            >
                <Sparkles className="h-3 w-3" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-emerald-600" />
                            Choose Your Preferred Version
                        </DialogTitle>
                        <DialogDescription>
                            Select one of the AI-generated options below, or keep your
                            original content.
                        </DialogDescription>
                    </DialogHeader>

                    {isGenerating ? (
                        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            <p className="text-sm text-muted-foreground">
                                Generating rewrites...
                            </p>
                        </div>
                    ) : (
                        <RadioGroup
                            value={selectedOption}
                            onValueChange={setSelectedOption}
                            className="space-y-3"
                        >
                            {options.map((option) => (
                                <div
                                    key={option.id}
                                    className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-muted/50"
                                >
                                    <RadioGroupItem
                                        value={option.id}
                                        id={option.id}
                                        className="mt-1"
                                    />
                                    <Label
                                        htmlFor={option.id}
                                        className="flex-1 cursor-pointer space-y-1"
                                    >
                                        <div className="text-xs font-medium text-muted-foreground">
                                            {option.style}
                                        </div>
                                        <div className="text-sm leading-relaxed">
                                            {option.content}
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleKeepOriginal}
                            disabled={isGenerating}
                        >
                            Keep Original
                        </Button>
                        <Button
                            onClick={handleApplyRewrite}
                            disabled={isGenerating || !selectedOption}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Apply Selected
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
