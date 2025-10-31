"use client";

/**
 * Image Generation Modal
 * AI-powered image generation with DALL-E for page sections
 */

import { useState } from "react";
import { X, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

interface ImageGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImageGenerated: (imageUrl: string, mediaId: string) => void;
    projectId: string;
    pageId?: string;
    suggestedPrompts?: string[];
}

export function ImageGenerationModal({
    isOpen,
    onClose,
    onImageGenerated,
    projectId,
    pageId,
    suggestedPrompts = [],
}: ImageGenerationModalProps) {
    const [prompt, setPrompt] = useState("");
    const [generating, setGenerating] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [generatedMediaId, setGeneratedMediaId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [size, setSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">(
        "1024x1024"
    );

    const defaultSuggestions = [
        "Modern minimalist hero background with soft gradient",
        "Professional business team collaborating in bright office",
        "Abstract technology network connections and data flow",
        "Serene nature landscape with mountains and clear sky",
        "Geometric patterns in brand colors, modern design",
    ];

    const suggestions =
        suggestedPrompts.length > 0 ? suggestedPrompts : defaultSuggestions;

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Please enter a prompt");
            return;
        }

        setGenerating(true);
        setError(null);

        try {
            logger.info({ prompt, size, projectId }, "Generating AI image");

            const response = await fetch("/api/pages/generate-image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    projectId,
                    pageId,
                    size,
                    quality: "standard",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate image");
            }

            logger.info(
                { imageUrl: data.imageUrl, mediaId: data.mediaId },
                "Image generated successfully"
            );

            setGeneratedImageUrl(data.imageUrl);
            setGeneratedMediaId(data.mediaId);
        } catch (err) {
            logger.error({ error: err }, "Image generation failed");
            setError(err instanceof Error ? err.message : "Failed to generate image");
        } finally {
            setGenerating(false);
        }
    };

    const handleInsert = () => {
        if (generatedImageUrl && generatedMediaId) {
            onImageGenerated(generatedImageUrl, generatedMediaId);
            handleClose();
        }
    };

    const handleRegenerate = () => {
        setGeneratedImageUrl(null);
        setGeneratedMediaId(null);
        setError(null);
    };

    const handleClose = () => {
        setPrompt("");
        setGeneratedImageUrl(null);
        setGeneratedMediaId(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 p-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h2 className="text-xl font-semibold text-gray-900">
                            Generate AI Image
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-lg p-1 hover:bg-gray-100"
                        disabled={generating}
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!generatedImageUrl ? (
                        <>
                            {/* Prompt Input */}
                            <div className="mb-4">
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Describe the image you want to create
                                </label>
                                <Textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="E.g., A modern minimalist hero background with soft blue gradient and subtle geometric shapes"
                                    className="min-h-[100px] resize-none"
                                    disabled={generating}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Be specific and descriptive for best results
                                </p>
                            </div>

                            {/* Size Selection */}
                            <div className="mb-4">
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Image Size
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSize("1024x1024")}
                                        className={cn(
                                            "flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors",
                                            size === "1024x1024"
                                                ? "border-purple-600 bg-purple-50 text-purple-700"
                                                : "border-gray-200 text-gray-700 hover:border-gray-300"
                                        )}
                                        disabled={generating}
                                    >
                                        Square (1024×1024)
                                    </button>
                                    <button
                                        onClick={() => setSize("1792x1024")}
                                        className={cn(
                                            "flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors",
                                            size === "1792x1024"
                                                ? "border-purple-600 bg-purple-50 text-purple-700"
                                                : "border-gray-200 text-gray-700 hover:border-gray-300"
                                        )}
                                        disabled={generating}
                                    >
                                        Wide (1792×1024)
                                    </button>
                                    <button
                                        onClick={() => setSize("1024x1792")}
                                        className={cn(
                                            "flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors",
                                            size === "1024x1792"
                                                ? "border-purple-600 bg-purple-50 text-purple-700"
                                                : "border-gray-200 text-gray-700 hover:border-gray-300"
                                        )}
                                        disabled={generating}
                                    >
                                        Tall (1024×1792)
                                    </button>
                                </div>
                            </div>

                            {/* Suggestions */}
                            <div className="mb-6">
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Try these prompts
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setPrompt(suggestion)}
                                            className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:border-purple-600 hover:bg-purple-50 hover:text-purple-700"
                                            disabled={generating}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {/* Generate Button */}
                            <Button
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || generating}
                                className="w-full"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating... (this may take 10-30 seconds)
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Image
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* Generated Image Preview */}
                            <div className="mb-6">
                                <img
                                    src={generatedImageUrl}
                                    alt="Generated"
                                    className="w-full rounded-lg border border-gray-200"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleRegenerate}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Generate New Image
                                </Button>
                                <Button onClick={handleInsert} className="flex-1">
                                    Insert Image
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
