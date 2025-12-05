"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { WizardQuestion } from "./wizard-question";
import { Sparkles, Loader2, ChevronRight, ChevronLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionId, SectionData, BusinessProfile } from "@/types/business-profile";
import { SECTION_DEFINITIONS } from "@/types/business-profile";
import { useToast } from "@/components/ui/use-toast";

interface WizardSectionProps {
    sectionId: SectionId;
    profile: Partial<BusinessProfile>;
    onSave: (sectionData: SectionData, aiGeneratedFields?: string[]) => Promise<void>;
    onNext?: () => void;
    onPrevious?: () => void;
    isFirstSection?: boolean;
    isLastSection?: boolean;
    projectId: string;
}

export function WizardSection({
    sectionId,
    profile,
    onSave,
    onNext,
    onPrevious,
    isFirstSection = false,
    isLastSection = false,
    projectId,
}: WizardSectionProps) {
    const { toast } = useToast();
    const sectionDef = SECTION_DEFINITIONS[sectionId];

    // Get context field name
    const contextKey = `${sectionId}_context` as keyof BusinessProfile;

    // Local state for section data
    const [context, setContext] = useState<string>(
        (profile[contextKey] as string) || ""
    );
    const [sectionData, setSectionData] = useState<Record<string, unknown>>(() => {
        // Initialize with existing profile data for this section's fields
        const initial: Record<string, unknown> = {};
        for (const field of sectionDef.fields) {
            initial[field.key] = profile[field.key as keyof BusinessProfile] ?? null;
        }
        return initial;
    });
    const [aiGeneratedFields, setAiGeneratedFields] = useState<string[]>(
        profile.ai_generated_fields?.filter((f) =>
            sectionDef.fields.some((sf) => sf.key === f)
        ) || []
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(
        sectionDef.fields.some(
            (f) =>
                sectionData[f.key] !== null &&
                sectionData[f.key] !== undefined &&
                sectionData[f.key] !== ""
        )
    );

    // Handle field change
    const handleFieldChange = useCallback((key: string, value: unknown) => {
        setSectionData((prev) => ({ ...prev, [key]: value }));
        // If user edits, remove from AI generated
        setAiGeneratedFields((prev) => prev.filter((f) => f !== key));
    }, []);

    // Generate section answers
    const handleGenerate = async () => {
        if (!context.trim()) {
            toast({
                title: "Context Required",
                description:
                    "Please provide some context about this section before generating.",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);

        try {
            const response = await fetch("/api/context/generate-section", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    sectionId,
                    context,
                    existingData: profile,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to generate section");
            }

            if (result.data) {
                // Update section data with generated content
                setSectionData((prev) => ({ ...prev, ...result.data }));
                // Track AI generated fields
                setAiGeneratedFields(result.generatedFields || []);
                setHasGenerated(true);

                toast({
                    title: "Section Generated!",
                    description: "Review the generated content and edit as needed.",
                });
            }
        } catch (error) {
            toast({
                title: "Generation Failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate section.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Save section data
    const handleSave = async () => {
        setIsSaving(true);

        try {
            // Add context to section data
            const dataToSave = {
                ...sectionData,
                [contextKey]: context,
            };

            await onSave(dataToSave as SectionData, aiGeneratedFields);

            toast({
                title: "Section Saved",
                description: "Your progress has been saved.",
            });
        } catch (error) {
            toast({
                title: "Save Failed",
                description:
                    error instanceof Error ? error.message : "Failed to save section.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Save and continue to next section
    const handleSaveAndContinue = async () => {
        await handleSave();
        if (onNext) {
            onNext();
        }
    };

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-foreground">
                    {sectionDef.title}
                </h2>
                <p className="mt-1 text-muted-foreground">{sectionDef.description}</p>
            </div>

            {/* Context Input */}
            <Card className="p-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="context" className="text-base font-semibold">
                            Tell us about {sectionDef.title.toLowerCase()}
                        </Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {sectionDef.contextPrompt}
                        </p>
                    </div>

                    <Textarea
                        id="context"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Type your thoughts here... Be as detailed as you'd like. The more context you provide, the better the AI can help."
                        className="min-h-[150px] resize-y text-base"
                        disabled={isGenerating}
                    />

                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !context.trim()}
                        className="w-full"
                        size="lg"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Generating Section Answers...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-5 w-5" />
                                Generate Section Answers
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Generated Questions / Answers */}
            {hasGenerated && (
                <Card className="p-6">
                    <div className="mb-6 flex items-center justify-between border-b pb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Generated Answers
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Review and edit your answers below
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleGenerate}
                            disabled={isGenerating || !context.trim()}
                            size="sm"
                        >
                            {isGenerating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Regenerate
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {sectionDef.fields.map((field) => (
                            <WizardQuestion
                                key={field.key}
                                fieldKey={field.key}
                                label={field.label}
                                type={
                                    field.type as
                                        | "text"
                                        | "textarea"
                                        | "pricing"
                                        | "objections"
                                        | "array"
                                        | "belief_shift"
                                }
                                value={sectionData[field.key]}
                                onChange={handleFieldChange}
                                isAiGenerated={aiGeneratedFields.includes(field.key)}
                                subfields={
                                    "subfields" in field
                                        ? [...field.subfields]
                                        : undefined
                                }
                                disabled={isGenerating}
                            />
                        ))}
                    </div>
                </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between border-t pt-6">
                <div>
                    {!isFirstSection && (
                        <Button
                            variant="outline"
                            onClick={onPrevious}
                            disabled={isSaving}
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Previous Section
                        </Button>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Progress
                    </Button>

                    {!isLastSection ? (
                        <Button onClick={handleSaveAndContinue} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Save & Continue
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            variant="default"
                        >
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Complete Profile
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
