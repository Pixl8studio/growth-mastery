"use client";

/**
 * Field Regenerate Modal
 * Shows 3 AI-generated content options based on intake data
 */

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

interface FieldRegenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (content: string) => void;
    fieldId: string;
    fieldContext: string;
    pageId: string;
    pageType: "registration" | "watch" | "enrollment";
}

type LengthPreference = "match" | "shorter" | "longer";

export function FieldRegenerateModal({
    isOpen,
    onClose,
    onSelect,
    fieldId,
    fieldContext,
    pageId,
    pageType,
}: FieldRegenerateModalProps) {
    const [generating, setGenerating] = useState(false);
    const [options, setOptions] = useState<string[]>([]);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lengthPreference, setLengthPreference] = useState<LengthPreference>("match");

    // Generate 3 options when modal opens
    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        setOptions([]);
        setSelectedOption(null);

        logger.info(
            { fieldId, pageId, lengthPreference },
            "Generating 3 content options"
        );

        try {
            // Call API to generate 3 variations
            const response = await fetch(
                `/api/pages/${pageType}/${pageId}/regenerate-field`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fieldId,
                        fieldContext,
                        generateMultiple: true,
                        count: 3,
                        lengthPreference,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate options");
            }

            if (data.options && Array.isArray(data.options)) {
                setOptions(data.options);
                logger.info({ optionCount: data.options.length }, "Options generated");
            } else {
                throw new Error("Invalid response format");
            }
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to generate options";
            setError(errorMessage);
            logger.error({ error: err, fieldId }, "Failed to generate options");
        } finally {
            setGenerating(false);
        }
    };

    // Don't auto-generate - wait for user to click Generate button
    // useEffect removed - user controls when to generate

    const handleSelectOption = (index: number) => {
        setSelectedOption(index);
        logger.info(
            { index, optionPreview: options[index]?.substring(0, 50) },
            "Option clicked"
        );

        // Auto-apply immediately when option is clicked
        if (options[index]) {
            onSelect(options[index]);

            // Small delay before closing to ensure update completes
            setTimeout(() => {
                handleClose();
            }, 100);
        }
    };

    const handleClose = () => {
        setOptions([]);
        setSelectedOption(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white flex items-center justify-between border-b border-gray-200 p-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-900">
                            AI Content Options
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
                    {/* Original Content */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Content:
                        </label>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 italic">
                            {fieldContext}
                        </div>
                    </div>

                    {/* Initial State - Show Length Controls and Generate Button */}
                    {!generating && options.length === 0 && !error && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="text-center mb-6">
                                <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Ready to Generate AI Options
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Choose a length preference, then generate 3 unique
                                    variations
                                </p>

                                {/* Length Controls */}
                                <div className="flex gap-2 justify-center mb-6">
                                    <button
                                        onClick={() => setLengthPreference("shorter")}
                                        className={cn(
                                            "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                                            lengthPreference === "shorter"
                                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                        )}
                                    >
                                        📉 Shorter
                                    </button>
                                    <button
                                        onClick={() => setLengthPreference("match")}
                                        className={cn(
                                            "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                                            lengthPreference === "match"
                                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                        )}
                                    >
                                        ↔️ Match Length
                                    </button>
                                    <button
                                        onClick={() => setLengthPreference("longer")}
                                        className={cn(
                                            "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                                            lengthPreference === "longer"
                                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                        )}
                                    >
                                        📈 Longer
                                    </button>
                                </div>
                            </div>
                            <Button
                                onClick={handleGenerate}
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Sparkles className="h-5 w-5 mr-2" />
                                Generate 3 Options
                            </Button>
                        </div>
                    )}

                    {/* Loading State */}
                    {generating && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                            <p className="text-sm text-gray-600">
                                Generating 3 AI-powered options from your intake data...
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
                            <p className="text-sm text-red-800 mb-3">{error}</p>
                            <Button
                                onClick={handleGenerate}
                                variant="outline"
                                size="sm"
                                className="border-red-300"
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Try Again
                            </Button>
                        </div>
                    )}

                    {/* Options */}
                    {!generating && options.length > 0 && (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Choose your favorite option:
                            </label>
                            {options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelectOption(index)}
                                    className={cn(
                                        "w-full text-left rounded-lg border-2 p-4 transition-all hover:shadow-md",
                                        "border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center mt-0.5">
                                            <Check className="h-4 w-4 text-transparent" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-medium text-gray-500 mb-1">
                                                Option {index + 1} - Click to use
                                            </div>
                                            <p className="text-sm text-gray-900">
                                                {option}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!generating && options.length > 0 && (
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex items-center justify-between">
                        <Button
                            onClick={handleGenerate}
                            variant="outline"
                            disabled={generating}
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Different Options
                        </Button>
                        <Button onClick={handleClose} variant="outline">
                            Close
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
