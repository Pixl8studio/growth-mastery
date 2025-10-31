"use client";

/**
 * Section Block Generator
 * AI-powered section generation with copy based on intake data
 */

import { useState } from "react";
import { X, Sparkles, Loader2, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";

interface SectionBlockGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onSectionGenerated: (sectionType: string, copy: SectionCopy) => void;
    projectId: string;
    pageId: string;
}

interface SectionCopy {
    headline?: string;
    subheadline?: string;
    body?: string;
    bullets?: string[];
    cta?: string;
    buttonText?: string;
}

const SECTION_TYPES = [
    {
        id: "hero",
        label: "Hero Section",
        description: "Headline, subheadline, CTA button",
    },
    {
        id: "benefits",
        label: "Benefits",
        description: "List key benefits and value propositions",
    },
    {
        id: "problem",
        label: "Problem",
        description: "Agitate the pain point they're facing",
    },
    { id: "solution", label: "Solution", description: "Present your unique solution" },
    { id: "features", label: "Features", description: "What's included in your offer" },
    {
        id: "testimonial",
        label: "Testimonials",
        description: "Social proof section header",
    },
    { id: "cta", label: "Call-to-Action", description: "Strong CTA with urgency" },
    { id: "faq", label: "FAQ", description: "Address common questions" },
];

export function SectionBlockGenerator({
    isOpen,
    onClose,
    onSectionGenerated,
    projectId,
    pageId,
}: SectionBlockGeneratorProps) {
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState("");
    const [generating, setGenerating] = useState(false);
    const [generatedCopy, setGeneratedCopy] = useState<SectionCopy | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!selectedType) {
            setError("Please select a section type");
            return;
        }

        setGenerating(true);
        setError(null);

        try {
            logger.info(
                { sectionType: selectedType, projectId, pageId },
                "Generating section copy"
            );

            const response = await fetch("/api/pages/generate-section-copy", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sectionType: selectedType,
                    pageId,
                    projectId,
                    customPrompt: customPrompt.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate section");
            }

            logger.info(
                { sectionType: selectedType, copy: data.copy },
                "Section copy generated"
            );

            setGeneratedCopy(data.copy);
        } catch (err) {
            logger.error({ error: err }, "Section generation failed");
            setError(err instanceof Error ? err.message : "Failed to generate section");
        } finally {
            setGenerating(false);
        }
    };

    const handleInsert = () => {
        if (selectedType && generatedCopy) {
            onSectionGenerated(selectedType, generatedCopy);
            handleClose();
        }
    };

    const handleRegenerate = () => {
        setGeneratedCopy(null);
        setError(null);
    };

    const handleClose = () => {
        setSelectedType(null);
        setCustomPrompt("");
        setGeneratedCopy(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
                    <div className="flex items-center gap-2">
                        <Layout className="h-5 w-5 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-900">
                            Generate Section
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
                    {!generatedCopy ? (
                        <>
                            {/* Section Type Selection */}
                            <div className="mb-6">
                                <label className="mb-3 block text-sm font-medium text-gray-700">
                                    Select Section Type
                                </label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {SECTION_TYPES.map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setSelectedType(type.id)}
                                            className={cn(
                                                "rounded-lg border-2 p-4 text-left transition-all",
                                                selectedType === type.id
                                                    ? "border-blue-600 bg-blue-50"
                                                    : "border-gray-200 hover:border-blue-300"
                                            )}
                                            disabled={generating}
                                        >
                                            <div className="mb-1 font-medium text-gray-900">
                                                {type.label}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {type.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Optional Custom Prompt */}
                            <div className="mb-6">
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Custom Instructions (Optional)
                                </label>
                                <Textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="E.g., Focus on healthcare professionals, emphasize time savings, use medical terminology"
                                    className="min-h-[80px] resize-none"
                                    disabled={generating}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    AI will use your intake data by default. Add custom
                                    instructions to refine the output.
                                </p>
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
                                disabled={!selectedType || generating}
                                className="w-full"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating Section...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Section
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* Generated Copy Preview */}
                            <div className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
                                {generatedCopy.headline && (
                                    <div>
                                        <div className="mb-1 text-xs font-medium uppercase text-gray-500">
                                            Headline
                                        </div>
                                        <div className="text-xl font-bold text-gray-900">
                                            {generatedCopy.headline}
                                        </div>
                                    </div>
                                )}

                                {generatedCopy.subheadline && (
                                    <div>
                                        <div className="mb-1 text-xs font-medium uppercase text-gray-500">
                                            Subheadline
                                        </div>
                                        <div className="text-lg text-gray-700">
                                            {generatedCopy.subheadline}
                                        </div>
                                    </div>
                                )}

                                {generatedCopy.body && (
                                    <div>
                                        <div className="mb-1 text-xs font-medium uppercase text-gray-500">
                                            Body Copy
                                        </div>
                                        <div className="text-gray-700">
                                            {generatedCopy.body}
                                        </div>
                                    </div>
                                )}

                                {generatedCopy.bullets &&
                                    generatedCopy.bullets.length > 0 && (
                                        <div>
                                            <div className="mb-2 text-xs font-medium uppercase text-gray-500">
                                                Bullet Points
                                            </div>
                                            <ul className="space-y-2">
                                                {generatedCopy.bullets.map(
                                                    (bullet, index) => (
                                                        <li
                                                            key={index}
                                                            className="flex items-start gap-2"
                                                        >
                                                            <span className="mt-1 flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
                                                            <span className="text-gray-700">
                                                                {bullet}
                                                            </span>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                {(generatedCopy.cta || generatedCopy.buttonText) && (
                                    <div>
                                        <div className="mb-1 text-xs font-medium uppercase text-gray-500">
                                            Call-to-Action
                                        </div>
                                        <div className="text-gray-700">
                                            {generatedCopy.cta ||
                                                generatedCopy.buttonText}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleRegenerate}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Regenerate
                                </Button>
                                <Button onClick={handleInsert} className="flex-1">
                                    Insert Section
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
