"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/client-logger";
import { useToast } from "@/components/ui/use-toast";

interface PasteIntakeProps {
    projectId: string;
    userId: string;
    onComplete?: () => void;
}

export function PasteIntake({ projectId, userId, onComplete }: PasteIntakeProps) {
    const [content, setContent] = useState("");
    const [sessionName, setSessionName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const charCount = content.length;

    const handleSubmit = async () => {
        if (content.trim().length < 100) {
            toast({
                title: "Content too short",
                description: "Please provide at least 100 characters of content.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/intake/paste", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    userId,
                    content: content.trim(),
                    sessionName: sessionName.trim() || "Pasted Content",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to save content");
            }

            logger.info(
                { intakeId: data.intakeId },
                "Pasted content saved successfully"
            );

            toast({
                title: "Content saved!",
                description: "Your content has been saved successfully.",
            });

            setContent("");
            setSessionName("");

            if (onComplete) {
                setTimeout(() => onComplete(), 1000);
            }
        } catch (error) {
            logger.error({ error }, "Failed to save pasted content");
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to save content",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        Paste Your Content
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                        Paste text about your business, offer, or existing materials
                    </p>
                </div>

                {/* Session Name */}
                <div>
                    <label
                        htmlFor="sessionName"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Session Name (optional)
                    </label>
                    <input
                        type="text"
                        id="sessionName"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="e.g., Coaching Offer Description"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                </div>

                {/* Content Textarea */}
                <div>
                    <label
                        htmlFor="content"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Paste your content here... (minimum 100 characters)"
                        rows={12}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <span>
                            {wordCount} {wordCount === 1 ? "word" : "words"}
                        </span>
                        <span>
                            {charCount} {charCount === 1 ? "character" : "characters"}
                        </span>
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || content.trim().length < 100}
                    className="w-full"
                    size="lg"
                >
                    {isSubmitting ? "Saving..." : "Save Content"}
                </Button>

                {/* Help Text */}
                <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-blue-900">
                        💡 Tips
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                        <li>
                            • Include details about your business and target audience
                        </li>
                        <li>• Describe your offer, pricing, and value proposition</li>
                        <li>• Add any unique selling points or differentiators</li>
                        <li>
                            • The more detail, the better the AI can understand your
                            business
                        </li>
                    </ul>
                </div>
            </div>
        </Card>
    );
}
