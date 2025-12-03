"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { WizardQuestion } from "./wizard-question";
import { SectionProgress } from "./section-progress";
import {
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    Loader2,
    ChevronRight,
    ChevronLeft,
    Save,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
    SectionId,
    SectionData,
    BusinessProfile,
    CompletionStatus,
} from "@/types/business-profile";
import { SECTION_DEFINITIONS } from "@/types/business-profile";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";

interface GptPasteModeProps {
    projectId: string;
    userId: string;
    initialProfile?: BusinessProfile;
    onComplete?: () => void;
}

const SECTION_ORDER: SectionId[] = [
    "section1",
    "section2",
    "section3",
    "section4",
    "section5",
];

export function GptPasteMode({
    projectId,
    userId,
    initialProfile,
    onComplete,
}: GptPasteModeProps) {
    const { toast } = useToast();
    const [currentSection, setCurrentSection] = useState<SectionId>("section1");
    const [profile, setProfile] = useState<Partial<BusinessProfile>>(
        initialProfile || {}
    );
    const [isLoading, setIsLoading] = useState(!initialProfile);

    // Per-section state
    const [pastedContent, setPastedContent] = useState<Record<SectionId, string>>({
        section1: "",
        section2: "",
        section3: "",
        section4: "",
        section5: "",
    });
    const [sectionData, setSectionData] = useState<
        Record<SectionId, Record<string, unknown>>
    >({
        section1: {},
        section2: {},
        section3: {},
        section4: {},
        section5: {},
    });
    const [copiedSection, setCopiedSection] = useState<SectionId | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
        new Set(["section1"])
    );

    // Initialize section data from profile
    const initializeSectionData = useCallback((prof: Partial<BusinessProfile>) => {
        const newSectionData: Record<SectionId, Record<string, unknown>> = {
            section1: {},
            section2: {},
            section3: {},
            section4: {},
            section5: {},
        };

        for (const sectionId of SECTION_ORDER) {
            const sectionDef = SECTION_DEFINITIONS[sectionId];
            for (const field of sectionDef.fields) {
                newSectionData[sectionId][field.key] =
                    prof[field.key as keyof BusinessProfile] ?? null;
            }
        }

        setSectionData(newSectionData);
    }, []);

    // Load profile on mount
    useEffect(() => {
        const loadProfile = async () => {
            if (initialProfile) {
                // Initialize section data from profile
                initializeSectionData(initialProfile);
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `/api/context/business-profile?projectId=${projectId}`,
                    { credentials: "include" }
                );

                if (response.status === 401) {
                    setIsLoading(false);
                    return;
                }

                const result = await response.json();

                if (response.ok && result.profile) {
                    setProfile(result.profile);
                    initializeSectionData(result.profile);
                }
            } catch (error) {
                logger.error({ error }, "Failed to load business profile");
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [projectId, initialProfile, initializeSectionData]);

    // Generate copy prompt for a section
    const generateCopyPrompt = (sectionId: SectionId): string => {
        const sectionDef = SECTION_DEFINITIONS[sectionId];

        const questionsText = sectionDef.fields
            .map((field, index) => {
                if (field.type === "belief_shift" && "subfields" in field) {
                    const subQuestions = field.subfields
                        .map(
                            (sub, subIndex) =>
                                `   ${String.fromCharCode(97 + subIndex)}) ${sub.label}`
                        )
                        .join("\n");
                    return `${index + 1}. ${field.label}:\n${subQuestions}`;
                }
                return `${index + 1}. ${field.label}`;
            })
            .join("\n\n");

        return `# ${sectionDef.title}

Please answer the following questions about ${sectionDef.description.toLowerCase()}:

${questionsText}

Please provide detailed, specific answers for each question. Format your response clearly with each answer labeled by question number.`;
    };

    // Copy prompt to clipboard
    const handleCopyPrompt = async (sectionId: SectionId) => {
        const prompt = generateCopyPrompt(sectionId);
        await navigator.clipboard.writeText(prompt);
        setCopiedSection(sectionId);

        toast({
            title: "Prompt Copied!",
            description: "Paste this into your GPT, then paste the response back here.",
        });

        setTimeout(() => setCopiedSection(null), 3000);
    };

    // Parse pasted content
    const handleParsePaste = async (sectionId: SectionId) => {
        const content = pastedContent[sectionId];
        if (!content.trim()) {
            toast({
                title: "No Content",
                description: "Please paste your GPT's response first.",
                variant: "destructive",
            });
            return;
        }

        setIsParsing(true);

        try {
            const response = await fetch("/api/context/parse-gpt-paste", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    sectionId,
                    pastedContent: content,
                    existingData: profile,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to parse response");
            }

            if (result.data) {
                setSectionData((prev) => ({
                    ...prev,
                    [sectionId]: { ...prev[sectionId], ...result.data },
                }));

                toast({
                    title: "Content Parsed!",
                    description: "Review and edit the extracted answers below.",
                });
            }
        } catch (error) {
            toast({
                title: "Parse Failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to parse GPT response.",
                variant: "destructive",
            });
        } finally {
            setIsParsing(false);
        }
    };

    // Handle field change
    const handleFieldChange = useCallback(
        (sectionId: SectionId, key: string, value: unknown) => {
            setSectionData((prev) => ({
                ...prev,
                [sectionId]: { ...prev[sectionId], [key]: value },
            }));
        },
        []
    );

    // Save section
    const handleSaveSection = async (sectionId: SectionId) => {
        setIsSaving(true);

        try {
            const contextKey = `${sectionId}_context` as keyof BusinessProfile;
            const dataToSave = {
                ...sectionData[sectionId],
                [contextKey]: pastedContent[sectionId],
            };

            const response = await fetch("/api/context/business-profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    sectionId,
                    sectionData: dataToSave,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to save section");
            }

            setProfile(result.profile);

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

    // Toggle section expansion
    const toggleSection = (sectionId: SectionId) => {
        setExpandedSections((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };

    // Navigate sections
    const handleNext = () => {
        const currentIndex = SECTION_ORDER.indexOf(currentSection);
        if (currentIndex < SECTION_ORDER.length - 1) {
            const nextSection = SECTION_ORDER[currentIndex + 1];
            setCurrentSection(nextSection);
            setExpandedSections((prev) => new Set([...prev, nextSection]));
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (onComplete) {
            onComplete();
        }
    };

    const handlePrevious = () => {
        const currentIndex = SECTION_ORDER.indexOf(currentSection);
        if (currentIndex > 0) {
            setCurrentSection(SECTION_ORDER[currentIndex - 1]);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    const completionStatus: CompletionStatus =
        (profile.completion_status as CompletionStatus) || {
            section1: 0,
            section2: 0,
            section3: 0,
            section4: 0,
            section5: 0,
            overall: 0,
        };

    return (
        <div className="space-y-6">
            {/* Progress */}
            <SectionProgress
                currentSection={currentSection}
                completionStatus={completionStatus}
                onSectionClick={(s) => {
                    setCurrentSection(s);
                    setExpandedSections((prev) => new Set([...prev, s]));
                }}
            />

            {/* Instructions */}
            <Card className="border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-2 font-semibold text-blue-900">
                    How GPT Paste Mode Works
                </h3>
                <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800">
                    <li>Click "Copy Prompt" to copy the questions for each section</li>
                    <li>Paste the prompt into your trained GPT and get its response</li>
                    <li>Paste the GPT response back here and click "Parse Response"</li>
                    <li>Review, edit, and save each section</li>
                </ol>
            </Card>

            {/* Sections */}
            <div className="space-y-4">
                {SECTION_ORDER.map((sectionId) => {
                    const sectionDef = SECTION_DEFINITIONS[sectionId];
                    const isExpanded = expandedSections.has(sectionId);
                    const isCurrent = sectionId === currentSection;
                    const hasData = Object.values(sectionData[sectionId]).some(
                        (v) => v !== null && v !== undefined && v !== ""
                    );

                    return (
                        <Card
                            key={sectionId}
                            className={cn("overflow-hidden transition-all", {
                                "border-primary": isCurrent,
                            })}
                        >
                            {/* Section Header */}
                            <button
                                onClick={() => toggleSection(sectionId)}
                                className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-full",
                                            {
                                                "bg-primary text-primary-foreground":
                                                    isCurrent,
                                                "bg-green-100 text-green-700":
                                                    hasData && !isCurrent,
                                                "bg-muted text-muted-foreground":
                                                    !hasData && !isCurrent,
                                            }
                                        )}
                                    >
                                        {SECTION_ORDER.indexOf(sectionId) + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">
                                            {sectionDef.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {sectionDef.fields.length} questions
                                        </p>
                                    </div>
                                </div>
                                {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                            </button>

                            {/* Section Content */}
                            {isExpanded && (
                                <div className="space-y-6 border-t p-6">
                                    {/* Copy Prompt Button */}
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleCopyPrompt(sectionId)}
                                            className="flex-1"
                                        >
                                            {copiedSection === sectionId ? (
                                                <>
                                                    <Check className="mr-2 h-4 w-4 text-green-600" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    Copy Prompt for GPT
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Paste Area */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Paste your GPT's response:
                                        </label>
                                        <Textarea
                                            value={pastedContent[sectionId]}
                                            onChange={(e) =>
                                                setPastedContent((prev) => ({
                                                    ...prev,
                                                    [sectionId]: e.target.value,
                                                }))
                                            }
                                            placeholder="Paste your GPT's response here..."
                                            className="min-h-[200px]"
                                        />
                                        <Button
                                            onClick={() => handleParsePaste(sectionId)}
                                            disabled={
                                                isParsing ||
                                                !pastedContent[sectionId].trim()
                                            }
                                            className="w-full"
                                        >
                                            {isParsing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Parsing Response...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                    Parse Response
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Parsed Fields */}
                                    {Object.keys(sectionData[sectionId]).length > 0 && (
                                        <div className="space-y-4 border-t pt-4">
                                            <h4 className="font-medium text-foreground">
                                                Extracted Answers
                                            </h4>
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
                                                    value={
                                                        sectionData[sectionId][
                                                            field.key
                                                        ]
                                                    }
                                                    onChange={(key, value) =>
                                                        handleFieldChange(
                                                            sectionId,
                                                            key,
                                                            value
                                                        )
                                                    }
                                                    isAiGenerated={false}
                                                    subfields={
                                                        "subfields" in field
                                                            ? field.subfields
                                                            : undefined
                                                    }
                                                />
                                            ))}

                                            <Button
                                                onClick={() =>
                                                    handleSaveSection(sectionId)
                                                }
                                                disabled={isSaving}
                                                className="w-full"
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Save Section
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t pt-6">
                <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={SECTION_ORDER.indexOf(currentSection) === 0}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>

                <Button onClick={handleNext}>
                    {SECTION_ORDER.indexOf(currentSection) ===
                    SECTION_ORDER.length - 1 ? (
                        "Complete"
                    ) : (
                        <>
                            Next Section
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
